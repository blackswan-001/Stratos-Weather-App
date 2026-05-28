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

## Images

<img width="1919" height="875" alt="Screenshot 2026-05-28 224249" src="https://github.com/user-attachments/assets/003a0025-5678-496c-9ec9-f9989c7bc22f" />

<img width="1919" height="884" alt="Screenshot 2026-05-28 224002" src="https://github.com/user-attachments/assets/5dc82b7d-5804-4c15-9631-6eaa327effc8" />

<img width="1919" height="870" alt="Screenshot 2026-05-28 224019" src="https://github.com/user-attachments/assets/322c8d96-5428-4cf8-bdb2-5d778f4a3ad6" />

<img width="1919" height="874" alt="Screenshot 2026-05-28 224034" src="https://github.com/user-attachments/assets/e5d926f0-553c-4d19-b779-826fe07f42e1" />

<img width="1919" height="882" alt="Screenshot 2026-05-28 224051" src="https://github.com/user-attachments/assets/72904b3e-1aad-46ee-af79-4630d37371b9" />

<img width="1919" height="872" alt="Screenshot 2026-05-28 224101" src="https://github.com/user-attachments/assets/e30b3ec8-ed0a-41c2-aa77-424df83e8e83" />

<img width="1919" height="877" alt="Screenshot 2026-05-28 224116" src="https://github.com/user-attachments/assets/6c3959ff-aeb2-4ff4-9c74-41902f02c6b4" />

<img width="1919" height="882" alt="Screenshot 2026-05-28 224140" src="https://github.com/user-attachments/assets/4d5def6a-3497-4663-a5b8-4cc7e133967d" />

<img width="1918" height="867" alt="Screenshot 2026-05-28 224153" src="https://github.com/user-attachments/assets/ddea5753-7bb0-4fdb-8588-643edf6e652a" />

<img width="1919" height="872" alt="Screenshot 2026-05-28 224203" src="https://github.com/user-attachments/assets/b1b33810-3872-4767-ad3b-ac503082661a" />

<img width="1919" height="871" alt="Screenshot 2026-05-28 224212" src="https://github.com/user-attachments/assets/af073059-a7de-4d03-a0c4-3cda03648a7f" />

<img width="1917" height="877" alt="Screenshot 2026-05-28 224227" src="https://github.com/user-attachments/assets/07d4d0f9-cb9e-4e4f-ad95-cbf689b3ca2e" />

<img width="1919" height="876" alt="Screenshot 2026-05-28 224238" src="https://github.com/user-attachments/assets/58a6759a-f5bd-44b9-a3b3-8ef7d3c6ac57" />
