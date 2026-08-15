const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const connectDatabase = require('../../src/config/database');
const { User } = require('../../src/models/user.model');

const DEFAULT_INPUT = path.resolve(__dirname, 'sample-embedding-map.json');
const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, 'output');
const DEFAULT_OUTPUT = path.join(DEFAULT_OUTPUT_DIR, 'embedding-map.html');
const DEFAULT_LIMIT = Number(process.env.EMBEDDING_MAP_LIMIT || 60);

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
  input: parsedArgs.input || process.env.npm_config_input || undefined,
  output: parsedArgs.output || process.env.npm_config_output || undefined,
  limit: parsedArgs.limit || process.env.npm_config_limit || undefined,
  allUsers:
    parsedArgs.allUsers ||
    parsedArgs['all-users'] ||
    process.env.npm_config_allusers ||
    process.env.npm_config_all_users ||
    false,
  userIds:
    parsedArgs.userIds ||
    parsedArgs['user-ids'] ||
    process.env.npm_config_userids ||
    process.env.npm_config_user_ids ||
    undefined,
};

const round = (value, digits = 6) => Number(value.toFixed(digits));
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const parseLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const normalizeEmbedding = (embedding) =>
  Array.isArray(embedding)
    ? embedding.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : [];

const readEmbeddingsFile = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  if (!items.length) {
    throw new Error(`No se encontro un arreglo valido en items dentro de ${filePath}`);
  }

  return items.map((item, index) => ({
    id: String(item.id || item.userId || `item-${index + 1}`),
    label: String(item.label || item.nombre || item.userId || `Item ${index + 1}`),
    category: String(item.category || item.rolAcademico || 'Sin categoria'),
    subtitle: item.subtitle ? String(item.subtitle) : '',
    sourceType: 'json-file',
    embedding: normalizeEmbedding(item.embedding),
  }));
};

const readEmbeddingsFromDatabase = async ({ allUsers = false, userIds = [], limit = DEFAULT_LIMIT }) => {
  await connectDatabase();

  const query = userIds.length
    ? { _id: { $in: userIds } }
    : { faceRegistered: true, faceDescriptor: { $exists: true, $ne: [] } };

  const docs = await User.find(query)
    .select('+faceDescriptor nombre apellido email cedula rolAcademico facultad estado faceRegistered')
    .sort({ faceDescriptorUpdatedAt: -1, updated_at: -1 })
    .limit(allUsers || userIds.length ? limit : 0);

  if (!docs.length) {
    throw new Error('No se encontraron usuarios con embeddings para construir el mapa');
  }

  return docs.map((user) => ({
    id: String(user._id),
    label: [user.nombre, user.apellido].filter(Boolean).join(' ').trim() || String(user._id),
    category: String(user.rolAcademico || 'Sin rol'),
    subtitle: [user.email, user.cedula, user.facultad, user.estado].filter(Boolean).join(' • '),
    sourceType: 'mongodb-user',
    meta: {
      userId: String(user._id),
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      email: user.email || '',
      cedula: user.cedula || '',
      rolAcademico: user.rolAcademico || '',
      facultad: user.facultad || '',
      estado: user.estado || '',
      faceRegistered: user.faceRegistered === true,
    },
    embedding: normalizeEmbedding(user.faceDescriptor),
  }));
};

const getDominantDimension = (items) => {
  const histogram = items.reduce((acc, item) => {
    const size = item.embedding.length;
    if (!size) return acc;
    acc[size] = (acc[size] || 0) + 1;
    return acc;
  }, {});

  return Number(
    Object.entries(histogram).sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]))[0]?.[0] || 0
  );
};

const filterConsistentItems = (items) => {
  const dimension = getDominantDimension(items);
  const accepted = items.filter((item) => item.embedding.length === dimension);
  const rejected = items.filter((item) => item.embedding.length !== dimension);

  if (accepted.length < 2) {
    throw new Error('Se necesitan al menos dos embeddings con la misma dimension para construir el mapa 2D');
  }

  return { accepted, rejected, dimension };
};

const transpose = (matrix) => matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex]));

const centerMatrix = (matrix) => {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const means = Array.from({ length: cols }, (_, colIndex) => {
    const sum = matrix.reduce((acc, row) => acc + row[colIndex], 0);
    return sum / rows;
  });

  const centered = matrix.map((row) => row.map((value, index) => value - means[index]));
  return { centered, means };
};

const multiplyMatrixVector = (matrix, vector) =>
  matrix.map((row) => row.reduce((acc, value, index) => acc + value * vector[index], 0));

const dot = (a, b) => a.reduce((acc, value, index) => acc + value * b[index], 0);
const norm = (vector) => Math.sqrt(dot(vector, vector)) || 1;

const normalizeVector = (vector) => {
  const length = norm(vector);
  return vector.map((value) => value / length);
};

const covarianceMatrix = (matrix) => {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const cov = Array.from({ length: cols }, () => Array.from({ length: cols }, () => 0));

  for (let i = 0; i < cols; i += 1) {
    for (let j = i; j < cols; j += 1) {
      let sum = 0;
      for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
        sum += matrix[rowIndex][i] * matrix[rowIndex][j];
      }
      const value = sum / Math.max(rows - 1, 1);
      cov[i][j] = value;
      cov[j][i] = value;
    }
  }

  return cov;
};

const powerIteration = (matrix, iterations = 120) => {
  let vector = Array.from({ length: matrix.length }, (_, index) => 1 / Math.sqrt(matrix.length + index + 1));
  vector = normalizeVector(vector);

  for (let index = 0; index < iterations; index += 1) {
    const next = multiplyMatrixVector(matrix, vector);
    const magnitude = norm(next);
    if (!Number.isFinite(magnitude) || magnitude === 0) break;
    vector = next.map((value) => value / magnitude);
  }

  const eigenvalue = dot(vector, multiplyMatrixVector(matrix, vector));
  return { eigenvalue, eigenvector: vector };
};

const deflateMatrix = (matrix, eigenvalue, eigenvector) =>
  matrix.map((row, rowIndex) =>
    row.map(
      (value, colIndex) => value - eigenvalue * eigenvector[rowIndex] * eigenvector[colIndex]
    )
  );

const projectToPca2D = (items) => {
  const matrix = items.map((item) => item.embedding);
  const { centered } = centerMatrix(matrix);
  const cov = covarianceMatrix(centered);
  const first = powerIteration(cov);
  const second = powerIteration(deflateMatrix(cov, first.eigenvalue, first.eigenvector));

  return centered.map((row, index) => ({
    ...items[index],
    x: dot(row, first.eigenvector),
    y: dot(row, second.eigenvector),
  }));
};

const buildLegend = (items) => {
  const counts = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
};

const colorForCategory = (category) => {
  let hash = 0;
  for (let index = 0; index < category.length; index += 1) {
    hash = (hash * 31 + category.charCodeAt(index)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 70% 46%)`;
};

const scalePoints = (points, width, height, padding) => {
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  return {
    minX: round(minX),
    maxX: round(maxX),
    minY: round(minY),
    maxY: round(maxY),
    items: points.map((point) => ({
      ...point,
      sx: padding.left + ((point.x - minX) / xRange) * innerWidth,
      sy: padding.top + (1 - (point.y - minY) / yRange) * innerHeight,
    })),
  };
};

const summarizePointSet = (items, dimension, rejected) => ({
  total: items.length,
  dimension,
  categories: buildLegend(items).length,
  rejected: rejected.length,
});

const buildHtml = ({ source, sourceType, sourceMeta, points, dimension, rejected }) => {
  const summary = summarizePointSet(points, dimension, rejected);
  const legend = buildLegend(points);
  const scaled = scalePoints(points, 1200, 700, {
    left: 80,
    right: 40,
    top: 40,
    bottom: 64,
  });

  const circles = scaled.items
    .map((point) => {
      const color = colorForCategory(point.category);
      return `<circle cx="${round(point.sx, 2)}" cy="${round(point.sy, 2)}" r="10" fill="${color}" fill-opacity="0.88" stroke="#ffffff" stroke-width="3">
  <title>${escapeHtml(point.label)}\n${escapeHtml(point.category)}\n${escapeHtml(point.subtitle || 'Sin detalle')}\nPCA1=${round(point.x, 4)} | PCA2=${round(point.y, 4)}</title>
</circle>`;
    })
    .join('\n');

  const legendHtml = legend
    .map(
      ({ category, count }) => `<div class="legend-item"><span class="swatch" style="background:${colorForCategory(category)}"></span><span>${escapeHtml(category)} (${count})</span></div>`
    )
    .join('');

  const rowsHtml = scaled.items
    .slice()
    .sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label))
    .map(
      (point) => `<tr><td>${escapeHtml(point.label)}</td><td>${escapeHtml(point.category)}</td><td>${round(point.x, 4)}</td><td>${round(point.y, 4)}</td><td>${escapeHtml(point.subtitle || '-')}</td></tr>`
    )
    .join('');

  const rejectedHtml = rejected.length
    ? `<div class="warning">Se ignoraron ${rejected.length} embeddings por tener una dimension distinta a ${dimension}. Ejemplos: ${escapeHtml(rejected.slice(0, 4).map((item) => item.label).join(', '))}</div>`
    : '';

  const sourceMetaRows = Object.entries(sourceMeta || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(String(value))}</td></tr>`)
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Embedding Map 2D</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #475569;
      --border: #e2e8f0;
      --line: #0f766e;
      --warn: #8c7030;
      --warn-bg: #fff8e7;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, Arial, sans-serif;
      background: linear-gradient(180deg, #f8fafc 0%, #edf6f4 100%);
      color: var(--text);
    }
    .page { width: min(1280px, calc(100vw - 32px)); margin: 32px auto; display: grid; gap: 20px; }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
    }
    .eyebrow { color: var(--line); text-transform: uppercase; letter-spacing: 0.28em; font-size: 0.72rem; font-weight: 700; }
    .hero h1 { margin: 8px 0 0; font-size: clamp(1.8rem, 3vw, 2.6rem); }
    .muted { color: var(--muted); }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 20px; }
    .stat { border: 1px solid var(--border); border-radius: 16px; padding: 16px; background: #fbfdfd; }
    .stat-label { font-size: 0.8rem; color: var(--muted); margin-bottom: 8px; }
    .stat-value { font-size: 1.35rem; font-weight: 700; }
    .warning { margin-top: 16px; border: 1px solid #e6d5a5; border-radius: 14px; padding: 14px 16px; background: var(--warn-bg); color: var(--warn); }
    .scatter-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 18px; background: linear-gradient(180deg, #ffffff 0%, #f7fbfb 100%); padding: 10px; }
    svg { display: block; width: 100%; min-width: 1100px; height: auto; }
    .grid-line { stroke: #e5eeee; stroke-width: 1.5; }
    .axis { stroke: #94a3b8; stroke-width: 2; }
    .axis-label { fill: #64748b; font-size: 14px; }
    .chart-footer { display: flex; gap: 24px; margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--border); flex-wrap: wrap; }
    .chart-footer > div { flex: 1; min-width: 200px; }
    .legend { display: flex; gap: 12px; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
    .swatch { width: 12px; height: 12px; border-radius: 999px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.55); flex-shrink: 0; }
    .source-table { width: 100%; border-collapse: collapse; }
    .source-table td { padding: 4px 8px; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
    .source-table td:first-child { color: var(--muted); font-weight: 600; white-space: nowrap; }
    .source-table tr:last-child td { border-bottom: none; }
    table { width: 100%; border-collapse: collapse; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); font-size: 0.92rem; vertical-align: top; }
    th { background: #f8fafc; }
    tbody tr:last-child td { border-bottom: none; }
    @media (max-width: 720px) { .chart-footer { flex-direction: column; } }
  </style>
</head>
<body>
  <main class="page">
    <section class="card hero">
      <p class="eyebrow">Embedding Map 2D</p>
      <h1>Mapa comparativo de embeddings</h1>
      <p class="muted">Fuente: ${escapeHtml(source)}. Tipo de fuente: ${escapeHtml(sourceType || 'unknown')}. Visualizacion aislada usando PCA 2D aproximado para inspeccionar cercania y agrupamiento de embeddings.</p>
      <div class="stats">
        <div class="stat"><div class="stat-label">Usuarios proyectados</div><div class="stat-value">${summary.total}</div></div>
        <div class="stat"><div class="stat-label">Dimensiones por embedding</div><div class="stat-value">${summary.dimension}</div></div>
        <div class="stat"><div class="stat-label">Categorias</div><div class="stat-value">${summary.categories}</div></div>
        <div class="stat"><div class="stat-label">Embeddings ignorados</div><div class="stat-value">${summary.rejected}</div></div>
      </div>
      ${rejectedHtml}
    </section>

    <section class="card">
      <h2 style="margin:0 0 6px">Scatter PCA 2D</h2>
      <p class="muted" style="margin:0 0 18px">Puntos cercanos implican embeddings mas parecidos en el espacio proyectado. Los colores se asignan por categoria.</p>
      <div class="scatter-wrap">
        <svg viewBox="0 0 1200 700" role="img" aria-label="Mapa 2D de embeddings">
          <line class="grid-line" x1="80" y1="40" x2="80" y2="636"></line>
          <line class="grid-line" x1="80" y1="636" x2="1160" y2="636"></line>
          <line class="grid-line" x1="80" y1="338" x2="1160" y2="338"></line>
          <line class="grid-line" x1="620" y1="40" x2="620" y2="636"></line>
          <line class="axis" x1="80" y1="338" x2="1160" y2="338"></line>
          <line class="axis" x1="620" y1="40" x2="620" y2="636"></line>
          ${circles}
          <text class="axis-label" x="80" y="660">PCA1 min ${scaled.minX}</text>
          <text class="axis-label" x="1040" y="660">PCA1 max ${scaled.maxX}</text>
          <text class="axis-label" x="12" y="44">PCA2 max ${scaled.maxY}</text>
          <text class="axis-label" x="12" y="636">PCA2 min ${scaled.minY}</text>
        </svg>
      </div>
      <div class="chart-footer">
        <div>
          <h3 style="margin:0 0 8px; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.14em; color:var(--muted);">Fuente</h3>
          <table class="source-table">
            <tbody>
              <tr><td>source</td><td>${escapeHtml(source)}</td></tr>
              <tr><td>sourceType</td><td>${escapeHtml(sourceType || 'unknown')}</td></tr>
              ${sourceMetaRows}
            </tbody>
          </table>
        </div>
        <div>
          <h3 style="margin:0 0 8px; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.14em; color:var(--muted);">Leyenda</h3>
          <div class="legend">${legendHtml}</div>
        </div>
      </div>
    </section>

    <section class="card">
      <h2 style="margin:0 0 6px">Puntos proyectados</h2>
      <p class="muted" style="margin:0 0 18px">Coordenadas PCA 2D para inspeccion rapida o exportacion manual.</p>
      <table>
        <thead><tr><th>Usuario</th><th>Categoria</th><th>PCA1</th><th>PCA2</th><th>Detalle</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
};

const main = async () => {
  const outputFile = path.resolve(String(cliArgs.output || DEFAULT_OUTPUT));
  const limit = parseLimit(cliArgs.limit);
  let items;
  let source;
  let sourceType;
  let sourceMeta = {};

  if (cliArgs.allUsers || cliArgs.userIds) {
    const userIds = String(cliArgs.userIds || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    items = await readEmbeddingsFromDatabase({
      allUsers: Boolean(cliArgs.allUsers),
      userIds,
      limit,
    });
    source = cliArgs.userIds ? `MongoDB userIds=${userIds.join(',')}` : `MongoDB faceRegistered=true limit=${limit}`;
    sourceType = cliArgs.userIds ? 'mongodb-user-list' : 'mongodb-all-users';
    sourceMeta = {
      requestedUserIds: userIds.length ? userIds.join(', ') : '',
      requestedLimit: limit,
      loadedItems: items.length,
    };
  } else {
    const inputFile = path.resolve(String(cliArgs.input || DEFAULT_INPUT));
    if (!fs.existsSync(inputFile)) {
      throw new Error(`No existe el archivo de entrada: ${inputFile}`);
    }
    items = readEmbeddingsFile(inputFile);
    source = inputFile;
    sourceType = 'json-file';
    sourceMeta = {
      loadedItems: items.length,
    };
  }

  const { accepted, rejected, dimension } = filterConsistentItems(items);
  const points = projectToPca2D(accepted);
  sourceMeta = {
    ...sourceMeta,
    projectedItems: points.length,
    rejectedItems: rejected.length,
    dominantDimension: dimension,
  };
  const html = buildHtml({ source, sourceType, sourceMeta, points, dimension, rejected });

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, html, 'utf8');

  console.log('Mapa 2D de embeddings generado correctamente.');
  console.log(`Fuente: ${source}`);
  console.log(`Tipo  : ${sourceType}`);
  console.log(`Salida: ${outputFile}`);
  console.log('Resumen de fuente:');
  Object.entries(sourceMeta).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    console.log(`  - ${key}: ${value}`);
  });
  if (rejected.length) {
    console.log(`Ignorados: ${rejected.length}`);
    rejected.slice(0, 8).forEach((item) => {
      console.log(`  - ${item.label} (dim=${item.embedding.length})`);
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
