const { Schema, model } = require("mongoose");

const RegistroSchema = new Schema(
  {
    usuario: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    administrador: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    vehiculo: { type: Schema.Types.ObjectId, ref: "Vehicle" },

    // Campos de entrada y salida
    fechaEntrada: { type: Date, required: true },
    fechaSalida: { type: Date },

    horaEntrada: { type: String, required: true },
    horaSalida: { type: String },

    // Duración total de la sesión en formato HH:mm
    duracionSesion: { type: String },
    cierreForzado: { type: Boolean, default: false },
    cierreMotivo: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = model("Registro", RegistroSchema, "registros");
