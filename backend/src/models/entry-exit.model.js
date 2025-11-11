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
    observaciones: { type: String, trim: true },
    alertStatus: {
      type: String,
      enum: ["none", "pending", "acknowledged", "resolved"],
      default: "none",
    },
    alertRaisedAt: { type: Date },
    alertResolvedAt: { type: Date },
    alertNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

RegistroSchema.index({ usuario: 1, fechaEntrada: -1 });
RegistroSchema.index({ fechaEntrada: -1 });
RegistroSchema.index({ fechaSalida: -1 });
RegistroSchema.index({ alertStatus: 1, fechaEntrada: -1 });
module.exports = model("Registro", RegistroSchema, "registros");
