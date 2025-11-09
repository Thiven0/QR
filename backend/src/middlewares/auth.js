const { verifyToken } = require('../services/token.service');

const extractToken = (rawHeader = '') =>
  rawHeader
    .trim()
    .replace(/['"]+/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim();

const authMiddleware = (requiredPermissions = []) => (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).json({
      status: 'error',
      message: 'No se encontro cabecera de autenticacion',
    });
  }

  const token = extractToken(authHeader);

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Token invalido',
    });
  }

  let payload;
  try {
    payload = verifyToken(token);

    if (
      Array.isArray(requiredPermissions) &&
      requiredPermissions.length > 0 &&
      !requiredPermissions.includes(payload.permisoSistema)
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permisos para acceder a este recurso',
      });
    }

    req.user = payload;
    return next();
  } catch (error) {
    if (error.code === 'TOKEN_EXPIRED') {
      return res.status(401).json({
        token,
        status: 'error',
        message: 'El token ha expirado',
      });
    }

    return res.status(401).json({
      token,
      payload,
      status: 'error',
      message: 'Token invalido',
    });
  }
};

module.exports = authMiddleware;
