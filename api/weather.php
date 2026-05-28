<?php
// ============================================================
//  api/weather.php — OWM proxy + history logging
// ============================================================
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

session_name(SESSION_NAME);
session_start();

$action = $_GET['action'] ?? 'current';

match($action) {
    'current'  => handle_current(),
    'forecast' => handle_forecast(),
    'search'   => handle_search(),
    default    => json_err('Unknown action')
};

// ── Shared: build location query string ──────────────────────
function loc_qs(): string {
    if (!empty($_GET['q']))
        return 'q=' . urlencode($_GET['q']);
    if (isset($_GET['lat'], $_GET['lon']))
        return 'lat=' . (float)$_GET['lat'] . '&lon=' . (float)$_GET['lon'];
    json_err('Provide ?q=City or ?lat=&lon=');
}

// ── Shared: units param ───────────────────────────────────────
function units_param(): string {
    $u = $_GET['units'] ?? 'metric';
    return in_array($u, ['metric','imperial']) ? $u : 'metric';
}

// ── Fetch from OWM using cURL ────────────────────────────────
function owm_fetch(string $url): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,          // timeout to connect
        CURLOPT_TIMEOUT        => 15,         // total fetch timeout
        CURLOPT_SSL_VERIFYPEER => false,      // dev only; enable in prod
        CURLOPT_FAILONERROR    => false,
        CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4, // force IPv4
    ]);

    $raw = curl_exec($ch);
    if ($raw === false) {
        json_err('Could not reach weather service: ' . curl_error($ch), 502);
    }

    curl_close($ch);

    $d = json_decode($raw, true);
    $cod = (int)($d['cod'] ?? 200);
    if ($cod !== 200) json_err($d['message'] ?? 'Weather service error', $cod ?: 400);

    return $d;
}

// ── Current weather ───────────────────────────────────────────
function handle_current(): void {
    $units = units_param();
    $url   = OWM_BASE . '/weather?' . loc_qs() . '&appid=' . OWM_API_KEY . '&units=' . $units;
    $d     = owm_fetch($url);

    $speed_unit = $units === 'imperial' ? 'mph' : 'km/h';
    $wind_speed = $units === 'imperial'
        ? round($d['wind']['speed'], 1)
        : round($d['wind']['speed'] * 3.6, 1);

    $out = [
        'city'        => $d['name'],
        'country'     => $d['sys']['country'] ?? '',
        'temp'        => round($d['main']['temp']),
        'feels_like'  => round($d['main']['feels_like']),
        'temp_min'    => round($d['main']['temp_min']),
        'temp_max'    => round($d['main']['temp_max']),
        'humidity'    => $d['main']['humidity'],
        'pressure'    => $d['main']['pressure'],
        'wind_speed'  => $wind_speed,
        'wind_deg'    => $d['wind']['deg'] ?? 0,
        'wind_gust'   => isset($d['wind']['gust'])
                            ? ($units === 'imperial' ? round($d['wind']['gust'],1) : round($d['wind']['gust']*3.6,1))
                            : null,
        'visibility'  => isset($d['visibility']) ? round($d['visibility'] / 1000, 1) : null,
        'clouds'      => $d['clouds']['all'] ?? 0,
        'description' => ucfirst($d['weather'][0]['description']),
        'icon'        => $d['weather'][0]['icon'],
        'condition'   => $d['weather'][0]['main'],
        'sunrise'     => $d['sys']['sunrise'],
        'sunset'      => $d['sys']['sunset'],
        'timezone'    => $d['timezone'],
        'dt'          => $d['dt'],
        'lat'         => $d['coord']['lat'],
        'lon'         => $d['coord']['lon'],
        'units'       => $units,
        'speed_unit'  => $speed_unit,
    ];

    // Log to history
    $uid = $_SESSION['user_id'] ?? null;
    DB::run(
        'INSERT INTO search_history
            (user_id, city, country, lat, lon, temp, feels_like, humidity, wind_speed, condition, icon)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [$uid, $out['city'], $out['country'], $out['lat'], $out['lon'],
         $out['temp'], $out['feels_like'], $out['humidity'], $out['wind_speed'],
         $out['condition'], $out['icon']]
    );

    // Trim history to HISTORY_LIMIT per user
    if ($uid) {
        DB::run(
            'DELETE FROM search_history WHERE user_id = ? AND id NOT IN
             (SELECT id FROM search_history WHERE user_id = ? ORDER BY searched_at DESC LIMIT ?)',
            [$uid, $uid, HISTORY_LIMIT]
        );
    }

    json_out($out);
}

// ── 5-day forecast ────────────────────────────────────────────
function handle_forecast(): void {
    $units = units_param();
    $url   = OWM_BASE . '/forecast?' . loc_qs() . '&appid=' . OWM_API_KEY . '&units=' . $units . '&cnt=40';
    $d     = owm_fetch($url);

    // Group into daily buckets — prefer noon reading
    $days = [];
    foreach ($d['list'] as $item) {
        $date = date('Y-m-d', $item['dt']);
        $hour = (int)date('H', $item['dt']);
        if (!isset($days[$date]) || abs($hour - 12) < abs((int)date('H', $days[$date]['dt']) - 12)) {
            $days[$date] = $item;
        }
    }

    $forecast = [];
    foreach (array_slice($days, 0, 5) as $date => $item) {
        $wind_speed = $units === 'imperial'
            ? round($item['wind']['speed'], 1)
            : round($item['wind']['speed'] * 3.6, 1);
        $forecast[] = [
            'date'        => $date,
            'temp_min'    => round($item['main']['temp_min']),
            'temp_max'    => round($item['main']['temp_max']),
            'temp'        => round($item['main']['temp']),
            'humidity'    => $item['main']['humidity'],
            'wind_speed'  => $wind_speed,
            'description' => ucfirst($item['weather'][0]['description']),
            'icon'        => $item['weather'][0]['icon'],
            'condition'   => $item['weather'][0]['main'],
            'pop'         => round(($item['pop'] ?? 0) * 100),
        ];
    }

    json_out([
        'forecast' => $forecast,
        'city'     => $d['city']['name'],
        'country'  => $d['city']['country'],
        'units'    => $units,
    ]);
}

// ── City autocomplete search (Geo API) ────────────────────────
function handle_search(): void {
    $q = trim($_GET['q'] ?? '');
    if (strlen($q) < 2) json_out(['results' => []]);

    $url = OWM_GEO . '/direct?q=' . urlencode($q) . '&limit=5&appid=' . OWM_API_KEY;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => false, // dev only
        CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4, // force IPv4
    ]);
    $raw = curl_exec($ch);
    curl_close($ch);

    if ($raw === false) json_out(['results' => []]);

    $items = json_decode($raw, true) ?? [];
    $results = array_map(fn($i) => [
        'city'    => $i['name'],
        'country' => $i['country'] ?? '',
        'state'   => $i['state']   ?? '',
        'lat'     => $i['lat'],
        'lon'     => $i['lon'],
    ], $items);

    json_out(['results' => $results]);
}
