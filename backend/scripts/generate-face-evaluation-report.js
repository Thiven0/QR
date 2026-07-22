require("dotenv").config();

const path = require("path");
const mongoose = require("mongoose");
const connectDatabase = require("../src/config/database");
const { FaceEvaluationRun } = require("../src/models/face-evaluation-run.model");
const { generateFaceEvaluationReport } = require("../src/services/face-evaluation-report.service");

const DEFAULT_OUTPUT_ROOT = path.resolve(
  process.cwd(),
  process.env.FACE_EVAL_OUTPUT_ROOT || "evaluation/face-runs"
);

const parseArgs = (argv) => {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const match = argument.slice(2).match(/^([^=]+)=(.*)$/s);
    if (match) {
      result[match[1]] = match[2];
      continue;
    }
    const key = argument.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) result[key] = true;
    else {
      result[key] = next;
      index += 1;
    }
  }
  return result;
};

const option = (args, key, fallback) => (
  args[key] ?? process.env[`npm_config_${key.replaceAll("-", "_")}`] ?? fallback
);

const booleanOption = (value) => value === true || String(value || "").toLowerCase() === "true";

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Uso: npm run report:face-evaluation -- --run-id=<id> [--candidate-page-size=2500] [--file-only=true]");
    return;
  }
  const runId = String(option(args, "run-id", "")).trim();
  if (!runId) throw new Error("--run-id es obligatorio");
  const fileOnly = booleanOption(option(args, "file-only", false));
  const pageCandidateLimit = Number(option(args, "candidate-page-size", 2500));
  if (!Number.isInteger(pageCandidateLimit) || pageCandidateLimit < 100 || pageCandidateLimit > 20000) {
    throw new Error("candidate-page-size debe ser un entero entre 100 y 20000");
  }

  let outputDirectory = path.join(DEFAULT_OUTPUT_ROOT, runId);
  if (!fileOnly) {
    await connectDatabase();
    const run = await FaceEvaluationRun.findOne({ runId }).lean();
    if (!run) throw new Error(`No existe el run MongoDB ${runId}`);
    outputDirectory = run.outputDirectory;
  }

  console.log(`Generando reporte HTML para ${runId}...`);
  const result = await generateFaceEvaluationReport({
    runId,
    outputDirectory,
    includeMongoDetails: !fileOnly,
    pageCandidateLimit,
  });
  console.log(`Reporte: ${result.outputPath}`);
  console.log(`Umbral destacado: ${result.bestThreshold}`);
  console.log(`Paginas de perfiles: ${result.profilePages}`);
  console.log(`Paginas de candidatos: ${result.candidatePages}`);
  console.log(`Probes con detalle: ${result.probeDetails}`);
};

main()
  .catch((error) => {
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
