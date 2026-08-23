import { useState, useCallback } from 'react';
import { apiUrl, appConfig, storageKey } from '../config/appConfig';
import { useSmartPolling } from './useSmartPolling';

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

  const pollVisitors = useCallback(async ({ signal }) => {
    const vid = getVisitorId();
    try {
      const res = await fetch(apiUrl('live-visitors', { vid, _t: Date.now() }), { signal });
      if (!res.ok) return;
      const data = await res.json();
      if (data && typeof data.onlineVisitors === 'number') {
        setVisitors({
          count: data.onlineVisitors,
          loaded: true,
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setVisitors((prev) => ({ ...prev, loaded: true }));
      }
    }
  }, []);

  useSmartPolling(pollVisitors, {
    interval: appConfig.polling.liveVisitorsMs || 5000,
    maxBackoff: 30000,
  });

  return visitors;
}
