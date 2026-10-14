import { useEffect, useState } from 'react';
import { api, ApiError, errorMessage } from '../../../lib/api';
import type { User } from '../types';

/** Somente consulta/criação local do estado da sessão e logout. */
export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await api<{ user: User; demoMode: boolean }>('/auth/me');
        setUser(response.user);
        setDemoMode(response.demoMode);
      } catch (cause) {
        const missingSession = cause instanceof ApiError && cause.status === 401;
        if (!missingSession) setError(errorMessage(cause));
      } finally {
        setLoading(false);
      }
    }

    void loadSession();
    api<{ demoMode: boolean }>('/health')
      .then((response) => setDemoMode(response.demoMode))
      .catch(() => {});
  }, []);

  function acceptSession(authenticatedUser: User) {
    setUser(authenticatedUser);
    setError('');
  }

  async function logout(): Promise<boolean> {
    setLoggingOut(true);
    setError('');

    try {
      await api('/auth/logout', {});
      setUser(null);
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setLoggingOut(false);
    }
  }

  return { user, demoMode, loading, loggingOut, error, acceptSession, logout };
}
