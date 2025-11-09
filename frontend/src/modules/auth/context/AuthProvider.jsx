import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../../../services/apiClient';

const STORAGE_KEYS = {
  token: 'qr_token',
  user: 'qr_user',
  ticket: 'qr_ticket',
};

export const AuthContext = createContext({
  user: null,
  token: null,
  ticket: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  hasPermission: () => false,
  establishSession: () => {},
});

const persistSession = (token, user, ticket) => {
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

  if (ticket) {
    localStorage.setItem(STORAGE_KEYS.ticket, JSON.stringify(ticket));
  } else {
    localStorage.removeItem(STORAGE_KEYS.ticket);
  }
};

const readPersistedSession = () => {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const userRaw = localStorage.getItem(STORAGE_KEYS.user);
    const ticketRaw = localStorage.getItem(STORAGE_KEYS.ticket);
    const user = userRaw ? JSON.parse(userRaw) : null;
    const ticket = ticketRaw ? JSON.parse(ticketRaw) : null;
    return { token, user, ticket };
  } catch (error) {
    console.warn('No se pudo leer la sesión almacenada', error);
    return { token: null, user: null, ticket: null };
  }
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  const visitorLogoutTimerRef = useRef(null);
  const tokenRef = useRef(null);

  const clearVisitorTimer = useCallback(() => {
    if (visitorLogoutTimerRef.current) {
      clearTimeout(visitorLogoutTimerRef.current);
      visitorLogoutTimerRef.current = null;
    }
  }, []);

  const performLocalLogout = useCallback(() => {
    clearVisitorTimer();
    setUser(null);
    setToken(null);
    setTicket(null);
    tokenRef.current = null;
    persistSession(null, null, null);
  }, [clearVisitorTimer]);

  const performVisitorAutoLogout = useCallback(async () => {
    try {
      if (tokenRef.current) {
        await apiRequest('/visitors/expire', {
          method: 'POST',
          token: tokenRef.current,
        });
      }
    } catch (error) {
      console.warn('No fue posible expirar el ticket temporal', error);
    } finally {
      performLocalLogout();
    }
  }, [performLocalLogout]);

  const scheduleVisitorAutoLogout = useCallback(
    (ticketInfo) => {
      clearVisitorTimer();

      if (!ticketInfo?.expiresAt) {
        return;
      }

      const expiresAt = new Date(ticketInfo.expiresAt);
      const delay = expiresAt.getTime() - Date.now();

      if (!Number.isFinite(delay) || delay <= 0) {
        performVisitorAutoLogout();
        return;
      }

      visitorLogoutTimerRef.current = setTimeout(performVisitorAutoLogout, delay);
    },
    [clearVisitorTimer, performVisitorAutoLogout]
  );

  const notifyRemoteLogout = useCallback(async () => {
    if (!tokenRef.current) return;

    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        token: tokenRef.current,
      });
    } catch (error) {
      console.warn('No se pudo notificar el cierre de sesion', error);
    }
  }, []);

  useEffect(() => {
    const { token: storedToken, user: storedUser, ticket: storedTicket } = readPersistedSession();

    if (!storedToken) {
      setLoading(false);
      return;
    }

    if (storedUser) {
      setUser(storedUser);
    }

    if (storedTicket) {
      setTicket(storedTicket);
    }

    tokenRef.current = storedToken;

    const restoreSession = async () => {
      try {
        const profile = await apiRequest('/auth/profile', { token: storedToken });
        const profileUser = profile.user;
        const profileTicket = profile.ticket || null;

        setUser(profileUser);
        setToken(storedToken);
        setTicket(profileTicket);
        tokenRef.current = storedToken;
        persistSession(storedToken, profileUser, profileTicket);
      } catch (error) {
        console.warn('No se pudo restaurar la sesión', error);
        performLocalLogout();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [performLocalLogout]);

  useEffect(() => {
    const isVisitor = (user?.rolAcademico || '').toLowerCase() === 'visitante';

    if (isVisitor) {
      if (ticket) {
        scheduleVisitorAutoLogout(ticket);
      } else if (tokenRef.current) {
        performVisitorAutoLogout();
      }
    } else {
      clearVisitorTimer();
    }
  }, [user, ticket, scheduleVisitorAutoLogout, performVisitorAutoLogout, clearVisitorTimer]);

  const establishSession = useCallback(({ user: sessionUser, token: sessionToken, ticket: sessionTicket }) => {
    setUser(sessionUser);
    setToken(sessionToken);
    setTicket(sessionTicket || null);
    tokenRef.current = sessionToken || null;
    persistSession(sessionToken, sessionUser, sessionTicket || null);
  }, []);

  const login = useCallback(
    async ({ email, password }) => {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        data: { email, password },
      });

      establishSession({
        user: response.user,
        token: response.token,
        ticket: response.ticket || null,
      });

      return response;
    },
    [establishSession]
  );

  const logout = useCallback(async () => {
    await notifyRemoteLogout();
    performLocalLogout();
  }, [notifyRemoteLogout, performLocalLogout]);

  const hasPermission = useCallback(
    (requiredPermissions = []) => {
      if (!requiredPermissions.length) return true;
      if (!user?.permisoSistema) return false;
      return requiredPermissions.includes(user.permisoSistema);
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      ticket,
      loading,
      login,
      logout,
      hasPermission,
      establishSession,
    }),
    [user, token, ticket, loading, login, logout, hasPermission, establishSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
