import { apiRequest } from './apiClient';

export const getTurnstileStatus = (token) => apiRequest('/turnstile/status', { token });
export const openTurnstile = (token) => apiRequest('/turnstile/open', { method: 'POST', token });
export const closeTurnstile = (token) => apiRequest('/turnstile/close', { method: 'POST', token });
