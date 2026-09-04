import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';
export const MEDIA_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export interface AuthTokens {
  access: string;
  refresh: string;
}

const STORAGE_KEY = 'iman_crm_auth_tokens';

/** Émis dès qu'un rafraîchissement de token échoue (session expirée côté
 * serveur) — permet à AuthContext de déconnecter l'utilisateur et de
 * rediriger vers /login au lieu de laisser l'appli dans un état incohérent. */
export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

export function getTokens(): AuthTokens | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AuthTokens) : null;
}

export function setTokens(tokens: AuthTokens | null) {
  if (tokens) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Instance axios principale : base URL de l'API + injection automatique du
 * token JWT sur chaque requête. */
export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const tokens = getTokens();
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens?.refresh) return null;

  try {
    const response = await axios.post<{ access: string }>(`${API_BASE_URL}/auth/token/refresh/`, {
      refresh: tokens.refresh,
    });
    setTokens({ access: response.data.access, refresh: tokens.refresh });
    return response.data.access;
  } catch {
    setTokens(null);
    return null;
  }
}

// Sur un 401 (access token expiré), on tente un refresh une seule fois puis
// on rejoue la requête d'origine.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      refreshPromise ??= refreshAccessToken();
      const newAccess = await refreshPromise;
      refreshPromise = null;

      if (newAccess) {
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      }

      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    return Promise.reject(error);
  }
);
