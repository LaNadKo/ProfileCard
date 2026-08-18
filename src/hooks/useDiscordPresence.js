import { useState, useEffect } from 'react';
import { appConfig, lanyardUserUrl } from '../config/appConfig';

/**
 * Hook to fetch real-time Discord presence via Lanyard API
 * Supports WebSocket for instant live updates with HTTP REST fallback
 */
export function useDiscordPresence(discordUserId) {
  const [presence, setPresence] = useState({
    status: 'online', // 'online' | 'idle' | 'dnd' | 'offline'
    statusText: 'Online',
    activity: null,
    isLoaded: false,
  });

  useEffect(() => {
    if (!discordUserId || discordUserId === 'YOUR_DISCORD_USER_ID') {
      setPresence({
        status: 'online',
        statusText: 'Online',
        activity: null,
        isLoaded: true,
      });
      return;
    }

    let socket;
    let heartbeatInterval;

    const connectWebSocket = () => {
      try {
        socket = new WebSocket(appConfig.lanyardSocketUrl);

        socket.onopen = () => {
          // Initialize connection
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.op === 1) {
              // Hello event, send initialize
              heartbeatInterval = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                  socket.send(JSON.stringify({ op: 3 }));
                }
              }, data.d.heartbeat_interval);

              socket.send(
                JSON.stringify({
                  op: 2,
                  d: {
                    subscribe_to_id: discordUserId,
                  },
                })
              );
            } else if (data.op === 0) {
              // Event dispatch (INIT_STATE or PRESENCE_UPDATE)
              const d = data.d;
              if (d) {
                const status = d.discord_status || 'offline';
                let statusText = 'Offline';
                if (status === 'online') statusText = 'Online';
                else if (status === 'idle') statusText = 'Idle';
                else if (status === 'dnd') statusText = 'Do Not Disturb';

                const activity = d.activities?.find((a) => a.type !== 4)?.name || null;

                setPresence({
                  status,
                  statusText,
                  activity,
                  isLoaded: true,
                });
              }
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
          const d = json.data;
          const status = d.discord_status || 'offline';
          let statusText = 'Offline';
          if (status === 'online') statusText = 'Online';
          else if (status === 'idle') statusText = 'Idle';
          else if (status === 'dnd') statusText = 'Do Not Disturb';

          const activity = d.activities?.find((a) => a.type !== 4)?.name || null;

          setPresence({
            status,
            statusText,
            activity,
            isLoaded: true,
          });
        }
      } catch {
        setPresence({
          status: 'online',
          statusText: 'Online',
          activity: null,
          isLoaded: true,
        });
      }
    };

    connectWebSocket();

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [discordUserId]);

  return presence;
}
