const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildThresholds,
  calculateThresholdMetrics,
  compareEmbeddings,
  rankCandidates,
  summarizeValues,
  validateEmbedding,
} = require("../src/services/face-evaluation-metrics.service");

const unitVector = (index = 0) => Array.from({ length: 512 }, (_, current) => (current === index ? 1 : 0));

test("valida exactamente 512 valores finitos", () => {
  assert.equal(validateEmbedding(unitVector()).valid, true);
  assert.equal(validateEmbedding([1, 2]).valid, false);
  const invalid = unitVector();
  invalid[3] = Number.NaN;
  assert.equal(validateEmbedding(invalid).valid, false);
  const nullValue = unitVector();
  nullValue[3] = null;
  assert.equal(validateEmbedding(nullValue).valid, false);
  assert.equal(validateEmbedding(Array(512).fill(0)).valid, false);
});

test("explica el calculo de similitud coseno", () => {
  const result = compareEmbeddings(unitVector(0), unitVector(0));
  assert.equal(result.valid, true);
  assert.equal(result.dimensions, 512);
  assert.equal(result.dotProduct, 1);
  assert.equal(result.queryNorm, 1);
  assert.equal(result.profileNorm, 1);
  assert.equal(result.denominator, 1);
  assert.equal(result.score, 1);

  const orthogonal = compareEmbeddings(unitVector(0), unitVector(1));
  assert.equal(orthogonal.score, 0);
});

test("ordena todos los candidatos de forma determinista", () => {
  const ranked = rankCandidates(unitVector(0), [
    { identity: "B", userId: "2", embedding: unitVector(1) },
    { identity: "A", userId: "1", embedding: unitVector(0) },
  ]);
  assert.equal(ranked.candidates.length, 2);
  assert.equal(ranked.candidates[0].identity, "A");
  assert.equal(ranked.candidates[0].rank, 1);
  assert.equal(ranked.candidates[1].rank, 2);
  assert.ok(ranked.comparisonMs >= 0);
});

test("genera el barrido inclusivo de umbrales", () => {
  assert.deepEqual(buildThresholds(0.3, 0.7, 0.05), [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7]);
  assert.throws(() => buildThresholds(0.3, 0.7, 0));
  assert.throws(() => buildThresholds(0, 1, 0.0001), /1000/);
});

test("calcula conocidos, impostores, Top-1 y errores", () => {
  const probes = [
    {
      identity: "A",
      isKnown: true,
      status: "completed",
      top1: { identity: "A", score: 0.8 },
      top2: { identity: "B", score: 0.5 },
    },
    {
      identity: "B",
      isKnown: true,
      status: "completed",
      top1: { identity: "A", score: 0.7 },
      top2: { identity: "B", score: 0.6 },
    },
    {
      identity: "X",
      isKnown: false,
      status: "completed",
      top1: { identity: "A", score: 0.4 },
      top2: { identity: "B", score: 0.3 },
    },
    { identity: "A", isKnown: true, status: "error", errorStage: "extraction", top1: null },
  ];

  const metrics = calculateThresholdMetrics(probes, [0.5])[0];
  assert.equal(metrics.totalTests, 4);
  assert.equal(metrics.correctIdentifications, 1);
  assert.equal(metrics.incorrectIdentifications, 1);
  assert.equal(metrics.impostorsRejected, 1);
  assert.equal(metrics.impostorsAccepted, 0);
  assert.equal(metrics.extractionErrors, 1);
  assert.equal(metrics.top1Correct, 1);
  assert.equal(metrics.top2Correct, 2);
  assert.equal(metrics.extractionErrorRate, 25);
});

test("resume media, mediana, minimo, maximo, P90 y P95", () => {
  const summary = summarizeValues([1, 2, 3, 4, 5]);
  assert.equal(summary.count, 5);
  assert.equal(summary.mean, 3);
  assert.equal(summary.median, 3);
  assert.equal(summary.min, 1);
  assert.equal(summary.max, 5);
  assert.equal(summary.p90, 4.6);
  assert.equal(summary.p95, 4.8);
  assert.deepEqual(summarizeValues([null, undefined, 2]), {
    count: 1,
    mean: 2,
    median: 2,
    min: 2,
    max: 2,
    p90: 2,
    p95: 2,
  });
});
