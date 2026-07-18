require("dotenv").config();

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const connectDatabase = require("../src/config/database");
const { User } = require("../src/models/user.model");

const DEFAULT_ADMIN_NAME = "Admin";
const DEFAULT_ADMIN_EMAIL = "admin@admin.com";
const DEFAULT_ADMIN_PASSWORD = "admin1234";
const DEFAULT_ADMIN_IMAGE = "https://ui-avatars.com/api/?name=Admin&background=0f766e&color=ffffff";

const getSeedConfig = () => ({
  nombre: (process.env.ADMIN_SEED_NAME || DEFAULT_ADMIN_NAME).trim(),
  email: (process.env.ADMIN_SEED_EMAIL || process.env.EVALUATION_EMAIL || DEFAULT_ADMIN_EMAIL)
    .trim()
    .toLowerCase(),
  password: process.env.ADMIN_SEED_PASSWORD || process.env.EVALUATION_PASSWORD || DEFAULT_ADMIN_PASSWORD,
  imagen: (process.env.ADMIN_SEED_IMAGE || DEFAULT_ADMIN_IMAGE).trim(),
});

const seedAdmin = async () => {
  const adminConfig = getSeedConfig();

  if (!adminConfig.nombre || !adminConfig.email || !adminConfig.password || !adminConfig.imagen) {
    throw new Error("La configuracion del admin inicial es invalida");
  }

  await connectDatabase();

  const existingUser = await User.findOne({ email: adminConfig.email });
  if (existingUser) {
    console.log(`El usuario administrador ya existe: ${adminConfig.email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(adminConfig.password, 10);

  const user = new User({
    nombre: adminConfig.nombre,
    email: adminConfig.email,
    password: hashedPassword,
    imagen: adminConfig.imagen,
    permisoSistema: "Administrador",
    rolAcademico: "Administrador",
    estado: "activo",
  });

  await user.save();

  console.log("Administrador inicial creado correctamente.");
  console.log(`Email   : ${adminConfig.email}`);
  console.log(`Password: ${adminConfig.password}`);
};

(async () => {
  try {
    await seedAdmin();
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }
  }
})();
