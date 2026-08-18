import { useState, useEffect } from 'react';
import { apiUrl, appConfig, storageKey } from '../config/appConfig';

// Generates or retrieves a persistent unique Device Visitor ID
function getVisitorId() {
  try {
    let id = localStorage.getItem(storageKey('visitor_id'));
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem(storageKey('visitor_id'), id);
    }
    return id;
  } catch {
    // Fallback for private mode without localStorage access
    if (!window.__profileCardTempVisitorId) {
      window.__profileCardTempVisitorId = 'dev_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    }
    return window.__profileCardTempVisitorId;
  }
}

export function useLiveVisitors() {
  const [visitors, setVisitors] = useState({
    count: 0,
    loaded: false,
  });

  useEffect(() => {
    let isMounted = true;
    const vid = getVisitorId();

    const fetchVisitors = async () => {
      try {
        const res = await fetch(apiUrl('live-visitors', { vid, _t: Date.now() }));
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data && typeof data.onlineVisitors === 'number') {
          setVisitors({
            count: data.onlineVisitors,
            loaded: true,
          });
        }
      } catch {
        if (isMounted) {
          setVisitors((prev) => ({ ...prev, loaded: true }));
        }
      }
    };

    fetchVisitors();
    const interval = setInterval(fetchVisitors, appConfig.polling.liveVisitorsMs);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchVisitors();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return visitors;
}
