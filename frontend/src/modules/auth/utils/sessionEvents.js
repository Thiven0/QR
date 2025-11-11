const FORCE_LOGOUT_EVENT = 'qr-force-logout';

export const emitForceLogout = (detail = {}) => {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent(FORCE_LOGOUT_EVENT, { detail });
  window.dispatchEvent(event);
};

export const subscribeForceLogout = (handler) => {
  if (typeof window === 'undefined' || typeof handler !== 'function') return () => {};
  window.addEventListener(FORCE_LOGOUT_EVENT, handler);
  return () => window.removeEventListener(FORCE_LOGOUT_EVENT, handler);
};

export { FORCE_LOGOUT_EVENT };
