const bcrypt = require("bcrypt");
const { User } = require("../models/user.model");
const { createToken } = require("../services/jwt.service");

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: "error",
      message: "Email y contraseña son obligatorios",
    });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "El usuario no existe",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({
        status: "error",
        message: "Credenciales inválidas",
      });
    }

    const token = createToken(user);
    const { password: _, ...userData } = user.toObject();

    return res.status(200).json({
      status: "success",
      message: "Sesión iniciada correctamente",
      token,
      user: userData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Error al iniciar sesión",
      error: error.message,
    });
  }
};

const profile = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      status: "error",
      message: "Token no válido",
    });
  }

  const user = await User.findById(userId).select("-password");

  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "Usuario no encontrado",
    });
  }

  return res.status(200).json({
    status: "success",
    user,
  });
};

module.exports = {
  login,
  profile,
};
