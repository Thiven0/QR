const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const {
  escapeHtml,
  generateFaceEvaluationReport,
  normalizeReportSummary,
  selectBestThreshold,
  summarizeErrors,
} = require("../src/services/face-evaluation-report.service");

test("selecciona el umbral con mayor F1 y menor aceptacion de impostores", () => {
  const selected = selectBestThreshold([
    { threshold: 0.3, f1Score: 90, impostorAcceptanceRate: 1, validUserRejectionRate: 0.1 },
    { threshold: 0.35, f1Score: 91, impostorAcceptanceRate: 2, validUserRejectionRate: 0.1 },
    { threshold: 0.4, f1Score: 91, impostorAcceptanceRate: 0.5, validUserRejectionRate: 0.2 },
  ]);
  assert.equal(selected.threshold, 0.4);
});

test("escapa contenido HTML y agrupa errores", () => {
  assert.equal(escapeHtml('<script>"x"</script>'), "&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
  assert.deepEqual(summarizeErrors([
    { stage: "extraction", error: { message: "Sin rostro" } },
    { stage: "extraction", error: { message: "Sin rostro" } },
  ]), [{ stage: "extraction", message: "Sin rostro", count: 2 }]);
});

test("rechaza umbrales no numericos antes de construir HTML o JavaScript", () => {
  assert.throws(() => normalizeReportSummary({
    counts: {
      sourceIdentities: 1,
      eligibleIdentities: 1,
      requestedProfiles: 1,
      enrolledProfiles: 1,
      totalProbes: 1,
      knownProbes: 1,
      impostorProbes: 0,
      expectedComparisons: 1,
    },
    thresholdMetrics: [{ threshold: "0.5;alert(1)", f1Score: 100 }],
  }), /Metrica invalida/);
});

test("genera un reporte explicativo solo desde archivos", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "face-report-"));
  const summary = {
    schemaVersion: 1,
    runId: "fixture-run",
    generatedAt: "2026-07-20T00:00:00.000Z",
    sourceDirectory: "dataset",
    outputDirectory: directory,
    counts: {
      sourceIdentities: 2,
      eligibleIdentities: 1,
      requestedProfiles: 1,
      enrolledProfiles: 1,
      totalProbes: 2,
      knownProbes: 1,
      impostorProbes: 1,
      expectedComparisons: 2,
    },
    comparison: { metric: "cosine-similarity", formula: "dot / norms", acceptanceRule: "score >= threshold" },
    thresholdMetrics: [{
      threshold: 0.5,
      totalTests: 2,
      validExtractions: 2,
      extractionErrors: 0,
      correctIdentifications: 1,
      incorrectIdentifications: 0,
      knownUsersRejected: 0,
      impostorsRejected: 1,
      impostorsAccepted: 0,
      precision: 100,
      recall: 100,
      recallValidExtractions: 100,
      f1Score: 100,
      top1Accuracy: 100,
      validUserRejectionRate: 0,
      impostorAcceptanceRate: 0,
      extractionErrorRate: 0,
    }],
    timingSummary: {},
    extractionErrors: [],
    processingErrors: [],
    topResults: [],
  };
  const enrollments = [{
    identity: "Persona_<A>",
    userId: "1",
    embedding: Array(512).fill(0.01),
    embeddingDimensions: 512,
    enrollmentAttempts: [],
    status: "ready",
  }];
  await fs.writeFile(path.join(directory, "evaluation-summary.json"), JSON.stringify(summary));
  await fs.writeFile(path.join(directory, "enrollment-records.json"), JSON.stringify(enrollments));

  const result = await generateFaceEvaluationReport({
    runId: "fixture-run",
    outputDirectory: directory,
    includeMongoDetails: false,
  });
  const html = await fs.readFile(result.outputPath, "utf8");
  assert.match(html, /Resumen ejecutivo/);
  assert.match(html, /Umbral 0.5/);
  assert.ok(!html.includes("Persona_<A>"));
  assert.equal(result.profilePages, 1);
  await fs.rm(directory, { recursive: true, force: true });
});
