const { Schema, model } = require("mongoose");

const PERMISOS_SISTEMA = ["Administrador", "Celador", "Usuario"];
const USER_ESTADOS = ["activo", "inactivo", "bloqueado"];

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
      enum: USER_ESTADOS,
      default: "inactivo",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

userSchema.index({ cedula: 1 }, { unique: true, sparse: true });
userSchema.index({ permisoSistema: 1, estado: 1 });
userSchema.index({ rolAcademico: 1 });
userSchema.index({ facultad: 1 });
userSchema.index({ created_at: -1 });
module.exports = {
  PERMISOS_SISTEMA,
  USER_ESTADOS,
  User: model("Users", userSchema, "users"),
};
