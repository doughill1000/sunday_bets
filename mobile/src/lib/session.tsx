// Session context: loads the persisted Supabase session once at startup and tracks
// auth-state changes. Screens gate on `initialized` so the router never redirects
// before the stored session has been read from AsyncStorage.
import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

type SessionContextValue = {
  session: Session | null;
  /** false until the persisted session has been loaded from storage. */
  initialized: boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setInitialized(true);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      initialized,
      signOut: async () => {
        await supabase.auth.signOut();
      }
    }),
    [session, initialized]
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const ctx = use(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

/** The signed-in user's id. Only call from screens rendered behind the auth guard. */
export function useUserId(): string {
  const { session } = useSession();
  if (!session) throw new Error('useUserId called without a session');
  return session.user.id;
}
