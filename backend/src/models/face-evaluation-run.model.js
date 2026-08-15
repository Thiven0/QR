const { Schema, model } = require("mongoose");

const faceEvaluationRunSchema = new Schema(
  {
    runId: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      enum: ["preparing", "enrolling", "evaluating", "reporting", "completed", "failed", "cleaning", "cleaned"],
      default: "preparing",
    },
    sourceDirectory: { type: String, required: true },
    outputDirectory: { type: String, required: true },
    apiBaseUrl: { type: String, required: true },
    options: { type: Schema.Types.Mixed, default: {} },
    counts: { type: Schema.Types.Mixed, default: {} },
    thresholds: { type: [Number], default: [] },
    thresholdMetrics: { type: [Schema.Types.Mixed], default: [] },
    timingSummary: { type: Schema.Types.Mixed, default: {} },
    error: { type: Schema.Types.Mixed, default: null },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    cleanedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

faceEvaluationRunSchema.index({ createdAt: -1 });
faceEvaluationRunSchema.index({ status: 1, createdAt: -1 });

module.exports = {
  FaceEvaluationRun: model("FaceEvaluationRun", faceEvaluationRunSchema, "face_evaluation_runs"),
};
