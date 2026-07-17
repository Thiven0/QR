const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const connectDatabase = require('../../src/config/database');
const { User } = require('../../src/models/user.model');

const DEFAULT_INPUT = path.resolve(__dirname, 'sample-embedding.json');
const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, 'output');
const DEFAULT_OUTPUT = path.join(DEFAULT_OUTPUT_DIR, 'embedding-plot.html');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) continue;

    const equalIndex = arg.indexOf('=');
    if (equalIndex !== -1) {
      const key = arg.slice(2, equalIndex);
      const value = arg.slice(equalIndex + 1);
      parsed[key] = value === '' ? true : value;
      continue;
    }

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

const parsedArgs = parseArgs();
const cliArgs = {
  ...parsedArgs,
  userId: parsedArgs.userId || process.env.npm_config_userid || process.env.npm_config_userId || undefined,
  input: parsedArgs.input || process.env.npm_config_input || undefined,
  output: parsedArgs.output || process.env.npm_config_output || undefined,
};

const readEmbeddingFile = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const embedding = Array.isArray(parsed.embedding)
    ? parsed.embedding.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : [];

  if (!embedding.length) {
    throw new Error(`No se encontro un arreglo valido en embedding dentro de ${filePath}`);
  }

  return {
    label: String(parsed.label || parsed.userId || path.basename(filePath, path.extname(filePath))),
    source: parsed.source ? String(parsed.source) : path.basename(filePath),
    sourceType: 'json-file',
    userMeta: parsed.userMeta && typeof parsed.userMeta === 'object' ? parsed.userMeta : null,
    embedding,
  };
};

const readEmbeddingFromDatabase = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error(`userId invalido: ${userId}`);
  }

  await connectDatabase();

  const user = await User.findById(userId).select(
    '+faceDescriptor nombre apellido email cedula rolAcademico facultad estado faceRegistered faceDescriptorUpdatedAt'
  );

  if (!user) {
    throw new Error(`No se encontro un usuario con id ${userId}`);
  }

  const embedding = Array.isArray(user.faceDescriptor)
    ? user.faceDescriptor.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : [];

  if (!embedding.length) {
    throw new Error(`El usuario ${userId} no tiene faceDescriptor registrado`);
  }

  const label = [user.nombre, user.apellido].filter(Boolean).join(' ').trim() || String(user._id);
  const metaBits = [
    user.email ? `email=${user.email}` : null,
    user.cedula ? `cedula=${user.cedula}` : null,
    user.rolAcademico ? `rol=${user.rolAcademico}` : null,
    user.facultad ? `facultad=${user.facultad}` : null,
    user.estado ? `estado=${user.estado}` : null,
  ].filter(Boolean);

  return {
    label,
    sourceType: 'mongodb-user',
    source: `mongodb userId=${userId}${metaBits.length ? ` (${metaBits.join(', ')})` : ''}`,
    userMeta: {
      userId: String(user._id),
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      email: user.email || '',
      cedula: user.cedula || '',
      rolAcademico: user.rolAcademico || '',
      facultad: user.facultad || '',
      estado: user.estado || '',
      faceRegistered: user.faceRegistered === true,
      faceDescriptorUpdatedAt: user.faceDescriptorUpdatedAt || null,
    },
    embedding,
  };
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const round = (value, digits = 6) => Number(value.toFixed(digits));

const summarizeEmbedding = (embedding) => {
  const count = embedding.length;
  const min = Math.min(...embedding);
  const max = Math.max(...embedding);
  const sum = embedding.reduce((acc, value) => acc + value, 0);
  const mean = sum / count;
  const variance = embedding.reduce((acc, value) => acc + (value - mean) ** 2, 0) / count;
  const stdDev = Math.sqrt(variance);

  return {
    count,
    min: round(min),
    max: round(max),
    mean: round(mean),
    stdDev: round(stdDev),
  };
};

const buildLinePath = (embedding, width, height, padding) => {
  const min = Math.min(...embedding);
  const max = Math.max(...embedding);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const domain = max - min || 1;

  return embedding
    .map((value, index) => {
      const x = padding.left + (index / Math.max(embedding.length - 1, 1)) * innerWidth;
      const y = padding.top + (1 - (value - min) / domain) * innerHeight;
      return `${index === 0 ? 'M' : 'L'} ${round(x, 2)} ${round(y, 2)}`;
    })
    .join(' ');
};

const buildHistogram = (embedding, bins = 16) => {
  const min = Math.min(...embedding);
  const max = Math.max(...embedding);
  const domain = max - min || 1;
  const counts = Array.from({ length: bins }, () => 0);

  embedding.forEach((value) => {
    const ratio = clamp((value - min) / domain, 0, 0.999999);
    const index = Math.floor(ratio * bins);
    counts[index] += 1;
  });

  return counts.map((count, index) => {
    const start = min + (domain * index) / bins;
    const end = min + (domain * (index + 1)) / bins;
    return {
      index,
      count,
      start: round(start),
      end: round(end),
    };
  });
};

const colorForValue = (value, min, max) => {
  const ratio = clamp((value - min) / (max - min || 1), 0, 1);
  const hue = 215 - ratio * 165;
  const lightness = 32 + ratio * 30;
  return `hsl(${round(hue, 2)} 78% ${round(lightness, 2)}%)`;
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildHtml = ({ label, source, sourceType, userMeta, embedding }) => {
  const stats = summarizeEmbedding(embedding);
  const histogram = buildHistogram(embedding, 16);
  const linePath = buildLinePath(embedding, 960, 320, {
    left: 48,
    right: 16,
    top: 20,
    bottom: 36,
  });
  const min = Math.min(...embedding);
  const max = Math.max(...embedding);
  const histogramMax = Math.max(...histogram.map((bucket) => bucket.count), 1);

  const heatmapCells = embedding
    .map(
      (value, index) => `
        <div class="heat-cell" title="dim ${index}: ${round(value)}" style="background:${colorForValue(value, min, max)}"></div>`
    )
    .join('');

  const histogramBars = histogram
    .map((bucket) => {
      const barHeight = (bucket.count / histogramMax) * 100;
      return `
        <div class="bar-group" title="${bucket.start} a ${bucket.end}: ${bucket.count}">
          <div class="bar" style="height:${round(barHeight, 2)}%"></div>
          <span class="bar-label">${bucket.index + 1}</span>
        </div>`;
    })
    .join('');

  const sampleRows = embedding
    .slice(0, 24)
    .map(
      (value, index) => `<tr><td>${index}</td><td>${round(value)}</td></tr>`
    )
    .join('');

  const metaRows = userMeta
    ? Object.entries(userMeta)
        .filter(([, value]) => value !== null && value !== '')
        .map(
          ([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(
            value instanceof Date ? value.toISOString() : String(value)
          )}</td></tr>`
        )
        .join('')
    : '<tr><td>sourceType</td><td>json-file</td></tr>';

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Embedding Plot - ${escapeHtml(label)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #475569;
      --line: #0f766e;
      --line-soft: rgba(15, 118, 110, 0.16);
      --border: #e2e8f0;
      --accent: #b5a160;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, Arial, sans-serif;
      background: linear-gradient(180deg, #f8fafc 0%, #eef6f5 100%);
      color: var(--text);
    }
    .page {
      width: min(1200px, calc(100vw - 32px));
      margin: 32px auto;
      display: grid;
      gap: 20px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
    }
    .hero h1 {
      margin: 8px 0 0;
      font-size: clamp(1.8rem, 3vw, 2.6rem);
    }
    .eyebrow {
      color: var(--line);
      text-transform: uppercase;
      letter-spacing: 0.28em;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .muted { color: var(--muted); }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-top: 20px;
    }
    .stat {
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px;
      background: #fbfdfd;
    }
    .stat-label {
      font-size: 0.8rem;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 1.35rem;
      font-weight: 700;
    }
    .chart-title {
      margin: 0 0 6px;
      font-size: 1.1rem;
    }
    .chart-subtitle {
      margin: 0 0 18px;
      color: var(--muted);
      font-size: 0.92rem;
    }
    .line-chart {
      width: 100%;
      overflow-x: auto;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: linear-gradient(180deg, #ffffff 0%, #f8fbfb 100%);
      padding: 8px;
    }
    svg { display: block; width: 100%; min-width: 820px; height: auto; }
    .grid-line { stroke: #dbe7e7; stroke-width: 1; }
    .plot-line { fill: none; stroke: var(--line); stroke-width: 2.5; }
    .plot-area { fill: var(--line-soft); stroke: none; }
    .axis-label { fill: #64748b; font-size: 12px; }
    .histogram {
      display: grid;
      grid-template-columns: repeat(16, minmax(18px, 1fr));
      gap: 10px;
      align-items: end;
      min-height: 220px;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px 16px 10px;
      background: linear-gradient(180deg, #ffffff 0%, #faf8ef 100%);
    }
    .bar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      height: 100%;
      justify-content: end;
    }
    .bar {
      width: 100%;
      min-height: 6px;
      border-radius: 999px 999px 6px 6px;
      background: linear-gradient(180deg, #b5a160 0%, #0f766e 100%);
    }
    .bar-label {
      font-size: 11px;
      color: #64748b;
    }
    .heatmap {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10px, 1fr));
      gap: 4px;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: #fff;
      padding: 14px;
    }
    .heat-cell {
      height: 28px;
      border-radius: 6px;
    }
    .two-col {
      display: grid;
      gap: 20px;
      grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
      border-radius: 16px;
      border: 1px solid var(--border);
    }
    th, td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      font-size: 0.92rem;
    }
    th { background: #f8fafc; }
    tbody tr:last-child td { border-bottom: none; }
    @media (max-width: 900px) {
      .two-col { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="card hero">
      <p class="eyebrow">Embedding Visualizer</p>
      <h1>${escapeHtml(label)}</h1>
      <p class="muted">Fuente: ${escapeHtml(source)}. Tipo de fuente: ${escapeHtml(sourceType || 'unknown')}. Visualizacion aislada para explorar como se veria un embedding facial sin tocar el proyecto principal.</p>
      <div class="stats">
        <div class="stat"><div class="stat-label">Dimensiones</div><div class="stat-value">${stats.count}</div></div>
        <div class="stat"><div class="stat-label">Minimo</div><div class="stat-value">${stats.min}</div></div>
        <div class="stat"><div class="stat-label">Maximo</div><div class="stat-value">${stats.max}</div></div>
        <div class="stat"><div class="stat-label">Promedio</div><div class="stat-value">${stats.mean}</div></div>
        <div class="stat"><div class="stat-label">Desv. estandar</div><div class="stat-value">${stats.stdDev}</div></div>
      </div>
    </section>

    <section class="card">
      <h2 class="chart-title">Grafico de linea</h2>
      <p class="chart-subtitle">Cada punto representa el valor de una dimension del embedding.</p>
      <div class="line-chart">
        <svg viewBox="0 0 960 320" role="img" aria-label="Grafico de linea del embedding">
          <line class="grid-line" x1="48" y1="20" x2="48" y2="284"></line>
          <line class="grid-line" x1="48" y1="284" x2="944" y2="284"></line>
          <line class="grid-line" x1="48" y1="152" x2="944" y2="152"></line>
          <path class="plot-line" d="${linePath}"></path>
          <text class="axis-label" x="48" y="304">0</text>
          <text class="axis-label" x="912" y="304">${embedding.length - 1}</text>
          <text class="axis-label" x="8" y="26">${stats.max}</text>
          <text class="axis-label" x="8" y="156">${round((stats.max + stats.min) / 2)}</text>
          <text class="axis-label" x="8" y="288">${stats.min}</text>
        </svg>
      </div>
    </section>

    <section class="two-col">
      <section class="card">
        <h2 class="chart-title">Histograma</h2>
        <p class="chart-subtitle">Distribucion de valores del embedding agrupada en 16 buckets.</p>
        <div class="histogram">${histogramBars}</div>
      </section>

      <section class="card">
        <h2 class="chart-title">Fuente y metadatos</h2>
        <p class="chart-subtitle">Referencia explicita del origen del embedding usado para esta visualizacion.</p>
        <table style="margin-bottom:20px">
          <thead><tr><th>Campo</th><th>Valor</th></tr></thead>
          <tbody>
            <tr><td>source</td><td>${escapeHtml(source)}</td></tr>
            <tr><td>sourceType</td><td>${escapeHtml(sourceType || 'unknown')}</td></tr>
            ${metaRows}
          </tbody>
        </table>

        <h2 class="chart-title">Muestra de dimensiones</h2>
        <p class="chart-subtitle">Primeras 24 dimensiones para inspeccion rapida.</p>
        <table>
          <thead><tr><th>Indice</th><th>Valor</th></tr></thead>
          <tbody>${sampleRows}</tbody>
        </table>
      </section>
    </section>

    <section class="card">
      <h2 class="chart-title">Heatmap lineal</h2>
      <p class="chart-subtitle">Cada celda representa una dimension del embedding coloreada segun su intensidad relativa.</p>
      <div class="heatmap">${heatmapCells}</div>
    </section>
  </main>
</body>
</html>`;
};

const main = async () => {
  const outputFile = path.resolve(String(cliArgs.output || DEFAULT_OUTPUT));
  let payload;
  let inputFile = null;

  if (cliArgs.userId) {
    payload = await readEmbeddingFromDatabase(String(cliArgs.userId));
  } else {
    inputFile = path.resolve(String(cliArgs.input || DEFAULT_INPUT));

    if (!fs.existsSync(inputFile)) {
      throw new Error(`No existe el archivo de entrada: ${inputFile}`);
    }

    payload = readEmbeddingFile(inputFile);
  }

  const html = buildHtml(payload);

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, html, 'utf8');

  console.log(`Embedding visualizado correctamente.`);
  console.log(`Entrada: ${cliArgs.userId ? `MongoDB userId=${cliArgs.userId}` : inputFile}`);
  console.log(`Salida : ${outputFile}`);
  console.log(`Fuente : ${payload.source}`);
  console.log(`Tipo   : ${payload.sourceType}`);
  if (payload.userMeta) {
    console.log('Metadatos del usuario:');
    Object.entries(payload.userMeta).forEach(([key, value]) => {
      if (value === null || value === '') return;
      console.log(`  - ${key}: ${value instanceof Date ? value.toISOString() : value}`);
    });
  }
};

(async () => {
  try {
    await main();
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }
  }
})();
