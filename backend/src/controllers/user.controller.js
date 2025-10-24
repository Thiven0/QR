const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { User, PERMISOS_SISTEMA } = require("../models/user.model");
const VisitorTicket = require("../models/visitor-ticket.model");
const { serializeVisitorTicket } = require("../utils/visitorTicket");

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

const cleanUndefined = (object) => {
  return Object.entries(object).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const ensureCreationPermission = (requester, permisoDestino) => {
  if (!requester) {
    return {
      allowed: false,
      message: "Necesitas iniciar sesiÃƒÂ³n para registrar usuarios",
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
        message: "Nombre y correo electrÃƒÂ³nico son obligatorios",
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

    let result = users;

    if (req.query.includeVisitorTicket === "true") {
      const now = new Date();
      const visitorUsers = users.filter(
        (user) => (user.rolAcademico || "").toLowerCase() === "visitante"
      );

      if (visitorUsers.length) {
        const visitorIds = visitorUsers.map((user) => user._id);
        const tickets = await VisitorTicket.find({
          user: { $in: visitorIds },
        })
          .sort({ expiresAt: -1 })
          .lean();

        const ticketMap = tickets.reduce((acc, ticket) => {
          const key = ticket.user.toString();
          if (!acc.has(key)) {
            acc.set(key, ticket);
          }
          return acc;
        }, new Map());

        result = users.map((userDoc) => {
          const user = userDoc.toObject();
          const ticket = ticketMap.get(user._id.toString());
          user.visitorTicket = serializeVisitorTicket(ticket);
          return user;
        });
      } else {
        result = users.map((userDoc) => {
          const user = userDoc.toObject();
          user.visitorTicket = null;
          return user;
        });
      }
    }

    return res.status(200).json({
      status: "success",
      data: result,
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
        message: "Debes iniciar sesiÃƒÂ³n para actualizar el estado",
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
        message: "La cÃƒÂ©dula es obligatoria",
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

const ensureAdmin = (requester) => {
  if (!requester || requester.permisoSistema !== "Administrador") {
    return {
      allowed: false,
      status: 403,
      message: "No tienes permisos para realizar esta accion",
    };
  }

  return { allowed: true };
};

const updateUser = async (req, res) => {
  try {
    const permission = ensureAdmin(req.user);
    if (!permission.allowed) {
      return res.status(permission.status).json({
        status: "error",
        message: permission.message,
      });
    }

    const userId = req.params?.id;
    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "El identificador del usuario es obligatorio",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Usuario no encontrado",
      });
    }

    const payload = cleanUndefined({
      ...buildUserPayload(req.body || {}),
      cedula: req.body?.cedula,
    });

    if (payload.email && payload.email !== user.email) {
      const emailInUse = await User.findOne({
        email: payload.email,
        _id: { $ne: userId },
      });

      if (emailInUse) {
        return res.status(409).json({
          status: "error",
          message: "Otro usuario ya utiliza este correo",
        });
      }
    }

    if (payload.cedula && payload.cedula !== user.cedula) {
      const cedulaInUse = await User.findOne({
        cedula: payload.cedula,
        _id: { $ne: userId },
      });

      if (cedulaInUse) {
        return res.status(409).json({
          status: "error",
          message: "Otro usuario ya utiliza esta cedula",
        });
      }
    }

    if (payload.password) {
      payload.password = await bcrypt.hash(payload.password, 10);
    } else {
      delete payload.password;
    }

    Object.assign(user, payload);
    await user.save();

    const { password, ...userWithoutPassword } = user.toObject();

    return res.status(200).json({
      status: "success",
      message: "Usuario actualizado correctamente",
      user: userWithoutPassword,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Error al actualizar usuario",
      error: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const permission = ensureAdmin(req.user);
    if (!permission.allowed) {
      return res.status(permission.status).json({
        status: "error",
        message: permission.message,
      });
    }

    const userId = req.params?.id;
    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "El identificador del usuario es obligatorio",
      });
    }

    const removed = await User.findByIdAndDelete(userId);

    if (!removed) {
      return res.status(404).json({
        status: "error",
        message: "Usuario no encontrado",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Usuario eliminado correctamente",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Error al eliminar usuario",
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
  updateUser,
  deleteUser,
};






