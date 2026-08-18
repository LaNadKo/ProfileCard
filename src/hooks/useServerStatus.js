import { useState, useEffect } from 'react';
import { apiUrl, appConfig, storageKey } from '../config/appConfig';

function getCachedServerStatus() {
  try {
    const val = localStorage.getItem(storageKey('server_status'));
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

const defaultStatus = {
  status: 'online',
  hostname: '',
  os: '',
  uptimeStr: '—',
  loadAvg: 0.0,
  memUsedMb: 0,
  memTotalMb: 0,
  memPercent: 0,
  pingMs: null,
  loaded: false,
};

export function useServerStatus() {
  const [status, setStatus] = useState(() => getCachedServerStatus() || defaultStatus);

  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const t0 = performance.now();
        const res = await fetch(apiUrl('system-status'));
        const rtt = Math.round(performance.now() - t0);

        if (!res.ok) throw new Error('Failed to fetch system status');
        const data = await res.json();

        if (isMounted && data) {
          const newStatus = {
            status: data.status || 'online',
            hostname: data.hostname || '',
            os: data.os || '',
            uptimeStr: data.uptimeStr || '—',
            loadAvg: data.loadAvg ?? 0,
            memUsedMb: data.memUsedMb ?? 0,
            memTotalMb: data.memTotalMb ?? 0,
            memPercent: data.memPercent ?? 0,
            pingMs: rtt,
            loaded: true,
          };
          setStatus(newStatus);
          try {
            localStorage.setItem(storageKey('server_status'), JSON.stringify(newStatus));
          } catch {
            // Ignore quota
          }
        }
      } catch {
        if (isMounted) {
          setStatus((prev) => ({ ...prev, loaded: true }));
        }
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, appConfig.polling.serverStatusMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return status;
}
