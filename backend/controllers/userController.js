const Usuario = require("../models/user");

const registerUser = async (req, res) => {
  let params = req.body;

  // Validación de campos requeridos
  const missingFields = {};
  if (!params.cedula) missingFields.cedula = "Campo obligatorio";
  if (!params.rol) missingFields.rol = "Campo obligatorio";
  if (!params.nombre) missingFields.nombre = "Campo obligatorio";
  if (!params.apellido) missingFields.apellido = "Campo obligatorio";
  if (!params.rh) missingFields.rh = "Campo obligatorio";
  if (!params.facultad) missingFields.facultad = "Campo obligatorio";
  if (!params.telefono) missingFields.telefono = "Campo obligatorio";
  if (!params.correo) missingFields.correo = "Campo obligatorio";
  if (!params.estado) missingFields.estado = "Campo obligatorio";

  if (Object.keys(missingFields).length > 0) {
    return res.status(400).json({
      status: "error",
      errors: missingFields,
    });
  }

  try {
    // Verificar si el usuario ya existe (por correo o cédula)
    const existingUser = await Usuario.findOne({
      $or: [{ correo: params.correo }, { cedula: params.cedula }],
    });
    if (existingUser) {
      return res.status(200).json({
        status: "success",
        message: "El usuario ya existe",
      });
    }

    // Crear un nuevo usuario
    const newUser = new Usuario(params);
    const userStored = await newUser.save();

    if (!userStored) {
      return res.status(500).json({
        status: "error",
        message: "Error al guardar el usuario",
      });
    }

    return res.status(201).json({
      status: "success",
      message: "Usuario registrado correctamente",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Error al registrar el usuario",
      error: error.message,
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await Usuario.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener usuarios", error });
  }
};

module.exports = {
  registerUser,
  getAllUsers,
};