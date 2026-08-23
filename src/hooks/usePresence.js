import { useState, useEffect, useCallback } from 'react';
import { apiUrl, appConfig, lanyardUserUrl } from '../config/appConfig';
import { useSmartPolling } from './useSmartPolling';

export const formatTelegramLastSeen = (lastSeenSec, lang = 'ru') => {
  const isEn = lang === 'en';
  if (!lastSeenSec) return isEn ? 'offline' : 'не в сети';

  const nowSec = Math.floor(Date.now() / 1000);
  const diffSec = Math.max(0, nowSec - lastSeenSec);

  // < 1 min
  if (diffSec < 60) {
    return isEn ? 'seen just now' : 'был только что';
  }

  // < 60 min
  const minutes = Math.floor(diffSec / 60);
  if (minutes < 60) {
    if (isEn) return `seen ${minutes}m ago`;
    const minStr = getPluralMinutes(minutes);
    return `был ${minutes} ${minStr} назад`;
  }

  // < 3 hours
  const hours = Math.floor(diffSec / 3600);
  if (hours < 3) {
    if (isEn) return `seen ${hours}h ago`;
    const hourStr = getPluralHours(hours);
    return `был ${hours} ${hourStr} назад`;
  }

  const lastSeenDate = new Date(lastSeenSec * 1000);
  const nowDate = new Date();

  const isToday =
    lastSeenDate.getDate() === nowDate.getDate() &&
    lastSeenDate.getMonth() === nowDate.getMonth() &&
    lastSeenDate.getFullYear() === nowDate.getFullYear();

  const yesterdayDate = new Date();
  yesterdayDate.setDate(nowDate.getDate() - 1);
  const isYesterday =
    lastSeenDate.getDate() === yesterdayDate.getDate() &&
    lastSeenDate.getMonth() === yesterdayDate.getMonth() &&
    lastSeenDate.getFullYear() === yesterdayDate.getFullYear();

  const locale = isEn ? 'en-US' : 'ru-RU';
  const timeString = lastSeenDate.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) {
    return isEn ? `seen today at ${timeString}` : `был сегодня в ${timeString}`;
  }

  if (isYesterday) {
    return isEn ? `seen yesterday at ${timeString}` : `был вчера в ${timeString}`;
  }

  const dateString = lastSeenDate.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  });
  return isEn ? `seen on ${dateString}` : `был ${dateString}`;
};

function getPluralMinutes(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'минуту';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'минуты';
  return 'минут';
}

function getPluralHours(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'час';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'часа';
  return 'часов';
}

/**
 * Multi-Presence Aggregator with Telegram-Style Last-Seen & Direct Spotify Web API + Last Played Cache
 */
export function usePresence({ discordUserId, lang = 'ru' }) {
  const [discordState, setDiscordState] = useState({
    online: false,
    game: null,
    loaded: false,
  });

  const [spotifyState, setSpotifyState] = useState({
    isPlaying: false,
    data: null,
    lastPlayed: null,
    loaded: false,
  });

  const [lastSeenTimestamp, setLastSeenTimestamp] = useState(null);

  // 1. Direct Autonomous Spotify Web API with Smart Polling
  const pollSpotify = useCallback(async ({ signal }) => {
    try {
      const res = await fetch(apiUrl('spotify/playing', { _t: Date.now() }), { signal });
      if (!res.ok) return;
      const data = await res.json();
      setSpotifyState({
        isPlaying: Boolean(data.isPlaying),
        data: data.isPlaying ? data : null,
        lastPlayed: data.lastPlayed || null,
        loaded: true,
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setSpotifyState((prev) => ({ ...prev, loaded: true }));
      }
    }
  }, []);

  useSmartPolling(pollSpotify, {
    interval: appConfig.polling.spotifyMs || 5000,
    maxBackoff: 30000,
  });

  // 2. Real-Time Discord Gateway via Lanyard
  useEffect(() => {
    if (!discordUserId) {
      setDiscordState({ online: false, game: null, loaded: true });
      return;
    }

    let socket;
    let heartbeatInterval;

    const parseLanyardData = (d) => {
      if (!d) return;

      const discordStatus = (d.discord_status || 'offline').toLowerCase();
      const isOnline = discordStatus === 'online' || discordStatus === 'idle' || discordStatus === 'dnd';
      const gameActivity = d.activities?.find((a) => a.type === 0 || a.type === 1)?.name || null;

      setDiscordState({
        online: isOnline,
        game: isOnline ? gameActivity : null,
        loaded: true,
      });
    };

    const connectWebSocket = () => {
      try {
        socket = new WebSocket(appConfig.lanyardSocketUrl);

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.op === 1) {
              heartbeatInterval = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                  socket.send(JSON.stringify({ op: 3 }));
                }
              }, data.d.heartbeat_interval);

              socket.send(
                JSON.stringify({
                  op: 2,
                  d: { subscribe_to_id: discordUserId },
                })
              );
            } else if (data.op === 0) {
              parseLanyardData(data.d);
            }
          } catch {
            // Ignore parse errors
          }
        };

        socket.onerror = () => {
          fallbackRest();
        };

        socket.onclose = () => {
          clearInterval(heartbeatInterval);
        };
      } catch {
        fallbackRest();
      }
    };

    const fallbackRest = async () => {
      try {
        const res = await fetch(lanyardUserUrl(discordUserId));
        const json = await res.json();
        if (json.success && json.data) {
          parseLanyardData(json.data);
        } else {
          setDiscordState({ online: false, game: null, loaded: true });
        }
      } catch {
        setDiscordState({ online: false, game: null, loaded: true });
      }
    };

    fallbackRest();
    connectWebSocket();

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [discordUserId]);

  // 3. Last-Seen Server Fetch with Smart Polling
  const pollLastSeen = useCallback(async ({ signal }) => {
    try {
      const res = await fetch(apiUrl('last-seen', { _t: Date.now() }), { signal });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.lastSeenTimestamp) {
        setLastSeenTimestamp(data.lastSeenTimestamp);
      }
    } catch {
      // Fallback to local
    }
  }, []);

  useSmartPolling(pollLastSeen, {
    interval: appConfig.polling.lastSeenMs || 15000,
    maxBackoff: 30000,
  });

  // Combined Presence Computation
  const isOnline = discordState.online || spotifyState.isPlaying || Boolean(discordState.game);
  const statusType = isOnline ? 'online' : 'offline';

  const effectiveLastSeen = Math.max(
    Number(lastSeenTimestamp) || 0,
    Number(spotifyState.lastPlayed?.playedAtTimestamp) || 0
  );
  const statusText = isOnline ? 'Online' : formatTelegramLastSeen(effectiveLastSeen, lang);

  const isLastPlayedValid = Boolean(
    spotifyState.lastPlayed &&
    spotifyState.lastPlayed.playedAtTimestamp &&
    (Date.now() / 1000 - spotifyState.lastPlayed.playedAtTimestamp < 60)
  );

  return {
    isOnline,
    statusType,
    statusText,
    activity: discordState.game,
    spotify: spotifyState.isPlaying ? spotifyState.data : null,
    lastPlayedSpotify: isLastPlayedValid ? spotifyState.lastPlayed : null,
    lastSeenTimestamp,
    isLoaded: discordState.loaded && spotifyState.loaded,
  };
}
