const { Schema, model } = require("mongoose");

const candidateSummarySchema = new Schema(
  {
    rank: { type: Number, required: true },
    identity: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    score: { type: Number, required: true },
  },
  { _id: false }
);

const faceEvaluationProbeSchema = new Schema(
  {
    runId: { type: String, required: true, index: true },
    probeKey: { type: String, required: true },
    identity: { type: String, required: true },
    isKnown: { type: Boolean, required: true },
    sourceFile: { type: String, required: true },
    preparedFile: { type: String, required: true },
    sourceSha256: { type: String, required: true },
    embedding: { type: [Number], select: false, default: undefined },
    embeddingDimensions: { type: Number, default: null },
    detectionScore: { type: Number, default: null },
    top1: { type: candidateSummarySchema, default: null },
    top2: { type: candidateSummarySchema, default: null },
    top1Top2Margin: { type: Number, default: null },
    expectedIdentityRank: { type: Number, default: null },
    profilesEvaluated: { type: Number, default: 0 },
    timings: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "extracting", "comparing", "completed", "error"],
      default: "pending",
    },
    error: { type: Schema.Types.Mixed, default: null },
    errorStage: {
      type: String,
      enum: ["read", "extraction", "validation", "comparison", "persistence", null],
      default: null,
    },
  },
  { timestamps: true }
);

faceEvaluationProbeSchema.index({ runId: 1, probeKey: 1 }, { unique: true });
faceEvaluationProbeSchema.index({ runId: 1, status: 1 });
faceEvaluationProbeSchema.index({ runId: 1, isKnown: 1 });

module.exports = {
  FaceEvaluationProbe: model(
    "FaceEvaluationProbe",
    faceEvaluationProbeSchema,
    "face_evaluation_probes"
  ),
};
