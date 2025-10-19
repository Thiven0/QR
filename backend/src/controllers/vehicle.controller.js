const { Vehicle, VEHICLE_TYPES } = require("../models/vehicle.model");
const { User } = require("../models/user.model");

const normalizeType = (type) => {
  if (!type) return null;
  const normalized = type.trim().toLowerCase();
  const match = VEHICLE_TYPES.find(
    (value) => value.toLowerCase() === normalized
  );
  return match || null;
};

const normalizeStatus = (status) => {
  if (!status) return undefined;
  const normalized = String(status).trim().toLowerCase();
  if (["activo", "inactivo"].includes(normalized)) {
    return normalized;
  }
  return undefined;
};

const sanitizePayload = (payload = {}) => {
  const type = normalizeType(payload.type);
  const estado = normalizeStatus(payload.estado);
  let imagen;

  if (payload.imagen === null) {
    imagen = null;
  } else if (typeof payload.imagen === "string") {
    const trimmedImage = payload.imagen.trim();
    imagen = trimmedImage || null;
  }

  return {
    owner: payload.owner,
    type,
    brand: payload.brand?.trim(),
    model: payload.model?.trim(),
    color: payload.color?.trim(),
    plate: payload.plate?.trim(),
    notes: payload.notes?.trim(),
    ...(imagen !== undefined ? { imagen } : {}),
    ...(estado ? { estado } : {}),
  };
};

const ensureOwnerExists = async (ownerId) => {
  if (!ownerId) {
    return {
      ok: false,
      status: 400,
      message: "El identificador del usuario es obligatorio",
    };
  }

  const user = await User.findById(ownerId).select("_id");
  if (!user) {
    return {
      ok: false,
      status: 404,
      message: "Usuario no encontrado",
    };
  }

  return { ok: true };
};

const createVehicle = async (req, res) => {
  try {
    const payload = sanitizePayload(req.body);

    const ownerCheck = await ensureOwnerExists(payload.owner);
    if (!ownerCheck.ok) {
      return res.status(ownerCheck.status).json({
        status: "error",
        message: ownerCheck.message,
      });
    }

    if (!payload.type) {
      return res.status(400).json({
        status: "error",
        message: "El tipo de vehiculo es obligatorio",
      });
    }

    const vehicle = await Vehicle.create(payload);

    return res.status(201).json({
      status: "success",
      message: "Vehiculo registrado correctamente",
      data: vehicle,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "No fue posible registrar el vehiculo",
      error: error.message,
    });
  }
};

const listVehicles = async (_req, res) => {
  try {
    const vehicles = await Vehicle.find().populate("owner", "nombre apellido cedula email permisoSistema");

    return res.status(200).json({
      status: "success",
      data: vehicles,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "No fue posible obtener los vehiculos",
      error: error.message,
    });
  }
};

const getVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "El identificador del vehiculo es obligatorio",
      });
    }

    const vehicle = await Vehicle.findById(id).populate("owner", "nombre apellido cedula email permisoSistema");

    if (!vehicle) {
      return res.status(404).json({
        status: "error",
        message: "Vehiculo no encontrado",
      });
    }

    return res.status(200).json({
      status: "success",
      data: vehicle,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "No fue posible obtener el vehiculo",
      error: error.message,
    });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "El identificador del vehiculo es obligatorio",
      });
    }

    const payload = sanitizePayload(req.body);
    if (payload.owner) {
      const ownerCheck = await ensureOwnerExists(payload.owner);
      if (!ownerCheck.ok) {
        return res.status(ownerCheck.status).json({
          status: "error",
          message: ownerCheck.message,
        });
      }
    }

    if (payload.type === null && req.body.type !== undefined) {
      return res.status(400).json({
        status: "error",
        message: "El tipo de vehiculo debe ser Carro, Moto o Bicicleta",
      });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      {
        ...payload,
        estado: payload.estado || undefined,
      },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        status: "error",
        message: "Vehiculo no encontrado",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Vehiculo actualizado correctamente",
      data: vehicle,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "No fue posible actualizar el vehiculo",
      error: error.message,
    });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "El identificador del vehiculo es obligatorio",
      });
    }

    const result = await Vehicle.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({
        status: "error",
        message: "Vehiculo no encontrado",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Vehiculo eliminado correctamente",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "No fue posible eliminar el vehiculo",
      error: error.message,
    });
  }
};

const listVehiclesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const ownerCheck = await ensureOwnerExists(userId);
    if (!ownerCheck.ok) {
      return res.status(ownerCheck.status).json({
        status: "error",
        message: ownerCheck.message,
      });
    }

    const vehicles = await Vehicle.find({ owner: userId });

    return res.status(200).json({
      status: "success",
      data: vehicles,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "No fue posible obtener los vehiculos del usuario",
      error: error.message,
    });
  }
};

const toggleVehicleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "El identificador del vehiculo es obligatorio",
      });
    }

    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return res.status(404).json({
        status: "error",
        message: "Vehiculo no encontrado",
      });
    }

    const nextStatus = vehicle.estado === "activo" ? "inactivo" : "activo";
    vehicle.estado = nextStatus;
    await vehicle.save();

    let sanitizedOwner = null;

    if (vehicle.owner) {
      const owner = await User.findById(vehicle.owner);
      if (owner) {
        if (owner.estado !== nextStatus) {
          owner.estado = nextStatus;
          await owner.save();
        }
        const ownerObject = owner.toObject();
        delete ownerObject.password;
        sanitizedOwner = ownerObject;
      }
    }

    return res.status(200).json({
      status: "success",
      message: `Vehiculo marcado como ${nextStatus}`,
      data: vehicle,
      user: sanitizedOwner,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "No fue posible actualizar el estado del vehiculo",
      error: error.message,
    });
  }
};

module.exports = {
  createVehicle,
  listVehicles,
  getVehicle,
  updateVehicle,
  deleteVehicle,
  listVehiclesByUser,
  toggleVehicleStatus,
};
