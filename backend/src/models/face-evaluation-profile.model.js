const { Schema, model } = require("mongoose");

const enrollmentAttemptSchema = new Schema(
  {
    file: { type: String, required: true },
    endpoint: { type: String, required: true },
    success: { type: Boolean, required: true },
    detectionScore: { type: Number, default: null },
    embeddingDimensions: { type: Number, default: null },
    timings: { type: Schema.Types.Mixed, default: {} },
    error: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const faceEvaluationProfileSchema = new Schema(
  {
    runId: { type: String, required: true, index: true },
    identity: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "Users", default: null },
    email: { type: String, trim: true },
    sourceFile: { type: String, default: null },
    pendingEnrollmentFile: { type: String, default: null },
    preparedFile: { type: String, default: null },
    uploadedProfilePath: { type: String, default: null },
    uploadedProfilePaths: { type: [String], default: [] },
    embedding: { type: [Number], select: false, default: undefined },
    embeddingDimensions: { type: Number, default: null },
    detectionScore: { type: Number, default: null },
    extractionTimings: { type: Schema.Types.Mixed, default: {} },
    enrollmentAttempts: { type: [enrollmentAttemptSchema], default: [] },
    imageCount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "enrolling", "ready", "error", "cleaned"],
      default: "pending",
    },
    error: { type: Schema.Types.Mixed, default: null },
    cleanedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

faceEvaluationProfileSchema.index({ runId: 1, identity: 1 }, { unique: true });
faceEvaluationProfileSchema.index({ runId: 1, user: 1 });
faceEvaluationProfileSchema.index({ runId: 1, status: 1 });

module.exports = {
  FaceEvaluationProfile: model(
    "FaceEvaluationProfile",
    faceEvaluationProfileSchema,
    "face_evaluation_profiles"
  ),
};
