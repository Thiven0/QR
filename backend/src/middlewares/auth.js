const moment = require("moment");
const { SECRET } = require("../services/jwt.service");
const jwt = require("jwt-simple");

const authMiddleware = (requiredPermissions = []) => (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).json({
      status: "error",
      message: "No se encontró cabecera de autenticación",
    });
  }

  const token = authHeader.replace(/['"]+/g, "");

  try {
    const payload = jwt.decode(token, SECRET);

    if (payload.exp <= moment().unix()) {
      return res.status(401).json({
        status: "error",
        message: "El token ha expirado",
      });
    }

    if (
      requiredPermissions.length > 0 &&
      !requiredPermissions.includes(payload.permisoSistema)
    ) {
      return res.status(403).json({
        status: "error",
        message: "No tienes permisos para acceder a este recurso",
      });
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Token inválido",
    });
  }
};

module.exports = authMiddleware;
