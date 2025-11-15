import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { FiAlertTriangle, FiRefreshCcw } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const STATS_COLORS = ['#00594e', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];
const ACTIVITY_CHART_DAYS = 10;
const ALERT_THRESHOLD_MINUTES = 5;
const ALERT_POLL_INTERVAL = 30000;

const Content = () => {
  const navigate = useNavigate();
  const { token, hasPermission } = useAuth();
  const [userSummary, setUserSummary] = useState(null);
  const [userSummaryLoading, setUserSummaryLoading] = useState(false);
  const [userSummaryError, setUserSummaryError] = useState('');
  const [entriesToday, setEntriesToday] = useState(0);
  const [entryStatsLoading, setEntryStatsLoading] = useState(false);
  const [entryStatsError, setEntryStatsError] = useState('');
  const [entryRecords, setEntryRecords] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState('');
  const [alertToast, setAlertToast] = useState('');
  const alertCountRef = useRef(0);
  const canSeeAlerts = hasPermission(['Administrador', 'Celador']);

  useEffect(() => {
    if (!token) return undefined;

    let isMounted = true;

    const fetchUserSummary = async () => {
      try {
        if (isMounted) {
          setUserSummaryLoading(true);
          setUserSummaryError('');
        }

        const response = await apiRequest('/users/summary', { token });
        const data = response?.data || response || null;

        if (isMounted) {
          setUserSummary(data);
        }
      } catch (error) {
        if (isMounted) {
          setUserSummary(null);
          setUserSummaryError(error.message || 'No fue posible cargar el resumen de usuarios.');
        }
      } finally {
        if (isMounted) {
          setUserSummaryLoading(false);
        }
      }
    };

    fetchUserSummary();

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const fetchEntryStats = async () => {
      try {
        if (isMounted) {
          setEntryStatsLoading(true);
          setEntryStatsError('');
        }

        const params = new URLSearchParams({
          rangeDays: 30,
          limit: 1500,
        });;
        const response = await apiRequest(`/exitEntry?${params.toString()}`, { token });
        const data = Array.isArray(response) ? response : response?.data || [];

        if (!isMounted) return;

        setEntryRecords(data);

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const todayCount = data.reduce((count, record) => {
          const fechaEntrada = record?.fechaEntrada ? new Date(record.fechaEntrada) : null;
          if (!fechaEntrada || Number.isNaN(fechaEntrada.getTime())) {
            return count;
          }
          return fechaEntrada >= startOfDay && fechaEntrada < endOfDay ? count + 1 : count;
        }, 0);

        setEntriesToday(todayCount);
      } catch (error) {
        if (isMounted) {
          setEntryStatsError(error.message || 'No fue posible obtener los registros de hoy.');
          setEntriesToday(0);
          setEntryRecords([]);
        }
      } finally {
        if (isMounted) {
          setEntryStatsLoading(false);
        }
      }
    };

    fetchEntryStats();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const fetchAlerts = useCallback(async () => {
    if (!token || !canSeeAlerts) return;
    try {
      setAlertsLoading(true);
      setAlertsError('');
      const response = await apiRequest(`/exitEntry/alerts?thresholdMinutes=${ALERT_THRESHOLD_MINUTES}`, { token });
      const data = Array.isArray(response) ? response : response?.data || [];
      setAlerts(data);
      if (data.length > alertCountRef.current && data.length > 0) {
        setAlertToast(`Hay ${data.length} alerta${data.length === 1 ? '' : 's'} de permanencia activa.`);
      }
      alertCountRef.current = data.length;
    } catch (error) {
      setAlertsError(error.message || 'No fue posible obtener las alertas.');
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, [token, canSeeAlerts]);

  useEffect(() => {
    if (!canSeeAlerts) return undefined;
    fetchAlerts();
    const interval = setInterval(fetchAlerts, ALERT_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAlerts, canSeeAlerts]);

  useEffect(() => {
    if (!alertToast) return undefined;
    const timer = setTimeout(() => setAlertToast(''), 5000);
    return () => clearTimeout(timer);
  }, [alertToast]);

  const summaryGeneratedAt = userSummary?.generatedAt ? new Date(userSummary.generatedAt) : null;
  const updatedAtSource = summaryGeneratedAt && !Number.isNaN(summaryGeneratedAt.getTime()) ? summaryGeneratedAt : new Date();
  const updatedAt = updatedAtSource.toLocaleDateString('es-CO', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const estadoCounts = userSummary?.estadoCounts || {};
  const activeUsersCount = estadoCounts.activo || 0;
  const inactiveUsersCount = estadoCounts.inactivo || 0;
  const blockedUsersCount = estadoCounts.bloqueado || 0;
  const totalUsersCount = userSummary?.totalUsers ?? 0;
  const latestUsers = Array.isArray(userSummary?.latestUsers) ? userSummary.latestUsers : [];

  const formatMetricValue = (value, loading, error) => {
    if (loading) return '...';
    if (error) return '--';
    return value.toLocaleString('es-CO');
  };

  const formatCount = (value) => {
    if (!Number.isFinite(value)) return '--';
    return value.toLocaleString('es-CO');
  };

const formatPercentage = (value) => {
  if (!Number.isFinite(value) || value <= 0) return '0%';
  if (value >= 99.5) return '100%';
  if (value < 1) return '<1%';
  if (value < 10) return `${value.toFixed(1)}%`;
  return `${Math.round(value)}%`;
};

const formatElapsedMinutes = (value) => {
  if (!Number.isFinite(value) || value <= 0) return '<1 min';
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  if (hours <= 0) {
    return `${minutes} min`;
  }
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

  const ensureDate = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDateTime = (value) => {
    const date = ensureDate(value);
    if (!date) return 'Sin registro';
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const attendanceSummaryData = useMemo(() => {
    const now = new Date();
    const periods = [
      { period: 'Diario', days: 1 },
      { period: 'Semanal', days: 7 },
      { period: 'Mensual', days: 30 },
    ];

    return periods.map(({ period, days }) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      if (days > 1) {
        start.setDate(start.getDate() - (days - 1));
      }

      const records = entryRecords.filter((record) => {
        const entryDate = ensureDate(record?.fechaEntrada);
        return entryDate && entryDate >= start && entryDate <= now;
      });

      const uniqueUsers = new Set(
        records
          .map((record) => {
            const user = record?.usuario;
            if (!user) return null;
            if (typeof user === 'string') return user;
            return user._id || user.id || user.cedula || user.email || null;
          })
          .filter(Boolean)
      );

      const percentage = totalUsersCount ? (uniqueUsers.size / totalUsersCount) * 100 : 0;
      const latestActivity = records.reduce((latest, record) => {
        const candidate =
          ensureDate(record?.updatedAt) ||
          ensureDate(record?.fechaSalida) ||
          ensureDate(record?.fechaEntrada);
        if (!candidate) return latest;
        if (!latest || candidate > latest) return candidate;
        return latest;
      }, null);

      return {
        period,
        value: formatPercentage(percentage),
        note: latestActivity ? `Actualizado ${formatDateTime(latestActivity)}` : 'Sin actividad registrada',
        delta: `${uniqueUsers.size} usuario${uniqueUsers.size === 1 ? '' : 's'} único${uniqueUsers.size === 1 ? '' : 's'}`,
      };
    });
  }, [entryRecords, totalUsersCount]);

  const facultyHighlightsData = useMemo(() => {
    const faculties = Array.isArray(userSummary?.facultyStats) ? userSummary.facultyStats : [];
    if (!faculties.length || !totalUsersCount) {
      return [
        {
          faculty: 'Sin datos',
          distribution: '0%',
          trend: 'Activos 0%',
          status: 'Sin registros disponibles',
        },
      ];
    }

    return faculties.slice(0, 4).map((item) => {
      const total = item?.total || 0;
      const active = item?.active || 0;
      const distribution = totalUsersCount ? formatPercentage((total / totalUsersCount) * 100) : '0%';
      const activeRate = total ? (active / total) * 100 : 0;
      const status =
        activeRate >= 75 ? 'Alta asistencia' : activeRate >= 50 ? 'Estable' : 'Requiere seguimiento';

      return {
        faculty: item?.label || 'Sin facultad',
        distribution,
        trend: `Activos ${formatPercentage(activeRate)}`,
        status,
      };
    });
  }, [userSummary, totalUsersCount]);

  const accessFeedItems = useMemo(() => {
    if (!entryRecords.length) return [];

    const events = [];

    entryRecords.forEach((record) => {
      const userDoc = record?.usuario || {};
      const adminDoc = record?.administrador || {};

      const userName = [userDoc?.nombre, userDoc?.apellido].filter(Boolean).join(' ') || 'Usuario sin nombre';
      const identifier =
        userDoc?.cedula ||
        userDoc?.email ||
        (typeof record?.usuario === 'string' ? record.usuario : userDoc?._id) ||
        'Sin documento';
      const administrator = adminDoc?.nombre
        ? `Registrado por ${adminDoc.nombre}`
        : 'Validado automaticamente';

      const entryDate = ensureDate(record?.fechaEntrada);
      if (entryDate) {
        events.push({
          key: `${record?._id || identifier}-entry`,
          name: userName,
          id: identifier,
          timestamp: entryDate,
          gate: administrator,
          status: 'Entrada',
        });
      }

      const exitDate = ensureDate(record?.fechaSalida);
      if (exitDate) {
        events.push({
          key: `${record?._id || identifier}-exit`,
          name: userName,
          id: identifier,
          timestamp: exitDate,
          gate: administrator,
          status: 'Salida',
        });
      }
    });

    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 6)
      .map((event) => ({
        ...event,
        time: event.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      }));
  }, [entryRecords]);

  const alertFeedItems = useMemo(() => {
    const pending = entryRecords
      .filter((record) => !record?.fechaSalida)
      .sort((a, b) => {
        const aDate = ensureDate(a?.fechaEntrada);
        const bDate = ensureDate(b?.fechaEntrada);
        if (!aDate || !bDate) return 0;
        return bDate - aDate;
      })
      .slice(0, 4)
      .map((record) => {
        const userDoc = record?.usuario || {};
        const name = [userDoc?.nombre, userDoc?.apellido].filter(Boolean).join(' ') || 'Usuario sin nombre';
        return {
          title: `${name} sin salida registrada`,
          context: `Ingreso ${formatDateTime(record?.fechaEntrada)}`,
          severity: 'Atención',
        };
      });

    return pending;
  }, [entryRecords]);

        const configShortcutsData = useMemo(() => {
    const permissions = userSummary?.permisoCounts || null;
    const roles = Array.isArray(userSummary?.roleStats) ? userSummary.roleStats : [];

    if (!permissions && !roles.length) {
      return [
        { title: 'Permisos del sistema', detail: 'Sin usuarios registrados.' },
        { title: 'Estados', detail: 'Sin usuarios registrados.' },
        { title: 'Roles academicos', detail: 'Sin usuarios registrados.' },
      ];
    }

    const permissionEntries = permissions
      ? Object.entries(permissions)
          .filter(([, count]) => Number.isFinite(count) && count > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([label, count]) => `${label}: ${count}`)
      : [];

    const topRoles = roles
      .filter((item) => item?.total)
      .sort((a, b) => (b?.total || 0) - (a?.total || 0))
      .slice(0, 4)
      .map((item) => `${item?.label || 'Sin rol'}: ${item?.total ?? 0}`);

    return [
      {
        title: 'Permisos del sistema',
        detail: permissionEntries.length ? permissionEntries.join(' | ') : 'Sin usuarios registrados.',
      },
      {
        title: 'Estados',
        detail: `Activos: ${activeUsersCount} | Inactivos: ${inactiveUsersCount} | Bloqueados: ${blockedUsersCount}`,
      },
      {
        title: 'Roles academicos',
        detail: topRoles.length ? topRoles.join(' | ') : 'Sin roles registrados.',
      },
    ];
  }, [userSummary, activeUsersCount, inactiveUsersCount, blockedUsersCount]);

  const reportOptionsData = useMemo(() => {
    const now = new Date();
    const ranges = [
      { label: 'Ultimas 24 horas', days: 1, badge: '24h' },
      { label: 'Últimos 7 días', days: 7, badge: '7d' },
      { label: 'Últimos 30 días', days: 30, badge: '30d' },
    ];

    return ranges.map(({ label, days, badge }) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));

      const records = entryRecords.filter((record) => {
        const entryDate = ensureDate(record?.fechaEntrada);
        return entryDate && entryDate >= start && entryDate <= now;
      });

      const uniqueUsers = new Set(
        records
          .map((record) => {
            const user = record?.usuario;
            if (!user) return null;
            if (typeof user === 'string') return user;
            return user._id || user.id || user.cedula || user.email || null;
          })
          .filter(Boolean)
      );

      return {
        label,
        description: `${records.length} registro${records.length === 1 ? '' : 's'} · ${uniqueUsers.size} usuario${uniqueUsers.size === 1 ? '' : 's'} únicos`,
        badge,
      };
    });
  }, [entryRecords]);

  const userBreakdownData = useMemo(() => {
    const roles = Array.isArray(userSummary?.roleStats) ? userSummary.roleStats : [];

    if (!roles.length) {
      return [
        {
          segment: 'Sin registros',
          count: '0',
          status: 'Activos 0%',
        },
      ];
    }

    return roles
      .filter((item) => item?.total)
      .sort((a, b) => (b?.total || 0) - (a?.total || 0))
      .map((item) => {
        const total = item?.total || 0;
        const active = item?.active || 0;
        const ratio = total ? (active / total) * 100 : 0;
        return {
          segment: item?.label || 'Sin rol',
          count: total.toLocaleString('es-CO'),
          status: `Activos ${formatPercentage(ratio)}`,
        };
      });
  }, [userSummary]);

  const lastSevenDaysTrend = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = 6; offset >= 0; offset--) {
      const day = new Date(today);
      day.setDate(today.getDate() - offset);
      days.push(day);
    }

    const counts = days.map((day) => {
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      const total = entryRecords.reduce((acc, record) => {
        const entryDate = ensureDate(record?.fechaEntrada);
        if (!entryDate) return acc;
        return entryDate >= day && entryDate < nextDay ? acc + 1 : acc;
      }, 0);

      return {
        label: day.toLocaleDateString('es-CO', { weekday: 'short' }),
        value: total,
        tooltip: `${day.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}: ${total} registro${total === 1 ? '' : 's'}`,
      };
    });

    const max = counts.reduce((maxValue, item) => Math.max(maxValue, item.value), 0);

    return {
      max: Math.max(max, 1),
      items: counts,
    };
  }, [entryRecords]);

  const hourlyDistributionData = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const hours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${hour.toString().padStart(2, '0')}h`,
      value: 0,
    }));

    entryRecords.forEach((record) => {
      const entryDate = ensureDate(record?.fechaEntrada);
      if (!entryDate || entryDate < startOfToday || entryDate >= endOfToday) {
        return;
      }
      const hour = entryDate.getHours();
      hours[hour].value += 1;
    });

    const items = hours.map((item) => ({
      ...item,
      tooltip: `${item.label}: ${item.value} registro${item.value === 1 ? '' : 's'}`,
    }));

    const max = items.reduce((maxValue, item) => Math.max(maxValue, item.value), 0);

    return {
      max: Math.max(max, 1),
      items,
    };
  }, [entryRecords]);

  const activityDateSeries = useMemo(() => {
    if (!entryRecords.length) {
      return { labels: [], counts: [] };
    }

    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (ACTIVITY_CHART_DAYS - 1));

    const buckets = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      buckets.push({
        key: cursor.toISOString().slice(0, 10),
        label: cursor.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }),
        count: 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    entryRecords.forEach((record) => {
      if (!record?.fechaEntrada) return;
      const bucketDate = new Date(record.fechaEntrada);
      if (Number.isNaN(bucketDate)) return;
      bucketDate.setHours(0, 0, 0, 0);
      const key = bucketDate.toISOString().slice(0, 10);
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.count += 1;
      }
    });

    return {
      labels: buckets.map((bucket) => bucket.label),
      counts: buckets.map((bucket) => bucket.count),
    };
  }, [entryRecords]);

  const activityChartData = useMemo(
    () => ({
      labels: activityDateSeries.labels,
      datasets: [
        {
          label: 'Registros por dia',
          data: activityDateSeries.counts,
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15, 118, 110, 0.15)',
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    }),
    [activityDateSeries]
  );

  const activityChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#0f172a', autoSkip: true, maxTicksLimit: 6 },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#0f172a', precision: 0 },
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.parsed.y} registro${context.parsed.y === 1 ? '' : 's'}`,
          },
        },
      },
    }),
    []
  );

  const activityChartHasData = useMemo(
    () => activityDateSeries.counts.some((value) => value > 0),
    [activityDateSeries]
  );
  const activityChartTotal = useMemo(
    () => activityDateSeries.counts.reduce((acc, value) => acc + value, 0),
    [activityDateSeries]
  );
  const activityOpenCount = useMemo(
    () => entryRecords.filter((record) => !record?.fechaSalida).length,
    [entryRecords]
  );
  const activityClosedCount = useMemo(
    () => entryRecords.filter((record) => record?.fechaSalida).length,
    [entryRecords]
  );

  const parseDurationToMinutes = (record) => {
    if (record?.duracionSesion) {
      const parts = String(record.duracionSesion).split(':').map(Number);
      if (parts.length >= 2 && parts.every((value) => Number.isFinite(value))) {
        const hours = parts[0];
        const minutes = parts[1];
        return hours * 60 + minutes;
      }
    }

    const entryDate = ensureDate(record?.fechaEntrada);
    const exitDate = ensureDate(record?.fechaSalida);
    if (entryDate && exitDate) {
      const diff = exitDate.getTime() - entryDate.getTime();
      if (diff > 0) {
        return diff / 60000; // minutes
      }
    }

    return null;
  };

  const topVisitorsData = useMemo(() => {
    if (!entryRecords.length) return [];

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 30);

    const counter = new Map();

    entryRecords.forEach((record) => {
      const entryDate = ensureDate(record?.fechaEntrada);
      if (!entryDate || entryDate < threshold) return;

      const userDoc = record?.usuario || {};
      const name = [userDoc?.nombre, userDoc?.apellido].filter(Boolean).join(' ') || 'Usuario sin nombre';
      const key =
        userDoc?._id ||
        userDoc?.id ||
        userDoc?.cedula ||
        userDoc?.email ||
        (typeof record?.usuario === 'string' ? record.usuario : name);

      if (!counter.has(key)) {
        counter.set(key, {
          name,
          cedula: userDoc?.cedula || 'Sin documento',
          count: 0,
        });
      }

      counter.get(key).count += 1;
    });

    return Array.from(counter.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [entryRecords]);

  const sessionDurationSummary = useMemo(() => {
    const durations = entryRecords
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
  }, [entryRecords]);

  const openSessionsCount = useMemo(() => {
    if (!entryRecords.length) return 0;
    return entryRecords.reduce((count, record) => (!record?.fechaSalida ? count + 1 : count), 0);
  }, [entryRecords]);

  const vehicleUsageSummary = useMemo(() => {
    if (!entryRecords.length) {
      return {
        total: 0,
        active: 0,
        missing: 0,
      };
    }

    const uniqueVehicles = new Set();
    let active = 0;
    let missing = 0;

    entryRecords.forEach((record) => {
      const vehicle = record?.vehiculo;
      const vehicleId =
        (typeof vehicle === 'string' && vehicle) ||
        vehicle?._id ||
        vehicle?.id ||
        vehicle?.plate ||
        vehicle?.placa ||
        null;

      if (vehicleId) {
        uniqueVehicles.add(vehicleId);
        if (!record?.fechaSalida) {
          active += 1;
        }
      } else if (!record?.fechaSalida) {
        missing += 1;
      }
    });

    return {
      total: uniqueVehicles.size,
      active,
      missing,
    };
  }, [entryRecords]);

  const newUsersLastWeek = useMemo(() => {
    return userSummary?.newUsers?.last7Days ?? 0;
  }, [userSummary]);

  const recentAccessPreview = useMemo(() => accessFeedItems.slice(0, 3), [accessFeedItems]);

  const vehicleActivityPreview = useMemo(() => {
    if (!entryRecords.length) return [];

    return entryRecords
      .filter((record) => record?.vehiculo)
      .slice(0, 4)
      .map((record) => {
        const vehicle = record?.vehiculo || {};
        const identifier =
          vehicle?.plate ||
          vehicle?.placa ||
          vehicle?.type ||
          vehicle?.tipo ||
          vehicle?._id ||
          (typeof record?.vehiculo === 'string' ? record.vehiculo : 'Vehículo sin dato');
        const userDoc = record?.usuario || {};
        const owner = [userDoc?.nombre, userDoc?.apellido].filter(Boolean).join(' ') || 'Sin propietario';

        return {
          id: identifier,
          owner,
          status: record?.fechaSalida ? 'Fuera del campus' : 'En campus',
          time: formatDateTime(record?.updatedAt || record?.fechaEntrada),
        };
      });
  }, [entryRecords]);

  const lastSevenDaysTotals = useMemo(() => {
    const items = Array.isArray(lastSevenDaysTrend?.items) ? lastSevenDaysTrend.items : [];
    const total = items.reduce((acc, item) => acc + (Number.isFinite(item?.value) ? item.value : 0), 0);
    const average = items.length ? Math.round(total / items.length) : 0;
    const today = items.length ? (Number.isFinite(items[items.length - 1]?.value) ? items[items.length - 1].value : 0) : 0;

    return {
      total,
      average,
      today,
    };
  }, [lastSevenDaysTrend]);

  const busiestHour = useMemo(() => {
    const items = Array.isArray(hourlyDistributionData?.items) ? hourlyDistributionData.items : [];
    if (!items.length) {
      return { label: 'Sin datos', value: 0 };
    }
    return items.reduce((prev, current) => (current.value > prev.value ? current : prev), items[0]);
  }, [hourlyDistributionData]);

  const activeHourBlocks = useMemo(() => {
    const items = Array.isArray(hourlyDistributionData?.items) ? hourlyDistributionData.items : [];
    return items.filter((item) => item.value > 0).length;
  }, [hourlyDistributionData]);

  const attendanceSemanal = attendanceSummaryData.find((item) => item.period === 'Semanal') || attendanceSummaryData[0];
  const topFaculty = facultyHighlightsData[0];
  const frequentVisitor = topVisitorsData[0];
  const lastAccessEvent = accessFeedItems[0] || null;

  const facultyDistributionPreview = useMemo(() => {
    if (!facultyHighlightsData.length) {
      return { gradient: '#e2e8f0', segments: [] };
    }

    const segments = facultyHighlightsData.map((item, index) => ({
      label: item.faculty,
      value: Number.parseFloat(String(item.distribution).replace('%', '')) || 0,
      color: STATS_COLORS[index % STATS_COLORS.length],
    }));

    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    if (!total) {
      return { gradient: '#e2e8f0', segments };
    }

    let accumulator = 0;
    const stops = segments.map((segment) => {
      const start = (accumulator / total) * 360;
      accumulator += segment.value;
      const end = (accumulator / total) * 360;
      return `${segment.color} ${start}deg ${end}deg`;
    });

    return {
      gradient: `conic-gradient(${stops.join(', ')})`,
      segments,
    };
  }, [facultyHighlightsData]);

  const sectionSummaryCards = [
    {
      id: 'qr',
      anchor: 'qr',
      badge: 'Escaner',
      title: 'Escanear QR',
      value: formatCount(openSessionsCount),
      description: 'Registros sin salida registrada',
      footnote: alertFeedItems.length
        ? `${formatCount(alertFeedItems.length)} alertas activas`
        : lastAccessEvent
          ? `Último evento: ${lastAccessEvent.status} ${lastAccessEvent.time}`
          : 'Sin actividad reciente',
    },
    {
      id: 'directory',
      anchor: 'enabled-users',
      badge: 'Directorio',
      title: 'Usuarios habilitados',
      value: formatCount(totalUsersCount),
      description: 'Registros totales en el sistema',
      footnote: `Activos ${formatCount(activeUsersCount)} · Inactivos ${formatCount(inactiveUsersCount)}`,
    },
    {
      id: 'vehicles',
      anchor: 'vehicles',
      badge: 'Vehiculos',
      title: 'Monitoreo vehicular',
      value: formatCount(vehicleUsageSummary.total),
      description: 'Vehiculos detectados en accesos',
      footnote: `${formatCount(vehicleUsageSummary.active)} en movimiento`,
    },
    {
      id: 'vehicle-register',
      anchor: 'vehicle-register',
      badge: 'Registro',
      title: 'Registrar vehículo',
      value: formatCount(vehicleUsageSummary.missing),
      description: 'Ingresos pendientes por asociar vehículo',
      footnote: vehicleUsageSummary.missing ? 'Prioriza actualizarlos hoy' : 'Sin pendientes',
    },
    {
      id: 'statistics',
      anchor: 'statistics',
      badge: 'Cobertura',
      title: 'Estadisticas de asistencia',
      value: attendanceSemanal?.value ?? '0%',
      description: attendanceSemanal?.period ? `Periodo ${attendanceSemanal.period.toLowerCase()}` : 'Seguimiento general',
      footnote: attendanceSemanal?.delta ?? attendanceSemanal?.note ?? '',
    },
    {
      id: 'records-history',
      anchor: 'records-history',
      badge: 'Historial',
      title: 'Registros procesados',
      value: formatCount(entryRecords.length),
      description: `Últimos 7 días: ${formatCount(lastSevenDaysTotals.total)}`,
      footnote: lastAccessEvent ? `${lastAccessEvent.status} de ${lastAccessEvent.name}` : 'Sin eventos recientes',
    },
    {
      id: 'user-register',
      anchor: 'user-register',
      badge: 'Altas',
      title: 'Registrar usuario',
      value: formatCount(newUsersLastWeek),
      description: 'Nuevos usuarios en los ultimos 7 dias',
      footnote: `Total directorio: ${formatCount(totalUsersCount)}`,
    },
    {
      id: 'alerts-kpi',
      anchor: 'alerts-preview',
      badge: 'Alertas',
      title: 'Alertas activas',
      value: formatMetricValue(alerts.length, alertsLoading, alertsError),
      description: 'Usuarios con permanencia extendida',
      footnote: alertsError
        ? 'Error al sincronizar'
        : alerts.length
          ? 'Atiende las alertas pendientes'
          : 'Sin alertas activas',
    },
  ];

  const handleScroll = (id) => {
    if (typeof window === 'undefined') return
    const section = document.getElementById(id)
    if (section) {
      const { top } = section.getBoundingClientRect()
      const offset = window.pageYOffset + top - 80
      window.scrollTo({ top: Math.max(offset, 0), behavior: 'smooth' })
    }
  }

  const handleNavigate = (path) => {
    if (!path) return;
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 pb-10 pt-6 transition-all sm:pt-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#00594e]">Panel del celador</p>
            <h1 className="text-3xl font-bold text-[#0f172a]">Centro de control y vigilancia</h1>
            <p className="text-sm text-[#475569]">Actualizado el {updatedAt}</p>
          </div>
        </header>

        {canSeeAlerts && alertToast && (
          <div className="rounded-xl border border-[#f97316]/40 bg-[#fff7ed] px-4 py-3 text-sm font-semibold text-[#b45309]">
            {alertToast}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0f172a]">Resumen por seccion</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {sectionSummaryCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => card.anchor && handleScroll(card.anchor)}
                className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#00594e]/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#00594e]/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80"
                disabled={!card.anchor}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#99a1af]">{card.title}</span>
                  {card.badge ? (
                    <span className="rounded-full bg-[#00594e]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#00594e]">
                      {card.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{card.value}</p>
                <p className="mt-2 text-sm text-[#475569]">{card.description}</p>
                {card.footnote ? <p className="mt-3 text-xs font-semibold text-[#00594e]">{card.footnote}</p> : null}
              </button>
            ))}
          </div>
        </section>

        {canSeeAlerts && (
          <section
            id="alerts-preview"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[#0f172a]">
                  <FiAlertTriangle className="h-5 w-5 text-[#f97316]" />
                  Alertas activas
                </h2>
                <p className="text-sm text-[#475569]">
                  Vista previa de los usuarios pendientes de revisión.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={fetchAlerts}
                  disabled={alertsLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#0f172a] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FiRefreshCcw className="h-3.5 w-3.5" />
                  {alertsLoading ? 'Actualizando' : 'Refrescar'}
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('/dashboard/alerts')}
                  className="inline-flex items-center gap-2 rounded-full bg-[#f97316]/10 px-3 py-1.5 text-xs font-semibold text-[#b45309] transition hover:bg-[#f97316]/15"
                >
                  Abrir módulo
                </button>
              </div>
            </header>
            {alertsError && (
              <div className="mt-3 rounded-lg border border-[#b91c1c]/40 bg-[#fee2e2] px-3 py-2 text-xs font-semibold text-[#b91c1c]">
                {alertsError}
              </div>
            )}
            <div className="mt-4 space-y-3">
              {alertsLoading ? (
                <p className="text-sm text-[#475569]">Verificando alertas...</p>
              ) : alerts.length ? (
                alerts.slice(0, 3).map((alert) => {
                  const userDoc = alert?.usuario || {};
                  const adminDoc = alert?.administrador || {};
                  const name =
                    [userDoc?.nombre, userDoc?.apellido].filter(Boolean).join(' ') ||
                    userDoc?.email ||
                    'Usuario sin nombre';
                  const adminName =
                    [adminDoc?.nombre, adminDoc?.apellido].filter(Boolean).join(' ') ||
                    adminDoc?.email ||
                    'Sin asignar';
                  const elapsed = Number(alert?.alertElapsedMinutes ?? 0);
                  const status = (alert?.alertStatus || 'pending').toLowerCase();
                  const statusLabel =
                    status === 'resolved'
                      ? 'Resuelta'
                      : status === 'acknowledged'
                        ? 'En revisión'
                        : 'Pendiente';

                  return (
                    <article
                      key={alert?._id || alert?.id}
                      className="rounded-xl border border-slate-200 bg-[#fffaf0] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#0f172a]">{name}</p>
                          <p className="text-xs text-[#92561a]">Supervisor: {adminName}</p>
                          <p className="text-xs text-[#92561a]">
                            Entrada: {formatDateTime(alert?.fechaEntrada)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-semibold text-[#b45309]">
                            {formatElapsedMinutes(elapsed)}
                          </span>
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#b45309]">
                            {statusLabel}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="text-sm font-semibold text-[#0f172a]">
                  Sin alertas activas. Todo en orden.
                </p>
              )}
            </div>
          </section>
        )}

        <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <section id="qr" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#0f172a]">Escanear QR</h2>
                  <p className="text-sm text-[#64748b]">Controla accesos inmediatos desde el lector.</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#B5A160]">Operativo</span>
              </header>
              <div className="grid gap-4 md:grid-cols-3">
                <article className="rounded-xl border border-slate-200 bg-gradient-to-br from-[#f0fdf4] via-white to-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#16a34a]">Registros activos</p>
                  <p className="mt-3 text-3xl font-bold text-[#14532d]">{formatCount(openSessionsCount)}</p>
                  <p className="mt-1 text-xs text-[#166534]">Ingresos sin salida</p>
                </article>
                <article className="rounded-xl border border-slate-200 bg-gradient-to-br from-[#fefce8] via-white to-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#ca8a04]">Alertas</p>
                  <p className="mt-3 text-3xl font-bold text-[#92400e]">{formatCount(alertFeedItems.length)}</p>
                  <p className="mt-1 text-xs text-[#a16207]">Registros pendientes de cierre</p>
                </article>
                <article className="rounded-xl border border-slate-200 bg-gradient-to-br from-[#eff6ff] via-white to-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2563eb]">Ingresos hoy</p>
                  <p className="mt-3 text-3xl font-bold text-[#1d4ed8]">
                    {formatMetricValue(entriesToday, entryStatsLoading, entryStatsError)}
                  </p>
                  <p className="mt-1 text-xs text-[#1d4ed8]/80">Validaciones realizadas</p>
                </article>
              </div>
              <ul className="grid gap-2 text-sm text-[#475569]">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-[#00594e]" aria-hidden="true" />
                  Mantén visible los registros activos para asegurar la salida.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-[#B5A160]" aria-hidden="true" />
                  Usa el módulo de visitantes para reactivar tickets vencidos.
                </li>
              </ul>
              <button
                type="button"
                onClick={() => handleNavigate('/dashboard/qr')}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-[#00594e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2"
              >
                Abrir lector QR
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </article>
            <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h3 className="text-lg font-semibold text-[#0f172a]">Últimos movimientos validados</h3>
                <p className="text-sm text-[#64748b]">Resumen express de lo registrado desde el escáner.</p>
              </div>
              <ul className="space-y-3">
                {recentAccessPreview.length ? (
                  recentAccessPreview.map((item) => (
                    <li key={item.key} className="rounded-lg border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-[#0f172a]">{item.name}</p>
                      <p className="text-xs text-[#475569]">Documento: {item.id}</p>
                      <p className="text-xs text-[#94a3b8]">
                        {item.status} · {item.time} · {item.gate}
                      </p>
                    </li>
                  ))
                ) : (
                  <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-[#94a3b8]">
                    Sin registros recientes. Escanea un código para comenzar.
                  </li>
                )}
              </ul>
            </article>
          </div>
        </section>

        <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <section id="enabled-users" className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Usuarios habilitados</h2>
                <p className="text-sm text-[#64748b]">Resumen de estados actuales en el directorio</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#B5A160]">Directorio</span>
            </header>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-[#ecfeff] via-white to-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0284c7]">Activos</p>
                <p className="mt-3 text-3xl font-bold text-[#0f172a]">{formatCount(activeUsersCount)}</p>
                <p className="mt-1 text-xs text-[#0369a1]">Con acceso vigente</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-[#fff7ed] via-white to-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#ea580c]">Inactivos</p>
                <p className="mt-3 text-3xl font-bold text-[#0f172a]">{formatCount(inactiveUsersCount)}</p>
                <p className="mt-1 text-xs text-[#c2410c]">Pendientes por reactivar</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-[#f0fdf4] via-white to-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#15803d]">Total</p>
                <p className="mt-3 text-3xl font-bold text-[#0f172a]">{formatCount(totalUsersCount)}</p>
                <p className="mt-1 text-xs text-[#166534]">Registros en el sistema</p>
              </div>
            </div>
            <p className="text-xs text-[#475569]">
              Mantén actualizado el estado de cada usuario para evitar accesos no autorizados.
            </p>
            <button
              type="button"
              onClick={() => handleNavigate('/dashboard/users/directory')}
              className="mt-auto inline-flex items-center gap-2 self-start rounded-md bg-[#00594e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2"
            >
              Ir al directorio
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[#0f172a]">Estados recientes</h3>
            <p className="text-sm text-[#64748b]">Últimos cambios en el directorio</p>
            <ul className="mt-4 space-y-3 text-sm text-[#475569]">
              {latestUsers.slice(0, 4).map((user) => (
                <li key={user._id || user.id || user.cedula} className="rounded-lg border border-slate-200 p-4">
                  <p className="font-semibold text-[#0f172a]">{[user?.nombre, user?.apellido].filter(Boolean).join(' ') || 'Usuario sin nombre'}</p>
                  <p className="text-xs text-[#94a3b8]">{user?.email || user?.cedula || 'Sin identificador'}</p>
                  <p className="text-xs font-semibold text-[#00594e]">Estado: {(user?.estado || 'desconocido').toUpperCase()}</p>
                </li>
              ))}
              {latestUsers.length === 0 && (
                <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-[#94a3b8]">
                  No hay usuarios registrados aún.
                </li>
              )}
            </ul>
          </article>
        </section>

        <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <section id="statistics" className="space-y-6">
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Actividad por fecha</h2>
                <p className="text-sm text-[#64748b]">
                  Registros procesados en los últimos {ACTIVITY_CHART_DAYS} días.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleNavigate('/dashboard/records/history')}
                className="inline-flex items-center gap-2 rounded-full border border-[#00594e]/40 px-4 py-1.5 text-xs font-semibold text-[#00594e] transition hover:bg-[#00594e]/10"
              >
                Ver historial
                <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </header>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0f766e]/10 px-3 py-1 text-xs font-semibold text-[#0f766e]">
              <span className="h-2 w-2 rounded-full bg-[#0f766e]" />
              {formatCount(activityChartTotal)} registro{activityChartTotal === 1 ? '' : 's'} en el periodo
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Periodo analizado</p>
                <p className="mt-2 text-2xl font-semibold text-[#0f172a]">{formatCount(activityChartTotal)}</p>
                <p className="text-xs text-[#475569]">Ingresos registrados.</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">En campus</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-700">{formatCount(activityOpenCount)}</p>
                <p className="text-xs text-emerald-700/80">Registros sin salida.</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Finalizados</p>
                <p className="mt-2 text-2xl font-semibold text-amber-700">{formatCount(activityClosedCount)}</p>
                <p className="text-xs text-amber-700/80">Con salida registrada.</p>
              </div>
            </div>

            <div className="mt-6 h-64">
              {activityChartHasData ? (
                <Line data={activityChartData} options={activityChartOptions} />
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-[#94a3b8]">
                  Sin datos suficientes para los últimos {ACTIVITY_CHART_DAYS} días.
                </div>
              )}
            </div>
          </article>

          <div className="grid gap-6 md:grid-cols-2">
            <article
              id="access-trend"
              className="mx-auto flex w-full max-w-[520px] flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:mx-0 md:max-w-none"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#0f172a]">Accesos ultimos 7 dias</h2>
                  <p className="text-sm text-[#64748b]">Comparativa diaria de registros confirmados</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                  Pico: {Math.max(...lastSevenDaysTrend.items.map((item) => item.value)).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="overflow-x-auto">
                <div className="flex min-h-[11rem] min-w-[460px] items-end gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 md:min-w-0">
                  {lastSevenDaysTrend.items.map((item) => (
                    <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-32 w-full items-end overflow-hidden rounded-md bg-[#0f172a]/5 sm:h-36">
                        <div
                          className="w-full rounded-t-md bg-[#00594e]"
                          style={{ height: `${Math.max((item.value / lastSevenDaysTrend.max) * 100, 6)}%` }}
                          title={item.tooltip}
                        />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b] sm:text-xs">{item.label}</span>
                      <span className="text-[11px] text-[#0f172a] sm:text-xs">{item.value.toLocaleString('es-CO')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article
              id="hourly-distribution"
              className="mx-auto flex w-full max-w-[520px] flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:mx-0 md:max-w-none"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#0f172a]">Distribucion por hora (hoy)</h2>
                  <p className="text-sm text-[#64748b]">Registro de entradas agrupadas por hora del dia</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                  Total: {hourlyDistributionData.items.reduce((acc, item) => acc + item.value, 0).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="overflow-x-auto">
                <div className="flex min-h-[11rem] min-w-[520px] items-end gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 md:min-w-0">
                  {hourlyDistributionData.items.map((item) => (
                    <div key={item.label} className="flex w-10 flex-col items-center gap-2 sm:w-12">
                      <div className="flex h-28 w-full items-end overflow-hidden rounded-md bg-[#B5A160]/10 sm:h-32">
                        <div
                          className="w-full rounded-t-md bg-[#B5A160]"
                          style={{ height: `${Math.max((item.value / hourlyDistributionData.max) * 100, 6)}%` }}
                          title={item.tooltip}
                        />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b] sm:text-[11px]">{item.label}</span>
                      <span className="text-[10px] text-[#0f172a] sm:text-[11px]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>

          <article id="faculties" className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Facultades y programas</h2>
                <p className="text-sm text-[#64748b]">Distribución de estudiantes y tendencia de asistencia</p>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="relative flex h-24 w-24 items-center justify-center rounded-full shadow-inner"
                  style={{ backgroundImage: facultyDistributionPreview.gradient }}
                  aria-label="Distribución por facultad"
                  role="img"
                >
                  <span className="text-center text-[11px] font-semibold text-[#0f172a]">
                    Top
                    <br />
                    {topFaculty?.faculty || 'Sin datos'}
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-[#475569]">
                  {facultyDistributionPreview.segments.slice(0, 4).map((segment) => (
                    <li key={segment.label} className="flex items-center gap-2">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span className="font-semibold text-[#0f172a]">{segment.label}</span>
                      <span className="text-[#94a3b8]">{segment.value.toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <ul className="space-y-4">
              {facultyHighlightsData.map((item) => (
                <li key={item.faculty} className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold text-[#0f172a]">
                    <span>{item.faculty}</span>
                    <span>{item.distribution}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-[#00594e]" style={{ width: item.distribution }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#475569]">
                    <span>{item.status}</span>
                    <span className="font-semibold text-[#00594e]">{item.trend}</span>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <section id="vehicles" className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Vehiculos monitoreados</h2>
                <p className="text-sm text-[#64748b]">Seguimiento de identificaciones detectadas en accesos.</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0f172a]/60">Actualizado hoy</span>
            </div>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-center">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Vehiculos identificados</dt>
                <dd className="mt-2 text-2xl font-semibold text-[#0f172a]">{formatCount(vehicleUsageSummary.total)}</dd>
                <p className="mt-1 text-xs text-[#475569]">Basados en registros recientes</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-center">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">En campus</dt>
                <dd className="mt-2 text-2xl font-semibold text-[#0f172a]">{formatCount(vehicleUsageSummary.active)}</dd>
                <p className="mt-1 text-xs text-[#475569]">Movimientos abiertos</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-center">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Sin asociar</dt>
                <dd className="mt-2 text-2xl font-semibold text-[#0f172a]">{formatCount(vehicleUsageSummary.missing)}</dd>
                <p className="mt-1 text-xs text-[#475569]">Registros que requieren placa</p>
              </div>
            </dl>
            <ul className="space-y-3 text-sm text-[#475569]">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-[#00594e]" aria-hidden="true" />
                Verifica que cada ingreso vehicular tenga placa y tipo asignado.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-[#B5A160]" aria-hidden="true" />
                Si un usuario cambia de vehículo, actualiza sus datos antes de confirmar la salida.
              </li>
            </ul>
            <div className="mt-auto flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleNavigate('/dashboard/vehicles?view=list')}
                className="inline-flex items-center gap-2 rounded-md bg-[#00594e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2"
              >
                Ir a vehículos
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('/dashboard/vehicles?view=register')}
                className="inline-flex items-center gap-2 rounded-md border border-[#00594e]/40 px-4 py-2 text-sm font-semibold text-[#00594e] transition hover:bg-[#00594e]/10 focus:outline-none focus:ring-2 focus:ring-[#00594e]/40 focus:ring-offset-2"
              >
                Registrar nuevo
              </button>
            </div>
          </article>
          <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-lg font-semibold text-[#0f172a]">Actividad vehicular</h3>
              <p className="text-sm text-[#64748b]">Resumen rapido de los ultimos registros con placa.</p>
            </div>
            <ul className="space-y-3 text-sm text-[#475569]">
              {vehicleActivityPreview.length ? (
                vehicleActivityPreview.map((item) => (
                  <li key={`${item.id}-${item.time}`} className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-[#0f172a]">{item.id}</p>
                    <p className="text-xs text-[#64748b]">Usuario: {item.owner}</p>
                    <p className="text-xs text-[#94a3b8]">
                      {item.status} · {item.time}
                    </p>
                  </li>
                ))
              ) : (
                <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-[#94a3b8]">
                  Todavía no se han registrado vehículos en los accesos recientes.
                </li>
              )}
            </ul>
          </article>
        </section>

        <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <section id="vehicle-register" className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#0f172a]">Registrar vehículo</h2>
              <p className="text-sm text-[#64748b]">Agrega nuevos vehículos y asígnalos al propietario correcto.</p>
            </div>
            <ol className="space-y-3 text-sm text-[#475569]">
              <li className="flex items-start gap-3">
                <span className="mt-[3px] inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#00594e] text-xs font-semibold text-white">
                  1
                </span>
                Selecciona el usuario responsable del vehículo antes de completar el formulario.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-[3px] inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#B5A160] text-xs font-semibold text-white">
                  2
                </span>
                Registra tipo, placa, color y evidencia fotografica para facilitar la verificacion visual.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-[3px] inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#0f172a] text-xs font-semibold text-white">
                  3
                </span>
                Confirma el estado (activo/inactivo) para evitar que vehículos antiguos aparezcan disponibles.
              </li>
            </ol>
            <p className="text-xs text-[#94a3b8]">
              Estos datos alimentan al escáner de QR para bloquear el acceso cuando el vehículo no coincide.
            </p>
            <button
              type="button"
              onClick={() => handleNavigate('/dashboard/vehicles?view=register')}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-[#00594e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2"
            >
              Abrir registro de vehículos
            </button>
          </article>
          <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[#0f172a]">Pendientes por asociar</h3>
            <p className="text-sm text-[#64748b]">
              Registros abiertos sin vehículo asignado. Revísalos y actualiza antes de cerrar la jornada.
            </p>
            <div className="rounded-lg border border-dashed border-[#00594e]/40 bg-[#00594e]/5 p-4 text-sm text-[#0f172a]">
              {vehicleUsageSummary.missing
                ? `${formatCount(vehicleUsageSummary.missing)} ingresos requieren asignación de vehículo.`
                : 'Todos los ingresos recientes cuentan con vehículo definido.'}
            </div>
            <p className="text-xs text-[#94a3b8]">
              Cuando confirmes la salida desde el escáner, verifica que la placa corresponda al activo registrado.
            </p>
          </article>
        </section>

        <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <section id="records-history" className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Control de accesos</h2>
                <p className="text-sm text-[#64748b]">Entradas y salidas en tiempo real</p>
              </div>
              <div className="text-right">
                <span className="block text-xs font-medium uppercase tracking-wider text-[#94a3b8]">Vista resumida</span>
                <button
                  type="button"
                  onClick={() => handleNavigate('/dashboard/records/history')}
                  className="mt-1 inline-flex items-center gap-2 rounded-full border border-[#00594e]/40 px-3 py-1 text-xs font-semibold text-[#00594e] transition hover:bg-[#00594e]/10"
                >
                  Ver historial
                </button>
              </div>
            </header>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Persona</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Identificacion</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Hora</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Puesto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm text-[#334155]">
                  {accessFeedItems.length > 0 ? (
                    accessFeedItems.map((item) => (
                      <tr key={item.key}>
                        <td className="px-6 py-4 font-semibold">{item.name}</td>
                        <td className="px-6 py-4 text-[#64748b]">{item.id}</td>
                        <td className="px-6 py-4">{item.time}</td>
                        <td className="px-6 py-4">{item.gate}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-[#00594e]/10 px-2.5 py-1 text-xs font-semibold text-[#00594e]">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-xs text-[#64748b]">
                        No hay movimientos registrados recientemente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <article className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#0f172a]">Duración de permanencia</h2>
              <p className="text-sm text-[#64748b]">Sesiones con entrada y salida registradas</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Promedio</p>
                <p className="mt-2 text-2xl font-semibold text-[#0f172a]">{sessionDurationSummary.average}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Mediana</p>
                <p className="mt-2 text-2xl font-semibold text-[#0f172a]">{sessionDurationSummary.median}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Sesiones</p>
                <p className="mt-2 text-2xl font-semibold text-[#0f172a]">
                  {sessionDurationSummary.count.toLocaleString('es-CO')}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#475569]">
              Los calculos solo consideran registros con tiempo total determinado.
            </p>
          </article>

          <article id="visitors-frequent" className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Visitantes frecuentes (30 dias)</h2>
                <p className="text-sm text-[#64748b]">Usuarios con mayor numero de ingresos recientes</p>
              </div>
            </header>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">
                      Documento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">
                      Ingresos
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm text-[#334155]">
                  {topVisitorsData.length > 0 ? (
                    topVisitorsData.map((row) => (
                      <tr key={row.name + row.cedula}>
                        <td className="px-6 py-4 font-semibold">{row.name}</td>
                        <td className="px-6 py-4 text-[#64748b]">{row.cedula}</td>
                        <td className="px-6 py-4 text-[#0f172a]">{row.count.toLocaleString('es-CO')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-xs text-[#64748b]">
                        No se registraron ingresos en el periodo analizado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <section id="user-register" className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Registrar usuario</h2>
                <p className="text-sm text-[#64748b]">Controla las nuevas altas antes de que ingresen a campus.</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0f172a]/60">Directorio</span>
            </div>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-center">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Nuevos 7 dias</dt>
                <dd className="mt-2 text-2xl font-semibold text-[#0f172a]">{formatCount(newUsersLastWeek)}</dd>
                <p className="mt-1 text-xs text-[#475569]">Altas recientes</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-center">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Activos</dt>
                <dd className="mt-2 text-2xl font-semibold text-[#0f172a]">{formatCount(activeUsersCount)}</dd>
                <p className="mt-1 text-xs text-[#475569]">Con acceso inmediato</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-center">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Inactivos</dt>
                <dd className="mt-2 text-2xl font-semibold text-[#0f172a]">{formatCount(inactiveUsersCount)}</dd>
                <p className="mt-1 text-xs text-[#475569]">Requieren aprobacion</p>
              </div>
            </dl>
            <p className="text-sm text-[#475569]">
              Mantén actualizada la información básica para generar credenciales y tickets temporales. Si un visitante se
              vuelve recurrente, crea su registro definitivo desde este módulo.
            </p>
            <button
              type="button"
              onClick={() => handleNavigate('/dashboard/staff/register')}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-[#00594e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2"
            >
              Abrir registro de usuarios
            </button>
          </article>
          <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[#0f172a]">Checklist de alta</h3>
            <ul className="space-y-3 text-sm text-[#475569]">
              <li className="flex items-start gap-3">
                <span className="mt-[5px] inline-flex h-2 w-2 flex-none rounded-full bg-[#00594e]" aria-hidden="true" />
                Verifica cedula, correo y rol academico antes de guardar.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-[5px] inline-flex h-2 w-2 flex-none rounded-full bg-[#B5A160]" aria-hidden="true" />
                Asigna el permiso correcto (Administrador, Celador, Usuario).
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-[5px] inline-flex h-2 w-2 flex-none rounded-full bg-[#0f172a]" aria-hidden="true" />
                Confirma el estado inicial como inactivo hasta validar el primer acceso.
              </li>
            </ul>
            <p className="text-xs text-[#94a3b8]">
              Los usuarios nuevos aparecen en el directorio y alimentan las estadisticas de asistencia inmediatamente.
            </p>
          </article>
        </section>

        <section id="config" className="grid gap-6 lg:grid-cols-2">
          <article className="flex h-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#0f172a]">Configuracion operativa</h2>
              <p className="text-sm text-[#64748b]">Ajusta roles, horarios y conexiones del sistema.</p>
            </div>
            <ul className="space-y-4 text-sm text-[#475569]">
              {configShortcutsData.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#00594e]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">{item.title}</p>
                    <p className="text-xs text-[#64748b]">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-auto text-xs font-medium uppercase tracking-wider text-[#94a3b8]">Los ajustes se administran desde el módulo de configuración.</p>
          </article>

          <article id="reports" className="flex h-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#0f172a]">Exportar y reportes</h2>
              <p className="text-sm text-[#64748b]">Descarga datos para auditoría y seguimiento histórico.</p>
            </div>
            <ul className="space-y-4 text-sm text-[#475569]">
              {reportOptionsData.map((item) => (
                <li key={item.label} className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">{item.label}</p>
                    <p className="text-xs text-[#64748b]">{item.description}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-[#00594e]/10 px-3 py-1 text-xs font-semibold text-[#00594e]">{item.badge}</span>
                </li>
              ))}
            </ul>
            <p className="mt-auto text-xs font-medium uppercase tracking-wider text-[#94a3b8]">Descarga los reportes desde el módulo correspondiente.</p>
          </article>
        </section>
      </div>
    </div>
  )
}

export default Content






