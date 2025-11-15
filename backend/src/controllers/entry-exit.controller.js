const Registro = require("../models/entry-exit.model.js");
const { User } = require("../models/user.model");
const { Vehicle } = require("../models/vehicle.model");

const USER_BLOCKED_CODE = 'USER_BLOCKED';
const ALERT_STATUSES = {
  NONE: 'none',
  PENDING: 'pending',
  ACK: 'acknowledged',
  RESOLVED: 'resolved',
};
const DEFAULT_ALERT_THRESHOLD_MINUTES = Number(process.env.ALERT_THRESHOLD_MINUTES || 5);
const MAX_REGISTROS_RANGE_DAYS = Number(process.env.REGISTROS_MAX_RANGE_DAYS || 90);
const MAX_REGISTROS_LIMIT = Number(process.env.REGISTROS_MAX_LIMIT || 2000);
const isUserBlocked = (userDoc) => ((userDoc?.estado || '').toLowerCase() === 'bloqueado');
const clampRangeDays = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.min(Math.floor(parsed), MAX_REGISTROS_RANGE_DAYS);
};
const parseQueryLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.min(Math.floor(parsed), MAX_REGISTROS_LIMIT);
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

const formatTime = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatDuration = (start, end) => {
  if (!(start instanceof Date) || !(end instanceof Date)) {
    return undefined;
  }

  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return '00:00:00';
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};

const ensureDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildFechaEntradaFilter = ({ from, to, rangeDays }) => {
  const filter = {};
  if (rangeDays) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (rangeDays - 1));
    filter.$gte = start;
  }

  const fromDate = ensureDate(from);
  const toDate = ensureDate(to);

  if (fromDate) {
    filter.$gte = fromDate;
  }
  if (toDate) {
    filter.$lte = toDate;
  }

  return Object.keys(filter).length ? filter : null;
};

const minutesBetween = (start, end = new Date()) => {
  const startDate = ensureDate(start);
  const endDate = ensureDate(end);
  if (!startDate || !endDate) return 0;
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs > 0 ? Math.floor(diffMs / (1000 * 60)) : 0;
};

const resolveAlertThreshold = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ALERT_THRESHOLD_MINUTES;
};

const ensureAlertStateForRegistro = async (
  registro,
  thresholdMinutes = DEFAULT_ALERT_THRESHOLD_MINUTES,
  { persist = false } = {}
) => {
  if (!registro || registro.fechaSalida) {
    return { registro, elapsedMinutes: 0, shouldAlert: false };
  }

  if (!registro.alertStatus) {
    registro.alertStatus = ALERT_STATUSES.NONE;
  }

  const elapsedMinutes = minutesBetween(registro.fechaEntrada, new Date());
  const shouldAlert = elapsedMinutes >= thresholdMinutes;

  if (shouldAlert && registro.alertStatus === ALERT_STATUSES.NONE) {
    registro.alertStatus = ALERT_STATUSES.PENDING;
    registro.alertRaisedAt = new Date();
    if (persist) {
      await registro.save();
    }
  }

  return { registro, elapsedMinutes, shouldAlert };
};

const normalizeAlertMetadata = (registroDoc) => {
  if (!registroDoc) return registroDoc;
  const registro = registroDoc.toObject ? registroDoc.toObject() : registroDoc;
  registro.alertStatus = registro.alertStatus || ALERT_STATUSES.NONE;
  registro.alertRaisedAt = registro.alertRaisedAt || null;
  registro.alertResolvedAt = registro.alertResolvedAt || null;
  registro.alertNotes = registro.alertNotes || null;
  registro.alertElapsedMinutes = minutesBetween(registro.fechaEntrada, new Date());
  registro.alertThresholdMinutes = DEFAULT_ALERT_THRESHOLD_MINUTES;
  registro.alertShouldNotify =
    !registro.fechaSalida && registro.alertElapsedMinutes >= DEFAULT_ALERT_THRESHOLD_MINUTES;
  return registro;
};

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const sanitizeCedula = (value) => (typeof value === 'string' ? value.replace(/\D/g, '') : '');

const ensureRegistroPermission = (requester) => {
  if (!requester) {
    return {
      allowed: false,
      status: 401,
      message: 'Debes iniciar sesión para gestionar registros.',
    };
  }

  if (!['Administrador', 'Celador'].includes(requester.permisoSistema)) {
    return {
      allowed: false,
      status: 403,
      message: 'No tienes permisos para gestionar registros.',
    };
  }

  return { allowed: true };
};

const resolveUserFromPayload = async ({ userId, cedula }) => {
  if (userId) {
    const user = await User.findById(userId);
    if (user) return user;
  }

  const sanitizedCedula = sanitizeCedula(cedula);
  if (sanitizedCedula) {
    const user = await User.findOne({ cedula: sanitizedCedula });
    if (user) return user;
  }

  return null;
};

const resolveVehicleFromPayload = async ({ vehicleId, usuario }) => {
  if (!vehicleId) return null;
  const query = { _id: vehicleId };
  if (usuario?._id) {
    query.owner = usuario._id;
  } else if (typeof usuario === 'string') {
    query.owner = usuario;
  } else if (usuario && typeof usuario === 'object' && usuario.toString) {
    query.owner = usuario.toString();
  }
  const vehicle = await Vehicle.findOne(query);
  return vehicle;
};

const buildManualRegistroPayload = async (payload = {}, requester) => {
  const user = await resolveUserFromPayload({
    userId: payload.userId || payload.usuarioId,
    cedula: payload.cedula || payload.documento,
  });

  if (!user) {
    const error = new Error('No se encontro el usuario para crear el registro.');
    error.status = 404;
    throw error;
  }

  const adminId = payload.administradorId || requester?.id || requester?.userId;
  if (!adminId) {
    const error = new Error('No se pudo determinar el administrador responsable del registro.');
    error.status = 400;
    throw error;
  }

  const entryDate = ensureDate(payload.fechaEntrada) || new Date();
  const horaEntrada = sanitizeString(payload.horaEntrada) || formatTime(entryDate);
  const exitDate = ensureDate(payload.fechaSalida);
  const horaSalida =
    sanitizeString(payload.horaSalida) || (exitDate ? formatTime(exitDate) : undefined);

  if (exitDate && exitDate < entryDate) {
    const error = new Error('La fecha de salida no puede ser anterior a la fecha de entrada.');
    error.status = 400;
    throw error;
  }

  const vehicle = await resolveVehicleFromPayload({
    vehicleId: payload.vehiculoId || payload.vehicleId,
    usuario: user,
  });

  const registroPayload = {
    usuario: user._id,
    administrador: adminId,
    fechaEntrada: entryDate,
    horaEntrada,
    fechaSalida: exitDate || undefined,
    horaSalida,
    duracionSesion: exitDate ? formatDuration(entryDate, exitDate) : undefined,
    cierreForzado: Boolean(payload.cierreForzado),
    cierreMotivo: sanitizeString(payload.cierreMotivo) || undefined,
    observaciones: sanitizeString(payload.observaciones) || undefined,
    vehiculo: vehicle ? vehicle._id : undefined,
    alertStatus: exitDate ? ALERT_STATUSES.RESOLVED : ALERT_STATUSES.NONE,
    alertRaisedAt: exitDate ? null : undefined,
    alertResolvedAt: exitDate ? exitDate : null,
    alertNotes: sanitizeString(payload.alertNotes) || undefined,
  };

  return { registroPayload, user, vehicle };
};

const applyRegistroUpdates = async (registro, payload = {}) => {
  if (!registro) return registro;

  if (payload.fechaEntrada) {
    const entryDate = ensureDate(payload.fechaEntrada);
    if (entryDate) {
      registro.fechaEntrada = entryDate;
      registro.horaEntrada = sanitizeString(payload.horaEntrada) || formatTime(entryDate);
    }
  } else if (payload.horaEntrada) {
    registro.horaEntrada = sanitizeString(payload.horaEntrada);
  }

  if (payload.fechaSalida === null || payload.fechaSalida === '') {
    registro.fechaSalida = undefined;
    registro.horaSalida = undefined;
    registro.duracionSesion = undefined;
    registro.alertStatus = ALERT_STATUSES.NONE;
    registro.alertRaisedAt = null;
    registro.alertResolvedAt = null;
  } else if (payload.fechaSalida) {
    const exitDate = ensureDate(payload.fechaSalida);
    if (exitDate) {
      registro.fechaSalida = exitDate;
      registro.horaSalida = sanitizeString(payload.horaSalida) || formatTime(exitDate);
      if (registro.fechaEntrada) {
        registro.duracionSesion = formatDuration(registro.fechaEntrada, exitDate);
      }
      registro.alertStatus = ALERT_STATUSES.RESOLVED;
      registro.alertResolvedAt = exitDate;
    }
  } else if (payload.horaSalida) {
    registro.horaSalida = sanitizeString(payload.horaSalida);
  }

  if (typeof payload.cierreForzado === 'boolean') {
    registro.cierreForzado = payload.cierreForzado;
  }

  if (payload.cierreMotivo !== undefined) {
    registro.cierreMotivo = sanitizeString(payload.cierreMotivo) || undefined;
  }

  if (payload.observaciones !== undefined) {
    registro.observaciones = sanitizeString(payload.observaciones) || undefined;
  }

  if (payload.alertNotes !== undefined) {
    registro.alertNotes = sanitizeString(payload.alertNotes) || undefined;
  }

  if (payload.vehiculoId) {
    const vehicle = await resolveVehicleFromPayload({
      vehicleId: payload.vehiculoId,
      usuario: registro.usuario,
    });
    registro.vehiculo = vehicle ? vehicle._id : undefined;
  } else if (payload.vehiculoId === null) {
    registro.vehiculo = undefined;
  }

  return registro;
};

const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  const userObject = userDoc.toObject();
  delete userObject.password;
  return userObject;
};

const sanitizeVehicle = (vehicleDoc) => {
  if (!vehicleDoc) return null;
  const { _id, type, brand, model, color, plate, estado, notes } = vehicleDoc.toObject();
  return { _id, type, brand, model, color, plate, estado, notes };
};

const populateRegistroForResponse = async (registro) => {
  if (!registro) return registro;

  await registro.populate([
    { path: 'usuario', select: 'nombre apellido email cedula permisoSistema estado rolAcademico telefono' },
    { path: 'administrador', select: 'nombre apellido email permisoSistema' },
    { path: 'vehiculo', select: 'type brand model color plate estado notes' },
  ]);

  return registro;
};

const findVehicleForUser = async (vehicleId, userId) => {
  if (!vehicleId) return null;
  return Vehicle.findOne({ _id: vehicleId, owner: userId });
};

const findRegistroAbiertoParaUsuario = async (userId) => {
  return Registro.findOne({
    usuario: userId,
    $or: [{ fechaSalida: null }, { fechaSalida: { $exists: false } }],
  }).sort({ fechaEntrada: -1 });
};

const procesarTransicionDeUsuario = async ({ user, adminId, direction, vehicleId, exitObservation }) => {
  if (isUserBlocked(user)) {
    return {
      statusCode: 403,
      payload: {
        status: 'error',
        code: USER_BLOCKED_CODE,
        message: 'El usuario se encuentra bloqueado. Debes desbloquearlo antes de registrar entradas o salidas.',
      },
    };
  }

  const normalizedDirection =
    typeof direction === 'string' ? direction.trim().toLowerCase() : null;
  const action =
    normalizedDirection === 'entry' || normalizedDirection === 'exit'
      ? normalizedDirection
      : user.estado === 'activo'
        ? 'exit'
        : 'entry';

  const now = new Date();
  let vehicle = null;

  if (vehicleId) {
    vehicle = await findVehicleForUser(vehicleId, user._id);
    if (!vehicle) {
      return {
        statusCode: 404,
        payload: {
          status: 'error',
          message: 'El vehiculo seleccionado no pertenece al usuario o no existe',
        },
      };
    }
  }

  const ensureVehicleForRegistro = async (registro) => {
    if (!vehicle && registro?.vehiculo) {
      vehicle = await Vehicle.findById(registro.vehiculo);
    }
  };

  const updateVehicleState = async (estado) => {
    if (!vehicle) return null;
    vehicle.estado = estado;
    await vehicle.save();
    return sanitizeVehicle(vehicle);
  };

  if (action === 'exit') {
    const registro = await findRegistroAbiertoParaUsuario(user._id);

    if (!registro) {
      return {
        statusCode: 404,
        payload: {
          status: 'error',
          message: 'No se encontro un registro de entrada activo para el usuario',
        },
      };
    }

    await ensureVehicleForRegistro(registro);

    registro.fechaSalida = now;
    registro.horaSalida = formatTime(now);
    registro.duracionSesion = formatDuration(registro.fechaEntrada, now);
    registro.cierreForzado = false;
    registro.cierreMotivo = undefined;
    registro.alertStatus = ALERT_STATUSES.RESOLVED;
    registro.alertResolvedAt = now;
    const shouldSkipVehicleUpdate = !!(exitObservation && !vehicleId);

    if (vehicle) {
      registro.vehiculo = vehicle._id;
    }

    const shouldUpdateUserState = !isUserBlocked(user);
    if (shouldUpdateUserState) {
      user.estado = 'inactivo';
    }
    if (exitObservation) {
      registro.observaciones = registro.observaciones
        ? `${registro.observaciones}\n${exitObservation}`
        : exitObservation;
    }

    const vehicleUpdatePromise = shouldSkipVehicleUpdate ? Promise.resolve(null) : updateVehicleState('inactivo');
    const userSavePromise = shouldUpdateUserState ? user.save() : Promise.resolve();

    const [, , updatedVehiclePayload] = await Promise.all([
      registro.save(),
      userSavePromise,
      vehicleUpdatePromise,
    ]);
    await populateRegistroForResponse(registro);

    return {
      statusCode: 200,
      payload: {
        status: 'success',
        message:
          normalizedDirection === 'exit'
            ? 'Salida registrada correctamente'
            : 'Registro de salida actualizado correctamente',
        data: registro,
        user: sanitizeUser(user),
        vehicle: updatedVehiclePayload || sanitizeVehicle(vehicle),
        action: 'exit',
      },
    };
  }

  if (normalizedDirection === 'entry') {
    const registroAbierto = await findRegistroAbiertoParaUsuario(user._id);
    if (registroAbierto) {
      return {
        statusCode: 400,
        payload: {
          status: 'error',
          message:
            'El usuario ya tiene un ingreso activo pendiente por cerrar. Registra la salida antes de crear otro ingreso.',
        },
      };
    }
  }

  const shouldUpdateUserState = !isUserBlocked(user);
  if (shouldUpdateUserState) {
    user.estado = 'activo';
    await user.save();
  }

  const registro = new Registro({
    usuario: user._id,
    administrador: adminId,
    fechaEntrada: now,
    horaEntrada: formatTime(now),
    vehiculo: vehicle ? vehicle._id : undefined,
    cierreForzado: false,
    cierreMotivo: undefined,
    alertStatus: ALERT_STATUSES.NONE,
    alertRaisedAt: null,
    alertResolvedAt: null,
  });

  const [, updatedVehiclePayload] = await Promise.all([registro.save(), updateVehicleState('activo')]);
  await populateRegistroForResponse(registro);

  return {
    statusCode: 201,
    payload: {
      status: 'success',
      message:
        normalizedDirection === 'entry'
          ? 'Ingreso registrado correctamente'
          : 'Registro de ingreso creado correctamente',
      data: registro,
      user: sanitizeUser(user),
      vehicle: updatedVehiclePayload || sanitizeVehicle(vehicle),
      action: 'entry',
    },
  };
};

// Crear un nuevo registro manual
exports.createRegistro = async (req, res) => {
  try {
    const permission = ensureRegistroPermission(req.user);
    if (!permission.allowed) {
      return res.status(permission.status).json({
        status: 'error',
        message: permission.message,
      });
    }

    const { registroPayload } = await buildManualRegistroPayload(req.body || {}, req.user);
    const nuevoRegistro = new Registro(registroPayload);
    await nuevoRegistro.save();
    await populateRegistroForResponse(nuevoRegistro);

    return res.status(201).json({
      status: 'success',
      message: 'Registro creado con exito',
      registro: normalizeAlertMetadata(nuevoRegistro),
    });
  } catch (error) {
    const statusCode = error.status || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Error al crear registro',
    });
  }
};

// Obtener todos los registros (con datos de usuario y admin)
exports.getRegistros = async (req, res) => {
  try {
    const permission = ensureRegistroPermission(req.user);
    if (!permission.allowed) {
      return res.status(permission.status).json({
        status: 'error',
        message: permission.message,
      });
    }

    const rangeDays = clampRangeDays(req.query.rangeDays || req.query.days);
    const fromDate = ensureDate(req.query.from);
    const toDate = ensureDate(req.query.to);
    const activeOnly = toBoolean(req.query.activeOnly);
    const limit = parseQueryLimit(req.query.limit);

    const filters = {};
    const fechaEntradaFilter = buildFechaEntradaFilter({ from: fromDate, to: toDate, rangeDays });
    if (fechaEntradaFilter) {
      filters.fechaEntrada = fechaEntradaFilter;
    }
    if (activeOnly) {
      filters.$or = [{ fechaSalida: null }, { fechaSalida: { $exists: false } }];
    }

    const query = Registro.find(filters)
      .populate("usuario", "nombre apellido email cedula permisoSistema estado rolAcademico telefono")
      .populate("administrador", "nombre apellido email permisoSistema")
      .populate("vehiculo", "type brand model color plate estado")
      .sort({ fechaEntrada: -1 });

    if (limit) {
      query.limit(limit);
    }

    const registros = await query.lean();
    const data = registros.map((registro) => normalizeAlertMetadata(registro));

    return res.status(200).json({
      status: 'success',
      data,
      meta: {
        count: data.length,
        filters: {
          rangeDays: rangeDays || null,
          from: fromDate ? fromDate.toISOString() : null,
          to: toDate ? toDate.toISOString() : null,
          activeOnly,
          limit: limit || null,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: "Error al obtener registros",
      error: error.message,
    });
  }
};

// Obtener un registro por ID
exports.getRegistroById = async (req, res) => {
  try {
    const permission = ensureRegistroPermission(req.user);
    if (!permission.allowed) {
      return res.status(permission.status).json({
        status: 'error',
        message: permission.message,
      });
    }

    const registro = await Registro.findById(req.params.id)
      .populate("usuario", "nombre apellido email cedula permisoSistema estado rolAcademico telefono")
      .populate("administrador", "nombre apellido email permisoSistema")
      .populate("vehiculo", "type brand model color plate estado");

    if (!registro) {
      return res.status(404).json({
        status: 'error',
        message: "Registro no encontrado",
      });
    }

    return res.status(200).json({
      status: 'success',
      registro: normalizeAlertMetadata(registro),
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: "Error al obtener registro",
      error: error.message,
    });
  }
};

// Actualizar un registro
exports.updateRegistro = async (req, res) => {
  try {
    const permission = ensureRegistroPermission(req.user);
    if (!permission.allowed) {
      return res.status(permission.status).json({
        status: 'error',
        message: permission.message,
      });
    }

    const registro = await Registro.findById(req.params.id);

    if (!registro) {
      return res.status(404).json({
        status: 'error',
        message: "Registro no encontrado",
      });
    }

    await applyRegistroUpdates(registro, req.body || {});
    await registro.save();
    await populateRegistroForResponse(registro);

    return res.status(200).json({
      status: 'success',
      message: "Registro actualizado",
      registro: normalizeAlertMetadata(registro),
    });
  } catch (error) {
    return res.status(error.status || 400).json({
      status: 'error',
      message: error.message || "Error al actualizar registro",
    });
  }
};

// Eliminar un registro
exports.deleteRegistro = async (req, res) => {
  try {
    const permission = ensureRegistroPermission(req.user);
    if (!permission.allowed) {
      return res.status(permission.status).json({
        status: 'error',
        message: permission.message,
      });
    }

    const registroEliminado = await Registro.findByIdAndDelete(req.params.id);
    if (!registroEliminado) {
      return res.status(404).json({
        status: 'error',
        message: "Registro no encontrado",
      });
    }

    return res.status(200).json({
      status: 'success',
      message: "Registro eliminado con exito",
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: "Error al eliminar registro",
      error: error.message,
    });
  }
};

// Listar alertas activas
exports.listAlertas = async (req, res) => {
  try {
    const permission = ensureRegistroPermission(req.user);
    if (!permission.allowed) {
      return res.status(permission.status).json({
        status: 'error',
        message: permission.message,
      });
    }

    const thresholdMinutes = resolveAlertThreshold(req.query?.thresholdMinutes);
    const registros = await Registro.find({
      $or: [{ fechaSalida: null }, { fechaSalida: { $exists: false } }],
    })
      .populate("usuario", "nombre apellido email cedula permisoSistema estado rolAcademico telefono")
      .populate("administrador", "nombre apellido email permisoSistema")
      .populate("vehiculo", "type brand model color plate estado")
      .sort({ fechaEntrada: 1 });

    const data = [];

    for (const registro of registros) {
      const { elapsedMinutes, shouldAlert } = await ensureAlertStateForRegistro(
        registro,
        thresholdMinutes,
        { persist: true }
      );

      if (
        shouldAlert ||
        registro.alertStatus === ALERT_STATUSES.PENDING ||
        registro.alertStatus === ALERT_STATUSES.ACK
      ) {
        const normalized = normalizeAlertMetadata(registro);
        normalized.alertElapsedMinutes = elapsedMinutes;
        normalized.alertThresholdMinutes = thresholdMinutes;
        data.push(normalized);
      }
    }

    return res.status(200).json({
      status: 'success',
      thresholdMinutes,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'No fue posible obtener las alertas',
      error: error.message,
    });
  }
};

// Actualizar estado de alerta
exports.updateAlertStatus = async (req, res) => {
  try {
    const permission = ensureRegistroPermission(req.user);
    if (!permission.allowed) {
      return res.status(permission.status).json({
        status: 'error',
        message: permission.message,
      });
    }

    const { status, notes } = req.body || {};
    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';
    const allowedStatuses = Object.values(ALERT_STATUSES);

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        status: 'error',
        message: 'Estado de alerta no valido.',
      });
    }

    const registro = await Registro.findById(req.params.id)
      .populate("usuario", "nombre apellido email cedula permisoSistema estado rolAcademico telefono")
      .populate("administrador", "nombre apellido email permisoSistema")
      .populate("vehiculo", "type brand model color plate estado");

    if (!registro) {
      return res.status(404).json({
        status: 'error',
        message: 'Registro no encontrado',
      });
    }

    if (normalizedStatus === ALERT_STATUSES.RESOLVED && !registro.fechaSalida) {
      return res.status(400).json({
        status: 'error',
        message: 'No puedes resolver la alerta mientras el registro siga abierto. Registra la salida primero.',
      });
    }

    registro.alertStatus = normalizedStatus;

    if (normalizedStatus === ALERT_STATUSES.RESOLVED) {
      registro.alertResolvedAt = new Date();
    } else if (normalizedStatus === ALERT_STATUSES.NONE) {
      registro.alertRaisedAt = null;
      registro.alertResolvedAt = null;
    } else if (!registro.alertRaisedAt) {
      registro.alertRaisedAt = new Date();
    }

    if (notes !== undefined) {
      registro.alertNotes = sanitizeString(notes) || undefined;
    }

    await registro.save();

    return res.status(200).json({
      status: 'success',
      message: 'Estado de alerta actualizado',
      registro: normalizeAlertMetadata(registro),
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'No fue posible actualizar la alerta',
      error: error.message,
    });
  }
};



const handleScanAndUpdateUser = async (req, res) => {
  try {
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        status: 'error',
        message: 'Sesion requerida para registrar ingresos',
      });
    }

    const userId = req.body?.userId;

    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'El identificador del usuario es obligatorio',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado',
      });
    }

    if (isUserBlocked(user)) {
      return res.status(403).json({
        status: 'error',
        code: USER_BLOCKED_CODE,
        message: 'El usuario esta bloqueado y no puede registrar accesos.',
      });
    }

    const direction = req.body?.direction;
    const vehicleId = req.body?.vehicleId;
    const exitObservationRaw = typeof req.body?.exitObservation === 'string' ? req.body.exitObservation.trim() : '';
    const result = await procesarTransicionDeUsuario({
      user,
      adminId,
      direction,
      vehicleId,
      exitObservation: exitObservationRaw || undefined,
    });

    return res.status(result.statusCode).json(result.payload);
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al procesar el registro del escaneo',
      error: error.message,
    });
  }
};

// Crear o actualizar un registro a partir de un escaneo validado
exports.createRegistroFromScan = handleScanAndUpdateUser;
exports.updateUserEstadoFromScan = handleScanAndUpdateUser;

exports.resetScanData = async (req, res) => {
  try {
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        status: 'error',
        message: 'Sesion requerida para limpiar el escaneo',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Datos del escaneo limpiados correctamente',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al limpiar los datos del escaneo',
      error: error.message,
    });
  }
};
