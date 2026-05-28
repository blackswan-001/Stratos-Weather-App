# Stratos — Real-Time Weather Dashboard

A full-stack weather information platform built with PHP, SQLite, Leaflet, and Chart.js, powered by the OpenWeatherMap API.

Designed as a portfolio-grade engineering project demonstrating modular backend design, API integration, and interactive frontend architecture.

---

## Overview

Stratos is a single-page weather application that combines real-time meteorological data, interactive mapping, and user-driven analytics features such as saved locations, alerts, and search history visualization.

It is built with a focus on modular PHP APIs, lightweight database persistence, and a decoupled JavaScript frontend.

---

## Key Features

### Weather Intelligence

* Current weather conditions by city or geolocation
* 5-day / 3-hour forecast visualization
* City autocomplete search using geocoding API

### Interactive Mapping

* Leaflet-based live weather map
* Switchable weather layers (temperature, wind, precipitation, clouds)
* OpenWeatherMap tile integration

### Personalization

* Dark / light theme support
* °C / °F unit switching
* User accounts with session persistence

### User Tools

* Saved locations (favorites dashboard)
* Weather alerts (threshold-based monitoring)
* Search history tracking with analytics support

### Analytics

* Historical search visualization
* Chart.js-powered trend graphs
* Weather interaction insights per user

---

## Architecture

Stratos follows a modular SPA + API architecture:

```
Browser (SPA Frontend)
        ↓
index.php (Router / Entry Point)
        ↓
PHP API Layer (/api)
        ├── Authentication Module
        ├── Weather Data Proxy
        ├── Locations Manager
        ├── Alerts Engine
        └── History Tracker
        ↓
SQLite Database Layer
```

The frontend is fully JavaScript-driven, with PHP serving as a lightweight API backend and router.

---

## Project Structure

```
weather-app/
├── index.php                  # SPA entry + API router
├── config/
│   ├── config.php            # Application configuration
│   └── database.php          # SQLite connection layer
│
├── database/
│   └── schema.sql            # Database schema reference
│
├── api/
│   ├── auth.php              # Authentication endpoints
│   ├── weather.php           # Weather data proxy
│   ├── locations.php         # Saved locations API
│   ├── alerts.php            # Weather alert system
│   └── history.php           # Search history API
│
├── pages/                    # Frontend views (SPA partials)
│   ├── dashboard.php
│   ├── map.php
│   ├── alerts.php
│   ├── history.php
│   └── settings.php
│
├── assets/
│   ├── css/
│   │   ├── themes.css
│   │   ├── main.css
│   │   └── components.css
│   └── js/
│       ├── app.js
│       ├── ui.js
│       ├── weather.js
│       ├── map.js
│       ├── charts.js
│       ├── alerts.js
│       └── auth.js
```

---

## Configuration

The system uses a centralized configuration file for environment-level constants.

Key responsibilities:

* API integration configuration (OpenWeatherMap)
* Session management parameters
* Application-wide constants

> Sensitive credentials and secrets are excluded from version control.

---

## API Design

Stratos exposes a modular REST-style API under `/api/*`.

Core modules:

* **Authentication**: session-based login system
* **Weather Service**: proxy layer for external weather APIs
* **Locations Service**: user-managed saved places
* **Alerts Engine**: threshold-based weather monitoring
* **History Service**: user activity tracking

All responses are JSON-based and optimized for frontend consumption.

---

## Security Design (High-Level)

Stratos implements layered security principles:

* Session-based authentication
* Input validation and sanitization
* Rate limiting (request throttling per session/IP)
* Controlled API exposure via proxy layer
* Secure configuration separation from application logic

---

## Deployment

### Local Development

```bash
php -S localhost:8000
```

Then open:

```
http://localhost:8000
```

### Apache Deployment (Optional)

Ensure `mod_rewrite` is enabled:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.php [QSA,L]
```

---

## Data Storage

* SQLite is used for lightweight persistence
* Database auto-initializes on first run
* Stores:

  * user accounts
  * saved locations
  * alerts
  * search history

---

## External Integrations

* OpenWeatherMap API (weather + geocoding)
* Leaflet.js (interactive mapping)
* Chart.js (analytics visualisation)

---

## Design Philosophy

Stratos is designed around three principles:

1. **Modularity** — each feature is isolated into its own API module
2. **Simplicity** — minimal backend overhead with PHP + SQLite
3. **Extensibility** — new features can be added without restructuring core logic

---

## Status

Active development completed as a portfolio-grade full-stack demonstration project.

---

## License

This project is intended for educational and portfolio use.
