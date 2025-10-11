const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { User, PERMISOS_SISTEMA } = require("../models/user.model");

const DEFAULT_ALLOWED_BY_ROLE = {
  Administrador: PERMISOS_SISTEMA,
  Celador: ["Usuario"],
};

const normalizePermiso = (permiso) => {
  if (!permiso) return "Usuario";
  const normalized = permiso.trim();
  const match = PERMISOS_SISTEMA.find(
    (value) => value.toLowerCase() === normalized.toLowerCase()
  );
  return match || "Usuario";
};

const normalizeEstado = (estado) => {
  if (!estado) return undefined;
  const normalized = estado.toLowerCase();
  return ["activo", "inactivo"].includes(normalized)
    ? normalized
    : undefined;
};

const sanitizeNumeric = (value = '') => value.replace(/\D/g, '');
const sanitizePhone = (value = '') => value.replace(/[^\d+]/g, '');

const parseScannedText = (rawText) => {
  if (!rawText) return null;

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  const [nombre = '', cedulaRaw = '', programa = '', tipoSangre = '', telefonoRaw = ''] = lines;

  return {
    nombre,
    cedula: sanitizeNumeric(cedulaRaw),
    programa,
    tipo_sangre: tipoSangre,
    telefono: sanitizePhone(telefonoRaw),
  };
};

const buildUserPayload = (payload) => {
  const nombre = payload.nombre || payload.name || "";
  const apellido = payload.apellido || payload.lastName || "";
  const email = (payload.email || payload.correo || "").toLowerCase();

  return {
    cedula: payload.cedula,
    nombre: nombre.trim(),
    apellido: apellido.trim(),
    email,
    password: payload.password,
    RH: payload.RH || payload.rh,
    facultad: payload.facultad,
    telefono: payload.telefono,
    imagen: payload.imagen,
    imagenQR: payload.imagenQR,
    rolAcademico: payload.rolAcademico || payload.rol,
    permisoSistema: normalizePermiso(payload.permisoSistema || payload.permiso_sistema),
    estado: normalizeEstado(payload.estado),
  };
};

const ensureCreationPermission = (requester, permisoDestino) => {
  if (!requester) {
    return {
      allowed: false,
      message: "Necesitas iniciar sesiÃ³n para registrar usuarios",
      status: 401,
    };
  }

  const permitted = DEFAULT_ALLOWED_BY_ROLE[requester.permisoSistema] || [];
  if (!permitted.includes(permisoDestino)) {
    return {
      allowed: false,
      message: "No tienes permisos para registrar este tipo de usuario",
      status: 403,
    };
  }

  return { allowed: true };
};

const createUser = async (req, res) => {
  try {
    const requester = req.user;
    const userPayload = buildUserPayload(req.body || {});

    if (!userPayload.nombre || !userPayload.email) {
      return res.status(400).json({
        status: "error",
        message: "Nombre y correo electrÃ³nico son obligatorios",
      });
    }

    const permisoDestino = userPayload.permisoSistema;
    const permissionCheck = ensureCreationPermission(requester, permisoDestino);

    if (!permissionCheck.allowed) {
      return res.status(permissionCheck.status).json({
        status: "error",
        message: permissionCheck.message,
      });
    }

    const duplicateQuery = [{ email: userPayload.email }];
    if (userPayload.cedula) {
      duplicateQuery.push({ cedula: userPayload.cedula });
    }

    const existingUser = await User.findOne({ $or: duplicateQuery });

    if (existingUser) {
      return res.status(409).json({
        status: "error",
        message: "El usuario ya existe",
      });
    }

    let plainPassword = userPayload.password;

    if (!plainPassword) {
      plainPassword = crypto.randomBytes(9).toString("base64");
    }

    userPayload.password = await bcrypt.hash(plainPassword, 10);

    if (!userPayload.estado) {
      userPayload.estado = "activo";
    }

    const newUser = new User(userPayload);
    const savedUser = await newUser.save();

    const { password, ...userWithoutPassword } = savedUser.toObject();

    const response = {
      status: "success",
      message: "Usuario registrado correctamente",
      user: userWithoutPassword,
    };

    if (!req.body.password) {
      response.generatedPassword = plainPassword;
    }

    return res.status(201).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Error al registrar el usuario",
      error: error.message,
    });
  }
};

const listUsers = async (req, res) => {
  try {
    const { permiso, estado } = req.query;
    const query = {};

    if (permiso) {
      query.permisoSistema = normalizePermiso(permiso);
    }

    if (estado) {
      const normalizedEstado = normalizeEstado(estado);
      if (normalizedEstado) {
        query.estado = normalizedEstado;
      }
    }

    const users = await User.find(query).select("-password").sort({ created_at: -1 });

    return res.status(200).json({
      status: "success",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Error al obtener los usuarios",
      error: error.message,
    });
  }
};

const toggleAccessByCedula = async (req, res) => {
  try {
    const requester = req.user;

    if (!requester) {
      return res.status(401).json({
        status: "error",
        message: "Debes iniciar sesiÃ³n para actualizar el estado",
      });
    }

    if (!["Administrador", "Celador"].includes(requester.permisoSistema)) {
      return res.status(403).json({
        status: "error",
        message: "No tienes permisos para actualizar el estado",
      });
    }

    const { cedula } = req.body;

    if (!cedula) {
      return res.status(400).json({
        status: "error",
        message: "La cÃ©dula es obligatoria",
      });
    }

    const user = await User.findOne({ cedula });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "El usuario no existe",
      });
    }

    user.estado = user.estado === "activo" ? "inactivo" : "activo";
    await user.save();

    const { password, ...userWithoutPassword } = user.toObject();

    return res.status(200).json({
      status: "success",
      message: "Estado actualizado correctamente",
      user: userWithoutPassword,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Error al actualizar el estado",
      error: error.message,
    });
  }
};

const parseScannedData = (req, res) => {
  try {
    const rawText = (req.body?.rawText || '').trim();

    if (!rawText) {
      return res.status(400).json({
        status: 'error',
        message: 'El texto escaneado es obligatorio',
      });
    }

    const parsed = parseScannedText(rawText);

    if (!parsed || !parsed.nombre || !parsed.cedula) {
      return res.status(422).json({
        status: 'error',
        message: 'No fue posible interpretar el contenido escaneado',
      });
    }

    const parsedData = {
      rawText,
      ...parsed,
    };

    return res.status(200).json({
      status: 'success',
      data: parsedData,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al interpretar el texto escaneado',
      error: error.message,
    });
  }
};

const validateScannedUser = async (req, res) => {
  try {
    const payload = req.body?.data || req.body || {};
    const cedula = sanitizeNumeric(payload.cedula || '');

    if (!cedula) {
      return res.status(400).json({
        status: 'error',
        message: 'La cedula del usuario es obligatoria',
      });
    }

    const user = await User.findOne({ cedula });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado',
      });
    }

    const { password, ...userData } = user.toObject();

    return res.status(200).json({
      status: 'success',
      message: 'Usuario encontrado',
      userId: user._id,
      user: userData,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al validar el usuario escaneado',
      error: error.message,
    });
  }
};

module.exports = {
  createUser,
  listUsers,
  toggleAccessByCedula,
  parseScannedData,
  validateScannedUser,
};




