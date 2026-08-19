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
const API_ORIGIN = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

const buildApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const normalizeFileName = (fileName = 'image.jpg') => fileName.replace(/[^a-zA-Z0-9._-]/g, '-');

const getExtensionFromMimeType = (mimeType = '') => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
};

const dataUrlToBlob = (dataUrl) => {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('La imagen no tiene un formato valido para subir');
  }

  const [, mimeType, encoded] = match;
  const binary = window.atob(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
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

export const apiBlobRequest = async (path, { token, signal } = {}) => {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;

  const response = await fetch(buildApiUrl(path), { headers, signal });
  if (!response.ok) {
    const payload = await parseResponse(response);
    const error = payload && typeof payload === 'object' ? payload : { message: String(payload || 'Error en la solicitud') };
    if (error.code === 'USER_BLOCKED') {
      emitForceLogout({ reason: 'USER_BLOCKED', message: error.message });
    }
    throw Object.assign(new Error(error.message || 'No fue posible cargar el archivo'), {
      status: response.status,
      details: error,
    });
  }

  return response.blob();
};

export const getApiUrl = (path = '') => buildApiUrl(path);

export const resolveAssetUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  const normalized = value.trim();
  if (!normalized) return '';
  if (normalized.startsWith('data:') || normalized.startsWith('blob:') || ABSOLUTE_URL_PATTERN.test(normalized)) {
    return normalized;
  }
  if (normalized.startsWith('/')) {
    return `${API_ORIGIN}${normalized}`;
  }
  return `${API_ORIGIN}/${normalized.replace(/^\/+/, '')}`;
};

export const uploadImageSource = async (kind, source, { token, fileName } = {}) => {
  if (!source) return '';
  if (typeof source === 'string' && !source.startsWith('data:')) {
    return source;
  }

  let blob;
  let resolvedFileName = fileName;

  if (typeof File !== 'undefined' && source instanceof File) {
    blob = source;
    resolvedFileName = fileName || source.name;
  } else if (typeof Blob !== 'undefined' && source instanceof Blob) {
    blob = source;
  } else {
    blob = dataUrlToBlob(source);
  }

  if (!resolvedFileName) {
    resolvedFileName = `${kind}.${getExtensionFromMimeType(blob.type)}`;
  }

  const formData = new FormData();
  formData.append('file', blob, normalizeFileName(resolvedFileName));

  const headers = {};
  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }

  const response = await fetch(buildApiUrl(`/upload/${kind}`), {
    method: 'POST',
    headers,
    body: formData,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = payload && typeof payload === 'object' ? payload : { message: String(payload || 'Error al subir la imagen') };
    throw Object.assign(new Error(error.message || 'Error al subir la imagen'), {
      status: response.status,
      details: error,
    });
  }

  return payload?.path || payload?.url || '';
};
