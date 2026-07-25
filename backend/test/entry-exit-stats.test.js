const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveStatsRange,
  buildDailySeries,
  buildHeatmap,
  buildDurationSummary,
  buildStatsResponse,
} = require('../src/services/entry-exit-stats.service');

test('usa los ultimos 30 dias cuando no recibe fechas', () => {
  const range = resolveStatsRange({ now: new Date('2026-07-25T18:00:00.000Z') });

  assert.equal(range.start, '2026-06-26');
  assert.equal(range.end, '2026-07-25');
  assert.equal(range.days, 30);
  assert.equal(range.startInclusive.toISOString(), '2026-06-26T05:00:00.000Z');
  assert.equal(range.endExclusive.toISOString(), '2026-07-26T05:00:00.000Z');
});

test('acepta rangos extensos definidos por el filtro', () => {
  const range = resolveStatsRange({ start: '2025-01-01', end: '2026-07-25' });

  assert.equal(range.start, '2025-01-01');
  assert.equal(range.end, '2026-07-25');
  assert.equal(range.days, 571);
});

test('rechaza fechas invalidas y rangos invertidos', () => {
  assert.throws(
    () => resolveStatsRange({ start: '2026-02-30', end: '2026-03-01' }),
    /fecha valida/
  );
  assert.throws(
    () => resolveStatsRange({ start: '2026-07-26', end: '2026-07-25' }),
    /posterior/
  );
});

test('completa con ceros todos los dias del rango', () => {
  const range = resolveStatsRange({ start: '2026-07-23', end: '2026-07-25' });
  const series = buildDailySeries(range, [
    { _id: '2026-07-23', value: 4 },
    { _id: '2026-07-25', value: 2 },
  ]);

  assert.deepEqual(series.items.map((item) => item.value), [4, 0, 2]);
  assert.equal(series.max, 4);
});

test('construye el mapa de calor con lunes como primer dia', () => {
  const heatmap = buildHeatmap([
    { _id: { day: 1, hour: 7 }, value: 3 },
    { _id: { day: 7, hour: 22 }, value: 5 },
  ]);

  assert.equal(heatmap.matrix[0].values[7].count, 3);
  assert.equal(heatmap.matrix[6].values[22].count, 5);
  assert.equal(heatmap.max, 5);
});

test('resume duraciones y conserva percentil nearest-rank', () => {
  const summary = buildDurationSummary([
    { _id: 10, count: 1 },
    { _id: 20, count: 1 },
    { _id: 30, count: 1 },
    { _id: 40, count: 1 },
    { _id: 50, count: 1 },
  ]);

  assert.equal(summary.count, 5);
  assert.equal(summary.total, 150);
  assert.equal(summary.average, 30);
  assert.equal(summary.median, 30);
  assert.equal(summary.p90, 50);
});

test('calcula resumen y periodo previo sin depender de paginacion', () => {
  const range = resolveStatsRange({ start: '2026-07-23', end: '2026-07-25' });
  const response = buildStatsResponse({
    range,
    previous: 3,
    faculty: '',
    facultyOptions: ['Ingenieria'],
    openSessions: [],
    aggregate: {
      summary: [{ total: 6, closed: 5 }],
      daily: [
        { _id: '2026-07-23', value: 1 },
        { _id: '2026-07-24', value: 2 },
        { _id: '2026-07-25', value: 3 },
      ],
      hourly: [{ _id: 7, value: 4 }],
      heatmap: [],
      roles: [{ _id: 'Estudiante', count: 6 }],
      faculties: [{ _id: 'Ingenieria', count: 6 }],
      operators: [],
      durations: [{ _id: 15, count: 1 }, { _id: 30, count: 1 }],
    },
  });

  assert.equal(response.totalFiltered, 6);
  assert.deepEqual(response.summaryMetrics, { daily: 3, weekly: 6, monthly: 6 });
  assert.equal(response.previousPeriodComparison.days, 3);
  assert.equal(response.previousPeriodComparison.deltaPercent, 100);
  assert.equal(response.statisticalInsights.closedRate, (5 / 6) * 100);
});
