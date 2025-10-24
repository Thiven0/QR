const { Schema, model } = require("mongoose");

const VEHICLE_TYPES = ["Carro", "Moto", "Bicicleta"];

const vehicleSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: VEHICLE_TYPES,
      required: true,
    },
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    color: { type: String, trim: true },
    plate: { type: String, trim: true, uppercase: true },
    notes: { type: String, trim: true },
    imagen: { type: String, trim: true },
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
  Vehicle: model("Vehicle", vehicleSchema, "vehicles"),
  VEHICLE_TYPES,
};
