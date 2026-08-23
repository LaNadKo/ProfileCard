const env = import.meta.env;

const positiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const withoutTrailingSlash = (value) => value.replace(/\/+$/, '');

const apiBaseUrl = withoutTrailingSlash(env.VITE_API_BASE_URL?.trim() || '/api');
const lanyardRestBaseUrl = withoutTrailingSlash(
  env.VITE_LANYARD_REST_BASE_URL?.trim() || 'https://api.lanyard.rest/v1/users'
);

export const appConfig = {
  apiBaseUrl,
  lanyardRestBaseUrl,
  lanyardSocketUrl: env.VITE_LANYARD_SOCKET_URL?.trim() || 'wss://api.lanyard.rest/socket',
  mapsSearchBaseUrl: env.VITE_MAPS_SEARCH_BASE_URL?.trim() || 'https://maps.google.com/?q=',
  locale: env.VITE_LOCALE?.trim() || 'ru-RU',
  storagePrefix: env.VITE_STORAGE_PREFIX?.trim() || 'profile_card_v2',
  terminal: {
    productName: env.VITE_TERMINAL_PRODUCT_NAME?.trim() || 'whoami',
    version: env.VITE_TERMINAL_VERSION?.trim() || '',
    hostName: env.VITE_TERMINAL_HOST_NAME?.trim() || 'profile',
  },
  polling: {
    profileMs: positiveInt(env.VITE_PROFILE_REFRESH_MS, 300_000),
    serverStatusMs: positiveInt(env.VITE_SERVER_STATUS_REFRESH_MS, 15_000),
    spotifyMs: positiveInt(env.VITE_SPOTIFY_REFRESH_MS, 2_500),
    lastSeenMs: positiveInt(env.VITE_LAST_SEEN_REFRESH_MS, 30_000),
    weatherMs: positiveInt(env.VITE_WEATHER_REFRESH_MS, 600_000),
    liveVisitorsMs: positiveInt(env.VITE_LIVE_VISITORS_REFRESH_MS, 2_500),
    guestbookMs: positiveInt(env.VITE_GUESTBOOK_REFRESH_MS, 6_000),
  },
};

export const storageKey = (name) => `${appConfig.storagePrefix}_${name}`;

export function apiUrl(path, params = {}) {
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return `${apiBaseUrl}/${normalizedPath}${queryString ? `?${queryString}` : ''}`;
}

export const lanyardUserUrl = (discordUserId) =>
  `${appConfig.lanyardRestBaseUrl}/${encodeURIComponent(discordUserId)}`;
