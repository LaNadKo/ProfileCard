# ✨ whoami — Cyber-Glassmorphism Profile & CLI Terminal Dashboard

<div align="center">

[![React 19](https://img.shields.io/badge/React-19-black?style=flat-square&logo=react)](https://react.dev/)
[![Vite 8](https://img.shields.io/badge/Vite-8.2-black?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-black?style=flat-square&logo=python)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)](#-license)

**A futuristic, monochrome glassmorphic personal cyber-card with an interactive Web CLI terminal, real-time Discord & Spotify presence, unique visitor analytics, hardware server monitor, SQLite guestbook, and full bilingual localization (RU / EN).**

[🇷🇺 Читать на русском](README.ru.md) • [Features](#-key-features) • [Bilingual Localization](#-bilingual-localization-ru--en) • [Quick Start](#-quick-start) • [Integrations Guide](#-integrations-guide) • [Environment Variables](#-environment-variables-reference) • [Terminal Commands](#-terminal-cli-commands) • [Deployment](#-production-deployment) • [License](#-license)

</div>

---

## 📸 Overview

`whoami` is an ultra-modern personal profile card with a deep monochrome glassmorphism aesthetic. It integrates live external APIs (Discord Lanyard, Spotify Web API, Open-Meteo Weather, GitHub API) and a standalone Python/SQLite backend with zero heavy external runtime dependencies.

### 🌟 Key Features:

- 🌐 **Full Bilingual Localization (RU / EN)**:
  - Configure default language via `PROFILE_LANG=ru` or `PROFILE_LANG=en` in `backend/.env`.
  - Instant live preview in browser via URL query parameter `?lang=en` or `?lang=ru`.
  - Full translation across tabs, presence badges ("seen just now" / "был только что"), hardware monitor, guestbook, weather conditions, and Web CLI terminal.
- 🎮 **Real-time Discord Presence (Lanyard Gateway)**:
  - Live online/idle/dnd/offline status, playing games, and custom activities.
- 🎵 **Spotify Live Player + Cache**:
  - Live track progress bar with 5-bar animated equalizer.
  - Automatic fallback to the last-played track (with a 1-minute TTL expiry).
- 📟 **Interactive Web CLI Terminal (`~ whoami-cli`)**:
  - `neofetch` / `fastfetch`: Live animated video cat avatar rendered frame-by-frame via Braille/ASCII matrix alongside real hardware system specifications.
  - Commands: `whoami`, `profile`, `uptime`, `top` (live CPU/RAM bars), `visits`, `visitors`, `guestbook`, `matrix` (Matrix Rain), and `snake` (playable arcade game in console).
- 💬 **Interactive Guestbook & Wall**:
  - Leave public notes with rate limiting & anti-spam validation.
  - Emoji reactions (`🔥`, `⚡`, `💀`, `❤️`) with toggleable user state.
- 📊 **Visitor Analytics & Live Heartbeat**:
  - Unique visitor counter & history with IP anonymization (HMAC-SHA-256 identifiers & masked IPs `192.168.***.***`).
  - Concurrent active online visitors tracker (real-time heartbeat with adaptive pluralization).
- 🖥️ **Live Server Hardware Popover**:
  - Compact single-line uptime (`35d 14h 29m`), real-time CPU load, RAM usage, system uptime, OS version, and network ping (RTT).
- 🐙 **Dynamic GitHub Projects**:
  - Automatically fetches public & private repositories with up to 4 programming languages per repo and smooth custom scrollbar.
  - **Private Repo Protection**: Private repositories are displayed with a `🔒 Private project` badge and their URLs are strictly omitted (`link: null`).
- 🔥 **Atmospheric Fire Particle Background**:
  - Living monochrome interactive canvas with particle physics and cursor tracking.
- 🌓 **Themes Switcher**: Dynamic Light/Dark glassmorphism theme switch with `localStorage` persistence.

---

## 🌐 Bilingual Localization (RU / EN)

The profile card supports full bilingual display: Russian (`ru`) and English (`en`).

### 1. Configure Default Language
In `backend/.env`:
```env
# Default language: ru or en
PROFILE_LANG=ru
```

### 2. Instant URL Preview
Add `?lang=` to the URL in your browser:
* 🇬🇧 **English version**: `https://your-domain.com/?lang=en`
* 🇷🇺 **Russian version**: `https://your-domain.com/?lang=ru`

---

## 📂 Project Structure

```text
ProfileCard/
├── backend/                      # Python lightweight backend daemon
│   ├── server.py                 # Unified API: Spotify, Presence, Guestbook, Analytics, GitHub
│   ├── .env.example              # Backend environment variables template
│   ├── projects.example.json     # Fallback/offline projects template
│   ├── requirements.txt          # Standard library only (no pip dependencies required)
│   ├── whoami-backend.service.example  # systemd service unit template
│   └── Caddyfile.example         # Reverse proxy & static server configuration
├── public/                       # Static public assets
│   ├── avatar.jpg                # Profile photo
│   ├── video_bg.mp4              # Animated avatar video
│   └── favicon.svg               # Web favicon
├── src/
│   ├── components/               # React UI components
│   │   ├── ProfileHeader.jsx     # Avatar, online badge, live music & game pills, action buttons
│   │   ├── NavigationTabs.jsx    # Tab bar: Contacts, Projects, Guestbook Wall
│   │   ├── SocialLinks.jsx       # Interactive social cards with copyable handles
│   │   ├── ProjectsSection.jsx   # GitHub projects list with multi-language badges
│   │   ├── GuestbookTab.jsx      # Guestbook wall & emoji reactions
│   │   ├── TerminalModal.jsx     # Full Web CLI terminal modal & mini-games
│   │   ├── ServerStatusBadge.jsx # Live server hardware popover (CPU/RAM/Uptime/Ping)
│   │   ├── LiveVisitorsBadge.jsx # Real-time online visitors counter
│   │   ├── ThemeToggle.jsx       # Light / Dark glassmorphism switch
│   │   ├── FireBackground.jsx    # Atmospheric interactive canvas particle background
│   │   └── Toast.jsx             # Notification toast popups
│   ├── config/
│   │   └── appConfig.js          # Centralized public runtime settings
│   ├── data/
│   │   ├── profileData.js        # Neutral startup schema (no personal data)
│   │   └── avatarFrames.json     # Pre-rendered video Braille matrix frames
│   ├── hooks/
│   │   ├── usePresence.js        # Multi-gateway presence aggregator
│   │   ├── useProfileConfig.js   # Dynamic profile & GitHub projects hook
│   │   ├── useServerStatus.js    # Live hardware metrics hook
│   │   ├── useLiveVisitors.js    # Real-time online heartbeat hook
│   │   └── useWeather.js         # Live Open-Meteo weather hook
│   ├── i18n/
│   │   └── translations.js       # RU / EN translation dictionaries & useI18n hook
│   └── styles/
│       ├── index.css             # Base reset & typography
│       ├── global.css            # CSS custom properties & animations
│       └── card.css              # Cyber-glassmorphism monochrome styles
├── .gitignore                    # Secrets & build ignore rules
├── .env.example                  # Frontend configuration template
├── index.html                    # Root HTML with SEO meta tags
├── package.json
└── vite.config.js
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js 18+** & **npm**
- **Python 3.10+** (standard library only)

---

### 2. Frontend Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/LaNadKo/ProfileCard.git
   cd ProfileCard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create the frontend configuration**:
   ```bash
   cp .env.example .env
   ```

4. **Start local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

### 3. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create the backend configuration file**:
   ```bash
   cp .env.example .env
   ```

3. **Fill in `.env` variables** (see [Integrations Guide](#-integrations-guide) below).

4. **Run the backend**:
   ```bash
   python3 server.py
   ```
   The backend starts on port `8095` (default `http://127.0.0.1:8095`).

---

## 🔌 Integrations Guide

### 🎵 1. Spotify Live Player

1. Open the **[Spotify Developer Dashboard](https://developer.spotify.com/dashboard)** and log in.
2. Click **Create App**:
   * **App name**: `ProfileCard Presence`
   * **App description**: `Live player for personal site`
   * **Redirect URI**: `https://developer.spotify.com/` (or `http://localhost:8888/callback`)
   * In **Which API/SDKs are you planning to use?**, select **Web API**.
   * Save the app.
3. In app **Settings**, copy:
   * **Client ID**
   * **Client Secret**
4. **Obtain Refresh Token**:
   * Open this URL in browser (replace `YOUR_CLIENT_ID`):
     ```text
     https://accounts.spotify.com/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https://developer.spotify.com/&scope=user-read-currently-playing%20user-read-playback-state%20user-read-recently-played
     ```
   * Click **Agree**.
   * Copy the `code` value from the redirected URL `https://developer.spotify.com/?code=AQD...`.
   * Exchange code for a Refresh Token in terminal (replace `CLIENT_ID`, `CLIENT_SECRET`, and `CODE`):
     ```bash
     curl -X POST https://accounts.spotify.com/api/token \
       -H "Content-Type: application/x-www-form-urlencoded" \
       -u "CLIENT_ID:CLIENT_SECRET" \
       -d "grant_type=authorization_code&code=CODE&redirect_uri=https://developer.spotify.com/"
     ```
   * Copy `"refresh_token": "AQC..."` from the JSON response.
5. Paste into `backend/.env`:
   ```env
   SPOTIFY_CLIENT_ID=01f768...
   SPOTIFY_CLIENT_SECRET=c4b815...
   SPOTIFY_REFRESH_TOKEN=AQCemy...
   ```

---

### 🎮 2. Discord Lanyard (Status & Activity)

1. **Enable Developer Mode in Discord**: Settings -> **Advanced** -> Turn on **Developer Mode**.
2. **Copy your User ID**: Right-click your profile -> **Copy User ID** (e.g. `903955354663145472`).
3. **Join the Lanyard Discord server**:
   - Join: 👉 **[discord.gg/lanyard](https://discord.gg/lanyard)**
   - *(Required for Lanyard's bot to stream your status via WebSocket).*
4. Specify in `backend/.env`:
   ```env
   DISCORD_USER_ID=903955354663145472
   DISCORD_HANDLE=your_discord_tag
   DISCORD_URL=https://discord.com/users/903955354663145472
   ```

---

### 🐙 3. GitHub API (Projects & Languages)

1. Open **[GitHub Tokens (Classic)](https://github.com/settings/tokens/new)**.
2. Configure:
   * **Note**: `ProfileCard API`
   * **Expiration**: `No expiration`
   * **Select scopes**: Check **`repo`** *(Full control of private repositories)*
3. Click **Generate token** and copy `ghp_...`.
4. Add to `backend/.env`:
   ```env
   GITHUB_USERNAME=YourGitHubUsername
   GITHUB_TOKEN=ghp_your_token
   ```
> [!NOTE]
> **Privacy Guarantee**: Any repo flagged `private: true` on GitHub will automatically have its link omitted (`link: null`) and will be tagged with a `🔒 Private project` badge.

---

### 🌤️ 4. Weather (Open-Meteo API)

Weather runs with zero API keys via Open-Meteo:

```env
WEATHER_API_URL=https://api.open-meteo.com/v1/forecast
WEATHER_LATITUDE=54.9158
WEATHER_LONGITUDE=37.4167
WEATHER_TIMEZONE=Europe/Moscow
WEATHER_LOCATION_LABEL=Серпухов
WEATHER_LOCATION_LABEL_EN=Serpukhov
```

---

## ⚙️ Environment Variables Reference

### 🌐 Frontend (`.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base API prefix | `/api` |
| `VITE_LANYARD_REST_BASE_URL` | Lanyard REST endpoint | `https://api.lanyard.rest/v1/users` |
| `VITE_LANYARD_SOCKET_URL` | Lanyard WebSocket gateway | `wss://api.lanyard.rest/socket` |
| `VITE_SITE_TITLE` | Browser tab title | `Profile` |
| `VITE_SITE_DESCRIPTION` | OpenGraph & SEO description | `Digital profile and projects` |
| `VITE_SITE_URL` | Canonical website URL | `https://whoami.mechtatel.xyz` |
| `VITE_LOCALE` | Default locale | `ru-RU` |
| `VITE_STORAGE_PREFIX` | `localStorage` prefix | `profile_card_v2` |

---

### 🖥️ Backend (`backend/.env`)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PROFILE_LANG` | Default language (`ru` or `en`) | `ru` |
| `OWNER_NAME` | Display name | `LaNadKo` |
| `OWNER_ALIAS` | Secondary alias / handle | `Me4TaTeJlb` |
| `OWNER_HANDLE` | Main username | `@lanadko` |
| `OWNER_ROLE` | Role / Title (RU) | `whoami` |
| `OWNER_ROLE_EN` | Role / Title (EN) | `whoami` |
| `OWNER_BIO` | Bio description (RU) | `Zavod Zavodik` |
| `OWNER_BIO_EN` | Bio description (EN) | `Zavod Zavodik` |
| `OWNER_LOCATION` | Location (RU) | `Серпухов` |
| `OWNER_LOCATION_EN` | Location (EN) | `Serpukhov` |
| `WEATHER_LOCATION_LABEL` | Weather city label (RU) | `Серпухов` |
| `WEATHER_LOCATION_LABEL_EN` | Weather city label (EN) | `Serpukhov` |
| `OWNER_CANONICAL_URL` | Full public canonical URL | `https://whoami.mechtatel.xyz` |
| `TELEGRAM_URL` | Telegram URL | `https://t.me/your_channel` |
| `TELEGRAM_HANDLE` | Telegram handle | `@your_handle` |
| `DISCORD_USER_ID` | Discord Snowflake ID | `903955354663145472` |
| `GITHUB_USERNAME` | GitHub username | `LaNadKo` |
| `GITHUB_TOKEN` | GitHub PAT token (`ghp_...`) | `ghp_...` |
| `GITHUB_HIDE_PRIVATE` | Hide private repositories from the list (`true`/`false`) | `false` |
| `SPOTIFY_CLIENT_ID` | Spotify App Client ID | `01f768...` |
| `SPOTIFY_CLIENT_SECRET`| Spotify App Client Secret | `c4b815...` |
| `SPOTIFY_REFRESH_TOKEN`| Spotify Refresh Token | `AQCemy...` |
| `EXCLUDED_IPS` | Excluded IP list (ignored in visits counter) | `1.2.3.4,5.6.7.8` |
| `BIND_HOST` | Network interface | `0.0.0.0` |
| `PORT` | HTTP port | `8095` |
| `DB_PATH` | SQLite database filepath | `data.db` |

---

## 📟 Terminal CLI Commands

Open by pressing `>_` in the header or using hotkeys `Ctrl+K` / `~`:

| Command | Description |
| :--- | :--- |
| `help` | Lists all available commands and hints |
| `neofetch` / `fastfetch` | Animated Braille cat video avatar and hardware telemetry |
| `whoami` | Current visitor identification (IP, device, visit count) |
| `profile` | Profile owner overview |
| `projects` | List of repositories & programming languages |
| `contacts` | Communication channels & socials |
| `top` / `htop` | Real-time CPU/RAM meters and network ping |
| `uptime` | Host continuous system uptime |
| `visits` | Unique visitor analytics & recent activity |
| `visitors` | Real-time concurrent online visitors |
| `weather` | Current temperature and conditions |
| `snake` | Classic arcade Snake game playable in console |
| `matrix` | Fullscreen monochrome Matrix Rain animation |
| `guestbook` | View recent public notes from the Wall |
| `msg <text>` | Post a note to the Wall from terminal |
| `clear` / `cls` | Clear terminal screen |
| `exit` | Close terminal |

---

## 🌐 Production Deployment

### 1. Build Frontend Bundle
```bash
npm run build
```
Upload the contents of `dist/` to your server web root (e.g. `/srv/apps/whoami-web`).

---

### 2. Setup Systemd Service (`/etc/systemd/system/spotify-presence.service`)

```ini
[Unit]
Description=whoami Unified Backend Daemon
After=network.target

[Service]
Type=simple
User=lanadko
WorkingDirectory=/srv/apps/whoami-backend
ExecStart=/usr/bin/python3 /srv/apps/whoami-backend/server.py
Restart=always
RestartSec=5
EnvironmentFile=/srv/apps/whoami-backend/.env

[Install]
WantedBy=multi-user.target
```

Enable & start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now spotify-presence.service
```

---

### 3. Caddy Reverse Proxy (`/etc/caddy/Caddyfile`)

```caddy
whoami.mechtatel.xyz {
    encode zstd gzip

    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "same-origin"
        -Server
    }

    handle /api/* {
        reverse_proxy 127.0.0.1:8095
    }

    handle {
        root * /srv/apps/whoami-web
        try_files {path} /index.html
        file_server
    }
}
```

---

## 📜 License

Distributed under the [MIT License](LICENSE).

Copyright (c) 2026 LaNadKo.
