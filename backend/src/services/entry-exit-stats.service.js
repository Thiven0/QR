const Registro = require('../models/entry-exit.model');
const { User } = require('../models/user.model');

const STATS_TIMEZONE = 'America/Bogota';
const BOGOTA_UTC_OFFSET_HOURS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseDateKey = (value, fieldName) => {
  if (!DATE_ONLY_PATTERN.test(value || '')) {
    const error = new Error(`${fieldName} debe tener el formato YYYY-MM-DD.`);
    error.status = 400;
    throw error;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    const error = new Error(`${fieldName} no es una fecha valida.`);
    error.status = 400;
    throw error;
  }

  return date;
};

const formatDateKey = (date) => date.toISOString().slice(0, 10);

const addDays = (date, amount) => new Date(date.getTime() + amount * DAY_MS);

const getBogotaDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: STATS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const toBogotaStart = (date) =>
  new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    BOGOTA_UTC_OFFSET_HOURS
  ));

const resolveStatsRange = ({ start, end, now = new Date() } = {}) => {
  const endDate = end ? parseDateKey(end, 'end') : parseDateKey(getBogotaDateKey(now), 'end');
  const startDate = start ? parseDateKey(start, 'start') : addDays(endDate, -29);

  if (startDate > endDate) {
    const error = new Error('La fecha inicial no puede ser posterior a la fecha final.');
    error.status = 400;
    throw error;
  }

  const days = Math.floor((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1;
  const endExclusiveDate = addDays(endDate, 1);
  const startInclusive = toBogotaStart(startDate);
  const endExclusive = toBogotaStart(endExclusiveDate);
  const previousEndExclusive = startInclusive;
  const previousStartInclusive = toBogotaStart(addDays(startDate, -days));

  return {
    start: formatDateKey(startDate),
    end: formatDateKey(endDate),
    startDate,
    endDate,
    startInclusive,
    endExclusive,
    previousStartInclusive,
    previousEndExclusive,
    days,
  };
};

const average = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const percentile = (values, ratio) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
};

const standardDeviation = (values) => {
  if (!values.length) return 0;
  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
};

const formatDayLabel = (date, options) =>
  new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', ...options }).format(date);

const buildDailySeries = (range, rows = []) => {
  const counts = new Map(rows.map((row) => [row._id, row.value || 0]));
  const items = [];

  for (let index = 0; index < range.days; index += 1) {
    const date = addDays(range.startDate, index);
    const key = formatDateKey(date);
    items.push({
      key,
      label: formatDayLabel(date, { day: '2-digit', month: 'short' }),
      tooltip: formatDayLabel(date, { weekday: 'long', day: 'numeric', month: 'long' }),
      value: counts.get(key) || 0,
    });
  }

  const max = items.reduce((current, item) => Math.max(current, item.value), 0);
  return { max: Math.max(max, 1), items };
};

const sumBetween = (counts, start, endExclusive) => {
  let total = 0;
  for (let cursor = start; cursor < endExclusive; cursor = addDays(cursor, 1)) {
    total += counts.get(formatDateKey(cursor)) || 0;
  }
  return total;
};

const buildWeeklyBars = (range, dailyItems) => {
  const counts = new Map(dailyItems.map((item) => [item.key, item.value]));
  const endWeekDay = range.endDate.getUTCDay() || 7;
  const currentWeekStart = addDays(range.endDate, -(endWeekDay - 1));
  const items = [];

  for (let index = 5; index >= 0; index -= 1) {
    const start = addDays(currentWeekStart, -(index * 7));
    const finish = addDays(start, 7);
    const value = sumBetween(counts, start, finish);
    items.push({
      label: formatDayLabel(start, { day: '2-digit', month: 'short' }),
      value,
      tooltip: `${formatDayLabel(start, { weekday: 'short', day: '2-digit', month: 'short' })} - ${formatDayLabel(addDays(finish, -1), { weekday: 'short', day: '2-digit', month: 'short' })}: ${value} entradas`,
    });
  }

  return {
    max: Math.max(1, ...items.map((item) => item.value)),
    items,
  };
};

const buildMonthlyBars = (range, dailyItems) => {
  const counts = new Map(dailyItems.map((item) => [item.key, item.value]));
  const items = [];

  for (let index = 5; index >= 0; index -= 1) {
    const start = new Date(Date.UTC(
      range.endDate.getUTCFullYear(),
      range.endDate.getUTCMonth() - index,
      1
    ));
    const finish = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const value = sumBetween(counts, start, finish);
    items.push({
      label: formatDayLabel(start, { month: 'short', year: 'numeric' }),
      value,
      tooltip: `${formatDayLabel(start, { month: 'long', year: 'numeric' })}: ${value} entradas`,
    });
  }

  return {
    max: Math.max(1, ...items.map((item) => item.value)),
    items,
  };
};

const buildHeatmap = (rows = []) => {
  const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  const matrix = days.map((label) => ({
    label,
    values: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
  }));

  rows.forEach((row) => {
    const dayIndex = Number(row?._id?.day) - 1;
    const hour = Number(row?._id?.hour);
    if (dayIndex >= 0 && dayIndex < 7 && hour >= 0 && hour < 24) {
      matrix[dayIndex].values[hour].count = row.value || 0;
    }
  });

  const max = matrix.reduce(
    (current, day) => Math.max(current, ...day.values.map((cell) => cell.count)),
    0
  );
  return { days, matrix, max: Math.max(max, 1) };
};

const buildDurationSummary = (values = []) => {
  const bins = values
    .map((value) => (
      typeof value === 'number'
        ? { minute: value, count: 1 }
        : { minute: Number(value?._id), count: Number(value?.count) }
    ))
    .filter((bin) => Number.isFinite(bin.minute) && bin.minute > 0 && Number.isFinite(bin.count) && bin.count > 0)
    .sort((left, right) => left.minute - right.minute);
  const count = bins.reduce((sum, bin) => sum + bin.count, 0);
  if (!count) {
    return { count: 0, total: null, average: null, median: null, min: null, max: null, p90: null };
  }

  const total = bins.reduce((sum, bin) => sum + (bin.minute * bin.count), 0);
  const valueAtPosition = (position) => {
    let accumulated = 0;
    for (const bin of bins) {
      accumulated += bin.count;
      if (accumulated >= position) return bin.minute;
    }
    return bins[bins.length - 1].minute;
  };
  const lowerMiddle = valueAtPosition(Math.ceil(count / 2));
  const upperMiddle = valueAtPosition(Math.floor(count / 2) + 1);
  return {
    count,
    total,
    average: total / count,
    median: (lowerMiddle + upperMiddle) / 2,
    min: bins[0].minute,
    max: bins[bins.length - 1].minute,
    p90: valueAtPosition(Math.ceil(count * 0.9)),
  };
};

const buildCurrentPipeline = (match) => [
  { $match: match },
  {
    $lookup: {
      from: 'users',
      localField: 'usuario',
      foreignField: '_id',
      as: 'entryUser',
    },
  },
  { $unwind: { path: '$entryUser', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'users',
      localField: 'administrador',
      foreignField: '_id',
      as: 'entryAdmin',
    },
  },
  { $unwind: { path: '$entryAdmin', preserveNullAndEmptyArrays: true } },
  {
    $addFields: {
      facultyLabel: {
        $let: {
          vars: { value: { $trim: { input: { $ifNull: ['$entryUser.facultad', ''] } } } },
          in: { $cond: [{ $eq: ['$$value', ''] }, 'Sin facultad', '$$value'] },
        },
      },
      roleLabel: {
        $let: {
          vars: { value: { $trim: { input: { $ifNull: ['$entryUser.rolAcademico', ''] } } } },
          in: { $cond: [{ $eq: ['$$value', ''] }, 'Sin rol academico', '$$value'] },
        },
      },
      durationMinutes: {
        $cond: [
          {
            $and: [
              { $ne: ['$fechaSalida', null] },
              { $gt: ['$fechaSalida', '$fechaEntrada'] },
            ],
          },
          { $floor: { $divide: [{ $subtract: ['$fechaSalida', '$fechaEntrada'] }, 60000] } },
          null,
        ],
      },
    },
  },
  {
    $facet: {
      summary: [
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            closed: {
              $sum: {
                $cond: [
                  { $ne: [{ $ifNull: ['$fechaSalida', null] }, null] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ],
      daily: [
        {
          $group: {
            _id: { $dateToString: { date: '$fechaEntrada', format: '%Y-%m-%d', timezone: STATS_TIMEZONE } },
            value: { $sum: 1 },
          },
        },
      ],
      hourly: [
        {
          $group: {
            _id: { $hour: { date: '$fechaEntrada', timezone: STATS_TIMEZONE } },
            value: { $sum: 1 },
          },
        },
      ],
      heatmap: [
        {
          $group: {
            _id: {
              day: { $isoDayOfWeek: { date: '$fechaEntrada', timezone: STATS_TIMEZONE } },
              hour: { $hour: { date: '$fechaEntrada', timezone: STATS_TIMEZONE } },
            },
            value: { $sum: 1 },
          },
        },
      ],
      roles: [
        { $group: { _id: '$roleLabel', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ],
      faculties: [
        { $group: { _id: '$facultyLabel', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ],
      operators: [
        { $match: { 'entryAdmin._id': { $ne: null } } },
        {
          $group: {
            _id: '$entryAdmin._id',
            nombre: { $first: '$entryAdmin.nombre' },
            apellido: { $first: '$entryAdmin.apellido' },
            email: { $first: '$entryAdmin.email' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, nombre: 1, apellido: 1 } },
        { $limit: 5 },
      ],
      durations: [
        { $match: { durationMinutes: { $gt: 0 } } },
        { $group: { _id: '$durationMinutes', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ],
    },
  },
];

const buildStatsResponse = ({ range, aggregate, previous, faculty, facultyOptions, openSessions }) => {
  const summary = aggregate.summary?.[0] || { total: 0, closed: 0 };
  const total = summary.total || 0;
  const closed = summary.closed || 0;
  const dailyEntriesSeries = buildDailySeries(range, aggregate.daily);
  const dailyValues = dailyEntriesSeries.items.map((item) => item.value);
  const hourlyItems = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    value: aggregate.hourly.find((row) => row._id === hour)?.value || 0,
  }));
  const peakItems = hourlyItems
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value || left.hour - right.hour)
    .slice(0, 6);
  const endDayTotal = dailyEntriesSeries.items.at(-1)?.value || 0;
  const last7Days = dailyEntriesSeries.items.slice(-7).reduce((sum, item) => sum + item.value, 0);
  const last30Days = dailyEntriesSeries.items.slice(-30).reduce((sum, item) => sum + item.value, 0);
  const mean = average(dailyValues);
  const stdDev = standardDeviation(dailyValues);
  const delta = total - previous;

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      start: range.start,
      end: range.end,
      faculty: faculty || null,
      timezone: STATS_TIMEZONE,
      days: range.days,
    },
    facultyOptions,
    totalFiltered: total,
    summaryMetrics: {
      daily: endDayTotal,
      weekly: last7Days,
      monthly: last30Days,
    },
    dailyEntriesSeries,
    weeklyBars: buildWeeklyBars(range, dailyEntriesSeries.items),
    monthlyBars: buildMonthlyBars(range, dailyEntriesSeries.items),
    peakHourBars: {
      max: Math.max(1, ...peakItems.map((item) => item.value)),
      items: peakItems,
    },
    entriesByRole: {
      total,
      max: Math.max(1, ...aggregate.roles.map((row) => row.count || 0)),
      items: aggregate.roles.map((row) => ({ role: row._id, count: row.count || 0 })),
    },
    heatmapData: buildHeatmap(aggregate.heatmap),
    topAdminSeries: {
      max: Math.max(1, ...aggregate.operators.map((row) => row.count || 0)),
      items: aggregate.operators.map((row) => ({
        id: String(row._id),
        name: [row.nombre, row.apellido].filter(Boolean).join(' ').trim() || row.email || 'Sin asignar',
        email: row.email || '',
        count: row.count || 0,
      })),
    },
    openSessions,
    previousPeriodComparison: {
      current: total,
      previous,
      delta,
      deltaPercent: previous > 0 ? (delta / previous) * 100 : null,
      days: range.days,
    },
    statisticalInsights: {
      mean,
      median: median(dailyValues),
      p90: percentile(dailyValues, 0.9),
      stdDev,
      variationCoefficient: mean > 0 ? (stdDev / mean) * 100 : 0,
      closedRate: total > 0 ? (closed / total) * 100 : 0,
      openRate: total > 0 ? ((total - closed) / total) * 100 : 0,
      sampleDays: range.days,
    },
    rankingData: aggregate.faculties.map((row) => ({ faculty: row._id, count: row.count || 0 })),
    sessionDuration: buildDurationSummary(aggregate.durations),
  };
};

const getEntryExitStats = async ({ start, end, faculty }) => {
  const range = resolveStatsRange({ start, end });
  const normalizedFaculty = typeof faculty === 'string' ? faculty.trim() : '';
  const facultyFilter = normalizedFaculty
    ? { facultad: new RegExp(`^${escapeRegExp(normalizedFaculty)}$`, 'i') }
    : null;
  const facultyUserIds = facultyFilter ? await User.distinct('_id', facultyFilter) : null;
  const userClause = facultyUserIds ? { usuario: { $in: facultyUserIds } } : {};
  const currentMatch = {
    fechaEntrada: { $gte: range.startInclusive, $lt: range.endExclusive },
    ...userClause,
  };
  const previousMatch = {
    fechaEntrada: { $gte: range.previousStartInclusive, $lt: range.previousEndExclusive },
    ...userClause,
  };
  const openMatch = {
    $or: [{ fechaSalida: null }, { fechaSalida: { $exists: false } }],
    ...userClause,
  };

  const [aggregateRows, previous, facultyValues, openRows] = await Promise.all([
    Registro.aggregate(buildCurrentPipeline(currentMatch)).allowDiskUse(true),
    Registro.countDocuments(previousMatch),
    User.distinct('facultad', { facultad: { $nin: [null, ''] } }),
    Registro.find(openMatch)
      .sort({ fechaEntrada: -1 })
      .limit(5)
      .populate('usuario', 'nombre apellido email estado')
      .populate('administrador', 'nombre apellido email')
      .lean(),
  ]);

  const facultyOptions = Array.from(
    new Map(
      facultyValues
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .map((value) => [value.toLocaleLowerCase('es-CO'), value])
    ).values()
  ).sort((left, right) => left.localeCompare(right, 'es'));

  const openSessions = openRows.map((row) => ({
    id: String(row._id),
    userName: [row.usuario?.nombre, row.usuario?.apellido].filter(Boolean).join(' ').trim()
      || row.usuario?.email
      || 'Sin nombre',
    userEstado: row.usuario?.estado || 'Sin estado',
    adminName: [row.administrador?.nombre, row.administrador?.apellido].filter(Boolean).join(' ').trim()
      || row.administrador?.email
      || 'Sin asignar',
    startedAt: row.fechaEntrada,
    horaEntrada: row.horaEntrada,
  }));

  const aggregate = aggregateRows[0] || {
    summary: [],
    daily: [],
    hourly: [],
    heatmap: [],
    roles: [],
    faculties: [],
    operators: [],
    durations: [],
  };

  return buildStatsResponse({
    range,
    aggregate,
    previous,
    faculty: normalizedFaculty,
    facultyOptions,
    openSessions,
  });
};

module.exports = {
  STATS_TIMEZONE,
  resolveStatsRange,
  buildDailySeries,
  buildHeatmap,
  buildDurationSummary,
  buildStatsResponse,
  getEntryExitStats,
};
