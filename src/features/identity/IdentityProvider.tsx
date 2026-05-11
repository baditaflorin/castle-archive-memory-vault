import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { IdentityContext } from './identity.js';
import type { ActiveIdentity } from './identity.js';

const IDLE_LOCK_MS = 15 * 60 * 1000;

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveIdentity | null>(null);
  const idleTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const reset = () => {
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setActive(null), IDLE_LOCK_MS);
    };
    const windowEvents: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'pointerdown'];
    windowEvents.forEach((ev) => window.addEventListener(ev, reset));
    document.addEventListener('visibilitychange', reset);
    reset();
    return () => {
      windowEvents.forEach((ev) => window.removeEventListener(ev, reset));
      document.removeEventListener('visibilitychange', reset);
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
    };
  }, [active]);

  const value = useMemo(() => ({ active, setActive }), [active]);
  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}
