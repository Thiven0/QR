const { Schema, model } = require("mongoose");

const candidateCalculationSchema = new Schema(
  {
    rank: { type: Number, required: true },
    identity: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    dimensions: { type: Number, required: true },
    dotProduct: { type: Number, required: true },
    querySquaredMagnitude: { type: Number, required: true },
    profileSquaredMagnitude: { type: Number, required: true },
    queryNorm: { type: Number, required: true },
    profileNorm: { type: Number, required: true },
    denominator: { type: Number, required: true },
    score: { type: Number, required: true },
    valid: { type: Boolean, required: true },
    error: { type: String, default: null },
  },
  { _id: false }
);

const faceEvaluationScoreChunkSchema = new Schema(
  {
    runId: { type: String, required: true, index: true },
    probe: { type: Schema.Types.ObjectId, ref: "FaceEvaluationProbe", required: true },
    probeKey: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    candidates: { type: [candidateCalculationSchema], default: [] },
    candidateCount: { type: Number, required: true },
  },
  { timestamps: true }
);

faceEvaluationScoreChunkSchema.index({ runId: 1, probe: 1, chunkIndex: 1 }, { unique: true });
faceEvaluationScoreChunkSchema.index({ runId: 1, probeKey: 1 });
faceEvaluationScoreChunkSchema.index({ runId: 1, probeKey: 1, chunkIndex: 1 });

module.exports = {
  FaceEvaluationScoreChunk: model(
    "FaceEvaluationScoreChunk",
    faceEvaluationScoreChunkSchema,
    "face_evaluation_score_chunks"
  ),
};
