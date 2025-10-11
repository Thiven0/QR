const jwt = require('jwt-simple');
const moment = require('moment');

const SECRET = process.env.JWT_SECRET || 'CLAVE_SECRETA_universidad_unitropico_si';
const DEFAULT_EXPIRATION_DAYS = Number(process.env.JWT_EXPIRES_IN_DAYS || 30);

const sanitizeExtra = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value;
};

const resolveExpiration = (expiresInDays) => {
  const parsed = Number(expiresInDays);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_EXPIRATION_DAYS;
  }
  return parsed;
};

const buildPayload = (options = {}) => {
  const {
    userId,
    nombre,
    apellido,
    email,
    permisoSistema,
    roles,
    extra = {},
    expiresInDays,
  } = options;

  const payload = {
    id: userId,
    nombre,
    apellido,
    email,
    permisoSistema,
    roles: Array.isArray(roles) ? roles : undefined,
    iat: moment().unix(),
    exp: moment().add(resolveExpiration(expiresInDays), 'days').unix(),
    ...sanitizeExtra(extra),
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return payload;
};

const createToken = (options = {}) => {
  const payload = buildPayload(options);
  return jwt.encode(payload, SECRET);
};

const verifyToken = (token) => {
  if (!token) {
    const error = new Error('Token is required');
    error.code = 'TOKEN_REQUIRED';
    throw error;
  }

  const payload = jwt.decode(token, SECRET);

  if (payload.exp && payload.exp <= moment().unix()) {
    const error = new Error('Token expired');
    error.code = 'TOKEN_EXPIRED';
    throw error;
  }

  return payload;
};

module.exports = {
  SECRET,
  createToken,
  verifyToken,
  buildPayload,
};
