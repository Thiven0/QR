const { Schema, model } = require("mongoose");

const PERMISOS_SISTEMA = ["Administrador", "Celador", "Usuario"];

const userSchema = new Schema(
  {
    cedula: { type: String, trim: true },
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    RH: { type: String, uppercase: true, trim: true },
    facultad: { type: String, trim: true },
    telefono: { type: String, trim: true },
    imagen: { type: String, trim: true },
    imagenQR: { type: String, trim: true },
    rolAcademico: { type: String, trim: true },
    permisoSistema: {
      type: String,
      enum: PERMISOS_SISTEMA,
      required: true,
      default: "Usuario",
    },
    estado: {
      type: String,
      enum: ["activo", "inactivo"],
      default: "inactivo",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);



module.exports = {
  PERMISOS_SISTEMA,
  User: model("Users", userSchema, "users"),
};