const { performance } = require("perf_hooks");

const EMBEDDING_DIMENSIONS = 512;

const round = (value, digits = 6) => {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
};

const ratioPercent = (numerator, denominator) => (
  denominator ? round((numerator / denominator) * 100, 4) : 0
);

const validateEmbedding = (embedding) => {
  if (!Array.isArray(embedding)) {
    return { valid: false, error: "El embedding no es un arreglo" };
  }
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    return {
      valid: false,
      error: `Se esperaban ${EMBEDDING_DIMENSIONS} dimensiones y se recibieron ${embedding.length}`,
    };
  }
  if (embedding.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    return { valid: false, error: "El embedding contiene valores que no son numeros finitos" };
  }
  const squaredMagnitude = embedding.reduce((total, value) => total + value * value, 0);
  if (squaredMagnitude === 0) {
    return { valid: false, error: "El embedding tiene magnitud cero" };
  }
  return { valid: true, embedding: [...embedding] };
};

const compareEmbeddings = (queryEmbedding, profileEmbedding) => {
  const queryValidation = validateEmbedding(queryEmbedding);
  const profileValidation = validateEmbedding(profileEmbedding);
  if (!queryValidation.valid || !profileValidation.valid) {
    return {
      dimensions: 0,
      dotProduct: 0,
      querySquaredMagnitude: 0,
      profileSquaredMagnitude: 0,
      queryNorm: 0,
      profileNorm: 0,
      denominator: 0,
      score: -1,
      valid: false,
      error: queryValidation.error || profileValidation.error,
    };
  }

  let dotProduct = 0;
  let querySquaredMagnitude = 0;
  let profileSquaredMagnitude = 0;
  for (let index = 0; index < EMBEDDING_DIMENSIONS; index += 1) {
    const queryValue = queryValidation.embedding[index];
    const profileValue = profileValidation.embedding[index];
    dotProduct += queryValue * profileValue;
    querySquaredMagnitude += queryValue * queryValue;
    profileSquaredMagnitude += profileValue * profileValue;
  }

  const queryNorm = Math.sqrt(querySquaredMagnitude);
  const profileNorm = Math.sqrt(profileSquaredMagnitude);
  const denominator = queryNorm * profileNorm;
  const valid = denominator > 0;

  return {
    dimensions: EMBEDDING_DIMENSIONS,
    dotProduct,
    querySquaredMagnitude,
    profileSquaredMagnitude,
    queryNorm,
    profileNorm,
    denominator,
    score: valid ? dotProduct / denominator : -1,
    valid,
    error: valid ? null : "Uno de los embeddings tiene magnitud cero",
  };
};

const rankCandidates = (queryEmbedding, profiles) => {
  const startedAt = performance.now();
  const candidates = profiles.map((profile) => ({
    identity: profile.identity,
    userId: profile.userId,
    ...compareEmbeddings(queryEmbedding, profile.embedding),
  }));

  candidates.sort((left, right) => (
    right.score - left.score
    || left.identity.localeCompare(right.identity)
    || String(left.userId).localeCompare(String(right.userId))
  ));
  candidates.forEach((candidate, index) => {
    candidate.rank = index + 1;
  });

  return {
    candidates,
    comparisonMs: performance.now() - startedAt,
  };
};

const buildThresholds = (start = 0.3, end = 0.9, step = 0.05) => {
  if (![start, end, step].every(Number.isFinite) || step <= 0 || start > end) {
    throw new Error("La configuracion de umbrales es invalida");
  }
  const thresholds = [];
  for (let value = start; value <= end + 0.0000001; value += step) {
    thresholds.push(Number(value.toFixed(4)));
    if (thresholds.length > 1000) {
      throw new Error("La configuracion genera mas de 1000 umbrales");
    }
  }
  return thresholds;
};

const calculateThresholdMetrics = (probes, thresholds) => thresholds.map((threshold) => {
  const metrics = {
    threshold,
    totalTests: probes.length,
    knownTests: 0,
    impostorTests: 0,
    validExtractions: 0,
    extractionErrors: 0,
    processingErrors: 0,
    correctIdentifications: 0,
    incorrectIdentifications: 0,
    knownUsersRejected: 0,
    impostorsRejected: 0,
    impostorsAccepted: 0,
    top1Correct: 0,
    top2Correct: 0,
    validKnownTests: 0,
    validImpostorTests: 0,
  };

  for (const probe of probes) {
    if (probe.isKnown) metrics.knownTests += 1;
    else metrics.impostorTests += 1;

    if (probe.status !== "completed" || !probe.top1) {
      if (["read", "extraction", "validation"].includes(probe.errorStage)) {
        metrics.extractionErrors += 1;
      } else {
        metrics.processingErrors += 1;
      }
      continue;
    }

    metrics.validExtractions += 1;
    const accepted = probe.top1.score >= threshold;

    if (probe.isKnown) {
      metrics.validKnownTests += 1;
      if (probe.top1.identity === probe.identity) metrics.top1Correct += 1;
      if (probe.top1.identity === probe.identity || probe.top2?.identity === probe.identity) {
        metrics.top2Correct += 1;
      }

      if (!accepted) {
        metrics.knownUsersRejected += 1;
      } else if (probe.top1.identity === probe.identity) {
        metrics.correctIdentifications += 1;
      } else {
        metrics.incorrectIdentifications += 1;
      }
      continue;
    }

    metrics.validImpostorTests += 1;
    if (accepted) metrics.impostorsAccepted += 1;
    else metrics.impostorsRejected += 1;
  }

  const acceptedDecisions = metrics.correctIdentifications
    + metrics.incorrectIdentifications
    + metrics.impostorsAccepted;
  const precision = ratioPercent(metrics.correctIdentifications, acceptedDecisions);
  const recall = ratioPercent(metrics.correctIdentifications, metrics.knownTests);
  const recallValidExtractions = ratioPercent(metrics.correctIdentifications, metrics.validKnownTests);

  return {
    ...metrics,
    precision,
    recall,
    recallValidExtractions,
    f1Score: precision + recall ? round((2 * precision * recall) / (precision + recall), 4) : 0,
    top1Accuracy: ratioPercent(metrics.top1Correct, metrics.validKnownTests),
    top2Accuracy: ratioPercent(metrics.top2Correct, metrics.validKnownTests),
    validUserRejectionRate: ratioPercent(metrics.knownUsersRejected, metrics.validKnownTests),
    impostorAcceptanceRate: ratioPercent(metrics.impostorsAccepted, metrics.validImpostorTests),
    extractionErrorRate: ratioPercent(metrics.extractionErrors, metrics.totalTests),
    processingErrorRate: ratioPercent(metrics.processingErrors, metrics.totalTests),
  };
});

const percentile = (sorted, value) => {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * value;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

const summarizeValues = (values) => {
  const sorted = values
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (!sorted.length) {
    return { count: 0, mean: 0, median: 0, min: 0, max: 0, p90: 0, p95: 0 };
  }
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    count: sorted.length,
    mean: round(sum / sorted.length, 4),
    median: round(percentile(sorted, 0.5), 4),
    min: round(sorted[0], 4),
    max: round(sorted[sorted.length - 1], 4),
    p90: round(percentile(sorted, 0.9), 4),
    p95: round(percentile(sorted, 0.95), 4),
  };
};

const summarizeTimings = (records) => {
  const keys = ["readMs", "extractionMs", "comparisonMs", "persistenceMs", "totalMs", "profilesEvaluated"];
  return keys.reduce((summary, key) => {
    summary[key] = summarizeValues(records.map((record) => record?.timings?.[key] ?? record?.[key]));
    return summary;
  }, {});
};

module.exports = {
  EMBEDDING_DIMENSIONS,
  buildThresholds,
  calculateThresholdMetrics,
  compareEmbeddings,
  rankCandidates,
  summarizeTimings,
  summarizeValues,
  validateEmbedding,
};
