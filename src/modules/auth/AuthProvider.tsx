import { createContext, useContext, useState, type ReactNode } from 'react';
import { useSession } from './hooks/useSession';
import type { AuthChallenge } from './types';

type AuthState = ReturnType<typeof useSession> & {
  challenge: AuthChallenge | null;
  setChallenge: (challenge: AuthChallenge | null) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  // Desafio e QR ficam só em memória; nunca em URL ou localStorage.
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  return (
    <AuthContext.Provider value={{ ...session, challenge, setChallenge }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('AuthProvider ausente.');
  }
  return auth;
}
