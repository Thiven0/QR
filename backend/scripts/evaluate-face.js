const fs = require('fs');
const path = require('path');

const DEFAULT_API_BASE_URL = process.env.EVALUATION_API_URL || 'http://127.0.0.1:3000/api';
const DEFAULT_DATASET_DIR = process.env.FACE_EVAL_DATASET_DIR || path.resolve(__dirname, '..', 'evaluation', 'face-dataset');
const DEFAULT_THRESHOLD_START = Number(process.env.FACE_EVAL_THRESHOLD_START || 0.3);
const DEFAULT_THRESHOLD_END = Number(process.env.FACE_EVAL_THRESHOLD_END || 0.9);
const DEFAULT_THRESHOLD_STEP = Number(process.env.FACE_EVAL_THRESHOLD_STEP || 0.05);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) continue;

    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
};

const cliArgs = parseArgs();
const apiBaseUrl = String(cliArgs.api || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
const datasetDir = path.resolve(String(cliArgs.dataset || DEFAULT_DATASET_DIR));
const thresholdStart = Number(cliArgs.thresholdStart || DEFAULT_THRESHOLD_START);
const thresholdEnd = Number(cliArgs.thresholdEnd || DEFAULT_THRESHOLD_END);
const thresholdStep = Number(cliArgs.thresholdStep || DEFAULT_THRESHOLD_STEP);

const buildThresholds = (start, end, step) => {
  const thresholds = [];
  for (let value = start; value <= end + 0.000001; value += step) {
    thresholds.push(Number(value.toFixed(4)));
  }
  return thresholds;
};

const thresholds = buildThresholds(thresholdStart, thresholdEnd, thresholdStep);

const REJECTED_LABEL = '__rejected__';
const IMPOSTOR_LABEL = '__impostor__';

const round = (value, digits = 2) => Number(value.toFixed(digits));

const percent = (numerator, denominator) => (denominator ? (numerator / denominator) * 100 : 0);

const getPercentile = (sortedValues = [], percentile) => {
  if (!sortedValues.length) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const position = (sortedValues.length - 1) * percentile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const weight = position - lowerIndex;
  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
};

const summarizeScores = (values = []) => {
  if (!values.length) {
    return {
      count: 0,
      mean: 0,
      min: 0,
      max: 0,
      p25: 0,
      p50: 0,
      p75: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);

  return {
    count: sorted.length,
    mean: round(sum / sorted.length, 4),
    min: round(sorted[0], 4),
    max: round(sorted[sorted.length - 1], 4),
    p25: round(getPercentile(sorted, 0.25), 4),
    p50: round(getPercentile(sorted, 0.5), 4),
    p75: round(getPercentile(sorted, 0.75), 4),
  };
};

const createIdentityBucket = (identity) => ({
  identity,
  totalKnown: 0,
  evaluatedKnown: 0,
  extractionErrors: 0,
  tp: 0,
  fp: 0,
  fn: 0,
  rejected: 0,
  misclassifiedAs: {},
  mistakenForBy: {},
});

const incrementMapCounter = (target, key) => {
  target[key] = (target[key] || 0) + 1;
};

const createConfusionMatrix = (identities = []) => {
  const columns = [...identities, REJECTED_LABEL];
  const rows = [...identities, IMPOSTOR_LABEL];
  const counts = {};

  for (const row of rows) {
    counts[row] = columns.reduce((acc, column) => {
      acc[column] = 0;
      return acc;
    }, {});
  }

  return { rows, columns, counts };
};

const getErrorCategory = (message = '') => {
  const normalized = String(message).toLowerCase();
  if (normalized.includes('multiples rostros')) return 'multiples_rostros';
  if (normalized.includes('ningun rostro')) return 'sin_rostro';
  if (normalized.includes('demasiado pequena')) return 'imagen_pequena';
  if (normalized.includes('formato no soportado')) return 'formato_no_soportado';
  if (normalized.includes('base64 invalida')) return 'base64_invalida';
  if (normalized.includes('invalida o corrupta')) return 'imagen_corrupta';
  return 'otro';
};

const buildErrorSummary = (errors = []) => {
  const byStage = {};
  const byCategory = {};
  const byMessage = {};
  const byIdentity = {};

  for (const error of errors) {
    incrementMapCounter(byStage, error.stage || 'desconocido');
    incrementMapCounter(byCategory, getErrorCategory(error.message));
    incrementMapCounter(byMessage, error.message || 'Sin mensaje');
    incrementMapCounter(byIdentity, error.identity || 'desconocida');
  }

  const toRankedList = (source) => Object.entries(source)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  return {
    total: errors.length,
    byStage: toRankedList(byStage),
    byCategory: toRankedList(byCategory),
    byMessage: toRankedList(byMessage),
    byIdentity: toRankedList(byIdentity),
  };
};

const buildProbeDetails = (probeResults = []) => {
  return probeResults.map((probe) => ({
    identity: probe.identity,
    isKnown: probe.isKnown,
    filePath: probe.filePath,
    detectionScore: probe.detectionScore ?? null,
    bestMatchIdentity: probe.bestMatch?.identity || null,
    bestMatchScore: probe.bestMatch ? round(probe.bestMatch.score, 6) : null,
    error: probe.error || null,
  }));
};

const analyzeThreshold = (threshold, probeResults, identities) => {
  const metrics = createMetrics();
  const identityMap = identities.reduce((acc, identity) => {
    acc[identity] = createIdentityBucket(identity);
    return acc;
  }, {});
  const confusionMatrix = createConfusionMatrix(identities);
  const scoreBuckets = {
    correctMatches: [],
    incorrectMatches: [],
    knownRejected: [],
    impostorRejected: [],
  };
  const sampleMisclassifications = [];

  for (const probe of probeResults) {
    if (probe.isKnown && identityMap[probe.identity]) {
      identityMap[probe.identity].totalKnown += 1;
    }

    if (probe.error) {
      metrics.extractionErrors += 1;
      if (probe.isKnown && identityMap[probe.identity]) {
        identityMap[probe.identity].extractionErrors += 1;
      }
      continue;
    }

    metrics.evaluated += 1;
    const score = probe.bestMatch?.score ?? null;
    const predictedIdentity = score !== null && score >= threshold ? probe.bestMatch.identity : null;

    if (probe.isKnown && identityMap[probe.identity]) {
      identityMap[probe.identity].evaluatedKnown += 1;
    }

    if (probe.isKnown) {
      if (predictedIdentity === probe.identity) {
        metrics.tp += 1;
        identityMap[probe.identity].tp += 1;
        confusionMatrix.counts[probe.identity][probe.identity] += 1;
        if (score !== null) scoreBuckets.correctMatches.push(score);
        continue;
      }

      metrics.fn += 1;
      identityMap[probe.identity].fn += 1;

      if (!predictedIdentity) {
        metrics.rejected += 1;
        identityMap[probe.identity].rejected += 1;
        confusionMatrix.counts[probe.identity][REJECTED_LABEL] += 1;
        if (score !== null) scoreBuckets.knownRejected.push(score);
        continue;
      }

      metrics.fp += 1;
      if (identityMap[predictedIdentity]) {
        identityMap[predictedIdentity].fp += 1;
        incrementMapCounter(identityMap[predictedIdentity].mistakenForBy, probe.identity);
      }

      incrementMapCounter(identityMap[probe.identity].misclassifiedAs, predictedIdentity);
      confusionMatrix.counts[probe.identity][predictedIdentity] += 1;
      if (score !== null) scoreBuckets.incorrectMatches.push(score);

      sampleMisclassifications.push({
        expectedIdentity: probe.identity,
        predictedIdentity,
        filePath: probe.filePath,
        score: score !== null ? round(score, 6) : null,
      });
      continue;
    }

    if (!predictedIdentity) {
      metrics.tn += 1;
      metrics.rejected += 1;
      confusionMatrix.counts[IMPOSTOR_LABEL][REJECTED_LABEL] += 1;
      if (score !== null) scoreBuckets.impostorRejected.push(score);
      continue;
    }

    metrics.fp += 1;
    confusionMatrix.counts[IMPOSTOR_LABEL][predictedIdentity] += 1;
    if (identityMap[predictedIdentity]) {
      identityMap[predictedIdentity].fp += 1;
      incrementMapCounter(identityMap[predictedIdentity].mistakenForBy, IMPOSTOR_LABEL);
    }
    if (score !== null) scoreBuckets.incorrectMatches.push(score);

    sampleMisclassifications.push({
      expectedIdentity: IMPOSTOR_LABEL,
      predictedIdentity,
      filePath: probe.filePath,
      score: score !== null ? round(score, 6) : null,
    });
  }

  const perIdentity = Object.values(identityMap)
    .map((bucket) => {
      const bucketPrecision = percent(bucket.tp, bucket.tp + bucket.fp);
      const bucketRecall = percent(bucket.tp, bucket.tp + bucket.fn);
      const bucketF1 = bucketPrecision + bucketRecall
        ? (2 * bucketPrecision * bucketRecall) / (bucketPrecision + bucketRecall)
        : 0;

      return {
        ...bucket,
        sampleCount: bucket.totalKnown,
        usableSampleCount: bucket.evaluatedKnown,
        precision: round(bucketPrecision, 2),
        recall: round(bucketRecall, 2),
        f1Score: round(bucketF1, 2),
        misclassifiedAs: Object.entries(bucket.misclassifiedAs)
          .map(([identity, count]) => ({ identity, count }))
          .sort((a, b) => b.count - a.count || a.identity.localeCompare(b.identity)),
        mistakenForBy: Object.entries(bucket.mistakenForBy)
          .map(([identity, count]) => ({ identity, count }))
          .sort((a, b) => b.count - a.count || a.identity.localeCompare(b.identity)),
      };
    })
    .sort((a, b) => b.sampleCount - a.sampleCount || a.identity.localeCompare(b.identity));

  const topConfusions = [];
  for (const identity of identities) {
    for (const predictedIdentity of identities) {
      if (identity === predictedIdentity) continue;
      const count = confusionMatrix.counts[identity][predictedIdentity];
      if (!count) continue;
      topConfusions.push({ expectedIdentity: identity, predictedIdentity, count });
    }
  }
  topConfusions.sort((a, b) => b.count - a.count || a.expectedIdentity.localeCompare(b.expectedIdentity));

  return {
    threshold,
    ...metrics,
    precision: round(percent(metrics.tp, metrics.tp + metrics.fp), 2),
    recall: round(percent(metrics.tp, metrics.tp + metrics.fn), 2),
    f1Score: round((() => {
      const p = percent(metrics.tp, metrics.tp + metrics.fp);
      const r = percent(metrics.tp, metrics.tp + metrics.fn);
      return p + r ? (2 * p * r) / (p + r) : 0;
    })(), 2),
    perIdentity,
    confusionMatrix,
    topConfusions: topConfusions.slice(0, 15),
    scoreStats: {
      correctMatches: summarizeScores(scoreBuckets.correctMatches),
      incorrectMatches: summarizeScores(scoreBuckets.incorrectMatches),
      knownRejected: summarizeScores(scoreBuckets.knownRejected),
      impostorRejected: summarizeScores(scoreBuckets.impostorRejected),
    },
    sampleMisclassifications: sampleMisclassifications
      .sort((a, b) => (b.score || 0) - (a.score || 0) || a.expectedIdentity.localeCompare(b.expectedIdentity))
      .slice(0, 20),
  };
};

const pad = (value, width) => String(value).padEnd(width, ' ');

const formatThresholdRow = (result) => ([
  pad(result.threshold.toFixed(2), 8),
  pad(String(result.tp), 6),
  pad(String(result.fp), 6),
  pad(String(result.tn), 6),
  pad(String(result.fn), 6),
  pad(`${result.precision}%`, 11),
  pad(`${result.recall}%`, 9),
  pad(`${result.f1Score}%`, 9),
  pad(String(result.extractionErrors), 8),
].join(''));

const printThresholdTable = (results = []) => {
  console.log('Resumen por threshold');
  console.log(pad('Threshold', 8) + pad('TP', 6) + pad('FP', 6) + pad('TN', 6) + pad('FN', 6) + pad('Precision', 11) + pad('Recall', 9) + pad('F1', 9) + pad('Errores', 8));
  console.log('-'.repeat(69));
  for (const result of results) {
    console.log(formatThresholdRow(result));
  }
};

const printPerIdentityTable = (perIdentity = []) => {
  console.log('');
  console.log('Rendimiento por identidad (threshold recomendado)');
  console.log(
    pad('Identidad', 26)
    + pad('TP', 6)
    + pad('FP', 6)
    + pad('FN', 6)
    + pad('Prec.', 9)
    + pad('Recall', 9)
    + pad('F1', 9)
    + pad('Usables', 9)
    + pad('Errores', 8)
  );
  console.log('-'.repeat(88));
  for (const item of perIdentity) {
    console.log(
      pad(item.identity, 26)
      + pad(String(item.tp), 6)
      + pad(String(item.fp), 6)
      + pad(String(item.fn), 6)
      + pad(`${item.precision}%`, 9)
      + pad(`${item.recall}%`, 9)
      + pad(`${item.f1Score}%`, 9)
      + pad(String(item.usableSampleCount), 9)
      + pad(String(item.extractionErrors), 8)
    );
  }
};

const printConfusionSummary = (analysis) => {
  console.log('');
  console.log('Principales confusiones');
  if (!analysis.topConfusions.length) {
    console.log('  No se detectaron confusiones entre identidades en el threshold recomendado.');
    return;
  }

  for (const confusion of analysis.topConfusions.slice(0, 10)) {
    console.log(`  - ${confusion.expectedIdentity} se confundio con ${confusion.predictedIdentity} (${confusion.count} veces)`);
  }
};

const printScoreSummary = (scoreStats) => {
  const printScoreLine = (label, stats) => {
    console.log(`  ${label}`);
    console.log(`    count=${stats.count} mean=${stats.mean} min=${stats.min} p25=${stats.p25} p50=${stats.p50} p75=${stats.p75} max=${stats.max}`);
  };

  console.log('');
  console.log('Distribucion de scores');
  printScoreLine('Aciertos', scoreStats.correctMatches);
  printScoreLine('Confusiones', scoreStats.incorrectMatches);
  printScoreLine('Conocidos rechazados', scoreStats.knownRejected);
  printScoreLine('Impostores rechazados', scoreStats.impostorRejected);
};

const printErrorSummary = (errorSummary) => {
  if (!errorSummary.total) return;
  console.log('');
  console.log(`Errores de extraccion: ${errorSummary.total}`);
  console.log('  Por categoria:');
  for (const item of errorSummary.byCategory.slice(0, 6)) {
    console.log(`    - ${item.key}: ${item.count}`);
  }
  console.log('  Por identidad:');
  for (const item of errorSummary.byIdentity.slice(0, 10)) {
    console.log(`    - ${item.key}: ${item.count}`);
  }
};

const ensureDir = (dirPath, label) => {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    throw new Error(`No se encontro el directorio ${label}: ${dirPath}`);
  }
};

const isImageFile = (fileName) => /\.(jpg|jpeg|png)$/i.test(fileName);

const imageToDataUrl = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  const base64 = fs.readFileSync(filePath).toString('base64');
  return `data:${mimeType};base64,${base64}`;
};

const cosineSimilarity = (vectorA = [], vectorB = []) => {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB) || vectorA.length === 0 || vectorA.length !== vectorB.length) {
    return -1;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < vectorA.length; index += 1) {
    const valueA = Number(vectorA[index]) || 0;
    const valueB = Number(vectorB[index]) || 0;
    dotProduct += valueA * valueB;
    magnitudeA += valueA * valueA;
    magnitudeB += valueB * valueB;
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return -1;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
};

const createMetrics = () => ({
  tp: 0,
  fp: 0,
  tn: 0,
  fn: 0,
  evaluated: 0,
  rejected: 0,
  extractionErrors: 0,
});

const pickBestMatch = (probeEmbedding, enrollments) => {
  let bestMatch = null;

  for (const enrollment of enrollments) {
    const score = cosineSimilarity(probeEmbedding, enrollment.embedding);
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        identity: enrollment.identity,
        score,
        filePath: enrollment.filePath,
      };
    }
  }

  return bestMatch;
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = payload?.message || payload?.detail || String(payload || 'Error en la solicitud');
    const error = new Error(message);
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  return payload;
};

const login = async () => {
  const tokenFromEnv = process.env.EVALUATION_TOKEN;
  if (tokenFromEnv) {
    return tokenFromEnv;
  }

  const email = process.env.EVALUATION_EMAIL;
  const password = process.env.EVALUATION_PASSWORD;

  if (!email || !password) {
    throw new Error('Define EVALUATION_TOKEN o las variables EVALUATION_EMAIL y EVALUATION_PASSWORD para autenticar la evaluacion facial.');
  }

  const response = await fetchJson(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  return response.token;
};

const extractEmbedding = async (token, imagePath) => {
  const payload = await fetchJson(`${apiBaseUrl}/face/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ image: imageToDataUrl(imagePath) }),
  });

  const data = payload?.data || {};
  const embedding = Array.isArray(data.embedding) ? data.embedding : [];
  if (embedding.length !== 512) {
    throw new Error(`Embedding invalido para ${path.basename(imagePath)}. Se esperaban 512 dimensiones y se recibieron ${embedding.length}.`);
  }

  return {
    embedding,
    detectionScore: data.detectionScore,
    embeddingDimensions: data.embeddingDimensions,
  };
};

const loadDataset = () => {
  const enrollDir = path.join(datasetDir, 'enroll');
  const identifyDir = path.join(datasetDir, 'identify');
  const impostorsDir = path.join(datasetDir, 'impostors');

  ensureDir(datasetDir, 'raiz del dataset');
  ensureDir(enrollDir, 'de enrolamiento');
  ensureDir(identifyDir, 'de identificacion');
  ensureDir(impostorsDir, 'de impostores');

  const enrollments = fs.readdirSync(enrollDir)
    .filter(isImageFile)
    .map((fileName) => ({
      identity: path.parse(fileName).name,
      filePath: path.join(enrollDir, fileName),
    }));

  if (!enrollments.length) {
    throw new Error(`No se encontraron imagenes de enrolamiento en ${enrollDir}`);
  }

  const probes = [];
  for (const identity of fs.readdirSync(identifyDir)) {
    const identityDir = path.join(identifyDir, identity);
    if (!fs.existsSync(identityDir) || !fs.statSync(identityDir).isDirectory()) continue;

    for (const fileName of fs.readdirSync(identityDir).filter(isImageFile)) {
      probes.push({
        identity,
        isKnown: true,
        filePath: path.join(identityDir, fileName),
      });
    }
  }

  for (const fileName of fs.readdirSync(impostorsDir).filter(isImageFile)) {
    probes.push({
      identity: 'impostor',
      isKnown: false,
      filePath: path.join(impostorsDir, fileName),
    });
  }

  if (!probes.length) {
    throw new Error(`No se encontraron probes en ${identifyDir} ni imagenes de impostores en ${impostorsDir}`);
  }

  return {
    enrollments,
    probes,
  };
};

const evaluateDataset = async () => {
  const token = await login();
  const dataset = loadDataset();
  const datasetIdentities = dataset.enrollments.map((item) => item.identity).sort((a, b) => a.localeCompare(b));
  const report = {
    apiBaseUrl,
    datasetDir,
    generatedAt: new Date().toISOString(),
    thresholds,
    identities: datasetIdentities,
    enrollmentCount: dataset.enrollments.length,
    validEnrollmentCount: 0,
    probeCount: dataset.probes.length,
    results: [],
    errors: [],
    probeDetails: [],
    errorSummary: null,
    recommendedAnalysis: null,
  };

  const enrollmentEmbeddings = [];
  for (const enrollment of dataset.enrollments) {
    try {
      const extraction = await extractEmbedding(token, enrollment.filePath);
      enrollmentEmbeddings.push({
        ...enrollment,
        ...extraction,
      });
    } catch (error) {
      report.errors.push({
        stage: 'enroll',
        identity: enrollment.identity,
        filePath: enrollment.filePath,
        message: error.message,
      });
    }
  }

  if (!enrollmentEmbeddings.length) {
    throw new Error('No fue posible extraer embeddings para ninguna imagen de enrolamiento.');
  }

  report.validEnrollmentCount = enrollmentEmbeddings.length;

  const probeResults = [];
  for (const probe of dataset.probes) {
    try {
      const extraction = await extractEmbedding(token, probe.filePath);
      const bestMatch = pickBestMatch(extraction.embedding, enrollmentEmbeddings);
      probeResults.push({
        ...probe,
        bestMatch,
        detectionScore: extraction.detectionScore,
      });
    } catch (error) {
      probeResults.push({
        ...probe,
        error: error.message,
      });
      report.errors.push({
        stage: 'probe',
        identity: probe.identity,
        filePath: probe.filePath,
        message: error.message,
      });
    }
  }

  report.probeDetails = buildProbeDetails(probeResults);
  report.errorSummary = buildErrorSummary(report.errors);

  for (const threshold of thresholds) {
    const analysis = analyzeThreshold(threshold, probeResults, datasetIdentities);
    report.results.push({
      threshold: analysis.threshold,
      tp: analysis.tp,
      fp: analysis.fp,
      tn: analysis.tn,
      fn: analysis.fn,
      evaluated: analysis.evaluated,
      rejected: analysis.rejected,
      extractionErrors: analysis.extractionErrors,
      precision: analysis.precision,
      recall: analysis.recall,
      f1Score: analysis.f1Score,
    });
  }

  const recommended = report.results.find((result) => result.precision >= 90 && result.recall >= 85)
    || [...report.results].sort((a, b) => b.f1Score - a.f1Score)[0];
  report.recommended = recommended;
  report.recommendedAnalysis = recommended
    ? analyzeThreshold(recommended.threshold, probeResults, datasetIdentities)
    : null;

  const outputPath = path.join(datasetDir, 'evaluation-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  return { report, outputPath };
};

const printSummary = ({ report, outputPath }) => {
  console.log('Evaluacion facial completada');
  console.log(`API: ${report.apiBaseUrl}`);
  console.log(`Dataset: ${report.datasetDir}`);
  console.log(`Enrollments: ${report.validEnrollmentCount}/${report.enrollmentCount}`);
  console.log(`Probes: ${report.probeCount}`);
  console.log('');

  printThresholdTable(report.results);

  if (report.recommended) {
    console.log('');
    console.log(`Threshold recomendado: ${report.recommended.threshold.toFixed(2)}`);
    console.log(`  Precision: ${report.recommended.precision}%`);
    console.log(`  Recall:    ${report.recommended.recall}%`);
    console.log(`  F1-score:  ${report.recommended.f1Score}%`);
  }

  if (report.recommendedAnalysis) {
    printPerIdentityTable(report.recommendedAnalysis.perIdentity);
    printConfusionSummary(report.recommendedAnalysis);
    printScoreSummary(report.recommendedAnalysis.scoreStats);
  }

  if (report.errorSummary) {
    printErrorSummary(report.errorSummary);
  }

  console.log('');
  console.log(`Reporte completo: ${outputPath}`);
};

evaluateDataset()
  .then(printSummary)
  .catch((error) => {
    console.error('No fue posible ejecutar la evaluacion facial.');
    console.error(error.message);
    process.exitCode = 1;
  });
