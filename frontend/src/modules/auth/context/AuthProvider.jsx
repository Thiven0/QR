import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../services/apiClient';

const STORAGE_KEYS = {
  token: 'qr_token',
  user: 'qr_user',
};

export const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  hasPermission: () => false,
});

const persistSession = (token, user) => {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.token, token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.token);
  }

  if (user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.user);
  }
};

const readPersistedSession = () => {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const userRaw = localStorage.getItem(STORAGE_KEYS.user);
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { token, user };
  } catch (error) {
    console.warn('No se pudo leer la sesión almacenada', error);
    return { token: null, user: null };
  }
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { token: storedToken, user: storedUser } = readPersistedSession();

    if (!storedToken) {
      setLoading(false);
      return;
    }

    const restoreSession = async () => {
      try {
        const profile = await apiRequest('/auth/profile', { token: storedToken });
        setUser(profile.user);
        setToken(storedToken);
      } catch (error) {
        console.warn('No se pudo restaurar la sesión', error);
        persistSession(null, null);
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    if (storedUser) {
      setUser(storedUser);
    }

    restoreSession();
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      data: { email, password },
    });

    const sessionUser = response.user;
    const sessionToken = response.token;

    setUser(sessionUser);
    setToken(sessionToken);
    persistSession(sessionToken, sessionUser);

    return response;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    persistSession(null, null);
  }, []);

  const hasPermission = useCallback(
    (requiredPermissions = []) => {
      if (!requiredPermissions.length) return true;
      if (!user?.permisoSistema) return false;
      return requiredPermissions.includes(user.permisoSistema);
    },
    [user]
  );

  const value = useMemo(
    () => ({ user, token, loading, login, logout, hasPermission }),
    [user, token, loading, login, logout, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
