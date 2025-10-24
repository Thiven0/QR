import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';

const ensureDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDayLabel = (date) =>
  date.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

const normalizeUserId = (usuario) => {
  if (!usuario) return null;
  if (typeof usuario === 'string') return usuario;
  return usuario._id || usuario.id || usuario.cedula || usuario.email || null;
};

const getDefaultRange = () => {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

const DashboardStats = () => {
  const { token } = useAuth();

  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dateRange, setDateRange] = useState(getDefaultRange);
  const [facultyFilter, setFacultyFilter] = useState('');

  useEffect(() => {
    if (!token) return;

    let mounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const [usersResponse, recordsResponse] = await Promise.all([
          apiRequest('/users', { token }),
          apiRequest('/exitEntry', { token }),
        ]);

        if (!mounted) return;

        const usersPayload = Array.isArray(usersResponse) ? usersResponse : usersResponse?.data || [];
        const recordsPayload = Array.isArray(recordsResponse) ? recordsResponse : recordsResponse?.data || [];

        setUsers(usersPayload);
        setRecords(recordsPayload);
      } catch (err) {
        if (mounted) {
          setError(err.message || 'No fue posible obtener la informacion.');
          setUsers([]);
          setRecords([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [token]);

  const userMap = useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user._id] = user;
      return acc;
    }, {});
  }, [users]);

  const normalizedRecords = useMemo(() => {
    return records
      .map((record) => {
        const userId = normalizeUserId(record?.usuario);
        const user = userId ? userMap[userId] : null;
        const faculty = (user?.facultad || 'Sin facultad').trim() || 'Sin facultad';

        return {
          ...record,
          userId,
          faculty,
          fechaEntradaDate: ensureDate(record?.fechaEntrada),
        };
      })
      .filter((record) => record.fechaEntradaDate);
  }, [records, userMap]);

  const facultyOptions = useMemo(() => {
    const options = new Set();
    users.forEach((user) => {
      const label = (user?.facultad || '').trim();
      if (label) options.add(label);
    });
    return Array.from(options).sort((a, b) => a.localeCompare(b, 'es'));
  }, [users]);

  const rangeStart = ensureDate(dateRange.start);
  if (rangeStart) {
    rangeStart.setHours(0, 0, 0, 0);
  }
  const rangeEnd = ensureDate(dateRange.end);
  if (rangeEnd) {
    rangeEnd.setHours(23, 59, 59, 999);
  }

  const filteredRecords = useMemo(() => {
    return normalizedRecords.filter((record) => {
      const withinRange =
        (!rangeStart || record.fechaEntradaDate >= rangeStart) &&
        (!rangeEnd || record.fechaEntradaDate <= rangeEnd);

      const matchesFaculty = !facultyFilter || record.faculty.toLowerCase() === facultyFilter.toLowerCase();

      return withinRange && matchesFaculty;
    });
  }, [normalizedRecords, rangeStart, rangeEnd, facultyFilter]);

  const summaryMetrics = useMemo(() => {
    const dayStart = ensureDate(rangeEnd);
    if (dayStart) dayStart.setHours(0, 0, 0, 0);
    const dayEnd = dayStart ? new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) : null;

    const weekStart = dayStart ? new Date(dayStart) : null;
    if (weekStart) weekStart.setDate(weekStart.getDate() - 6);

    const monthStart = dayStart ? new Date(dayStart) : null;
    if (monthStart) monthStart.setDate(monthStart.getDate() - 29);

    const daily = filteredRecords.filter(
      (record) => dayStart && dayEnd && record.fechaEntradaDate >= dayStart && record.fechaEntradaDate < dayEnd
    ).length;

    const weekly = filteredRecords.filter(
      (record) => weekStart && dayEnd && record.fechaEntradaDate >= weekStart && record.fechaEntradaDate < dayEnd
    ).length;

    const monthly = filteredRecords.filter(
      (record) => monthStart && dayEnd && record.fechaEntradaDate >= monthStart && record.fechaEntradaDate < dayEnd
    ).length;

    return {
      daily,
      weekly,
      monthly,
    };
  }, [filteredRecords, rangeEnd]);

  const weeklyBars = useMemo(() => {
    if (!rangeEnd) {
      return { max: 1, items: [] };
    }

    const end = new Date(rangeEnd);
    end.setHours(0, 0, 0, 0);
    const day = end.getDay() || 7;
    end.setDate(end.getDate() - (day - 1));

    const items = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(end);
      start.setDate(end.getDate() - i * 7);
      const finish = new Date(start);
      finish.setDate(start.getDate() + 7);

      const count = filteredRecords.filter(
        (record) => record.fechaEntradaDate >= start && record.fechaEntradaDate < finish
      ).length;

      items.push({
        label: `${start.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`,
        value: count,
        tooltip: `${formatDayLabel(start)} - ${formatDayLabel(new Date(finish.getTime() - 1))}: ${count} entradas`,
      });
    }

    const max = items.reduce((acc, item) => Math.max(acc, item.value), 0);
    return {
      max: Math.max(max, 1),
      items,
    };
  }, [filteredRecords, rangeEnd]);

  const monthlyBars = useMemo(() => {
    if (!rangeEnd) {
      return { max: 1, items: [] };
    }

    const base = new Date(rangeEnd);
    base.setDate(1);
    base.setHours(0, 0, 0, 0);

    const items = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(base);
      start.setMonth(base.getMonth() - i);
      const finish = new Date(start);
      finish.setMonth(start.getMonth() + 1);

      const count = filteredRecords.filter(
        (record) => record.fechaEntradaDate >= start && record.fechaEntradaDate < finish
      ).length;

      items.push({
        label: start.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
        value: count,
        tooltip: `${start.toLocaleDateString('es-CO', {
          month: 'long',
          year: 'numeric',
        })}: ${count} entradas`,
      });
    }

    const max = items.reduce((acc, item) => Math.max(acc, item.value), 0);
    return {
      max: Math.max(max, 1),
      items,
    };
  }, [filteredRecords, rangeEnd]);

  const heatmapData = useMemo(() => {
    const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    const matrix = days.map((label, index) => ({
      label,
      values: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: 0,
      })),
    }));

    filteredRecords.forEach((record) => {
      const date = record.fechaEntradaDate;
      const weekday = date.getDay();
      const mappedDay = weekday === 0 ? 6 : weekday - 1;
      const hour = date.getHours();
      matrix[mappedDay].values[hour].count += 1;
    });

    const max = matrix.reduce((maxValue, day) => {
      const localMax = day.values.reduce((acc, cell) => Math.max(acc, cell.count), 0);
      return Math.max(maxValue, localMax);
    }, 0);

    return {
      days,
      matrix,
      max: Math.max(max, 1),
    };
  }, [filteredRecords]);

  const rankingData = useMemo(() => {
    const totals = filteredRecords.reduce((acc, record) => {
      const label = record.faculty || 'Sin facultad';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(totals)
      .map(([faculty, count]) => ({
        faculty,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  const parseDurationToMinutes = (record) => {
    if (record?.duracionSesion) {
      const parts = String(record.duracionSesion).split(':').map(Number);
      if (parts.length >= 2 && parts.every((value) => Number.isFinite(value))) {
        const [hours, minutes] = parts;
        return hours * 60 + minutes;
      }
    }

    const entryDate = ensureDate(record?.fechaEntrada);
    const exitDate = ensureDate(record?.fechaSalida);

    if (entryDate && exitDate) {
      const diff = exitDate.getTime() - entryDate.getTime();
      if (diff > 0) {
        return diff / 60000;
      }
    }

    return null;
  };

  const sessionDurationSummary = useMemo(() => {
    const durations = filteredRecords
      .map((record) => parseDurationToMinutes(record))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!durations.length) {
      return {
        average: 'Sin datos',
        median: 'Sin datos',
        count: 0,
      };
    }

    const sum = durations.reduce((acc, value) => acc + value, 0);
    const averageMinutes = sum / durations.length;

    const sorted = [...durations].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const medianMinutes =
      sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];

    const formatMinutes = (value) => {
      if (!Number.isFinite(value)) return 'Sin datos';
      const hours = Math.floor(value / 60);
      const minutes = Math.round(value % 60);
      if (hours <= 0) return `${minutes} min`;
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    };

    return {
      average: formatMinutes(averageMinutes),
      median: formatMinutes(medianMinutes),
      count: durations.length,
    };
  }, [filteredRecords]);

  const handleDateChange = (event) => {
    const { name, value } = event.target;
    setDateRange((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResetFilters = () => {
    setDateRange(getDefaultRange());
    setFacultyFilter('');
  };

  const totalFiltered = filteredRecords.length;

  return (
    <section className="min-h-screen bg-[#f8fafc] px-4 pb-16 pt-6 sm:pt-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#00594e]">Analitica</p>
            <h1 className="text-3xl font-bold text-[#0f172a]">Estadisticas de asistencia y tendencias</h1>
            <p className="text-sm text-[#475569]">
              Explora reportes diarios, semanales y mensuales con comparativas por facultad y franjas horarias.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-[#00594e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037]"
            >
              Descargar reporte
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-[#00594e]/40 px-4 py-2 text-sm font-semibold text-[#00594e] transition hover:bg-[#00594e]/10"
            >
              Comparar con periodo anterior
            </button>
          </div>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm text-[#0f172a]">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Fecha inicio</span>
              <input
                type="date"
                name="start"
                value={dateRange.start}
                onChange={handleDateChange}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/40"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-[#0f172a]">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Fecha fin</span>
              <input
                type="date"
                name="end"
                value={dateRange.end}
                onChange={handleDateChange}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/40"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-[#0f172a]">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Facultad</span>
              <select
                value={facultyFilter}
                onChange={(event) => setFacultyFilter(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/40"
              >
                <option value="">Todas</option>
                {facultyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-100"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
          <p className="mt-4 text-xs text-[#475569]">
            Coincidencias encontradas: <span className="font-semibold text-[#00594e]">{totalFiltered}</span> registros
            de acceso.
          </p>
          {error && <p className="mt-3 text-sm font-semibold text-[#b91c1c]">{error}</p>}
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#64748b]">Diario</p>
            <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{summaryMetrics.daily.toLocaleString('es-CO')}</p>
            <p className="mt-1 text-xs text-[#475569]">Entradas registradas en la fecha seleccionada.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#64748b]">Ultimos 7 dias</p>
            <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{summaryMetrics.weekly.toLocaleString('es-CO')}</p>
            <p className="mt-1 text-xs text-[#475569]">Total de accesos en la ultima semana.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#64748b]">Ultimos 30 dias</p>
            <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{summaryMetrics.monthly.toLocaleString('es-CO')}</p>
            <p className="mt-1 text-xs text-[#475569]">Registros en el mes movil.</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Asistencia semanal</h2>
                <p className="text-sm text-[#64748b]">Comparativa de entradas por semana.</p>
              </div>
            </div>
            <div className="flex h-48 items-end gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
              {weeklyBars.items.map((item) => (
                <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-36 w-full items-end overflow-hidden rounded-md bg-[#00594e]/10">
                    <div
                      className="w-full rounded-t-md bg-[#00594e]"
                      style={{ height: `${Math.max((item.value / weeklyBars.max) * 100, 6)}%` }}
                      title={item.tooltip}
                    />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">{item.label}</span>
                  <span className="text-xs text-[#0f172a]">{item.value.toLocaleString('es-CO')}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Asistencia mensual</h2>
                <p className="text-sm text-[#64748b]">Resumen comparativo de los ultimos meses.</p>
              </div>
            </div>
            <div className="flex h-48 items-end gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
              {monthlyBars.items.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2">
                  <div className="flex h-36 w-12 items-end overflow-hidden rounded-md bg-[#B5A160]/10">
                    <div
                      className="w-full rounded-t-md bg-[#B5A160]"
                      style={{ height: `${Math.max((item.value / monthlyBars.max) * 100, 6)}%` }}
                      title={item.tooltip}
                    />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">{item.label}</span>
                  <span className="text-xs text-[#0f172a]">{item.value.toLocaleString('es-CO')}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0f172a]">Horas pico de acceso</h2>
              <p className="text-sm text-[#64748b]">Mapa de calor con mayor demanda por dia y hora.</p>
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-xs text-[#475569]">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white px-3 py-2 text-left font-semibold text-[#0f172a]">Dia</th>
                  {Array.from({ length: 24 }, (_, hour) => (
                    <th key={hour} className="px-2 py-1 font-semibold text-[#64748b]">
                      {hour.toString().padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.matrix.map((day, index) => (
                  <tr key={day.label} className="border-t border-slate-200">
                    <th className="sticky left-0 bg-white px-3 py-2 text-left font-semibold text-[#0f172a]">{day.label}</th>
                    {day.values.map((cell) => {
                      const intensity = cell.count / heatmapData.max;
                      const background = `rgba(15, 118, 110, ${0.1 + intensity * 0.8})`;
                      return (
                        <td
                          key={`${index}-${cell.hour}`}
                          style={{ backgroundColor: cell.count === 0 ? '#f1f5f9' : background }}
                          className="px-2 py-2 text-center font-semibold text-[#0f172a]"
                          title={`${day.label} ${cell.hour.toString().padStart(2, '0')}:00 - ${cell.count} registros`}
                        >
                          {cell.count || ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Ranking por facultad</h2>
                <p className="text-sm text-[#64748b]">Facultades con mayor numero de ingresos.</p>
              </div>
            </header>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm text-[#334155]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">
                      Facultad
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#64748b]">
                      Entradas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rankingData.length > 0 ? (
                    rankingData.map((row) => (
                      <tr key={row.faculty}>
                        <td className="px-6 py-3 font-semibold">{row.faculty}</td>
                        <td className="px-6 py-3 text-right text-[#0f172a]">{row.count.toLocaleString('es-CO')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-6 py-3 text-center text-xs text-[#64748b]">
                        No hay registros suficientes para generar el ranking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#0f172a]">Duracion de permanencia</h2>
              <p className="text-sm text-[#64748b]">Resumen de sesiones registradas en el periodo.</p>
            </div>
            <div className="space-y-3 text-sm text-[#475569]">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-[#0f172a]">Promedio por sesion</span>
                <span className="text-[#00594e]">{sessionDurationSummary.average}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-[#0f172a]">Mediana</span>
                <span className="text-[#00594e]">{sessionDurationSummary.median}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-[#0f172a]">Sesiones contabilizadas</span>
                <span className="text-[#00594e]">{sessionDurationSummary.count.toLocaleString('es-CO')}</span>
              </div>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Las duraciones se calculan a partir de registros con hora de entrada y salida disponibles.
            </p>
          </article>
        </section>
      </div>
    </section>
  );
};

export default DashboardStats;
