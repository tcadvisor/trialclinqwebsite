import { useEffect, useRef, useCallback } from "react";

// 15 minutes default, per HIPAA requirements
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
// warn the user 2 minutes before we kill the session
const WARNING_BEFORE_MS = 2 * 60 * 1000;

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
];

/**
 * Automatically logs out idle users for HIPAA compliance.
 * Tracks mouse/keyboard/touch activity and fires `onTimeout` after
 * the configured period of inactivity. Shows a browser alert 2 min
 * before the session expires so the user has a chance to stay active.
 *
 * Only activates when `enabled` is true (i.e. when the user is logged in).
 */
export function useIdleTimeout(
  onTimeout: () => void,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  enabled: boolean = true
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningShownRef = useRef(false);

  // keep a stable reference to the callback so we don't re-bind listeners
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    warningShownRef.current = false;
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();

    // schedule the warning 2 minutes before timeout
    const warningDelay = Math.max(timeoutMs - WARNING_BEFORE_MS, 0);
    warningRef.current = setTimeout(() => {
      warningShownRef.current = true;
      // plain alert is fine here -- it blocks the thread, and if the user
      // clicks OK they'll generate activity that resets the timer
      window.alert(
        "Your session will expire in 2 minutes due to inactivity."
      );
      // user acknowledged the alert, counts as activity
      resetTimers();
    }, warningDelay);

    // schedule the actual logout
    timeoutRef.current = setTimeout(() => {
      onTimeoutRef.current();
    }, timeoutMs);
  }, [timeoutMs, clearTimers]);

  // we need a separate ref for resetTimers so the event handler always
  // calls the latest version without re-registering listeners constantly
  const resetTimersRef = useRef<() => void>(() => {});

  const resetTimers = useCallback(() => {
    startTimers();
  }, [startTimers]);

  resetTimersRef.current = resetTimers;

  useEffect(() => {
    if (!enabled) return;

    const handleActivity = () => {
      resetTimersRef.current();
    };

    // kick things off
    resetTimersRef.current();

    // throttle to avoid hammering setTimeout on every pixel of mouse movement
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const throttled = () => {
      if (throttleTimer) return;
      handleActivity();
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
      }, 1000);
    };

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, throttled, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, throttled);
      }
      if (throttleTimer) clearTimeout(throttleTimer);
      clearTimers();
    };
  }, [enabled, clearTimers]);
}
