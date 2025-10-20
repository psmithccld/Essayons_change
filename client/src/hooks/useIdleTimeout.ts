import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimeoutOptions {
  onIdle: () => void;
  idleTime?: number; // in milliseconds
  enabled?: boolean;
}

export function useIdleTimeout({
  onIdle,
  idleTime = 20 * 60 * 1000, // 20 minutes default
  enabled = true,
}: UseIdleTimeoutOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lastResetRef = useRef<number>(0);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    // Debounce: prevent excessive timer resets (e.g., from mousemove)
    const now = Date.now();
    if (now - lastResetRef.current < 500) {
      return; // Ignore resets within 500ms of last reset
    }

    lastActivityRef.current = now;
    lastResetRef.current = now;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onIdle();
    }, idleTime);
  }, [onIdle, idleTime, enabled]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Use modern events: 'keydown' instead of deprecated 'keypress'
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer, enabled]);

  return {
    resetTimer,
    lastActivity: lastActivityRef.current,
  };
}
