require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const connectDatabase = require("../src/config/database");
const { UPLOAD_ROOT } = require("../src/utils/uploads");
const { User } = require("../src/models/user.model");
const { FaceEvaluationRun } = require("../src/models/face-evaluation-run.model");
const { FaceEvaluationProfile } = require("../src/models/face-evaluation-profile.model");
const { FaceEvaluationProbe } = require("../src/models/face-evaluation-probe.model");
const { FaceEvaluationScoreChunk } = require("../src/models/face-evaluation-score-chunk.model");

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

const removeUploadedProfile = async (publicPath) => {
  if (!publicPath || !publicPath.startsWith("/uploads/")) return false;
  const relativePath = publicPath.slice("/uploads/".length).replaceAll("/", path.sep);
  const target = path.resolve(UPLOAD_ROOT, relativePath);
  const relativeToRoot = path.relative(UPLOAD_ROOT, target);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new Error(`Ruta de upload insegura: ${publicPath}`);
  }
  await fs.rm(target, { force: true });
  return true;
};

const removeGeneratedFiles = async (outputDirectory, configuredOutputRoot) => {
  const outputRoot = path.resolve(configuredOutputRoot);
  const target = path.resolve(outputDirectory);
  const relative = path.relative(outputRoot, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Directorio de run fuera de la raiz permitida: ${target}`);
  }
  await fs.rm(target, { recursive: true, force: true });
};

const cleanup = async () => {
  const args = parseArgs(process.argv.slice(2));
  const optionEnabled = (key) => (
    args[key] === true || String(process.env[`npm_config_${key.replaceAll("-", "_")}`] || "").toLowerCase() === "true"
  );
  if (args.help) {
    console.log("Uso: npm run cleanup:face-evaluation -- --run-id <id> [--purge-results] [--delete-generated-files]");
    return;
  }

  const runId = String(args["run-id"] || process.env.npm_config_run_id || "").trim();
  if (!runId) throw new Error("--run-id es obligatorio");
  const force = optionEnabled("force");

  await connectDatabase();
  const existingRun = await FaceEvaluationRun.findOne({ runId });
  if (!existingRun) throw new Error(`No existe el run ${runId}`);
  if (["preparing", "enrolling", "evaluating", "reporting", "cleaning"].includes(existingRun.status) && !force) {
    throw new Error(`El run esta ${existingRun.status}. Usa --force solo si confirmaste que el evaluador no esta activo.`);
  }
  const run = await FaceEvaluationRun.findOneAndUpdate(
    { runId, ...(force ? {} : { status: { $in: ["completed", "failed", "cleaned"] } }) },
    { $set: { status: "cleaning" } },
    { new: true }
  );
  if (!run) throw new Error("No fue posible bloquear el run para limpieza");
  const profiles = await FaceEvaluationProfile.find({ runId });
  let deletedUsers = 0;
  let missingUsers = 0;
  let deletedUploads = 0;

  for (const profile of profiles) {
    if (profile.user || profile.email) {
      const identityFilters = [];
      if (profile.user) identityFilters.push({ _id: profile.user });
      if (profile.email) identityFilters.push({ email: profile.email });
      const result = await User.deleteOne({ $or: identityFilters });
      if (result.deletedCount === 1) deletedUsers += 1;
      else missingUsers += 1;
    }
    const uploadedPaths = new Set([
      ...(profile.uploadedProfilePaths || []),
      profile.uploadedProfilePath,
    ].filter(Boolean));
    for (const uploadedPath of uploadedPaths) {
      if (await removeUploadedProfile(uploadedPath)) deletedUploads += 1;
    }
    profile.status = "cleaned";
    profile.cleanedAt = new Date();
    await profile.save();
  }

  if (optionEnabled("purge-results")) {
    await Promise.all([
      FaceEvaluationScoreChunk.deleteMany({ runId }),
      FaceEvaluationProbe.deleteMany({ runId }),
      FaceEvaluationProfile.updateMany({ runId }, { $unset: { embedding: 1 } }),
    ]);
  }
  if (optionEnabled("delete-generated-files")) {
    await removeGeneratedFiles(run.outputDirectory, run.options?.outputRoot || path.dirname(run.outputDirectory));
  }

  run.status = "cleaned";
  run.cleanedAt = new Date();
  await run.save();
  console.log(`Run limpiado: ${runId}`);
  console.log(`Usuarios eliminados: ${deletedUsers}`);
  console.log(`Usuarios ya ausentes: ${missingUsers}`);
  console.log(`Uploads eliminados: ${deletedUploads}`);
};

cleanup()
  .catch((error) => {
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
