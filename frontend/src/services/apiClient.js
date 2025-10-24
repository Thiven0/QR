const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

export const apiRequest = async (path, { method = 'GET', data, token, headers = {} } = {}) => {
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

  const response = await fetch(API_BASE_URL + path, config);
  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = payload && typeof payload === 'object' ? payload : { message: String(payload || 'Error en la solicitud') };
    throw Object.assign(new Error(error.message || 'Error en la solicitud'), {
      status: response.status,
      details: error,
    });
  }

  return payload;
};

export const getApiUrl = (path = '') => API_BASE_URL + path;
