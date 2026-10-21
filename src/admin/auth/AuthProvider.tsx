import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '../../shared/supabase/client';

/**
 * loading   – checking for a saved login
 * signedOut – nobody is logged in
 * noAccess  – logged in, but not on the admin list
 * admin     – logged in and allowed to edit
 * error     – could not check (settings missing or no connection)
 */
export type AuthStatus = 'loading' | 'signedOut' | 'noAccess' | 'admin' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  email: string | null;
  message: string | null;
  /** Returns an error message to show, or null on success. */
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

interface AuthSnapshot {
  status: AuthStatus;
  email: string | null;
  message: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>({
    status: 'loading',
    email: null,
    message: null,
  });

  useEffect(() => {
    let active = true;
    const client = (() => {
      try {
        return getSupabase();
      } catch (error) {
        setSnapshot({
          status: 'error',
          email: null,
          message: error instanceof Error ? error.message : 'Could not start.',
        });
        return null;
      }
    })();
    if (!client) return;
    const db = client;

    async function resolve(session: Session | null) {
      if (!session) {
        if (active) setSnapshot({ status: 'signedOut', email: null, message: null });
        return;
      }
      const email = session.user.email ?? null;
      const { data, error } = await db.rpc('is_admin');
      if (!active) return;
      if (error) {
        setSnapshot({ status: 'error', email, message: 'Could not check your access.' });
      } else {
        setSnapshot({ status: data ? 'admin' : 'noAccess', email, message: null });
      }
    }

    // Fires once with the saved login (or none), then on every sign-in, sign-out and refresh.
    // The check runs in a timeout because calling the database inside this callback can stall.
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => void resolve(session), 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (!error) return null;
    return error.status === 400
      ? 'Email or password is incorrect.'
      : 'Could not reach the server. Check your connection and try again.';
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const value = useMemo(() => ({ ...snapshot, signIn, signOut }), [snapshot, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
