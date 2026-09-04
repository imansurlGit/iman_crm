import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { getTokens, SESSION_EXPIRED_EVENT } from '../services/api';
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  type CurrentUser,
} from '../services/userService';

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  /** Vrai si l'utilisateur vient d'être déconnecté suite à l'expiration de sa session. */
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  acknowledgeSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  async function loadCurrentUser() {
    if (!getTokens()) {
      setUser(null);
      return;
    }
    try {
      setUser(await getCurrentUser());
    } catch {
      logoutRequest();
      setUser(null);
    }
  }

  useEffect(() => {
    loadCurrentUser().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      setSessionExpired(true);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  async function login(email: string, password: string) {
    await loginRequest(email, password);
    await loadCurrentUser();
  }

  function logout() {
    logoutRequest();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        sessionExpired,
        login,
        logout,
        refreshUser: loadCurrentUser,
        acknowledgeSessionExpired: () => setSessionExpired(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur de AuthProvider");
  }
  return context;
}
