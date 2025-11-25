const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { User, PERMISOS_SISTEMA, USER_ESTADOS } = require("../models/user.model");
const Registro = require("../models/entry-exit.model");
const VisitorTicket = require("../models/visitor-ticket.model");
const { serializeVisitorTicket, getActiveVisitorTicketForUser } = require("../utils/visitorTicket");
const USER_BLOCKED_CODE = 'USER_BLOCKED';
const USERS_DEFAULT_PAGE_SIZE = Number(process.env.USERS_PAGE_SIZE || 10);
const USERS_MAX_PAGE_SIZE = Number(process.env.USERS_PAGE_MAX_SIZE || 50);
const USERS_SUMMARY_RECENT_LIMIT = Number(process.env.USERS_SUMMARY_RECENT_LIMIT || 6);

const DEFAULT_ALLOWED_BY_ROLE = {
  Administrador: PERMISOS_SISTEMA,
  Celador: ["Usuario"],
};

const findActiveRegistroForUser = async (userId) => {
  if (!userId) return null;
  return Registro.findOne({
    usuario: userId,
    $or: [{ fechaSalida: null }, { fechaSalida: { $exists: false } }],
  })
    .sort({ fechaEntrada: -1 })
    .populate("vehiculo", "type brand model color plate estado");
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
  return USER_ESTADOS.includes(normalized) ? normalized : undefined;
};

const sanitizeNumeric = (value = '') => value.replace(/\D/g, '');
const sanitizePhone = (value = '') => value.replace(/[^\d+]/g, '');
const sanitizeSearchTerm = (value = '') => (typeof value === 'string' ? value.trim() : '');
const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildSearchFilter = (term) => {
  const normalized = sanitizeSearchTerm(term);
  if (!normalized) return null;
  const safeRegex = new RegExp(escapeRegExp(normalized), 'i');
  return {
    $or: [
      { nombre: safeRegex },
      { apellido: safeRegex },
      { email: safeRegex },
      { cedula: safeRegex },
      { facultad: safeRegex },
      { rolAcademico: safeRegex },
      { telefono: safeRegex },
    ],
  };
};
const parsePositiveInt = (value, fallback, max = USERS_MAX_PAGE_SIZE) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), max);
};
const parseLimitParam = (value) => {
  if (value === undefined || value === null || value === '') {
    return USERS_DEFAULT_PAGE_SIZE;
  }
  return parsePositiveInt(value, USERS_DEFAULT_PAGE_SIZE, USERS_MAX_PAGE_SIZE);
};
const toBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return String(value).toLowerCase() === 'true';
};

const RH_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const normalizeRh = (value = '') => {
  const candidate = value.toUpperCase().replace(/\s+/g, '');
  return RH_TYPES.includes(candidate) ? candidate : '';
};

const parseScannedText = (rawText) => {
  if (!rawText) return null;

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  const extractCedula = (text = '') => {
    const match = text.match(/(\d[\d.\s]{5,}\d)/);
    return match ? sanitizeNumeric(match[1]) : sanitizeNumeric(text);
  };

  const extractRh = (text = '') => {
    const match = text.match(/(A|B|AB|O)[+-]/i);
    if (match) {
      const normalized = normalizeRh(match[0]);
      if (normalized) return normalized;
    }
    return normalizeRh(text);
  };

  const splitName = (text = '') => {
    const parts = text
      .split(/\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return { nombre: '', apellido: '' };
    if (parts.length === 1) return { nombre: parts[0], apellido: '' };
    if (parts.length === 2) return { nombre: parts[0], apellido: parts[1] };
    const apellido = parts.slice(-2).join(' ');
    const nombre = parts.slice(0, -2).join(' ');
    return { nombre, apellido };
  };

  let nombreCompleto = lines[0] || '';
  let cedula = '';
  let programa = '';
  let tipoSangre = '';
  let telefono = '';

  for (const line of lines.slice(1)) {
    const lower = line.toLowerCase();
    if (!cedula && (lower.includes('cc') || lower.includes('c.c') || /\d/.test(line))) {
      cedula = extractCedula(line);
      continue;
    }
    if (!tipoSangre && lower.includes('rh')) {
      tipoSangre = extractRh(line);
      continue;
    }
    if (!telefono && /tel|cel|phone/i.test(line)) {
      telefono = sanitizePhone(line);
      continue;
    }
    // Assume any remaining text can be programa/facultad if not assigned
    if (!programa) {
      programa = line;
    }
  }

  if (!programa && lines.length >= 2) {
    programa = lines[lines.length - 1];
  }

  if (!tipoSangre) {
    tipoSangre = extractRh(rawText);
  }

  const { nombre, apellido } = splitName(nombreCompleto);

  return {
    nombre,
    apellido,
    cedula,
    programa,
    tipo_sangre: tipoSangre,
    telefono,
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
    documentIdentity: payload.documentIdentity,
    dataConsent: payload.dataConsent,
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
    const normalizedPermiso = req.query.permiso ? normalizePermiso(req.query.permiso) : undefined;
    const normalizedEstado = req.query.estado ? normalizeEstado(req.query.estado) : undefined;
    const searchTerm = sanitizeSearchTerm(req.query.search);
    const searchFilter = buildSearchFilter(searchTerm);
    const includeVisitorTicket = toBoolean(req.query.includeVisitorTicket);

    const page = parsePositiveInt(req.query.page, 1, Number.MAX_SAFE_INTEGER);
    const limit = parseLimitParam(req.query.limit);
    const skip = (page - 1) * limit;

    const query = {};
    if (normalizedPermiso) {
      query.permisoSistema = normalizedPermiso;
    }
    if (normalizedEstado) {
      query.estado = normalizedEstado;
    }
    if (searchFilter) {
      Object.assign(query, searchFilter);
    }

    const listQuery = User.find(query)
      .select('-password -imagenQR -documentIdentity.photo -documentIdentity.extractedData.rawText')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const [usersDocs, total] = await Promise.all([listQuery.lean(), User.countDocuments(query)]);

    let result = usersDocs;

    if (includeVisitorTicket && result.length) {
      const visitorIds = result
        .filter((user) => (user.rolAcademico || '').toLowerCase() === 'visitante')
        .map((user) => user._id);

      if (visitorIds.length) {
        const tickets = await VisitorTicket.find({ user: { $in: visitorIds } })
          .sort({ expiresAt: -1 })
          .lean();

        const ticketMap = tickets.reduce((acc, ticket) => {
          const key = ticket.user.toString();
          if (!acc.has(key)) {
            acc.set(key, ticket);
          }
          return acc;
        }, new Map());

        result = result.map((user) => {
          const ticket = ticketMap.get(user._id.toString());
          return {
            ...user,
            visitorTicket: serializeVisitorTicket(ticket),
          };
        });
      } else {
        result = result.map((user) => ({
          ...user,
          visitorTicket: null,
        }));
      }
    } else {
      result = result.map((user) => ({
        ...user,
        visitorTicket: null,
      }));
    }

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: skip + result.length < total,
    };

    return res.status(200).json({
      status: 'success',
      data: result,
      pagination,
      filters: {
        permiso: normalizedPermiso || null,
        estado: normalizedEstado || null,
        search: searchTerm || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al obtener los usuarios',
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

    const currentEstado = (user.estado || '').toLowerCase();
    const nextEstado = currentEstado === 'bloqueado' ? 'inactivo' : 'bloqueado';
    user.estado = nextEstado;
    await user.save();

    const { password, ...userWithoutPassword } = user.toObject();

    return res.status(200).json({
      status: "success",
      message:
        nextEstado === 'bloqueado'
          ? 'Usuario bloqueado correctamente'
          : 'Usuario desbloqueado correctamente',
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

const parseQrData = (req, res) => {
  try {
    const qrContent =
      (req.body?.qrData || req.body?.qr || req.body?.data || '').toString().trim();

    if (!qrContent) {
      return res.status(400).json({
        status: 'error',
        message: 'El contenido del QR es obligatorio',
      });
    }

    let parsed = null;

    if (qrContent.startsWith('{') || qrContent.startsWith('[')) {
      try {
        const qrJson = JSON.parse(qrContent);
        const embeddedRaw =
          (qrJson.rawText || qrJson.text || qrJson.data || qrJson.content || '').toString().trim();
        if (embeddedRaw) {
          parsed = parseScannedText(embeddedRaw);
        }
      } catch (_) {
        parsed = null;
      }
    }

    if (!parsed) {
      parsed = parseScannedText(qrContent);
    }

    if (!parsed || !parsed.nombre || !parsed.cedula) {
      return res.status(422).json({
        status: 'error',
        message: 'No fue posible interpretar el contenido del QR',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        rawText: qrContent,
        ...parsed,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al interpretar el QR',
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

    if ((user.estado || '').toLowerCase() === 'bloqueado') {
      return res.status(403).json({
        status: 'error',
        code: USER_BLOCKED_CODE,
        message: 'El usuario esta bloqueado y no puede validar acceso con su codigo QR.',
      });
    }

    const { password, ...userData } = user.toObject();
    const isVisitor = (user.rolAcademico || "").toLowerCase() === "visitante";
    let ticketInfo = null;

    if (isVisitor) {
      const activeTicket = await getActiveVisitorTicketForUser(user._id);
      if (!activeTicket) {
        return res.status(403).json({
          status: "error",
          message: "El ticket temporal del visitante ha expirado. Debe generar un nuevo registro antes de ingresar.",
        });
      }
      ticketInfo = serializeVisitorTicket(activeTicket);
      userData.visitorTicket = ticketInfo;
    }

    const activeRegistro = await findActiveRegistroForUser(user._id);
    let activeRegistroPayload = null;
    if (activeRegistro) {
      activeRegistroPayload = {
        _id: activeRegistro._id,
        fechaEntrada: activeRegistro.fechaEntrada,
        horaEntrada: activeRegistro.horaEntrada,
        vehiculo: activeRegistro.vehiculo
          ? {
              _id: activeRegistro.vehiculo._id,
              type: activeRegistro.vehiculo.type,
              plate: activeRegistro.vehiculo.plate,
              estado: activeRegistro.vehiculo.estado,
              brand: activeRegistro.vehiculo.brand,
              model: activeRegistro.vehiculo.model,
              color: activeRegistro.vehiculo.color,
            }
          : null,
      };
    }

    return res.status(200).json({
      status: 'success',
      message: 'Usuario encontrado',
      userId: user._id,
      user: userData,
      activeRegistro: activeRegistroPayload,
      visitorTicket: ticketInfo,
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

const getUserDetail = async (req, res) => {
  try {
    const userId = req.params?.id;
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'El identificador del usuario es obligatorio',
      });
    }

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado',
      });
    }

    return res.status(200).json({
      status: 'success',
      user,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al obtener el usuario',
      error: error.message,
    });
  }
};

const getUsersSummary = async (req, res) => {
  try {
    const now = new Date();
    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 6);
    last7Days.setHours(0, 0, 0, 0);
    const last30Days = new Date(now);
    last30Days.setDate(last30Days.getDate() - 29);
    last30Days.setHours(0, 0, 0, 0);

    const estadoCountsPromise = User.aggregate([
      {
        $group: {
          _id: {
            $toLower: {
              $ifNull: ['$estado', 'desconocido'],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const permisoCountsPromise = User.aggregate([
      {
        $group: {
          _id: {
            $ifNull: ['$permisoSistema', 'Usuario'],
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const facultyStatsPromise = User.aggregate([
      {
        $group: {
          _id: {
            $toLower: {
              $ifNull: ['$facultad', 'sin facultad'],
            },
          },
          label: {
            $first: {
              $ifNull: ['$facultad', 'Sin facultad'],
            },
          },
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    {
                      $toLower: {
                        $ifNull: ['$estado', ''],
                      },
                    },
                    'activo',
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const roleStatsPromise = User.aggregate([
      {
        $group: {
          _id: {
            $toLower: {
              $ifNull: ['$rolAcademico', 'sin rol'],
            },
          },
          label: {
            $first: {
              $ifNull: ['$rolAcademico', 'Sin rol'],
            },
          },
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    {
                      $toLower: {
                        $ifNull: ['$estado', ''],
                      },
                    },
                    'activo',
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const latestUsersPromise = User.find()
      .sort({ updated_at: -1 })
      .limit(Math.max(1, USERS_SUMMARY_RECENT_LIMIT))
      .select('nombre apellido email estado permisoSistema rolAcademico facultad created_at updated_at cedula telefono')
      .lean();

    const newUsersLastWeekPromise = User.countDocuments({ created_at: { $gte: last7Days } });
    const newUsersLastMonthPromise = User.countDocuments({ created_at: { $gte: last30Days } });
    const totalUsersPromise = User.estimatedDocumentCount();

    const [
      estadoCountsRaw,
      permisoCountsRaw,
      facultyStatsRaw,
      roleStatsRaw,
      latestUsers,
      newUsersLastWeek,
      newUsersLastMonth,
      totalUsers,
    ] = await Promise.all([
      estadoCountsPromise,
      permisoCountsPromise,
      facultyStatsPromise,
      roleStatsPromise,
      latestUsersPromise,
      newUsersLastWeekPromise,
      newUsersLastMonthPromise,
      totalUsersPromise,
    ]);

    const mapCounts = (entries = []) =>
      entries.reduce((acc, entry) => {
        const key = (entry?._id || '').toString().toLowerCase();
        acc[key] = entry?.count || 0;
        return acc;
      }, {});

    const estadoCountsMap = mapCounts(estadoCountsRaw);
    const permisoCountsMap = permisoCountsRaw.reduce((acc, entry) => {
      const key = entry?._id || 'Usuario';
      acc[key] = entry?.count || 0;
      return acc;
    }, {});

    const facultyStats = facultyStatsRaw.map((item) => ({
      label: (item?.label || 'Sin facultad').trim(),
      total: item?.total || 0,
      active: item?.active || 0,
    }));

    const roleStats = roleStatsRaw.map((item) => ({
      label: (item?.label || 'Sin rol').trim(),
      total: item?.total || 0,
      active: item?.active || 0,
    }));

    const permisoCounts = PERMISOS_SISTEMA.reduce((acc, label) => {
      acc[label] = permisoCountsMap[label] || 0;
      return acc;
    }, {});

    const otherPermisos = Object.entries(permisoCountsMap).reduce((sum, [key, count]) => {
      if (!PERMISOS_SISTEMA.includes(key)) {
        return sum + count;
      }
      return sum;
    }, 0);

    if (otherPermisos > 0) {
      permisoCounts.Otros = otherPermisos;
    }

    const summary = {
      totalUsers: totalUsers || 0,
      estadoCounts: {
        activo: estadoCountsMap.activo || 0,
        inactivo: estadoCountsMap.inactivo || 0,
        bloqueado: estadoCountsMap.bloqueado || 0,
      },
      permisoCounts,
      facultyStats,
      roleStats,
      latestUsers: latestUsers || [],
      newUsers: {
        last7Days: newUsersLastWeek || 0,
        last30Days: newUsersLastMonth || 0,
      },
      generatedAt: now.toISOString(),
    };

    return res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'No fue posible generar el resumen de usuarios',
      error: error.message,
    });
  }
};
module.exports = {
  createUser,
  listUsers,
  getUsersSummary,
  toggleAccessByCedula,
  parseScannedData,
  parseQrData,
  validateScannedUser,
  updateUser,
  deleteUser,
  getUserDetail,
};






