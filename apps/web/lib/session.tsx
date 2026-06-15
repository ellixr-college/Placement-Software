'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@ellixr/shared';
import { api, getAccessToken, setAccessToken, tryRefresh } from './api';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  collegeId: string | null;
  avatarUrl: string | null;
  mustChangePassword?: boolean;
  college?: { id: string; name: string; slug: string; logoUrl: string | null } | null;
}

interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const clearRoleCookie = () => {
  document.cookie = 'ellixr_role=; path=/; max-age=0';
};

/**
 * Bootstraps and holds the client session. On mount (e.g. after a page reload
 * that clears the in-memory access token) it restores the token from the
 * httpOnly refresh cookie, then loads the current user. If there's no valid
 * session it clears the routing cookie and redirects to /login.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!getAccessToken()) {
          // Shared/deduped with any concurrent page data-fetch refresh so the
          // single-use refresh cookie isn't rotated twice in parallel.
          await tryRefresh();
        }
        const me = await api<SessionUser>('/auth/me');
        if (active) setUser(me);
      } catch {
        if (active) {
          setAccessToken(null);
          clearRoleCookie();
          setUser(null);
          router.replace('/login');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const signOut = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore — clear locally regardless */
    } finally {
      setAccessToken(null);
      clearRoleCookie();
      setUser(null);
      router.replace('/login');
    }
  }, [router]);

  return (
    <SessionContext.Provider value={{ user, loading, signOut }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
