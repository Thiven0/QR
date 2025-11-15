const { Schema, model } = require("mongoose");

const PERMISOS_SISTEMA = ["Administrador", "Celador", "Usuario"];
const USER_ESTADOS = ["activo", "inactivo", "bloqueado"];

const documentExtractedDataSchema = new Schema(
  {
    cedula: { type: String, trim: true },
    nombres: { type: String, trim: true },
    apellidos: { type: String, trim: true },
    fechaNacimiento: { type: String, trim: true },
    rawText: { type: String },
    confidence: { type: Number, min: 0, max: 100 },
    fieldsDetected: [{ type: String, trim: true }],
  },
  { _id: false }
);

const documentIdentitySchema = new Schema(
  {
    photo: { type: String, trim: true },
    extractedData: { type: documentExtractedDataSchema, default: undefined },
    updatedAt: { type: Date },
  },
  { _id: false }
);

const dataConsentSchema = new Schema(
  {
    accepted: { type: Boolean, default: false },
    acceptedAt: { type: Date },
    documentUrl: { type: String, trim: true },
  },
  { _id: false }
);

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
    documentIdentity: { type: documentIdentitySchema, default: undefined },
    dataConsent: { type: dataConsentSchema, default: undefined },
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
