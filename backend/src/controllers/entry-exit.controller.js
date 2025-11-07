const Registro = require("../models/entry-exit.model.js");
const { User } = require("../models/user.model");
const { Vehicle } = require("../models/vehicle.model");

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

const procesarTransicionDeUsuario = async ({ user, adminId, direction, vehicleId }) => {
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
    if (vehicle) {
      registro.vehiculo = vehicle._id;
    }

    user.estado = 'inactivo';

    const [, , updatedVehiclePayload] = await Promise.all([
      registro.save(),
      user.save(),
      updateVehicleState('inactivo'),
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

  user.estado = 'activo';
  await user.save();

  const registro = new Registro({
    usuario: user._id,
    administrador: adminId,
    fechaEntrada: now,
    horaEntrada: formatTime(now),
    vehiculo: vehicle ? vehicle._id : undefined,
    cierreForzado: false,
    cierreMotivo: undefined,
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

// Crear un nuevo registro
exports.createRegistro = async (req, res) => {
  try {
    const nuevoRegistro = new Registro(req.body);
    await nuevoRegistro.save();
    res.status(201).json({ message: "Registro creado con exito", registro: nuevoRegistro });
  } catch (error) {
    res.status(400).json({ message: "Error al crear registro", error: error.message });
  }
};

// Obtener todos los registros (con datos de usuario y admin)
exports.getRegistros = async (req, res) => {
  try {
    const registros = await Registro.find()
      .populate("usuario", "nombre apellido email")
      .populate("administrador", "nombre cargo email")
      .populate("vehiculo", "type brand model color plate estado");

    res.status(200).json(registros);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener registros", error: error.message });
  }
};

// Obtener un registro por ID
exports.getRegistroById = async (req, res) => {
  try {
    const registro = await Registro.findById(req.params.id)
      .populate("usuario", "nombre apellido email")
      .populate("administrador", "nombre cargo email");

    if (!registro) return res.status(404).json({ message: "Registro no encontrado" });
    res.status(200).json(registro);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener registro", error: error.message });
  }
};

// Actualizar un registro
exports.updateRegistro = async (req, res) => {
  try {
    const registroActualizado = await Registro.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("usuario", "nombre apellido email")
     .populate("administrador", "nombre cargo email");

    if (!registroActualizado) return res.status(404).json({ message: "Registro no encontrado" });
    res.status(200).json({ message: "Registro actualizado", registro: registroActualizado });
  } catch (error) {
    res.status(400).json({ message: "Error al actualizar registro", error: error.message });
  }
};

// Eliminar un registro
exports.deleteRegistro = async (req, res) => {
  try {
    const registroEliminado = await Registro.findByIdAndDelete(req.params.id);
    if (!registroEliminado) return res.status(404).json({ message: "Registro no encontrado" });
    res.status(200).json({ message: "Registro eliminado con exito" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar registro", error: error.message });
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

    const direction = req.body?.direction;
    const vehicleId = req.body?.vehicleId;
    const result = await procesarTransicionDeUsuario({ user, adminId, direction, vehicleId });

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
