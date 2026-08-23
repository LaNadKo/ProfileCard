import { useEffect } from 'react';
import { apiUrl } from '../config/appConfig';

/**
 * Isolated hook for recording unique page visit once per session mount.
 */
export function useVisitTracking() {
  useEffect(() => {
    try {
      fetch(apiUrl('visit'), {
        method: 'POST',
        keepalive: true,
      }).catch(() => {
        // Fire-and-forget telemetry
      });
    } catch {
      // Ignore network errors
    }
  }, []);
}
