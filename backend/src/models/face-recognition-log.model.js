const { Schema, model } = require("mongoose");

const FACE_RECOGNITION_STATUSES = ["matched", "unmatched", "error"];

const faceRecognitionLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "Users" },
    matchedUser: { type: Schema.Types.ObjectId, ref: "Users", default: null },
    status: {
      type: String,
      enum: FACE_RECOGNITION_STATUSES,
      required: true,
    },
    match: {
      type: Boolean,
      default: false,
    },
    score: { type: Number, default: null },
    threshold: { type: Number, required: true },
    detectionScore: { type: Number, default: null },
    comparedProfiles: { type: Number, default: 0 },
    errorMessage: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

faceRecognitionLogSchema.index({ createdAt: -1 });
faceRecognitionLogSchema.index({ status: 1, createdAt: -1 });
faceRecognitionLogSchema.index({ matchedUser: 1, createdAt: -1 });
faceRecognitionLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = {
  FACE_RECOGNITION_STATUSES,
  FaceRecognitionLog: model("FaceRecognitionLog", faceRecognitionLogSchema, "face_recognition_logs"),
};
