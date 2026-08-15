const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { FaceEvaluationRun } = require("../models/face-evaluation-run.model");
const { FaceEvaluationProfile } = require("../models/face-evaluation-profile.model");
const { FaceEvaluationProbe } = require("../models/face-evaluation-probe.model");
const { FaceEvaluationScoreChunk } = require("../models/face-evaluation-score-chunk.model");

const REPORT_CSS = `
:root{--ink:#10231f;--muted:#58706a;--green:#00594e;--green2:#0f766e;--gold:#b5a160;--bg:#edf4f1;--paper:#fff;--line:#d8e4df;--good:#087f5b;--warn:#a16207;--bad:#b42318;--blue:#2563eb;--shadow:0 18px 50px rgba(15,35,31,.09)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:linear-gradient(135deg,#e9f3ef 0,#f7f4ea 52%,#edf4f1 100%);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.5}a{color:var(--green2)}code,.mono{font-family:"Cascadia Code",Consolas,monospace}.shell{max-width:1500px;margin:auto;padding:28px}.hero{position:relative;overflow:hidden;border-radius:28px;padding:34px;background:linear-gradient(125deg,#003f37,#087568);color:#fff;box-shadow:var(--shadow)}.hero:after{content:"";position:absolute;width:340px;height:340px;border-radius:50%;right:-100px;top:-140px;background:rgba(181,161,96,.28)}.eyebrow{text-transform:uppercase;letter-spacing:.22em;font-size:12px;font-weight:800;color:var(--gold)}h1,h2,h3{margin:0;line-height:1.15}h1{font-size:clamp(30px,5vw,56px);max-width:900px}.hero p{max-width:920px;color:rgba(255,255,255,.82)}.nav{display:flex;gap:9px;flex-wrap:wrap;margin-top:22px}.nav a{color:#fff;text-decoration:none;border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.08);padding:8px 12px;border-radius:999px;font-size:13px}.section{margin-top:24px;border:1px solid var(--line);border-radius:24px;background:rgba(255,255,255,.94);padding:24px;box-shadow:var(--shadow)}.section-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:18px}.section-head p{margin:6px 0 0;color:var(--muted);max-width:850px}.grid{display:grid;gap:14px}.cards{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}.card{border:1px solid var(--line);border-radius:18px;padding:17px;background:#fff}.card .label{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);font-weight:800}.card .value{font-size:28px;font-weight:850;margin-top:7px}.card .hint{font-size:12px;color:var(--muted);margin-top:4px}.card.good{border-color:#94d5bd;background:#f1fbf7}.card.warn{border-color:#ead59a;background:#fffaf0}.card.bad{border-color:#efb4ae;background:#fff5f3}.notice{border-left:5px solid var(--gold);padding:14px 16px;background:#fff9e9;border-radius:12px;color:#624d16}.formula{padding:16px;border-radius:14px;background:#0f2420;color:#d9fff4;overflow:auto}.two{grid-template-columns:repeat(auto-fit,minmax(340px,1fr))}.chart{overflow:auto;border:1px solid var(--line);border-radius:18px;background:#fff;padding:12px}.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted)}.legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:16px;background:#fff}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:10px 12px;border-bottom:1px solid #e8efec;text-align:left;white-space:nowrap}th{position:sticky;top:0;background:#f4f8f6;color:#38524c;font-size:11px;text-transform:uppercase;letter-spacing:.08em;z-index:1}tr:hover td{background:#f8fbfa}.pill{display:inline-flex;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:800}.pill.good{background:#dcfce7;color:#166534}.pill.warn{background:#fef3c7;color:#92400e}.pill.bad{background:#fee2e2;color:#991b1b}.controls{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.controls input,.controls select{border:1px solid #c9d8d2;border-radius:10px;background:#fff;padding:9px 11px;color:var(--ink)}button,.button{border:0;border-radius:10px;padding:9px 13px;background:var(--green);color:#fff;font-weight:750;cursor:pointer;text-decoration:none;display:inline-flex}.pager{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}.technical{margin-top:14px;border:1px dashed #b9cbc4;border-radius:14px;padding:12px;background:#f8fbfa}.technical summary{cursor:pointer;font-weight:800}.embedding{max-height:320px;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:11px;background:#10231f;color:#d7f9ed;padding:14px;border-radius:12px}.profile-head{display:grid;grid-template-columns:160px 1fr;gap:20px}.portrait{width:160px;height:160px;border-radius:20px;object-fit:cover;border:1px solid var(--line);background:#e8efec}.muted{color:var(--muted)}.small{font-size:12px}.right{text-align:right}.risk{color:var(--bad);font-weight:800}.success{color:var(--good);font-weight:800}.footer{text-align:center;color:var(--muted);font-size:12px;padding:30px}.candidate-probe{margin-bottom:28px;padding-bottom:25px;border-bottom:3px solid #dce9e4}.candidate-probe:last-child{border:0}.candidate-layout{display:grid;grid-template-columns:150px 1fr;gap:16px;margin:14px 0}.candidate-layout img{width:150px;height:150px;object-fit:cover;border-radius:18px;border:1px solid var(--line)}
@media(max-width:700px){.shell{padding:12px}.hero,.section{padding:18px;border-radius:18px}.profile-head,.candidate-layout{grid-template-columns:1fr}.portrait,.candidate-layout img{width:120px;height:120px}th,td{padding:8px}.right{text-align:left}}
@media print{body{background:#fff}.shell{max-width:none;padding:0}.hero,.section{box-shadow:none;break-inside:avoid}.nav,.controls,.pager{display:none}.section{margin-top:12px}}
`;

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const safeJson = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const formatNumber = (value, digits = 2) => Number.isFinite(Number(value))
  ? Number(value).toLocaleString("es-CO", { maximumFractionDigits: digits })
  : "N/D";
const formatPercent = (value) => `${formatNumber(value, 4)} %`;
const formatMs = (value) => `${formatNumber(value, 4)} ms`;
const hashKey = (value) => crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 16);
const profileFileName = (identity) => `${hashKey(identity)}.html`;

const ensureDirectory = (directory) => fsp.mkdir(directory, { recursive: true });
const readJson = async (filePath) => JSON.parse(await fsp.readFile(filePath, "utf8"));

const backupExistingReport = async (outputDirectory, targets) => {
  const backupDirectory = path.join(outputDirectory, `.report-backup-${process.pid}-${Date.now()}`);
  const moved = [];
  await ensureDirectory(backupDirectory);
  for (const target of targets) {
    if (!fs.existsSync(target)) continue;
    const backupTarget = path.join(backupDirectory, path.basename(target));
    await fsp.rename(target, backupTarget);
    moved.push({ target, backupTarget });
  }
  return { backupDirectory, moved };
};

const restoreReportBackup = async ({ backupDirectory, moved }, targets) => {
  await Promise.all(targets.map((target) => fsp.rm(target, { recursive: true, force: true })));
  for (const item of moved) {
    if (fs.existsSync(item.backupTarget)) await fsp.rename(item.backupTarget, item.target);
  }
  await fsp.rm(backupDirectory, { recursive: true, force: true });
};

const relativeHref = (fromDirectory, targetPath) => {
  if (!targetPath) return "";
  const relative = path.relative(fromDirectory, targetPath).split(path.sep);
  return relative.map((part) => (part === ".." || part === "." ? part : encodeURIComponent(part))).join("/");
};

const selectBestThreshold = (metrics = []) => [...metrics].sort((left, right) => (
  Number(right.f1Score || 0) - Number(left.f1Score || 0)
  || Number(left.impostorAcceptanceRate || 0) - Number(right.impostorAcceptanceRate || 0)
  || Number(left.validUserRejectionRate || 0) - Number(right.validUserRejectionRate || 0)
  || Number(left.threshold || 0) - Number(right.threshold || 0)
))[0] || null;

const summarizeErrors = (errors = []) => {
  const counts = new Map();
  for (const item of errors) {
    const message = item?.error?.message || "Sin mensaje";
    const key = `${item.stage || "desconocida"}|${message}`;
    const current = counts.get(key) || { stage: item.stage || "desconocida", message, count: 0 };
    current.count += 1;
    counts.set(key, current);
  }
  return [...counts.values()].sort((left, right) => right.count - left.count || left.message.localeCompare(right.message));
};

const normalizeReportSummary = (summary) => {
  const countKeys = [
    "sourceIdentities", "eligibleIdentities", "requestedProfiles", "enrolledProfiles",
    "totalProbes", "knownProbes", "impostorProbes", "expectedComparisons",
  ];
  summary.counts = summary.counts || {};
  for (const key of countKeys) {
    const value = Number(summary.counts[key]);
    if (!Number.isFinite(value) || value < 0) throw new Error(`Conteo invalido en counts.${key}`);
    summary.counts[key] = value;
  }
  const metricKeys = [
    "threshold", "totalTests", "knownTests", "impostorTests", "validExtractions",
    "extractionErrors", "processingErrors", "correctIdentifications", "incorrectIdentifications",
    "knownUsersRejected", "impostorsRejected", "impostorsAccepted", "top1Correct", "top2Correct",
    "validKnownTests", "validImpostorTests", "precision", "recall", "recallValidExtractions",
    "f1Score", "top1Accuracy", "top2Accuracy", "validUserRejectionRate",
    "impostorAcceptanceRate", "extractionErrorRate", "processingErrorRate",
  ];
  if (!Array.isArray(summary.thresholdMetrics) || !summary.thresholdMetrics.length) {
    throw new Error("No hay metricas por umbral para generar el reporte");
  }
  summary.thresholdMetrics = summary.thresholdMetrics.map((metric, index) => {
    const normalized = { ...metric };
    for (const key of metricKeys) {
      if (normalized[key] === undefined) continue;
      const value = Number(normalized[key]);
      if (!Number.isFinite(value)) throw new Error(`Metrica invalida thresholdMetrics[${index}].${key}`);
      normalized[key] = value;
    }
    if (!Number.isFinite(normalized.threshold)) throw new Error(`Umbral invalido en thresholdMetrics[${index}]`);
    return normalized;
  });
  return summary;
};

const lineChart = (metrics, series) => {
  const width = 900;
  const height = 300;
  const padding = { left: 54, right: 20, top: 24, bottom: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const x = (index) => padding.left + (metrics.length <= 1 ? 0 : (index / (metrics.length - 1)) * chartWidth);
  const y = (value) => padding.top + chartHeight - (Math.max(0, Math.min(100, Number(value) || 0)) / 100) * chartHeight;
  const grid = [0, 25, 50, 75, 100].map((value) => `
    <line x1="${padding.left}" y1="${y(value)}" x2="${width - padding.right}" y2="${y(value)}" stroke="#dce8e3"/>
    <text x="${padding.left - 10}" y="${y(value) + 4}" text-anchor="end" font-size="11" fill="#58706a">${value}%</text>`).join("");
  const paths = series.map((item) => {
    const points = metrics.map((metric, index) => `${x(index)},${y(metric[item.key])}`).join(" ");
    const dots = metrics.map((metric, index) => `<circle cx="${x(index)}" cy="${y(metric[item.key])}" r="3" fill="${item.color}"><title>Umbral ${metric.threshold}: ${formatPercent(metric[item.key])}</title></circle>`).join("");
    return `<polyline fill="none" stroke="${item.color}" stroke-width="3" points="${points}"/>${dots}`;
  }).join("");
  const labels = metrics.map((metric, index) => `<text x="${x(index)}" y="${height - 14}" text-anchor="middle" font-size="10" fill="#58706a">${metric.threshold}</text>`).join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Metricas por umbral" style="min-width:720px;width:100%">${grid}${paths}${labels}<text x="${width / 2}" y="${height - 1}" text-anchor="middle" font-size="11" fill="#58706a">Umbral</text></svg>`;
};

const timingRows = (summary = {}) => Object.entries(summary)
  .filter(([key]) => key !== "profilesEvaluated")
  .map(([key, stats]) => `
  <tr><td>${escapeHtml(key)}</td><td>${formatNumber(stats.count, 0)}</td><td>${formatMs(stats.mean)}</td><td>${formatMs(stats.median)}</td><td>${formatMs(stats.min)}</td><td>${formatMs(stats.max)}</td><td>${formatMs(stats.p90)}</td><td>${formatMs(stats.p95)}</td></tr>`).join("");

const buildProfilePage = ({ profile, outputDirectory, assetsDirectory }) => {
  const profileDirectory = path.join(outputDirectory, "profiles");
  const imageHref = relativeHref(profileDirectory, profile.preparedFile || profile.sourceFile);
  const attempts = (profile.enrollmentAttempts || []).map((attempt, index) => `
    <tr><td>${index + 1}</td><td>${escapeHtml(path.basename(attempt.file || ""))}</td><td>${escapeHtml(attempt.endpoint || "")}</td><td><span class="pill ${attempt.success ? "good" : "bad"}">${attempt.success ? "Exitoso" : "Fallido"}</span></td><td>${formatNumber(attempt.detectionScore, 6)}</td><td>${formatMs(attempt.timings?.endpointMs)}</td><td>${escapeHtml(attempt.error?.message || "-")}</td></tr>`).join("");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(profile.identity)} | Perfil de evaluacion</title><link rel="stylesheet" href="${relativeHref(profileDirectory, path.join(assetsDirectory, "report.css"))}"></head><body><main class="shell">
  <a class="button" href="../evaluation-report.html#enrollment">Volver al informe</a>
  <section class="section"><div class="profile-head">${imageHref ? `<img class="portrait" src="${imageHref}" alt="${escapeHtml(profile.identity)}">` : ""}<div><p class="eyebrow">Perfil enrolado</p><h1 style="font-size:38px">${escapeHtml(profile.identity)}</h1><p class="muted">Usuario MongoDB: <span class="mono">${escapeHtml(profile.userId || profile.user || "N/D")}</span></p><div class="grid cards"><div class="card"><div class="label">Estado</div><div class="value">${escapeHtml(profile.status)}</div></div><div class="card"><div class="label">Confianza</div><div class="value">${formatNumber(profile.detectionScore, 6)}</div></div><div class="card"><div class="label">Dimensiones</div><div class="value">${formatNumber(profile.embeddingDimensions, 0)}</div></div><div class="card"><div class="label">Intentos</div><div class="value">${formatNumber(profile.enrollmentAttempts?.length || 0, 0)}</div></div></div>${profile.error ? `<div class="notice" style="margin-top:14px"><strong>Error del perfil:</strong> ${escapeHtml(profile.error.message || JSON.stringify(profile.error))}</div>` : ""}</div></div></section>
  <section class="section"><div class="section-head"><div><h2>Intentos de enrolamiento</h2><p>La primera imagen se procesa durante la creacion normal del usuario. Si falla, se intenta la siguiente mediante /face/enroll.</p></div></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Archivo</th><th>Endpoint</th><th>Resultado</th><th>Confianza</th><th>Tiempo endpoint</th><th>Error</th></tr></thead><tbody>${attempts || `<tr><td colspan="7">Sin intentos registrados.</td></tr>`}</tbody></table></div></section>
  <section class="section"><h2>Embedding completo</h2><p class="muted">Vector biometrico de ${profile.embedding?.length || 0} dimensiones guardado para este perfil.</p><pre class="embedding">${escapeHtml(JSON.stringify(profile.embedding || null, null, 2))}</pre></section>
  <section class="section"><h2>Tiempos internos</h2><pre class="embedding">${escapeHtml(JSON.stringify(profile.extractionTimings || {}, null, 2))}</pre></section>
  </main></body></html>`;
};

const candidateSection = ({ probe, candidates, profilesByIdentity, detailsDirectory, recommendedThreshold }) => {
  const anchor = `probe-${hashKey(probe.probeKey)}`;
  const imageHref = relativeHref(detailsDirectory, probe.preparedFile || probe.sourceFile);
  const candidateRows = candidates.map((candidate) => {
    const profile = profilesByIdentity.get(candidate.identity);
    const profileLink = profile ? `../profiles/${profileFileName(profile.identity)}` : "";
    const aboveThreshold = candidate.score >= recommendedThreshold;
    const decisionLabel = candidate.rank === 1
      ? (aboveThreshold ? "Top-1 aceptado" : "Top-1 rechazado")
      : (aboveThreshold ? "Supera umbral" : "Bajo umbral");
    return `<tr><td>${candidate.rank}</td><td>${profileLink ? `<a href="${profileLink}">${escapeHtml(candidate.identity)}</a>` : escapeHtml(candidate.identity)}</td><td class="mono">${escapeHtml(candidate.userId || "N/D")}</td><td>${formatNumber(candidate.score, 8)}</td><td><span class="pill ${candidate.rank === 1 && aboveThreshold ? "good" : "warn"}">${decisionLabel}</span></td><td>${candidate.dimensions}</td><td>${formatNumber(candidate.dotProduct, 8)}</td><td>${formatNumber(candidate.querySquaredMagnitude, 8)}</td><td>${formatNumber(candidate.profileSquaredMagnitude, 8)}</td><td>${formatNumber(candidate.queryNorm, 8)}</td><td>${formatNumber(candidate.profileNorm, 8)}</td><td>${formatNumber(candidate.denominator, 8)}</td><td>${candidate.valid ? "Si" : "No"}</td><td>${escapeHtml(candidate.error || "-")}</td></tr>`;
  }).join("");
  return `<section id="${anchor}" class="section candidate-probe"><p class="eyebrow">Prueba facial</p><h2>${escapeHtml(probe.probeKey)}</h2><div class="candidate-layout">${imageHref ? `<img src="${imageHref}" alt="Probe ${escapeHtml(probe.identity)}">` : ""}<div><p><strong>Identidad esperada:</strong> ${escapeHtml(probe.identity)} · <strong>Tipo:</strong> ${probe.isKnown ? "Conocido" : "Impostor"}</p><p><strong>Top-1:</strong> ${escapeHtml(probe.top1?.identity || "N/D")} (${formatNumber(probe.top1?.score, 8)}) · <strong>Top-2:</strong> ${escapeHtml(probe.top2?.identity || "N/D")} (${formatNumber(probe.top2?.score, 8)})</p><p><strong>Margen:</strong> ${formatNumber(probe.top1Top2Margin, 8)} · <strong>Rango esperado:</strong> ${probe.expectedIdentityRank ?? "N/A"} · <strong>Perfiles:</strong> ${probe.profilesEvaluated} · <strong>Confianza de deteccion:</strong> ${formatNumber(probe.detectionScore, 8)}</p><p class="small muted">La decision acepta exclusivamente Top-1 cuando score &gt;= ${recommendedThreshold}. Un candidato inferior puede superar el umbral sin convertirse en la decision final.</p></div></div>
  <details class="technical"><summary>Embedding completo del probe (${probe.embedding?.length || 0} dimensiones)</summary><pre class="embedding">${escapeHtml(JSON.stringify(probe.embedding || null, null, 2))}</pre></details>
  <details class="technical"><summary>Tiempos completos</summary><pre class="embedding">${escapeHtml(JSON.stringify(probe.timings || {}, null, 2))}</pre></details>
  <div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Rango</th><th>Candidato</th><th>User ID</th><th>Score</th><th>Relacion umbral</th><th>Dim.</th><th>Producto punto</th><th>Magnitud² probe</th><th>Magnitud² perfil</th><th>Norma probe</th><th>Norma perfil</th><th>Denominador</th><th>Valido</th><th>Error</th></tr></thead><tbody>${candidateRows}</tbody></table></div></section>`;
};

const candidatePage = ({ pageNumber, totalPages, sections, outputDirectory, assetsDirectory }) => {
  const detailsDirectory = path.join(outputDirectory, "candidate-details");
  const pageName = (number) => `page-${String(number).padStart(5, "0")}.html`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Candidatos ${pageNumber}/${totalPages}</title><link rel="stylesheet" href="${relativeHref(detailsDirectory, path.join(assetsDirectory, "report.css"))}"></head><body><main class="shell"><div class="pager"><a class="button" href="../evaluation-report.html#probes">Volver al informe</a><span>Pagina ${pageNumber} de ${totalPages}</span><span>${pageNumber > 1 ? `<a class="button" href="${pageName(pageNumber - 1)}">Anterior</a>` : ""} ${pageNumber < totalPages ? `<a class="button" href="${pageName(pageNumber + 1)}">Siguiente</a>` : ""}</span></div>${sections.join("")}<div class="pager"><a class="button" href="../evaluation-report.html#probes">Volver</a><span>Pagina ${pageNumber} de ${totalPages}</span><span>${pageNumber > 1 ? `<a class="button" href="${pageName(pageNumber - 1)}">Anterior</a>` : ""} ${pageNumber < totalPages ? `<a class="button" href="${pageName(pageNumber + 1)}">Siguiente</a>` : ""}</span></div></main></body></html>`;
};

const generateCandidatePages = async ({ runId, probes, profiles, outputDirectory, assetsDirectory, pageCandidateLimit, recommendedThreshold }) => {
  const detailsDirectory = path.join(outputDirectory, "candidate-details");
  await ensureDirectory(detailsDirectory);
  const chunkTotals = await FaceEvaluationScoreChunk.aggregate([
    { $match: { runId } },
    { $group: { _id: "$probeKey", candidateCount: { $sum: "$candidateCount" }, chunkCount: { $sum: 1 } } },
  ]);
  const totalsByProbe = new Map(chunkTotals.map((item) => [item._id, item]));
  const completed = probes
    .filter((probe) => probe.status === "completed" && probe.top1)
    .sort((left, right) => (left.probeKey < right.probeKey ? -1 : left.probeKey > right.probeKey ? 1 : 0));
  for (const probe of completed) {
    const stored = totalsByProbe.get(probe.probeKey);
    if (!stored || stored.candidateCount !== probe.profilesEvaluated) {
      throw new Error(`Candidatos incompletos para ${probe.probeKey}: ${stored?.candidateCount || 0}/${probe.profilesEvaluated}`);
    }
  }
  const pageByProbe = new Map();
  const probeKeysByPage = new Map();
  let pageNumber = completed.length ? 1 : 0;
  let candidatesOnPage = 0;
  for (const probe of completed) {
    const candidateCount = Math.max(1, Number(probe.profilesEvaluated) || profiles.length || 1);
    if (candidatesOnPage > 0 && candidatesOnPage + candidateCount > pageCandidateLimit) {
      pageNumber += 1;
      candidatesOnPage = 0;
    }
    pageByProbe.set(probe.probeKey, pageNumber);
    if (!probeKeysByPage.has(pageNumber)) probeKeysByPage.set(pageNumber, []);
    probeKeysByPage.get(pageNumber).push(probe.probeKey);
    candidatesOnPage += candidateCount;
  }
  const totalPages = pageNumber;
  const profilesByIdentity = new Map(profiles.map((profile) => [profile.identity, profile]));
  let currentProbeKey = null;
  let currentCandidates = [];
  let currentPage = completed.length ? 1 : 0;
  let sections = [];
  let generatedProbeDetails = 0;
  let detailedProbesByKey = new Map();

  const loadDetailedProbes = async (targetPage) => {
    const probeKeys = probeKeysByPage.get(targetPage) || [];
    if (!probeKeys.length) {
      detailedProbesByKey = new Map();
      return;
    }
    const pageProbes = await FaceEvaluationProbe.find({ runId, probeKey: { $in: probeKeys } })
      .select("+embedding")
      .lean();
    detailedProbesByKey = new Map(pageProbes.map((probe) => [probe.probeKey, probe]));
  };

  const flushPage = async () => {
    if (!sections.length) return;
    const filePath = path.join(detailsDirectory, `page-${String(currentPage).padStart(5, "0")}.html`);
    await fsp.writeFile(filePath, candidatePage({ pageNumber: currentPage, totalPages, sections, outputDirectory, assetsDirectory }), "utf8");
    sections = [];
  };

  const flushProbe = async () => {
    if (!currentProbeKey) return;
    const targetPage = pageByProbe.get(currentProbeKey);
    if (!targetPage) return;
    if (targetPage !== currentPage) {
      await flushPage();
      currentPage = targetPage;
      await loadDetailedProbes(currentPage);
    }
    const probe = detailedProbesByKey.get(currentProbeKey);
    if (!probe || !Array.isArray(probe.embedding) || !probe.embedding.length) {
      throw new Error(`No se encontro el embedding Mongo del probe ${currentProbeKey}`);
    }
    if (currentCandidates.length !== probe.profilesEvaluated) {
      throw new Error(`El detalle de ${currentProbeKey} contiene ${currentCandidates.length}/${probe.profilesEvaluated} candidatos`);
    }
    for (let index = 0; index < currentCandidates.length; index += 1) {
      if (currentCandidates[index].rank !== index + 1) {
        throw new Error(`Ranking incompleto o desordenado para ${currentProbeKey}`);
      }
    }
    sections.push(candidateSection({ probe, candidates: currentCandidates, profilesByIdentity, detailsDirectory, recommendedThreshold }));
    generatedProbeDetails += 1;
  };

  if (totalPages) await loadDetailedProbes(currentPage);
  const cursor = FaceEvaluationScoreChunk.find({ runId }).sort({ probeKey: 1, chunkIndex: 1 }).lean().cursor();
  for await (const chunk of cursor) {
    if (currentProbeKey && chunk.probeKey !== currentProbeKey) {
      await flushProbe();
      currentCandidates = [];
    }
    currentProbeKey = chunk.probeKey;
    currentCandidates.push(...(chunk.candidates || []));
  }
  await flushProbe();
  await flushPage();
  if (generatedProbeDetails !== completed.length) {
    throw new Error(`Solo se generaron ${generatedProbeDetails}/${completed.length} detalles de probes`);
  }

  return {
    pageByProbe,
    totalPages,
    generatedProbeDetails,
    candidateCount: chunkTotals.reduce((total, item) => total + item.candidateCount, 0),
  };
};

const buildMainReport = ({ summary, enrollments, run, bestThreshold, errorGroups, processingErrorGroups, pageByProbe, candidateStats, outputDirectory }) => {
  const counts = summary.counts || {};
  const metrics = summary.thresholdMetrics || [];
  const validRate = counts.totalProbes ? ((bestThreshold.validExtractions / counts.totalProbes) * 100) : 0;
  const profiles = enrollments.map((profile) => ({
    identity: profile.identity,
    status: profile.status,
    detectionScore: profile.detectionScore,
    embeddingDimensions: profile.embeddingDimensions,
    attempts: profile.enrollmentAttempts?.length || 0,
    link: `profiles/${profileFileName(profile.identity)}`,
  }));
  const probeRows = (summary.topResults || []).map((probe) => {
    const page = pageByProbe.get(probe.probeKey);
    return {
      probeKey: probe.probeKey,
      identity: probe.identity,
      isKnown: probe.isKnown,
      status: probe.status,
      top1Identity: probe.top1?.identity || null,
      top1Score: probe.top1?.score ?? null,
      top2Identity: probe.top2?.identity || null,
      top2Score: probe.top2?.score ?? null,
      margin: probe.top1Top2Margin ?? null,
      expectedRank: probe.expectedIdentityRank ?? null,
      detailLink: page ? `candidate-details/page-${String(page).padStart(5, "0")}.html#probe-${hashKey(probe.probeKey)}` : null,
      errorStage: probe.errorStage || null,
      error: probe.error?.message || null,
    };
  });
  const thresholdRows = metrics.map((item) => `<tr class="${item.threshold === bestThreshold.threshold ? "recommended" : ""}"><td><strong>${item.threshold}</strong>${item.threshold === bestThreshold.threshold ? ` <span class="pill good">Mayor F1</span>` : ""}</td><td>${item.correctIdentifications}</td><td>${item.incorrectIdentifications}</td><td>${item.knownUsersRejected}</td><td>${item.impostorsRejected}</td><td>${item.impostorsAccepted}</td><td>${formatPercent(item.precision)}</td><td>${formatPercent(item.recall)}</td><td>${formatPercent(item.recallValidExtractions)}</td><td>${formatPercent(item.f1Score)}</td><td>${formatPercent(item.validUserRejectionRate)}</td><td>${formatPercent(item.impostorAcceptanceRate)}</td></tr>`).join("");
  const errorRows = errorGroups.map((item) => `<tr><td>${escapeHtml(item.stage)}</td><td>${escapeHtml(item.message)}</td><td>${item.count}</td><td>${formatPercent((item.count / Math.max(1, bestThreshold.totalTests)) * 100)}</td></tr>`).join("");
  const processingRows = processingErrorGroups.map((item) => `<tr><td>${escapeHtml(item.stage)}</td><td>${escapeHtml(item.message)}</td><td>${item.count}</td></tr>`).join("");
  const profileRows = profiles.map((profile) => `<tr><td><a href="${profile.link}">${escapeHtml(profile.identity)}</a></td><td>${escapeHtml(profile.status)}</td><td>${formatNumber(profile.detectionScore, 6)}</td><td>${formatNumber(profile.embeddingDimensions, 0)}</td><td>${formatNumber(profile.attempts, 0)}</td><td><a href="${profile.link}">Imagen, intentos y embedding</a></td></tr>`).join("");
  const series = [
    { key: "precision", label: "Precision", color: "#00594e" },
    { key: "recall", label: "Recall end-to-end", color: "#b42318" },
    { key: "recallValidExtractions", label: "Recall valido", color: "#2563eb" },
    { key: "f1Score", label: "F1", color: "#b58d18" },
  ];
  const legend = series.map((item) => `<span><i style="background:${item.color}"></i>${item.label}</span>`).join("");
  const evaluationGeneratedAt = new Date(summary.generatedAt).toLocaleString("es-CO");
  const reportGeneratedAt = new Date().toLocaleString("es-CO");
  const mainScript = `
const probes=${safeJson(probeRows)};let filtered=[...probes],page=1;const size=50;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v).toFixed(6):'N/D';
function classify(p){if(p.status!=='completed')return 'Error';if(!p.isKnown)return p.top1Score>=${bestThreshold.threshold}?'Impostor aceptado':'Impostor rechazado';if(p.top1Score<${bestThreshold.threshold})return 'Conocido rechazado';return p.top1Identity===p.identity?'Correcto':'Incorrecto'}
function apply(){const q=document.querySelector('#probe-search').value.toLowerCase(),type=document.querySelector('#probe-type').value,result=document.querySelector('#probe-result').value;filtered=probes.filter(p=>(!q||p.probeKey.toLowerCase().includes(q)||p.identity.toLowerCase().includes(q))&&(!type||(type==='known')===p.isKnown)&&(!result||classify(p)===result));page=1;render()}
function render(){const start=(page-1)*size,rows=filtered.slice(start,start+size);document.querySelector('#probe-body').innerHTML=rows.map(p=>'<tr><td>'+esc(p.probeKey)+'</td><td>'+esc(p.identity)+'</td><td>'+esc(p.isKnown?'Conocido':'Impostor')+'</td><td><span class="pill '+(classify(p)==='Correcto'||classify(p)==='Impostor rechazado'?'good':classify(p)==='Error'?'bad':'warn')+'">'+esc(classify(p))+'</span></td><td>'+esc(p.top1Identity||'-')+'</td><td>'+num(p.top1Score)+'</td><td>'+esc(p.top2Identity||'-')+'</td><td>'+num(p.top2Score)+'</td><td>'+num(p.margin)+'</td><td>'+(p.detailLink?'<a href="'+esc(p.detailLink)+'">Ver detalle completo</a>':esc(p.error||'Sin candidatos'))+'</td></tr>').join('');const total=Math.max(1,Math.ceil(filtered.length/size));document.querySelector('#probe-page').textContent='Pagina '+page+' de '+total+' · '+filtered.length+' resultados';document.querySelector('#prev').disabled=page<=1;document.querySelector('#next').disabled=page>=total}
document.querySelectorAll('#probe-search,#probe-type,#probe-result').forEach(el=>el.addEventListener(el.tagName==='INPUT'?'input':'change',apply));document.querySelector('#prev').onclick=()=>{page--;render()};document.querySelector('#next').onclick=()=>{page++;render()};render();`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Evaluacion facial ${escapeHtml(summary.runId)}</title><link rel="stylesheet" href="report-assets/report.css"></head><body><main class="shell">
  <header class="hero"><p class="eyebrow">Informe de evaluacion facial</p><h1>${escapeHtml(summary.runId)}</h1><p>Reporte explicativo generado desde los resultados existentes. No se volvieron a extraer rostros ni a ejecutar comparaciones.</p><p class="small">Evaluacion original: ${escapeHtml(evaluationGeneratedAt)} · HTML generado: ${escapeHtml(reportGeneratedAt)} · Estado: ${escapeHtml(run?.status === "reporting" ? "evaluacion completada" : run?.status || "archivos")}</p><nav class="nav"><a href="#summary">Resumen</a><a href="#method">Metodologia</a><a href="#thresholds">Umbrales</a><a href="#timings">Tiempos</a><a href="#errors">Errores</a><a href="#enrollment">Enrolamiento</a><a href="#probes">Pruebas y candidatos</a></nav></header>
  <section id="summary" class="section"><div class="section-head"><div><h2>Resumen ejecutivo</h2><p>La exactitud sobre rostros extraidos fue muy alta. La principal diferencia entre Top-1 y recall end-to-end proviene de las imagenes que no pudieron extraerse.</p></div></div><div class="grid cards">
    <div class="card"><div class="label">Perfiles enrolados</div><div class="value">${counts.enrolledProfiles}</div><div class="hint">de ${counts.requestedProfiles} solicitados</div></div>
    <div class="card"><div class="label">Pruebas totales</div><div class="value">${formatNumber(counts.totalProbes, 0)}</div><div class="hint">${counts.knownProbes} conocidas + ${counts.impostorProbes} impostores</div></div>
    <div class="card good"><div class="label">Top-1 valido</div><div class="value">${formatPercent(bestThreshold.top1Accuracy)}</div><div class="hint">Identidad correcta sin aplicar umbral</div></div>
    <div class="card good"><div class="label">Mejor F1</div><div class="value">${formatPercent(bestThreshold.f1Score)}</div><div class="hint">Umbral ${bestThreshold.threshold}</div></div>
    <div class="card warn"><div class="label">Recall end-to-end</div><div class="value">${formatPercent(bestThreshold.recall)}</div><div class="hint">Incluye errores de extraccion</div></div>
    <div class="card bad"><div class="label">Errores de extraccion</div><div class="value">${formatPercent(bestThreshold.extractionErrorRate)}</div><div class="hint">${bestThreshold.extractionErrors} imagenes</div></div>
    <div class="card"><div class="label">Extracciones validas</div><div class="value">${formatPercent(validRate)}</div><div class="hint">${bestThreshold.validExtractions} de ${bestThreshold.totalTests}</div></div>
    <div class="card"><div class="label">Comparaciones realizadas</div><div class="value">${formatNumber(candidateStats.candidateCount || (bestThreshold.validExtractions * counts.enrolledProfiles), 0)}</div><div class="hint">${formatNumber(counts.expectedComparisons, 0)} era el maximo antes de errores de extraccion</div></div>
  </div><div class="notice" style="margin-top:16px"><strong>Como leer el resultado:</strong> Top-1 de ${formatPercent(bestThreshold.top1Accuracy)} indica que, cuando se obtuvo un embedding valido, casi siempre se ordeno primero la identidad correcta. El recall end-to-end de ${formatPercent(bestThreshold.recall)} es menor porque tambien considera las ${bestThreshold.extractionErrors} imagenes que no pudieron procesarse.</div></section>

  <section id="method" class="section"><div class="section-head"><div><h2>Metodologia explicada</h2><p>El harness ordeno carpetas por numero de fotos, creo usuarios normales, extrajo cada probe y comparo su vector contra los ${counts.enrolledProfiles} perfiles MongoDB.</p></div></div><div class="grid two"><div><h3>Flujo</h3><ol><li>Seleccion de identidades con dos o mas fotos.</li><li>Una foto para enrolamiento; si falla, se prueba la siguiente.</li><li>Las fotos restantes son pruebas conocidas.</li><li>Identidades no enroladas actuan como impostores.</li><li>Cada embedding debe contener 512 numeros finitos.</li><li>Todos los perfiles se ordenan por similitud coseno.</li></ol></div><div><h3>Calculo</h3><pre class="formula">dotProduct = sum(probe[i] * perfil[i])
probeNorm = sqrt(sum(probe[i]^2))
profileNorm = sqrt(sum(perfil[i]^2))
score = dotProduct / (probeNorm * profileNorm)

Decision: score &gt;= umbral</pre></div></div><details class="technical"><summary>Definiciones de las metricas</summary><p><strong>Precision:</strong> correctos entre todas las decisiones aceptadas. <strong>Recall end-to-end:</strong> correctos entre todas las fotos conocidas, incluyendo fallos de extraccion. <strong>Recall valido:</strong> correctos solo entre fotos conocidas con embedding. <strong>Top-1:</strong> porcentaje donde la identidad correcta quedo primera, independientemente del umbral. <strong>Aceptacion de impostores:</strong> impostores aceptados entre impostores extraidos.</p></details></section>

  <section id="thresholds" class="section"><div class="section-head"><div><h2>Comportamiento por umbral</h2><p>Se destaca ${bestThreshold.threshold} porque obtuvo el mayor F1 (${formatPercent(bestThreshold.f1Score)}). Al aumentar el umbral disminuyen aceptaciones indebidas, pero crecen los rechazos de usuarios validos.</p></div><div class="pill good">Recomendado: ${bestThreshold.threshold}</div></div><div class="chart">${lineChart(metrics, series)}</div><div class="legend" style="margin:10px 0 18px">${legend}</div><div class="table-wrap"><table><thead><tr><th>Umbral</th><th>Correctas</th><th>Incorrectas</th><th>Conocidos rechazados</th><th>Impostores rechazados</th><th>Impostores aceptados</th><th>Precision</th><th>Recall total</th><th>Recall valido</th><th>F1</th><th>Rechazo valido</th><th>Aceptacion impostor</th></tr></thead><tbody>${thresholdRows}</tbody></table></div></section>

  <section id="timings" class="section"><div class="section-head"><div><h2>Tiempos</h2><p>Lectura mide disco; extraccion incluye API y modelo facial; comparacion recorre ${counts.enrolledProfiles} perfiles; persistencia guarda todos los calculos en MongoDB.</p></div></div><div class="table-wrap"><table><thead><tr><th>Etapa</th><th>Muestras</th><th>Media</th><th>Mediana</th><th>Minimo</th><th>Maximo</th><th>P90</th><th>P95</th></tr></thead><tbody>${timingRows(summary.timingSummary)}</tbody></table></div><div class="notice" style="margin-top:14px">P90 significa que el 90 % de las mediciones fue menor o igual a ese tiempo. P95 hace lo mismo para el 95 %.</div></section>

  <section id="errors" class="section"><div class="section-head"><div><h2>Errores</h2><p>Los errores de extraccion ocurren antes de comparar. Los errores de procesamiento corresponden a comparacion o persistencia.</p></div></div><div class="grid two"><div><h3>Extraccion (${summary.extractionErrors?.length || 0})</h3><div class="table-wrap"><table><thead><tr><th>Etapa</th><th>Mensaje</th><th>Cantidad</th><th>% pruebas</th></tr></thead><tbody>${errorRows || `<tr><td colspan="4">Sin errores.</td></tr>`}</tbody></table></div></div><div><h3>Procesamiento (${summary.processingErrors?.length || 0})</h3><div class="table-wrap"><table><thead><tr><th>Etapa</th><th>Mensaje</th><th>Cantidad</th></tr></thead><tbody>${processingRows || `<tr><td colspan="3">Sin errores.</td></tr>`}</tbody></table></div></div></div></section>

  <section id="enrollment" class="section"><div class="section-head"><div><h2>Perfiles de enrolamiento</h2><p>Cada perfil tiene una pagina con imagen, intentos, confianza, tiempos y las 512 dimensiones completas.</p></div></div><div class="table-wrap"><table><thead><tr><th>Identidad</th><th>Estado</th><th>Confianza</th><th>Dimensiones</th><th>Intentos</th><th>Detalle</th></tr></thead><tbody>${profileRows}</tbody></table></div></section>

  <section id="probes" class="section"><div class="section-head"><div><h2>Todas las pruebas</h2><p>Tabla interactiva con ${probeRows.length} pruebas. Los ${candidateStats.generatedProbeDetails} probes completados enlazan a ${candidateStats.totalPages} paginas que contienen todos los candidatos, calculos y embeddings.</p></div></div><div class="controls"><input id="probe-search" type="search" placeholder="Buscar archivo o identidad"><select id="probe-type"><option value="">Todos los tipos</option><option value="known">Conocidos</option><option value="impostor">Impostores</option></select><select id="probe-result"><option value="">Todos los resultados</option><option>Correcto</option><option>Incorrecto</option><option>Conocido rechazado</option><option>Impostor aceptado</option><option>Impostor rechazado</option><option>Error</option></select></div><div class="table-wrap"><table><thead><tr><th>Probe</th><th>Esperado</th><th>Tipo</th><th>Resultado @ ${bestThreshold.threshold}</th><th>Top-1</th><th>Score</th><th>Top-2</th><th>Score</th><th>Margen</th><th>Detalle</th></tr></thead><tbody id="probe-body"></tbody></table></div><div class="pager"><button id="prev">Anterior</button><span id="probe-page"></span><button id="next">Siguiente</button></div></section>

  <section class="section"><h2>Procedencia y privacidad</h2><p>Resumen y Top-1/Top-2: archivos JSON del run. Embeddings de probes y calculos completos: colecciones MongoDB del mismo run. Las imagenes se enlazan desde <span class="mono">prepared/</span>. Este directorio esta excluido de Git porque contiene datos biometricos.</p><details class="technical"><summary>Metadatos tecnicos del run</summary><pre class="embedding">${escapeHtml(JSON.stringify({ run: run || null, comparison: summary.comparison, sourceDirectory: summary.sourceDirectory, outputDirectory }, null, 2))}</pre></details></section>
  <footer class="footer">Reporte estatico generado sin repetir la evaluacion · ${escapeHtml(summary.runId)}</footer></main><script>${mainScript}</script></body></html>`;
};

const generateFaceEvaluationReport = async ({
  runId,
  outputDirectory,
  includeMongoDetails = true,
  pageCandidateLimit = 2500,
}) => {
  const summaryPath = path.join(outputDirectory, "evaluation-summary.json");
  const enrollmentPath = path.join(outputDirectory, "enrollment-records.json");
  if (!fs.existsSync(summaryPath) || !fs.existsSync(enrollmentPath)) {
    throw new Error(`Faltan evaluation-summary.json o enrollment-records.json en ${outputDirectory}`);
  }
  const [rawSummary, enrollmentFile] = await Promise.all([readJson(summaryPath), readJson(enrollmentPath)]);
  const summary = normalizeReportSummary(rawSummary);
  if (summary.runId !== runId) throw new Error(`El runId del reporte no coincide: ${summary.runId}`);
  const bestThreshold = selectBestThreshold(summary.thresholdMetrics || []);
  const assetsDirectory = path.join(outputDirectory, "report-assets");
  const profilesDirectory = path.join(outputDirectory, "profiles");
  const candidateDirectory = path.join(outputDirectory, "candidate-details");

  let run = null;
  let profiles = enrollmentFile;
  let probes = (summary.topResults || []).map((probe) => ({ ...probe, embedding: null }));
  let candidateStats = { pageByProbe: new Map(), totalPages: 0, generatedProbeDetails: 0, candidateCount: 0 };

  if (includeMongoDetails) {
    [run, profiles, probes] = await Promise.all([
      FaceEvaluationRun.findOne({ runId }).lean(),
      FaceEvaluationProfile.find({ runId }).select("+embedding").lean(),
      FaceEvaluationProbe.find({ runId }).lean(),
    ]);
    if (!run) throw new Error(`No existe el run MongoDB ${runId}`);
    const fileProfileIdentities = new Set(enrollmentFile.map((profile) => profile.identity));
    const mongoProfileIdentities = new Set(profiles.map((profile) => profile.identity));
    if (profiles.length !== enrollmentFile.length || [...fileProfileIdentities].some((identity) => !mongoProfileIdentities.has(identity))) {
      throw new Error(`Perfiles Mongo incompletos: ${profiles.length}/${enrollmentFile.length}`);
    }
    const fileProbeKeys = new Set((summary.topResults || []).map((probe) => probe.probeKey));
    const mongoProbeKeys = new Set(probes.map((probe) => probe.probeKey));
    if (probes.length !== fileProbeKeys.size || [...fileProbeKeys].some((probeKey) => !mongoProbeKeys.has(probeKey))) {
      throw new Error(`Probes Mongo incompletos: ${probes.length}/${fileProbeKeys.size}`);
    }
  }

  const outputPath = path.join(outputDirectory, "evaluation-report.html");
  const reportTargets = [assetsDirectory, profilesDirectory, candidateDirectory, outputPath];
  const backup = await backupExistingReport(outputDirectory, reportTargets);

  try {
    await Promise.all([ensureDirectory(assetsDirectory), ensureDirectory(profilesDirectory)]);
    await fsp.writeFile(path.join(assetsDirectory, "report.css"), REPORT_CSS, "utf8");

    if (includeMongoDetails) {
      candidateStats = await generateCandidatePages({
        runId,
        probes,
        profiles,
        outputDirectory,
        assetsDirectory,
        pageCandidateLimit,
        recommendedThreshold: bestThreshold.threshold,
      });
    }

    for (const profile of profiles) {
      const normalized = {
        ...profile,
        userId: profile.userId || (profile.user ? String(profile.user) : null),
        enrollmentAttempts: profile.enrollmentAttempts || [],
      };
      await fsp.writeFile(
        path.join(profilesDirectory, profileFileName(profile.identity)),
        buildProfilePage({ profile: normalized, outputDirectory, assetsDirectory }),
        "utf8"
      );
    }

    const html = buildMainReport({
      summary,
      enrollments: profiles.map((profile) => ({
        ...profile,
        userId: profile.userId || (profile.user ? String(profile.user) : null),
      })),
      run,
      bestThreshold,
      errorGroups: summarizeErrors(summary.extractionErrors || []),
      processingErrorGroups: summarizeErrors(summary.processingErrors || []),
      pageByProbe: candidateStats.pageByProbe,
      candidateStats,
      outputDirectory,
    });
    await fsp.writeFile(outputPath, html, "utf8");
    await fsp.rm(backup.backupDirectory, { recursive: true, force: true });
    return {
      outputPath,
      bestThreshold: bestThreshold.threshold,
      profilePages: profiles.length,
      candidatePages: candidateStats.totalPages,
      probeDetails: candidateStats.generatedProbeDetails,
    };
  } catch (error) {
    await restoreReportBackup(backup, reportTargets);
    throw error;
  }
};

module.exports = {
  escapeHtml,
  generateFaceEvaluationReport,
  normalizeReportSummary,
  selectBestThreshold,
  summarizeErrors,
};
