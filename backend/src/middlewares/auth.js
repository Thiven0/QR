const { verifyToken } = require('../services/token.service');
const { User } = require('../models/user.model');

const USER_BLOCKED_CODE = 'USER_BLOCKED';

const extractToken = (rawHeader = '') =>
  rawHeader
    .trim()
    .replace(/['"]+/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim();

const authMiddleware = (requiredPermissions = []) => async (req, res, next) => {
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

  try {
    const payload = verifyToken(token);
    const userId = payload.id;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Token invalido',
      });
    }

    const user = await User.findById(userId).select('permisoSistema estado');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Usuario no encontrado para este token',
      });
    }

    if ((user.estado || '').toLowerCase() === 'bloqueado') {
      return res.status(403).json({
        status: 'error',
        code: USER_BLOCKED_CODE,
        message: 'Tu acceso ha sido bloqueado. Comunicate con el administrador.',
      });
    }

    if (
      Array.isArray(requiredPermissions) &&
      requiredPermissions.length > 0 &&
      !requiredPermissions.includes(user.permisoSistema)
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permisos para acceder a este recurso',
      });
    }

    req.user = {
      ...payload,
      id: user._id.toString(),
      userId: user._id.toString(),
      permisoSistema: user.permisoSistema,
      estado: user.estado,
    };
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
      status: 'error',
      message: 'Token invalido',
    });
  }
};

module.exports = authMiddleware;
