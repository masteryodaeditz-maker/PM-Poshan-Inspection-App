// Auto-logout after a period of inactivity, with a warning shown before the
// session actually ends. Activity is tracked in localStorage (not just in
// memory) so that closing the tab/app and reopening it after the timeout
// window has already elapsed also forces a fresh login — Supabase would
// otherwise silently restore the old session from its persisted token.

import { useCallback, useEffect, useRef, useState } from 'react';

const LAST_ACTIVITY_KEY = 'pmposhan_last_activity';

// Total allowed inactivity before forced logout (kept within the 15–30 min
// window), and how long before that the warning popup appears.
export const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
export const WARNING_LEAD_MS = 2 * 60 * 1000; // warn at the 18-minute mark

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'wheel',
];

export function recordActivity() {
  try { localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())); } catch { /* private mode etc. — ignore */ }
}

export function getLastActivity(): number | null {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

export function clearActivity() {
  try { localStorage.removeItem(LAST_ACTIVITY_KEY); } catch { /* ignore */ }
}

/**
 * Tracks user inactivity while `active` (i.e. someone is signed in) is true.
 *
 * - If the app is opened and the stored last-activity timestamp is already
 *   older than the timeout window, signs out immediately — this covers the
 *   "closed and reopened the app" case, since Supabase would otherwise just
 *   restore the old session.
 * - Shows a warning a couple of minutes before the timeout is reached. Once
 *   the warning is showing, only an explicit "stay logged in" click extends
 *   the session — ambient mouse movement while reading the warning doesn't
 *   silently dismiss it.
 * - Logs out automatically if there's still no response once the full
 *   window elapses.
 */
export function useSessionTimeout(active: boolean, onTimeout: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const warningActiveRef = useRef(false);
  const timedOutRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const stayLoggedIn = useCallback(() => {
    recordActivity();
    warningActiveRef.current = false;
    timedOutRef.current = false;
    setShowWarning(false);
  }, []);

  useEffect(() => {
    if (!active) {
      setShowWarning(false);
      warningActiveRef.current = false;
      return;
    }

    timedOutRef.current = false;
    warningActiveRef.current = false;

    // Already-expired check: covers the app being closed and reopened after
    // the inactivity window passed while it was shut.
    const last = getLastActivity();
    if (last && Date.now() - last >= INACTIVITY_TIMEOUT_MS) {
      timedOutRef.current = true;
      clearActivity();
      onTimeoutRef.current();
      return;
    }
    if (!last) recordActivity();

    const handleActivity = () => {
      // While the warning is up, only the explicit "Stay logged in" action
      // (stayLoggedIn) should reset the clock — not passive mouse movement.
      if (timedOutRef.current || warningActiveRef.current) return;
      recordActivity();
    };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    const interval = setInterval(() => {
      if (timedOutRef.current) return;
      const lastActivity = getLastActivity() ?? Date.now();
      const remaining = INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivity);

      if (remaining <= 0) {
        timedOutRef.current = true;
        warningActiveRef.current = false;
        setShowWarning(false);
        clearActivity();
        onTimeoutRef.current();
      } else if (remaining <= WARNING_LEAD_MS) {
        warningActiveRef.current = true;
        setShowWarning(true);
        setSecondsLeft(Math.ceil(remaining / 1000));
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      clearInterval(interval);
    };
  }, [active]);

  return { showWarning, secondsLeft, stayLoggedIn };
}
