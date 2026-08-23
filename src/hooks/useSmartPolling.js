import { useEffect, useRef } from 'react';

/**
 * Universal visibility-aware polling with local AbortController, backoff, jitter,
 * helper abortActive(), retryCount reset on resume, and complete sleep on hidden tabs.
 */
export function useSmartPolling(
  callback,
  {
    interval = 5000,
    maxBackoff = 30000,
    retryBaseMs = 5000,
    jitter = 0.15,
    enabled = true,
    immediate = true,
  } = {}
) {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return undefined;

    let stopped = false;
    let timer = null;
    let activeAbortCtrl = null;
    let retryCount = 0;

    const abortActive = () => {
      const controller = activeAbortCtrl;
      if (!controller) return;
      activeAbortCtrl = null;
      controller.abort();
    };

    const scheduleNext = (delayMs) => {
      if (stopped || document.visibilityState === 'hidden') return;
      const jitterFactor = 1 + (Math.random() * 2 - 1) * jitter;
      const finalDelay = Math.round(delayMs * jitterFactor);
      timer = window.setTimeout(run, finalDelay);
    };

    const run = async () => {
      if (stopped || activeAbortCtrl) return;
      if (document.visibilityState === 'hidden') return;

      const controller = new AbortController();
      activeAbortCtrl = controller;

      try {
        await savedCallback.current({ signal: controller.signal });
        retryCount = 0;
        scheduleNext(interval);
      } catch (err) {
        if (err?.name === 'AbortError' || stopped) return;
        retryCount += 1;
        const backoffDelay = Math.min(
          Math.max(interval, retryBaseMs * (2 ** (retryCount - 1))),
          maxBackoff
        );
        scheduleNext(backoffDelay);
      } finally {
        if (activeAbortCtrl === controller) {
          activeAbortCtrl = null;
        }
      }
    };

    const handleVisibilityChange = () => {
      clearTimeout(timer);
      timer = null;
      if (document.visibilityState === 'hidden') {
        abortActive();
        return;
      }
      retryCount = 0;
      run();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (immediate) {
      run();
    } else {
      scheduleNext(interval);
    }

    return () => {
      stopped = true;
      clearTimeout(timer);
      abortActive();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [interval, maxBackoff, retryBaseMs, jitter, enabled, immediate]);
}
