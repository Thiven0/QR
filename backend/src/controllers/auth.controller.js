const bcrypt = require('bcrypt');
const { User } = require('../models/user.model');
const VisitorTicket = require('../models/visitor-ticket.model');
const { createToken, verifyToken } = require('../services/token.service');
const { getActiveVisitorTicketForUser, serializeVisitorTicket } = require('../utils/visitorTicket');

const ACCESS_KEY = process.env.TOKEN_ACCESS_KEY || 'accessKey123';
const SECRET_KEY = process.env.TOKEN_SECRET_KEY || 'secretKey123';
const MIN_TOKEN_EXPIRATION_DAYS = 1;

const ensureTokenExpirationDays = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < MIN_TOKEN_EXPIRATION_DAYS) {
    return MIN_TOKEN_EXPIRATION_DAYS;
  }
  return parsed;
};

const createSessionToken = (payload = {}) => {
  const expiresInDays = ensureTokenExpirationDays(payload.expiresInDays);
  return createToken({
    ...payload,
    expiresInDays,
  });
};

const SESSION_STATE_PERMISSIONS = ['Administrador', 'Celador'];
const USER_BLOCKED_CODE = 'USER_BLOCKED';

const shouldSyncSessionState = (userDoc) =>
  !!userDoc && SESSION_STATE_PERMISSIONS.includes(userDoc.permisoSistema);

const ensureUserEstado = async (userDoc, desiredEstado) => {
  if (!shouldSyncSessionState(userDoc)) {
    return false;
  }

  const normalizedDesired = desiredEstado === 'activo' ? 'activo' : 'inactivo';
  const currentEstado = (userDoc.estado || 'inactivo').toLowerCase();

  if (currentEstado === 'bloqueado') {
    return false;
  }

  if (currentEstado === normalizedDesired) {
    return false;
  }

  userDoc.estado = normalizedDesired;
  await userDoc.save();
  return true;
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Email y contrasena son obligatorios',
    });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'El usuario no existe',
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({
        status: 'error',
        message: 'Credenciales invalidas',
      });
    }

    if ((user.estado || '').toLowerCase() === 'bloqueado') {
      return res.status(403).json({
        status: 'error',
        code: USER_BLOCKED_CODE,
        message: 'Tu acceso ha sido bloqueado. Comunicate con el administrador.',
      });
    }

    const isVisitor = (user.rolAcademico || '').toLowerCase() === 'visitante';
    let serializedTicket = null;

    if (isVisitor) {
      const activeTicketDoc = await getActiveVisitorTicketForUser(user._id);

      if (!activeTicketDoc) {
        const lastTicket = await VisitorTicket.findOne({ user: user._id }).sort({ expiresAt: -1 });
        if (lastTicket) {
          lastTicket.expiresAt = new Date(Date.now() - 1000);
          await lastTicket.save();
        }
        return res.status(403).json({
          status: 'error',
          message: 'Tu ticket temporal ha expirado. Registra tu visita nuevamente.',
        });
      }

      serializedTicket = serializeVisitorTicket(activeTicketDoc);

    }

    await ensureUserEstado(user, 'activo');

    const token = createSessionToken({
      userId: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      permisoSistema: user.permisoSistema,
    });

    res.set('Authorization', `Bearer ${token}`);
    res.set('Access-Control-Expose-Headers', 'Authorization');

    const { password: _, ...userData } = user.toObject();

    if (serializedTicket) {
      userData.visitorTicket = serializedTicket;
    }

    // TODO(TEST) Remover log despues de validar los servicios.
    console.log('[AUTH][LOGIN][TEST]', {
      userId: user._id.toString(),
      permisoSistema: user.permisoSistema,
      tokenPreview: token.slice(0, 12),
    });

    return res.status(200).json({
      status: 'success',
      message: 'Sesion iniciada correctamente',
      token,
      user: userData,
      ticket: serializedTicket || undefined,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al iniciar sesion',
      error: error.message,
    });
  }
};

const profile = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      status: 'error',
      message: 'Token no valido',
    });
  }

  const user = await User.findById(userId).select('-password');

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'Usuario no encontrado',
    });
  }

  const userData = user.toObject();
  let serializedTicket = null;

  if ((userData.rolAcademico || '').toLowerCase() === 'visitante') {
    const activeTicketDoc = await getActiveVisitorTicketForUser(user._id);

    if (activeTicketDoc) {
      serializedTicket = serializeVisitorTicket(activeTicketDoc);
      userData.visitorTicket = serializedTicket;
    } else {
      userData.visitorTicket = null;
    }
  }

  return res.status(200).json({
    status: 'success',
    user: userData,
    ticket: serializedTicket,
  });
};

const logout = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      status: 'error',
      message: 'Token no valido',
    });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado',
      });
    }

    await ensureUserEstado(user, 'inactivo');

    const { password: _, ...userData } = user.toObject();

    return res.status(200).json({
      status: 'success',
      message: 'Sesion cerrada correctamente',
      user: userData,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al cerrar sesion',
      error: error.message,
    });
  }
};

const issueToken = (req, res) => {
  try {
    const { access_key: accessKey, secret_key: secretKey } = req.body || {};

    if (!ACCESS_KEY || !SECRET_KEY) {
      return res.status(500).json({
        status: 'error',
        message: 'Servicio de tokens no configurado correctamente',
      });
    }

    if (!accessKey || !secretKey) {
      return res.status(400).json({
        status: 'error',
        message: 'Access key y secret key son obligatorios',
      });
    }

    if (accessKey !== ACCESS_KEY || secretKey !== SECRET_KEY) {
      return res.status(401).json({
        status: 'error',
        message: 'Credenciales de emision de token invalidas',
      });
    }

    const token = createSessionToken({
      extra: { scope: 'service-token' },
    });

    const payload = verifyToken(token);

    // TODO(TEST) Remover log despues de validar los servicios.
    console.log('[AUTH][ISSUE_TOKEN][TEST]', { payload });

    return res.status(200).json({
      status: 'success',
      message: 'Token generado correctamente',
      token,
      payload,
    });
  } catch (error) {
    const statusCode = error.code === 'TOKEN_REQUIRED' ? 400 : 500;

    return res.status(statusCode).json({
      status: 'error',
      message: 'Error al generar token',
      error: error.message,
    });
  }
};

module.exports = {
  login,
  profile,
  logout,
  issueToken,
};
