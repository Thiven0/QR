require("dotenv").config();

const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { performance } = require("perf_hooks");
const mongoose = require("mongoose");
const connectDatabase = require("../src/config/database");
const { User } = require("../src/models/user.model");
const { FaceEvaluationRun } = require("../src/models/face-evaluation-run.model");
const { FaceEvaluationProfile } = require("../src/models/face-evaluation-profile.model");
const { FaceEvaluationProbe } = require("../src/models/face-evaluation-probe.model");
const { FaceEvaluationScoreChunk } = require("../src/models/face-evaluation-score-chunk.model");
const {
  buildThresholds,
  calculateThresholdMetrics,
  rankCandidates,
  summarizeTimings,
  validateEmbedding,
} = require("../src/services/face-evaluation-metrics.service");
const { generateFaceEvaluationReport } = require("../src/services/face-evaluation-report.service");

const DEFAULT_SOURCE = path.resolve(__dirname, "..", "evaluation", "dataset-prueba");
const DEFAULT_OUTPUT_ROOT = path.resolve(__dirname, "..", "evaluation", "face-runs");
const DEFAULT_API_URL = process.env.EVALUATION_API_URL || "http://127.0.0.1:3000/api";
const IMAGE_PATTERN = /\.(jpe?g|png)$/i;

const HELP = `
Harness robusto de evaluacion facial

Uso:
  npm run evaluate:face:robust -- [opciones]

Opciones:
  --source <ruta>                 Dataset crudo identity/imagenes
  --output-root <ruta>            Raiz de ejecuciones generadas
  --api <url>                     API base (default: ${DEFAULT_API_URL})
  --run-id <id>                   Identificador de ejecucion
  --max-profiles <n|all>          Perfiles, ordenados por cantidad de fotos
  --max-impostor-images <n|all>   Limite opcional de imagenes impostoras
  --threshold-start <n>           Default 0.30
  --threshold-end <n>             Default 0.90
  --threshold-step <n>            Default 0.05
  --chunk-size <n>                Candidatos por documento Mongo (default 250)
  --progress-every <n>            Frecuencia de progreso (default 25)
  --resume                        Reanudar un run existente
  --retry-failed                  Reintentar enrolamientos fallidos al reanudar
  --html-report <true|false>      Generar reporte HTML al finalizar (default true)
  --candidate-page-size <n>       Candidatos por pagina HTML (default 2500)
  --dry-run                       Solo inventario y estimacion; no escribe ni conecta
  --help                          Mostrar ayuda

Autenticacion:
  EVALUATION_TOKEN o EVALUATION_EMAIL + EVALUATION_PASSWORD
`;

const parseArgs = (argv) => {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const withoutPrefix = argument.slice(2);
    const equalsIndex = withoutPrefix.indexOf("=");
    if (equalsIndex >= 0) {
      result[withoutPrefix.slice(0, equalsIndex)] = withoutPrefix.slice(equalsIndex + 1);
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      result[withoutPrefix] = true;
      continue;
    }
    result[withoutPrefix] = next;
    index += 1;
  }
  return result;
};

const readPositiveInteger = (value, fallback, label, allowAll = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (allowAll && String(value).toLowerCase() === "all") return Infinity;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} debe ser un entero positivo${allowAll ? " o all" : ""}`);
  }
  return parsed;
};

const buildRunId = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `face-eval-${timestamp}`;
};

const getOption = (args, key, fallback) => {
  if (args[key] !== undefined) return args[key];
  const npmValue = process.env[`npm_config_${key.replaceAll("-", "_")}`];
  return npmValue !== undefined ? npmValue : fallback;
};

const readBooleanOption = (value) => value === true || String(value || "").toLowerCase() === "true";

const buildConfig = (args) => {
  const thresholdStart = Number(getOption(args, "threshold-start", process.env.FACE_EVAL_THRESHOLD_START ?? 0.3));
  const thresholdEnd = Number(getOption(args, "threshold-end", process.env.FACE_EVAL_THRESHOLD_END ?? 0.9));
  const thresholdStep = Number(getOption(args, "threshold-step", process.env.FACE_EVAL_THRESHOLD_STEP ?? 0.05));
  const runId = String(getOption(args, "run-id", buildRunId())).trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(runId) || runId === "." || runId === "..") {
    throw new Error("run-id debe iniciar con letra o numero y solo puede contener punto, guion y guion bajo");
  }

  const chunkSize = readPositiveInteger(getOption(args, "chunk-size"), 250, "chunk-size");
  if (chunkSize > 1000) throw new Error("chunk-size no puede superar 1000 candidatos");
  const apiBaseUrl = String(getOption(args, "api", DEFAULT_API_URL)).replace(/\/+$/, "");
  const apiHostname = new URL(apiBaseUrl).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(apiHostname)) {
    throw new Error("El harness Mongo-backed requiere una API local para compartir MongoDB, uploads y limpieza");
  }
  const candidatePageSize = readPositiveInteger(
    getOption(args, "candidate-page-size"),
    2500,
    "candidate-page-size"
  );
  if (candidatePageSize < 100 || candidatePageSize > 20000) {
    throw new Error("candidate-page-size debe estar entre 100 y 20000");
  }

  return {
    sourceDirectory: path.resolve(String(getOption(args, "source", process.env.FACE_EVAL_DATASET_DIR || DEFAULT_SOURCE))),
    outputRoot: path.resolve(String(getOption(args, "output-root", process.env.FACE_EVAL_OUTPUT_ROOT || DEFAULT_OUTPUT_ROOT))),
    apiBaseUrl,
    runId,
    maxProfiles: readPositiveInteger(getOption(args, "max-profiles"), Infinity, "max-profiles", true),
    maxImpostorImages: readPositiveInteger(
      getOption(args, "max-impostor-images"),
      Infinity,
      "max-impostor-images",
      true
    ),
    chunkSize,
    progressEvery: readPositiveInteger(getOption(args, "progress-every"), 25, "progress-every"),
    thresholds: buildThresholds(thresholdStart, thresholdEnd, thresholdStep),
    thresholdStart,
    thresholdEnd,
    thresholdStep,
    resume: readBooleanOption(getOption(args, "resume", false)),
    retryFailed: readBooleanOption(getOption(args, "retry-failed", false)),
    htmlReport: readBooleanOption(getOption(args, "html-report", true)),
    candidatePageSize,
    dryRun: readBooleanOption(getOption(args, "dry-run", false)),
  };
};

const ensureSourceDirectory = (directory) => {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error(`No existe el directorio fuente: ${directory}`);
  }
};

const scanDataset = (sourceDirectory) => {
  ensureSourceDirectory(sourceDirectory);
  return fs.readdirSync(sourceDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const identityDirectory = path.join(sourceDirectory, entry.name);
      const images = fs.readdirSync(identityDirectory, { withFileTypes: true })
        .filter((file) => file.isFile() && IMAGE_PATTERN.test(file.name))
        .map((file) => path.join(identityDirectory, file.name))
        .sort((left, right) => path.basename(left).localeCompare(path.basename(right)));
      return { identity: entry.name, directory: identityDirectory, images, imageCount: images.length };
    })
    .filter((entry) => entry.imageCount > 0)
    .sort((left, right) => right.imageCount - left.imageCount || left.identity.localeCompare(right.identity));
};

const splitDataset = (identities, config) => {
  const eligible = identities.filter((entry) => entry.imageCount > 1);
  const selected = eligible.slice(0, Number.isFinite(config.maxProfiles) ? config.maxProfiles : eligible.length);
  const selectedNames = new Set(selected.map((entry) => entry.identity));
  const initialImpostors = identities.filter((entry) => !selectedNames.has(entry.identity));
  return { eligible, selected, initialImpostors };
};

const buildConfigurationFingerprint = (identities, split, config) => {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify({
    sourceDirectory: config.sourceDirectory,
    outputRoot: config.outputRoot,
    apiBaseUrl: config.apiBaseUrl,
    maxProfiles: Number.isFinite(config.maxProfiles) ? config.maxProfiles : "all",
    maxImpostorImages: Number.isFinite(config.maxImpostorImages) ? config.maxImpostorImages : "all",
    chunkSize: config.chunkSize,
    thresholds: config.thresholds,
    selectedIdentities: split.selected.map((identity) => identity.identity),
  }));
  for (const identity of identities) {
    hash.update(identity.identity);
    for (const imagePath of identity.images) {
      hash.update(toRelativeKey(config.sourceDirectory, imagePath));
      hash.update(fs.readFileSync(imagePath));
    }
  }
  return hash.digest("hex");
};

const printInventory = (identities, split, config) => {
  const totalImages = identities.reduce((total, identity) => total + identity.imageCount, 0);
  const knownProbeEstimate = split.selected.reduce((total, identity) => total + identity.imageCount - 1, 0);
  const impostorImageEstimate = split.initialImpostors.reduce((total, identity) => total + identity.imageCount, 0);
  const limitedImpostors = Math.min(impostorImageEstimate, config.maxImpostorImages);
  const estimatedProbes = knownProbeEstimate + limitedImpostors;
  const estimatedComparisons = split.selected.length * estimatedProbes;

  console.log("Inventario del dataset");
  console.log(`  Fuente: ${config.sourceDirectory}`);
  console.log(`  Identidades: ${identities.length}`);
  console.log(`  Imagenes: ${totalImages}`);
  console.log(`  Identidades elegibles (2+): ${split.eligible.length}`);
  console.log(`  Perfiles solicitados: ${split.selected.length}`);
  console.log(`  Pruebas conocidas estimadas: ${knownProbeEstimate}`);
  console.log(`  Impostores estimados: ${limitedImpostors}`);
  console.log(`  Comparaciones maximas estimadas: ${estimatedComparisons.toLocaleString("es-CO")}`);
};

const mimeTypeForFile = (filePath) => (
  path.extname(filePath).toLowerCase() === ".png" ? "image/png" : "image/jpeg"
);

const readImage = async (filePath) => {
  const startedAt = performance.now();
  const buffer = await fsp.readFile(filePath);
  const readMs = performance.now() - startedAt;
  const mimeType = mimeTypeForFile(filePath);
  return {
    buffer,
    mimeType,
    readMs,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
  };
};

const serializeError = (error) => ({
  message: error?.message || "Error desconocido",
  status: error?.status || error?.statusCode || null,
  details: error?.details || error?.payload || null,
});

const fetchPayload = async (url, options = {}) => {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.detail || String(payload || "Error HTTP"));
    error.status = response.status;
    error.details = payload;
    throw error;
  }
  return payload;
};

const login = async (apiBaseUrl) => {
  if (process.env.EVALUATION_TOKEN) return process.env.EVALUATION_TOKEN;
  if (!process.env.EVALUATION_EMAIL || !process.env.EVALUATION_PASSWORD) {
    throw new Error("Define EVALUATION_TOKEN o EVALUATION_EMAIL y EVALUATION_PASSWORD");
  }
  const response = await fetchPayload(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.EVALUATION_EMAIL,
      password: process.env.EVALUATION_PASSWORD,
    }),
  });
  return response.token;
};

const authenticatedJson = (token, data) => ({
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(data),
});

const uploadProfile = async (apiBaseUrl, token, image, fileName) => {
  const form = new FormData();
  form.append("file", new Blob([image.buffer], { type: image.mimeType }), fileName);
  return fetchPayload(`${apiBaseUrl}/upload/profile`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
};

const createEvaluationUser = async ({ apiBaseUrl, token, identity, email, password, profilePath, dataUrl }) => (
  fetchPayload(`${apiBaseUrl}/users`, authenticatedJson(token, {
    nombre: identity.replace(/_/g, " "),
    email,
    password,
    imagen: profilePath,
    faceImage: dataUrl,
    permisoSistema: "Usuario",
    rolAcademico: "Evaluacion facial",
    facultad: "Dataset de evaluacion",
    estado: "activo",
  }))
);

const enrollExistingUser = async (apiBaseUrl, token, userId, dataUrl) => (
  fetchPayload(`${apiBaseUrl}/face/enroll`, authenticatedJson(token, { userId, image: dataUrl, force: true }))
);

const extractProbe = async (apiBaseUrl, token, dataUrl) => (
  fetchPayload(`${apiBaseUrl}/face/extract`, authenticatedJson(token, { image: dataUrl }))
);

const deleteUserThroughApi = async (apiBaseUrl, token, userId) => {
  try {
    await fetchPayload(`${apiBaseUrl}/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    if (error.status !== 404) throw error;
  }
};

const buildEvaluationEmail = (runId, identity) => {
  const runHash = crypto.createHash("sha1").update(runId).digest("hex").slice(0, 10);
  const identityHash = crypto.createHash("sha1").update(identity).digest("hex").slice(0, 14);
  return `face-eval+${runHash}.${identityHash}@example.invalid`;
};

const ensureDirectory = async (directory) => {
  await fsp.mkdir(directory, { recursive: true });
};

const copyPreparedImage = async (sourceFile, destinationFile) => {
  await ensureDirectory(path.dirname(destinationFile));
  await fsp.copyFile(sourceFile, destinationFile);
};

const toRelativeKey = (root, filePath) => path.relative(root, filePath).split(path.sep).join("/");

const extractTimingFromResponse = (payload) => (
  payload?.timings
  || payload?.faceRegistration?.timings
  || payload?.data?.timings
  || {}
);

const enrollIdentity = async ({ identityEntry, config, token, outputDirectory }) => {
  let profile = await FaceEvaluationProfile.findOne({ runId: config.runId, identity: identityEntry.identity })
    .select("+embedding");
  if (profile?.status === "ready" && validateEmbedding(profile.embedding).valid && profile.user) {
    const persistedUser = await User.findById(profile.user).select("+faceDescriptor");
    const persistedValidation = validateEmbedding(persistedUser?.faceDescriptor);
    if (persistedValidation.valid) {
      profile.embedding = persistedValidation.embedding;
      profile.embeddingDimensions = persistedValidation.embedding.length;
      await profile.save();
      return profile;
    }
    profile.status = "pending";
    profile.user = null;
    profile.sourceFile = null;
    profile.preparedFile = null;
    profile.error = { message: "El usuario o descriptor Mongo asociado ya no existe; se intentara recrear" };
    await profile.save();
  }
  if (profile?.status === "error" && !config.retryFailed) {
    return profile;
  }

  const email = buildEvaluationEmail(config.runId, identityEntry.identity);
  profile = await FaceEvaluationProfile.findOneAndUpdate(
    { runId: config.runId, identity: identityEntry.identity },
    {
      $setOnInsert: {
        runId: config.runId,
        identity: identityEntry.identity,
        email,
        imageCount: identityEntry.imageCount,
      },
      $set: { status: "enrolling", error: null },
    },
    { new: true, upsert: true }
  ).select("+embedding");

  let user = await User.findOne({ email }).select("+faceDescriptor");
  let uploadedProfilePath = profile.uploadedProfilePath || null;
  let chosenFile = profile.sourceFile || null;
  let chosenResponse = null;
  let chosenRead = null;
  let startIndex = 0;

  if (user && validateEmbedding(user.faceDescriptor).valid) {
    chosenFile = chosenFile || profile.pendingEnrollmentFile || identityEntry.images[0];
    chosenRead = await readImage(chosenFile);
  } else if (!user) {
    const firstFile = identityEntry.images[0];
    const image = await readImage(firstFile);
    const upload = await uploadProfile(config.apiBaseUrl, token, image, path.basename(firstFile));
    uploadedProfilePath = upload.path;
    await FaceEvaluationProfile.updateOne(
      { _id: profile._id },
      {
        $set: { uploadedProfilePath },
        $addToSet: { uploadedProfilePaths: uploadedProfilePath },
      }
    );
    const attemptStartedAt = performance.now();

    try {
      const response = await createEvaluationUser({
        apiBaseUrl: config.apiBaseUrl,
        token,
        identity: identityEntry.identity,
        email,
        password: crypto.randomBytes(24).toString("base64url"),
        profilePath: uploadedProfilePath,
        dataUrl: image.dataUrl,
      });
      user = await User.findById(response.user?._id).select("+faceDescriptor");
      const success = response.faceRegistration?.registered === true
        && validateEmbedding(user?.faceDescriptor).valid;
      const attempt = {
        file: firstFile,
        endpoint: "/api/users",
        success,
        detectionScore: response.faceRegistration?.detectionScore ?? null,
        embeddingDimensions: response.faceRegistration?.embeddingDimensions ?? null,
        timings: {
          readMs: image.readMs,
          endpointMs: performance.now() - attemptStartedAt,
          ...extractTimingFromResponse(response),
        },
        error: success ? null : { message: response.faceRegistration?.message || "Enrolamiento no disponible" },
      };
      await FaceEvaluationProfile.updateOne(
        { _id: profile._id },
        {
          $set: {
            user: user?._id || null,
            uploadedProfilePath,
            ...(success ? { sourceFile: firstFile } : {}),
          },
          $addToSet: { uploadedProfilePaths: uploadedProfilePath },
          $push: { enrollmentAttempts: { $each: [attempt], $slice: -1000 } },
        }
      );
      if (success) {
        chosenFile = firstFile;
        chosenResponse = response.faceRegistration;
        chosenRead = image;
      }
    } catch (error) {
      await FaceEvaluationProfile.updateOne(
        { _id: profile._id },
        {
          $set: { uploadedProfilePath },
          $addToSet: { uploadedProfilePaths: uploadedProfilePath },
          $push: {
            enrollmentAttempts: { $each: [{
              file: firstFile,
              endpoint: "/api/users",
              success: false,
              timings: { readMs: image.readMs, endpointMs: performance.now() - attemptStartedAt },
              error: serializeError(error),
            }], $slice: -1000 },
          },
        }
      );
      throw error;
    }
    startIndex = 1;
  }

  if (!chosenFile && user) {
    for (let index = startIndex; index < identityEntry.images.length; index += 1) {
      const candidateFile = identityEntry.images[index];
      const image = await readImage(candidateFile);
      await FaceEvaluationProfile.updateOne(
        { _id: profile._id },
        { $set: { pendingEnrollmentFile: candidateFile } }
      );
      const attemptStartedAt = performance.now();
      try {
        const response = await enrollExistingUser(config.apiBaseUrl, token, user._id, image.dataUrl);
        user = await User.findById(user._id).select("+faceDescriptor");
        const success = validateEmbedding(user?.faceDescriptor).valid;
        const attempt = {
          file: candidateFile,
          endpoint: "/api/face/enroll",
          success,
          detectionScore: response.data?.detectionScore ?? null,
          embeddingDimensions: response.data?.embeddingDimensions ?? null,
          timings: {
            readMs: image.readMs,
            endpointMs: performance.now() - attemptStartedAt,
            ...extractTimingFromResponse(response),
          },
          error: success ? null : { message: "El endpoint no persistio un embedding valido" },
        };
        await FaceEvaluationProfile.updateOne(
          { _id: profile._id },
          {
            $set: {
              user: user._id,
              ...(success ? { sourceFile: candidateFile } : {}),
            },
            $push: { enrollmentAttempts: { $each: [attempt], $slice: -1000 } },
          }
        );
        if (success) {
          chosenFile = candidateFile;
          chosenResponse = response.data;
          chosenRead = image;
          break;
        }
      } catch (error) {
        await FaceEvaluationProfile.updateOne(
          { _id: profile._id },
          {
            $push: {
              enrollmentAttempts: { $each: [{
                file: candidateFile,
                endpoint: "/api/face/enroll",
                success: false,
                timings: { readMs: image.readMs, endpointMs: performance.now() - attemptStartedAt },
                error: serializeError(error),
              }], $slice: -1000 },
            },
          }
        );
      }
    }
  }

  if (!chosenFile || !user || !validateEmbedding(user.faceDescriptor).valid) {
    if (user?._id) await deleteUserThroughApi(config.apiBaseUrl, token, user._id);
    await FaceEvaluationProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          user: null,
          pendingEnrollmentFile: null,
          status: "error",
          error: { message: "Ninguna imagen produjo un embedding valido" },
        },
      }
    );
    return FaceEvaluationProfile.findById(profile._id).select("+embedding");
  }

  const preparedEnrollmentFile = path.join(
    outputDirectory,
    "prepared",
    "enroll",
    identityEntry.identity,
    path.basename(chosenFile)
  );
  await copyPreparedImage(chosenFile, preparedEnrollmentFile);

  await FaceEvaluationProfile.updateOne(
    { _id: profile._id },
    {
      $set: {
        user: user._id,
          sourceFile: chosenFile,
          pendingEnrollmentFile: null,
        preparedFile: preparedEnrollmentFile,
        uploadedProfilePath,
        embedding: user.faceDescriptor,
        embeddingDimensions: user.faceDescriptor.length,
        detectionScore: chosenResponse?.detectionScore ?? null,
        extractionTimings: {
          readMs: chosenRead?.readMs ?? null,
          ...extractTimingFromResponse(chosenResponse),
        },
        status: "ready",
        error: null,
      },
    }
  );

  return FaceEvaluationProfile.findById(profile._id).select("+embedding");
};

const prepareProbeManifest = async ({ identities, successfulProfiles, config, outputDirectory }) => {
  const profileByIdentity = new Map(successfulProfiles.map((profile) => [profile.identity, profile]));
  const probes = [];

  for (const identityEntry of identities) {
    const profile = profileByIdentity.get(identityEntry.identity);
    if (profile) {
      for (const sourceFile of identityEntry.images) {
        if (path.resolve(sourceFile) === path.resolve(profile.sourceFile)) continue;
        const preparedFile = path.join(
          outputDirectory,
          "prepared",
          "identify",
          identityEntry.identity,
          path.basename(sourceFile)
        );
        await copyPreparedImage(sourceFile, preparedFile);
        probes.push({ identity: identityEntry.identity, isKnown: true, sourceFile, preparedFile });
      }
    }
  }

  let impostorCount = 0;
  for (const identityEntry of identities) {
    if (profileByIdentity.has(identityEntry.identity)) continue;
    for (const sourceFile of identityEntry.images) {
      if (impostorCount >= config.maxImpostorImages) break;
      const preparedFile = path.join(
        outputDirectory,
        "prepared",
        "impostors",
        identityEntry.identity,
        path.basename(sourceFile)
      );
      await copyPreparedImage(sourceFile, preparedFile);
      probes.push({ identity: identityEntry.identity, isKnown: false, sourceFile, preparedFile });
      impostorCount += 1;
    }
    if (impostorCount >= config.maxImpostorImages) break;
  }

  const manifestEntries = [];
  for (const profile of successfulProfiles) {
    const image = await readImage(profile.sourceFile);
    manifestEntries.push({
      identity: profile.identity,
      role: "enrollment",
      sourceFile: toRelativeKey(config.sourceDirectory, profile.sourceFile),
      preparedFile: toRelativeKey(outputDirectory, profile.preparedFile),
      sha256: image.sha256,
      size: image.buffer.length,
    });
  }
  for (const probe of probes) {
    const image = await readImage(probe.sourceFile);
    probe.sourceSha256 = image.sha256;
    probe.probeKey = toRelativeKey(outputDirectory, probe.preparedFile);
    manifestEntries.push({
      identity: probe.identity,
      role: probe.isKnown ? "known-probe" : "impostor",
      sourceFile: toRelativeKey(config.sourceDirectory, probe.sourceFile),
      preparedFile: probe.probeKey,
      sha256: image.sha256,
      size: image.buffer.length,
    });
  }

  return { probes, manifestEntries };
};

const buildGallery = async (runId) => {
  const profiles = await FaceEvaluationProfile.find({ runId, status: "ready" }).lean();
  const userIds = profiles.map((profile) => profile.user).filter(Boolean);
  const users = await User.find({ _id: { $in: userIds } }).select("+faceDescriptor").lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));

  return profiles.map((profile) => {
    const user = usersById.get(String(profile.user));
    const validation = validateEmbedding(user?.faceDescriptor);
    if (!validation.valid) {
      throw new Error(`Perfil Mongo invalido para ${profile.identity}: ${validation.error}`);
    }
    return { identity: profile.identity, userId: user._id, embedding: validation.embedding };
  }).sort((left, right) => left.identity.localeCompare(right.identity) || String(left.userId).localeCompare(String(right.userId)));
};

const buildGalleryFingerprint = (gallery) => {
  const hash = crypto.createHash("sha256");
  for (const profile of gallery) {
    hash.update(profile.identity);
    hash.update(String(profile.userId));
    hash.update(Buffer.from(new Float64Array(profile.embedding).buffer));
  }
  return hash.digest("hex");
};

const persistCandidateChunks = async ({ runId, probe, candidates, chunkSize }) => {
  await FaceEvaluationScoreChunk.deleteMany({ runId, probe: probe._id });
  const chunks = [];
  for (let index = 0; index < candidates.length; index += chunkSize) {
    const chunkCandidates = candidates.slice(index, index + chunkSize);
    chunks.push({
      runId,
      probe: probe._id,
      probeKey: probe.probeKey,
      chunkIndex: chunks.length,
      candidates: chunkCandidates,
      candidateCount: chunkCandidates.length,
    });
  }
  if (chunks.length) await FaceEvaluationScoreChunk.insertMany(chunks, { ordered: true });
};

const evaluateProbe = async ({ probeEntry, gallery, config, token }) => {
  let probe = await FaceEvaluationProbe.findOne({ runId: config.runId, probeKey: probeEntry.probeKey });
  if (probe?.status === "completed") return probe;

  probe = await FaceEvaluationProbe.findOneAndUpdate(
    { runId: config.runId, probeKey: probeEntry.probeKey },
    {
      $setOnInsert: {
        runId: config.runId,
        probeKey: probeEntry.probeKey,
        identity: probeEntry.identity,
        isKnown: probeEntry.isKnown,
        sourceFile: probeEntry.sourceFile,
        preparedFile: probeEntry.preparedFile,
        sourceSha256: probeEntry.sourceSha256,
      },
      $set: { status: "extracting", error: null, errorStage: null },
    },
    { new: true, upsert: true }
  );

  const totalStartedAt = performance.now();
  let readMs = null;
  let extractionMs = null;
  let comparisonMs = null;
  let persistenceMs = null;
  let extractionStartedAt = null;
  let comparisonStartedAt = null;
  let persistenceStartedAt = null;
  let errorStage = "read";
  try {
    const image = await readImage(probeEntry.sourceFile);
    readMs = image.readMs;
    errorStage = "extraction";
    extractionStartedAt = performance.now();
    const extractionResponse = await extractProbe(config.apiBaseUrl, token, image.dataUrl);
    extractionMs = performance.now() - extractionStartedAt;
    const extraction = extractionResponse.data || {};
    errorStage = "validation";
    const validation = validateEmbedding(extraction.embedding);
    if (!validation.valid) throw new Error(validation.error);

    errorStage = "persistence";
    persistenceStartedAt = performance.now();
    await FaceEvaluationProbe.updateOne({ _id: probe._id }, { $set: { status: "comparing" } });
    persistenceMs = performance.now() - persistenceStartedAt;
    errorStage = "comparison";
    comparisonStartedAt = performance.now();
    const ranked = rankCandidates(validation.embedding, gallery);
    comparisonMs = ranked.comparisonMs;
    if (!ranked.candidates.length || ranked.candidates.some((candidate) => !candidate.valid)) {
      throw new Error("La galeria produjo una o mas comparaciones invalidas");
    }
    const top1 = ranked.candidates[0] || null;
    const top2 = ranked.candidates[1] || null;
    const expected = probeEntry.isKnown
      ? ranked.candidates.find((candidate) => candidate.identity === probeEntry.identity)
      : null;
    errorStage = "persistence";
    persistenceStartedAt = performance.now();
    await persistCandidateChunks({
      runId: config.runId,
      probe,
      candidates: ranked.candidates,
      chunkSize: config.chunkSize,
    });
    persistenceMs += performance.now() - persistenceStartedAt;
    const timings = {
      readMs,
      extractionMs,
      comparisonMs,
      persistenceMs,
      totalMs: performance.now() - totalStartedAt,
      profilesEvaluated: gallery.length,
      internalExtraction: extraction.timings || {},
    };

    persistenceStartedAt = performance.now();
    await FaceEvaluationProbe.updateOne(
      { _id: probe._id },
      {
        $set: {
          embedding: validation.embedding,
          embeddingDimensions: validation.embedding.length,
          detectionScore: extraction.detectionScore ?? null,
          top1: top1 ? { rank: top1.rank, identity: top1.identity, userId: top1.userId, score: top1.score } : null,
          top2: top2 ? { rank: top2.rank, identity: top2.identity, userId: top2.userId, score: top2.score } : null,
          top1Top2Margin: top1 && top2 ? top1.score - top2.score : null,
          expectedIdentityRank: expected?.rank ?? null,
          profilesEvaluated: gallery.length,
          timings,
          status: "completed",
          error: null,
          errorStage: null,
        },
      }
    );
  } catch (error) {
    if (errorStage === "extraction" && extractionStartedAt !== null && extractionMs === null) {
      extractionMs = performance.now() - extractionStartedAt;
    }
    if (errorStage === "comparison" && comparisonStartedAt !== null && comparisonMs === null) {
      comparisonMs = performance.now() - comparisonStartedAt;
    }
    if (errorStage === "persistence" && persistenceStartedAt !== null && persistenceMs === null) {
      persistenceMs = performance.now() - persistenceStartedAt;
    } else if (errorStage === "persistence" && persistenceStartedAt !== null) {
      persistenceMs += performance.now() - persistenceStartedAt;
    }
    await FaceEvaluationScoreChunk.deleteMany({ runId: config.runId, probe: probe._id });
    await FaceEvaluationProbe.updateOne(
      { _id: probe._id },
      {
        $set: {
          status: "error",
          error: serializeError(error),
          errorStage,
          profilesEvaluated: gallery.length,
          timings: {
            readMs,
            extractionMs,
            comparisonMs,
            persistenceMs,
            totalMs: performance.now() - totalStartedAt,
            profilesEvaluated: gallery.length,
          },
        },
        $unset: { embedding: 1, top1: 1, top2: 1 },
      }
    );
  }

  return FaceEvaluationProbe.findById(probe._id);
};

const writeJson = async (filePath, value) => {
  await ensureDirectory(path.dirname(filePath));
  const temporaryPath = `${filePath}.tmp`;
  await fsp.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fsp.rename(temporaryPath, filePath);
};

const runEvaluation = async (config) => {
  const identities = scanDataset(config.sourceDirectory);
  const split = splitDataset(identities, config);
  printInventory(identities, split, config);
  if (config.dryRun) {
    console.log("Dry-run finalizado. No se escribieron archivos ni se conecto a MongoDB.");
    return;
  }

  const configurationFingerprint = buildConfigurationFingerprint(identities, split, config);
  const outputDirectory = path.join(config.outputRoot, config.runId);
  if (fs.existsSync(outputDirectory) && !config.resume) {
    throw new Error(`El directorio del run ya existe. Usa --resume o cambia --run-id: ${outputDirectory}`);
  }
  await ensureDirectory(outputDirectory);
  await connectDatabase();

  let run = await FaceEvaluationRun.findOne({ runId: config.runId });
  if (run && !config.resume) {
    throw new Error(`El run ${config.runId} ya existe en MongoDB. Usa --resume.`);
  }
  if (!run) {
    run = await FaceEvaluationRun.create({
      runId: config.runId,
      status: "preparing",
      sourceDirectory: config.sourceDirectory,
      outputDirectory,
      apiBaseUrl: config.apiBaseUrl,
      thresholds: config.thresholds,
      options: {
        configurationFingerprint,
        outputRoot: config.outputRoot,
        maxProfiles: Number.isFinite(config.maxProfiles) ? config.maxProfiles : "all",
        maxImpostorImages: Number.isFinite(config.maxImpostorImages) ? config.maxImpostorImages : "all",
        chunkSize: config.chunkSize,
        thresholdStart: config.thresholdStart,
        thresholdEnd: config.thresholdEnd,
        thresholdStep: config.thresholdStep,
        profileOrdering: "image-count-descending",
        enrollmentFallback: "next-image",
        unselectedIdentityRole: "impostor",
      },
    });
  } else {
    if (["cleaning", "cleaned"].includes(run.status)) {
      throw new Error(`El run ${config.runId} esta en estado ${run.status} y no se puede reanudar`);
    }
    if (run.options?.configurationFingerprint !== configurationFingerprint) {
      throw new Error(
        "La fuente, imagenes u opciones cambiaron desde la creacion del run. Usa un run-id nuevo."
      );
    }
  }
  const token = await login(config.apiBaseUrl);

  try {
    const previousStatus = run.status;
    run = await FaceEvaluationRun.findOneAndUpdate(
      { _id: run._id, status: previousStatus },
      { $set: { status: "enrolling" } },
      { new: true }
    );
    if (!run) {
      throw new Error("El estado del run cambio antes de iniciar; verifica que no haya una limpieza concurrente");
    }
    const successfulProfiles = [];
    for (let index = 0; index < split.selected.length; index += 1) {
      const identityEntry = split.selected[index];
      console.log(`[enroll ${index + 1}/${split.selected.length}] ${identityEntry.identity} (${identityEntry.imageCount} fotos)`);
      try {
        const profile = await enrollIdentity({ identityEntry, config, token, outputDirectory });
        if (profile.status === "ready") successfulProfiles.push(profile);
        else console.warn(`  Sin enrolamiento valido: ${identityEntry.identity}`);
      } catch (error) {
        if (error.status === 401 || error.status === 403) throw error;
        await FaceEvaluationProfile.updateOne(
          { runId: config.runId, identity: identityEntry.identity },
          { $set: { status: "error", error: serializeError(error) } }
        );
        console.warn(`  Error de enrolamiento: ${error.message}`);
      }
    }

    if (!successfulProfiles.length) {
      throw new Error("Ninguna identidad pudo enrolarse correctamente");
    }

    const gallery = await buildGallery(config.runId);
    const galleryFingerprint = buildGalleryFingerprint(gallery);
    const previousGalleryFingerprint = run.options?.galleryFingerprint;
    if (previousGalleryFingerprint && previousGalleryFingerprint !== galleryFingerprint) {
      console.log("La galeria cambio; se invalidaran todas las comparaciones previas del run.");
      await Promise.all([
        FaceEvaluationScoreChunk.deleteMany({ runId: config.runId }),
        FaceEvaluationProbe.deleteMany({ runId: config.runId }),
        fsp.rm(path.join(outputDirectory, "prepared", "identify"), { recursive: true, force: true }),
        fsp.rm(path.join(outputDirectory, "prepared", "impostors"), { recursive: true, force: true }),
      ]);
    }
    run.options = { ...(run.options || {}), galleryFingerprint };
    run.markModified("options");

    const prepared = await prepareProbeManifest({
      identities,
      successfulProfiles,
      config,
      outputDirectory,
    });
    await writeJson(path.join(outputDirectory, "manifest.json"), {
      schemaVersion: 1,
      runId: config.runId,
      generatedAt: new Date().toISOString(),
      sourceDirectory: config.sourceDirectory,
      entries: prepared.manifestEntries,
    });

    run.status = "evaluating";
    run.counts = {
      sourceIdentities: identities.length,
      eligibleIdentities: split.eligible.length,
      requestedProfiles: split.selected.length,
      enrolledProfiles: gallery.length,
      totalProbes: prepared.probes.length,
      knownProbes: prepared.probes.filter((probe) => probe.isKnown).length,
      impostorProbes: prepared.probes.filter((probe) => !probe.isKnown).length,
      expectedComparisons: gallery.length * prepared.probes.length,
    };
    await run.save();

    for (let index = 0; index < prepared.probes.length; index += 1) {
      await evaluateProbe({ probeEntry: prepared.probes[index], gallery, config, token });
      if ((index + 1) % config.progressEvery === 0 || index + 1 === prepared.probes.length) {
        console.log(`[probe ${index + 1}/${prepared.probes.length}] completadas`);
      }
    }

    const probes = await FaceEvaluationProbe.find({ runId: config.runId }).lean();
    const thresholdMetrics = calculateThresholdMetrics(probes, config.thresholds);
    const timingSummary = summarizeTimings(probes);
    const profiles = await FaceEvaluationProfile.find({ runId: config.runId }).select("+embedding").lean();
    const allErrors = probes
      .filter((probe) => probe.status === "error")
      .map((probe) => ({
        probeKey: probe.probeKey,
        identity: probe.identity,
        stage: probe.errorStage,
        error: probe.error,
      }));
    const extractionErrors = allErrors.filter((error) => ["read", "extraction", "validation"].includes(error.stage));
    const processingErrors = allErrors.filter((error) => !["read", "extraction", "validation"].includes(error.stage));
    const report = {
      schemaVersion: 1,
      runId: config.runId,
      generatedAt: new Date().toISOString(),
      apiBaseUrl: config.apiBaseUrl,
      sourceDirectory: config.sourceDirectory,
      outputDirectory,
      counts: run.counts,
      comparison: {
        metric: "cosine-similarity",
        formula: "dotProduct / (queryNorm * profileNorm)",
        acceptanceRule: "score >= threshold",
        allCandidatesCollection: "face_evaluation_score_chunks",
      },
      thresholds: config.thresholds,
      thresholdMetrics,
      timingSummary,
      extractionErrors,
      processingErrors,
      topResults: probes.map((probe) => ({
        probeKey: probe.probeKey,
        identity: probe.identity,
        isKnown: probe.isKnown,
        status: probe.status,
        top1: probe.top1 || null,
        top2: probe.top2 || null,
        top1Top2Margin: probe.top1Top2Margin ?? null,
        expectedIdentityRank: probe.expectedIdentityRank ?? null,
        timings: probe.timings || {},
        errorStage: probe.errorStage || null,
        error: probe.error || null,
      })),
    };

    await writeJson(path.join(outputDirectory, "enrollment-records.json"), profiles.map((profile) => ({
      identity: profile.identity,
      userId: profile.user ? String(profile.user) : null,
      sourceFile: profile.sourceFile,
      preparedFile: profile.preparedFile,
      embedding: profile.embedding || null,
      embeddingDimensions: profile.embeddingDimensions,
      detectionScore: profile.detectionScore,
      extractionTimings: profile.extractionTimings,
      enrollmentAttempts: profile.enrollmentAttempts,
      status: profile.status,
      error: profile.error,
    })));
    await writeJson(path.join(outputDirectory, "threshold-metrics.json"), thresholdMetrics);
    await writeJson(path.join(outputDirectory, "timing-summary.json"), timingSummary);
    await writeJson(path.join(outputDirectory, "extraction-errors.json"), extractionErrors);
    await writeJson(path.join(outputDirectory, "processing-errors.json"), processingErrors);
    await writeJson(path.join(outputDirectory, "evaluation-summary.json"), report);

    if (config.htmlReport) {
      run.status = "reporting";
      await run.save();
      try {
        const htmlReport = await generateFaceEvaluationReport({
          runId: config.runId,
          outputDirectory,
          includeMongoDetails: true,
          pageCandidateLimit: config.candidatePageSize,
        });
        const nextReportOptions = {
          ...(run.options || {}),
          htmlReportStatus: "ready",
          htmlReportPath: htmlReport.outputPath,
          htmlReportGeneratedAt: new Date(),
        };
        delete nextReportOptions.htmlReportError;
        run.options = nextReportOptions;
        run.markModified("options");
        console.log(`Reporte HTML: ${htmlReport.outputPath}`);
      } catch (reportError) {
        console.warn(`La evaluacion termino, pero no se pudo generar el HTML: ${reportError.message}`);
        run.options = {
          ...(run.options || {}),
          htmlReportStatus: "error",
          htmlReportError: serializeError(reportError),
        };
        run.markModified("options");
      }
    }

    run.status = "completed";
    run.thresholdMetrics = thresholdMetrics;
    run.timingSummary = timingSummary;
    run.completedAt = new Date();
    run.error = null;
    await run.save();

    console.log(`Evaluacion completada: ${config.runId}`);
    console.log(`Reporte: ${path.join(outputDirectory, "evaluation-summary.json")}`);
  } catch (error) {
    run.status = "failed";
    run.error = serializeError(error);
    await run.save();
    throw error;
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP.trim());
    return;
  }
  const config = buildConfig(args);
  await runEvaluation(config);
};

main()
  .catch((error) => {
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
