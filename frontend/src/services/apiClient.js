import { emitForceLogout } from '../modules/auth/utils/sessionEvents';

const sanitizeBaseUrl = (url) => (url ? url.replace(/\/+$/, '') : '');

const resolveDefaultApiUrl = () => {
  if (import.meta?.env?.VITE_API_URL) {
    return sanitizeBaseUrl(import.meta.env.VITE_API_URL);
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    const apiPort = import.meta?.env?.VITE_API_PORT ?? 3000;
    const portSegment = apiPort ? `:${apiPort}` : '';
    return sanitizeBaseUrl(`${protocol}//${hostname}${portSegment}/api`);
  }

  return sanitizeBaseUrl('http://localhost:3000/api');
};

const API_BASE_URL = resolveDefaultApiUrl();

const buildApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

export const apiRequest = async (path, { method = 'GET', data, token, headers = {}, signal } = {}) => {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (data !== undefined) {
    config.body = JSON.stringify(data);
  }

  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }

  if (signal) {
    config.signal = signal;
  }

  const response = await fetch(buildApiUrl(path), config);
  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = payload && typeof payload === 'object' ? payload : { message: String(payload || 'Error en la solicitud') };

    if (error.code === 'USER_BLOCKED') {
      emitForceLogout({ reason: 'USER_BLOCKED', message: error.message });
    }

    throw Object.assign(new Error(error.message || 'Error en la solicitud'), {
      status: response.status,
      details: error,
    });
  }

  return payload;
};

export const getApiUrl = (path = '') => buildApiUrl(path);
