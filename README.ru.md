# ✨ whoami — Кибер-профиль и интерактивный CLI-терминал

<div align="center">

[![React 19](https://img.shields.io/badge/React-19-black?style=flat-square&logo=react)](https://react.dev/)
[![Vite 8](https://img.shields.io/badge/Vite-8.2-black?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-black?style=flat-square&logo=python)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)](#-лицензия)

**Футуристическая монохромная персональная карточка с эффектом глубокого матового стекла (glassmorphism), интерактивным Web CLI терминалом, живым статусом Discord и Spotify, аналитикой уникальных гостей, монитором сервера, стеной сообщений на SQLite и полноценной двуязычной локализацией (RU / EN).**

[🇬🇧 Read in English](README.md) • [Возможности](#-основные-возможности) • [Локализация RU / EN](#-двуязычная-локализация-ru--en) • [Быстрый старт](#-быстрый-старт) • [Инструкция по интеграциям](#-руководство-по-интеграциям) • [Переменные .env](#-справочник-переменных-окружения-env) • [Команды терминала](#-команды-веб-терминала) • [Деплой](#-развертывание-на-сервере-продакшн) • [Лицензия](#-лицензия)

</div>

---

## 📸 Обзор проекта

`whoami` — это ультрасовременная персональная карточка-визитка, вдохновленная эстетикой киберпанка и глубоким монохромным глассморфизмом. Проект работает с живыми внешними API (Discord Lanyard, Spotify Web API, Open-Meteo, GitHub API) и автономным легковесным Python-бэкендом без сторонних pip-зависимостей.

### 🌟 Основные возможности:

- 🌐 **Полноценная двуязычная локализация (RU / EN)**:
  - Выбор основного языка в `backend/.env` через `PROFILE_LANG=ru` или `PROFILE_LANG=en`.
  - Моментальный предпросмотр любой версии в браузере через URL-параметр `?lang=en` или `?lang=ru`.
  - Перевод всех вкладок, статусов активности («был только что» / «seen just now»), монитора сервера, стены сообщений, подсказок погоды и CLI-терминала.
- 🎮 **Интеграция Discord в реальном времени (Lanyard Gateway)**:
  - Живой статус (Online / Idle / DND / Offline), отображение запущенных игр и активности.
- 🎵 **Spotify Live-плеер с интеллектуальным кэшированием**:
  - Отображение текущего трека, обложки альбома, прогресс-бара и 5-полосного анимированного эквалайзера.
  - Автоматическое переключение на «Слушал ранее» при паузе с исчезновением через 60 секунд.
- 📟 **Интерактивный Web CLI Терминал (`~ whoami-cli`)**:
  - `neofetch` / `fastfetch`: Живая анимация видео-аватара кота, отрисовываемая покадрово шрифтом Брайля (Braille ASCII) рядом со спецификациями сервера.
  - Команды: `whoami`, `profile`, `uptime`, `top` (живые индикаторы CPU/RAM), `visits`, `visitors`, `guestbook`, `matrix` (эффект падающих символов Матрицы) и `snake` (полноценная игра «Змейка» прямо в консоли).
- 💬 **Гостевая книга и Стена сообщений**:
  - Публикация заметок со строгим анти-спамом и фильтрацией ссылок.
  - Интерактивные эмодзи-реакции (`🔥`, `⚡`, `💀`, `❤️`) с сохранением выбора.
- 📊 **Аналитика посещений и живой пульс**:
  - Счетчик уникальных посетителей и журнал визитов с защитой приватности (HMAC-SHA-256 хеширование IP, маскировка вида `192.168.***.***`).
  - Счетчик гостей онлайн в реальном времени (окно активности 2.5с с правильными склонениями).
- 🖥️ **Всплывающий монитор сервера (Hardware Popover)**:
  - Компактный однострочный аптайм (`35d 14h 29m`), реальная загрузка CPU, использование RAM, версия ОС и сетевой пинг (RTT).
- 🐙 **Динамические проекты с GitHub**:
  - Автоматический сбор репозиториев с анализом до 4 языков программирования на проект и плавным скроллом.
  - **Защита приватности**: закрытые репозитории получают значок `🔒 Закрытый проект`, а их ссылки зануляются (`link: null`).
- 🔥 **Атмосферный фон с частицами огня**:
  - Живой монохромный canvas с физикой парящих искр и реакцией на движение мыши.
- 🌓 **Переключатель тем оформления**:
  - Мгновенное переключение темной и светлой темы со стеклянными текстурами и сохранением в `localStorage`.

---

## 🌐 Двуязычная локализация (RU / EN)

Профиль поддерживает две языковые версии: русскую (`ru`) и английскую (`en`).

### 1. Переключение языка по умолчанию
В файле `backend/.env` на сервере:
```env
# Язык по умолчанию: ru или en
PROFILE_LANG=ru
```

### 2. Моментальное переключение через URL
Вы можете открыть любую версию в любой момент, добавив параметр в адресную строку:
* 🇬🇧 **Английская версия**: `https://your-domain.com/?lang=en`
* 🇷🇺 **Русская версия**: `https://your-domain.com/?lang=ru`

---

## 📂 Структура репозитория

```text
ProfileCard/
├── backend/                      # Легковесный демон Python API
│   ├── server.py                 # Единый сервер: Spotify, Discord, Гостевая, GitHub, Аналитика
│   ├── .env.example              # Шаблон переменных окружения бэкенда
│   ├── projects.example.json     # Шаблон оффлайн-проектов
│   ├── requirements.txt          # Только стандартная библиотека Python (без pip)
│   ├── whoami-backend.service.example  # Шаблон systemd юнита
│   └── Caddyfile.example         # Конфигурация Caddy Reverse Proxy
├── public/                       # Статические ресурсы
│   ├── avatar.jpg                # Фотография профиля
│   ├── video_bg.mp4              # Циклическое видео для аватара
│   └── favicon.svg               # Фавиконка сайта
├── src/
│   ├── components/               # React-компоненты
│   │   ├── ProfileHeader.jsx     # Шапка профиля, онлайн-статус, бейджи музыки и игр, кнопки действий
│   │   ├── NavigationTabs.jsx    # Навигационные вкладки (Контакты / Проекты / Стена)
│   │   ├── SocialLinks.jsx       # Интерактивные карточки соцсетей с копированием
│   │   ├── ProjectsSection.jsx   # Список проектов GitHub с тегами технологий
│   │   ├── GuestbookTab.jsx      # Стена сообщений и реакции
│   │   ├── TerminalModal.jsx     # Web CLI терминал и мини-игры
│   │   ├── ServerStatusBadge.jsx # Монитор сервера (CPU / RAM / Uptime / Ping)
│   │   ├── LiveVisitorsBadge.jsx # Счетчик онлайн-посетителей в реальном времени
│   │   ├── ThemeToggle.jsx       # Переключатель темной и светлой темы
│   │   ├── FireBackground.jsx    # Живой фон с частицами огня
│   │   └── Toast.jsx             # Всплывающие уведомления
│   ├── config/
│   │   └── appConfig.js          # Централизованный конфигуратор клиентской части
│   ├── data/
│   │   ├── profileData.js        # Нейтральная схема запуска (без персональных данных)
│   │   └── avatarFrames.json     # Предрассчитанные кадры видео-аватара для neofetch
│   ├── hooks/
│   │   ├── usePresence.js        # Агрегатор статусов Discord и Spotify
│   │   ├── useProfileConfig.js   # Динамическая загрузка профиля и проектов
│   │   ├── useServerStatus.js    # Получение реальных метрик сервера
│   │   ├── useLiveVisitors.js    # Подсчет посетителей онлайн
│   │   └── useWeather.js         # Получение погоды с Open-Meteo
│   ├── i18n/
│   │   └── translations.js       # Словари переводов RU / EN и хук useI18n
│   └── styles/
│       ├── index.css             # Базовые стили и шрифты
│       ├── global.css            # CSS-переменные темы и анимации
│       └── card.css              # Стили кибер-глассморфизма
├── .gitignore                    # Правила исключения секретов и сборок
├── .env.example                  # Шаблон переменных фронтенда
├── index.html                    # Главный HTML с мета-тегами SEO
├── package.json
└── vite.config.js
```

---

## 🚀 Быстрый старт

### 1. Требования
- **Node.js 18+** и **npm**
- **Python 3.10+** (только стандартные модули)

---

### 2. Запуск фронтенда

1. **Клонируйте репозиторий**:
   ```bash
   git clone https://github.com/LaNadKo/ProfileCard.git
   cd ProfileCard
   ```

2. **Установите зависимости**:
   ```bash
   npm install
   ```

3. **Создайте локальный конфиг фронтенда**:
   ```bash
   cp .env.example .env
   ```

4. **Запустите локальный сервер разработки**:
   ```bash
   npm run dev
   ```
   Откройте в браузере: `http://localhost:5173`.

---

### 3. Запуск бэкенда

1. **Перейдите в папку бэкенда**:
   ```bash
   cd backend
   ```

2. **Создайте файл конфигурации `.env`**:
   ```bash
   cp .env.example .env
   ```

3. **Заполните параметры в `backend/.env`** (см. [Руководство по интеграциям](#-руководство-по-интеграциям)).

4. **Запустите сервер**:
   ```bash
   python3 server.py
   ```
   Бэкенд запустится на порту `8095` (по умолчанию `http://127.0.0.1:8095`).

---

## 🔌 Руководство по интеграциям

### 🎵 1. Подключение Spotify (Live плеер)

Для того чтобы сайт отображал играющий в данный момент трек Spotify в реальном времени:

1. Откройте **[Spotify Developer Dashboard](https://developer.spotify.com/dashboard)** и войдите под своим аккаунтом.
2. Нажмите **Create App**:
   * **App name**: `ProfileCard Presence`
   * **App description**: `Live player for personal site`
   * **Redirect URI**: укажите `https://developer.spotify.com/` (или `http://localhost:8888/callback`)
   * В поле **Which API/SDKs are you planning to use?** выберите **Web API**.
   * Сохраните приложение.
3. В настройках (**Settings**) приложения скопируйте:
   * **Client ID**
   * **Client Secret**
4. **Получите Refresh Token**:
   * Вставьте в браузер следующую ссылку, подставив свой `CLIENT_ID`:
     ```text
     https://accounts.spotify.com/authorize?client_id=ВАШ_CLIENT_ID&response_type=code&redirect_uri=https://developer.spotify.com/&scope=user-read-currently-playing%20user-read-playback-state%20user-read-recently-played
     ```
   * Нажмите **Agree** (Разрешить).
   * Вас перенаправит на страницу с адресом вида `https://developer.spotify.com/?code=AQD...`. Скопируйте значение параметра `code`.
   * Выполните в терминале команду обмена кода на Refresh Token (замените `CLIENT_ID`, `CLIENT_SECRET` и `CODE`):
     ```bash
     curl -X POST https://accounts.spotify.com/api/token \
       -H "Content-Type: application/x-www-form-urlencoded" \
       -u "CLIENT_ID:CLIENT_SECRET" \
       -d "grant_type=authorization_code&code=CODE&redirect_uri=https://developer.spotify.com/"
     ```
   * В ответе JSON скопируйте `"refresh_token": "AQC..."`.
5. Вставьте полученные данные в `backend/.env`:
   ```env
   SPOTIFY_CLIENT_ID=01f768...
   SPOTIFY_CLIENT_SECRET=c4b815...
   SPOTIFY_REFRESH_TOKEN=AQCemy...
   ```

---

### 🎮 2. Подключение Discord Lanyard (Статус и Игры)

1. **Включите режим разработчика в Discord**:
   - Настройки Discord -> **Расширенные** -> Включите **Режим разработчика**.
2. **Скопируйте свой ID пользователя**:
   - Нажмите правой кнопкой мыши по своему профилю в Discord -> нажмите **Копировать ID пользователя** (например, `903955354663145472`).
3. **Обязательно вступите на сервер Lanyard**:
   - Перейдите по ссылке: 👉 **[discord.gg/lanyard](https://discord.gg/lanyard)**
   - *(Это необходимо, чтобы бот Lanyard мог отслеживать ваш статус через WebSocket).*
4. Укажите ID в `backend/.env`:
   ```env
   DISCORD_USER_ID=903955354663145472
   DISCORD_HANDLE=ваш_логин_в_дискорде
   DISCORD_URL=https://discord.com/users/903955354663145472
   ```

---

### 🐙 3. Подключение GitHub API (Проекты и Языки)

Для автоматического сбора списка репозиториев и их технологий:

1. Откройте **[GitHub Tokens (Classic)](https://github.com/settings/tokens/new)**.
2. Заполните форму:
   * **Note**: `ProfileCard API`
   * **Expiration**: `No expiration` (или нужный срок)
   * **Select scopes**: Отметьте галочкой пункт **`repo`** *(Full control of private repositories)*
3. Нажмите **Generate token** и скопируйте токен `ghp_...`.
4. Вставьте токен в `backend/.env`:
   ```env
   GITHUB_USERNAME=ВашGitHubЛогин
   GITHUB_TOKEN=ghp_ваш_токен
   ```
> [!NOTE]
> **Гарантия конфиденциальности**: для всех репозиториев с флагом `private: true` на GitHub бэкенд автоматически удаляет ссылки (`link: null`) и помечает их бейджем `🔒 Закрытый проект`.

---

### 🌤️ 4. Настройка погоды (Open-Meteo API)

Погода работает бесплатно и без ключей через Open-Meteo:

```env
WEATHER_API_URL=https://api.open-meteo.com/v1/forecast
WEATHER_LATITUDE=54.9158
WEATHER_LONGITUDE=37.4167
WEATHER_TIMEZONE=Europe/Moscow
WEATHER_LOCATION_LABEL=Серпухов
WEATHER_LOCATION_LABEL_EN=Serpukhov
```

---

## ⚙️ Справочник переменных окружения (.env)

### 🌐 Фронтенд (`.env`)

| Переменная | Описание | Значение по умолчанию |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Базовый префикс API | `/api` |
| `VITE_LANYARD_REST_BASE_URL` | REST эндпоинт Lanyard | `https://api.lanyard.rest/v1/users` |
| `VITE_LANYARD_SOCKET_URL` | WebSocket шлюз Lanyard | `wss://api.lanyard.rest/socket` |
| `VITE_SITE_TITLE` | Заголовок вкладки браузера | `Profile` |
| `VITE_SITE_DESCRIPTION` | Описание для соцсетей и поисковиков | `Digital profile and projects` |
| `VITE_SITE_URL` | Канонический URL сайта | `https://whoami.mechtatel.xyz` |
| `VITE_LOCALE` | Локаль по умолчанию | `ru-RU` |
| `VITE_STORAGE_PREFIX` | Префикс ключей в `localStorage` | `profile_card_v2` |

---

### 🖥️ Бэкенд (`backend/.env`)

| Переменная | Назначение | Пример |
| :--- | :--- | :--- |
| `PROFILE_LANG` | Язык по умолчанию (`ru` или `en`) | `ru` |
| `OWNER_NAME` | Отображаемое имя владельца | `LaNadKo` |
| `OWNER_ALIAS` | Вторичный псевдоним / ник | `Me4TaTeJlb` |
| `OWNER_HANDLE` | Основной юзернейм | `@lanadko` |
| `OWNER_ROLE` | Роль / Статус (RU) | `whoami` |
| `OWNER_ROLE_EN` | Роль / Статус (EN) | `whoami` |
| `OWNER_BIO` | Описание профиля (RU) | `Zavod Zavodik` |
| `OWNER_BIO_EN` | Описание профиля (EN) | `Zavod Zavodik` |
| `OWNER_LOCATION` | Город / Локация (RU) | `Серпухов` |
| `OWNER_LOCATION_EN` | Город / Локация (EN) | `Serpukhov` |
| `WEATHER_LOCATION_LABEL` | Название города для погоды (RU) | `Серпухов` |
| `WEATHER_LOCATION_LABEL_EN` | Название города для погоды (EN) | `Serpukhov` |
| `OWNER_CANONICAL_URL` | Полный публичный URL | `https://whoami.mechtatel.xyz` |
| `TELEGRAM_URL` | Ссылка на Telegram | `https://t.me/your_channel` |
| `TELEGRAM_HANDLE` | Хэндл Telegram | `@your_handle` |
| `DISCORD_USER_ID` | Snowflake ID пользователя Discord | `903955354663145472` |
| `GITHUB_USERNAME` | Имя пользователя на GitHub | `LaNadKo` |
| `GITHUB_TOKEN` | Токен GitHub (`ghp_...`) | `ghp_...` |
| `GITHUB_HIDE_PRIVATE` | Скрывать приватные репозитории (`true`/`false`) | `false` |
| `SPOTIFY_CLIENT_ID` | Client ID приложения Spotify | `01f768...` |
| `SPOTIFY_CLIENT_SECRET`| Client Secret приложения Spotify | `c4b815...` |
| `SPOTIFY_REFRESH_TOKEN`| Refresh Token для Spotify API | `AQCemy...` |
| `EXCLUDED_IPS` | Черный список IP (не учитываются в счетчике) | `1.2.3.4,5.6.7.8` |
| `BIND_HOST` | Сетевой интерфейс прослушивания | `0.0.0.0` |
| `PORT` | Порт HTTP-сервера | `8095` |
| `DB_PATH` | Путь к файлу базы данных SQLite | `data.db` |

---

## 📟 Команды веб-терминала

При нажатии на иконку `>_` в шапке или клавиш `Ctrl+K` / `~` открывается полнофункциональная интерактивная консоль:

| Команда | Описание |
| :--- | :--- |
| `help` | Список всех доступных команд и подсказок |
| `neofetch` / `fastfetch` | Видео-аватар символами Брайля и системные характеристики сервера |
| `whoami` | Идентификация вашего сеанса, IP-адреса, браузера и счетчика визитов |
| `profile` | Полная карточка владельца профиля |
| `projects` | Список проектов и используемых технологий |
| `contacts` | Список всех способов связи |
| `top` / `htop` | Индикаторы загрузки CPU, оперативной памяти и сетевого пинга в реальном времени |
| `uptime` | Время непрерывной работы сервера с момента последней перезагрузки |
| `visits` | Статистика уникальных просмотров и журнал последних посетителей |
| `visitors` | Текущее количество гостей онлайн в реальном времени |
| `weather` | Текущая температура и погодные условия |
| `snake` | Аркадная игра «Змейка» с управлением стрелками клавиатуры |
| `matrix` | Анимированный полноэкранный монохромный дождь символов Матрицы |
| `guestbook` | Чтение последних сообщений со стены |
| `msg <текст>` | Отправка сообщения на стену прямо из консоли |
| `clear` / `cls` | Очистка экрана консоли |
| `exit` | Закрыть терминал |

---

## 🌐 Развертывание на сервере (Продакшн)

### 1. Сборка статики фронтенда
```bash
npm run build
```
Скомпилированные файлы появятся в директории `dist/`. Скопируйте их в веб-директорию сервера (например, `/srv/apps/whoami-web`).

---

### 2. Настройка службы Systemd (`/etc/systemd/system/spotify-presence.service`)

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

Активация и запуск:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now spotify-presence.service
```

---

### 3. Конфигурация Caddy Reverse Proxy (`/etc/caddy/Caddyfile`)

```caddy
whoami.mechtatel.xyz {
    encode zstd gzip

    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "same-origin"
        -Server
    }

    # Проксирование всех API запросов к бэкенду
    handle /api/* {
        reverse_proxy 127.0.0.1:8095
    }

    # Отдача скомпилированного SPA фронтенда
    handle {
        root * /srv/apps/whoami-web
        try_files {path} /index.html
        file_server
    }
}
```

---

## 📜 Лицензия

Проект распространяется под открытой лицензией [MIT License](LICENSE).

Copyright (c) 2026 LaNadKo.
