import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../services/apiClient';
import UserStatsCharts from '../../../shared/components/UserStatsCharts';
import useAuth from '../../auth/hooks/useAuth';

const areaTiles = [
  {
    id: 'overview',
    icon: '🏠',
    title: 'Inicio / Dashboard',
    description: 'Resumen operativo general con indicadores clave y graficos del dia.',
    items: ['Vista general con KPIs', 'Graficos principales'],
    action: 'Ver resumen'
  },
  {
    id: 'users',
    icon: '👥',
    title: 'Usuarios',
    description: 'Administra perfiles y monitorea su estado de acceso.',
    items: ['Listado de usuarios por rol', 'Filtros por tipo y estado', 'Detalle de actividad individual'],
    action: 'Gestionar usuarios'
  },
  {
    id: 'analytics',
    icon: '📊',
    title: 'Estadisticas',
    description: 'Analiza el comportamiento de asistencia y tendencias.',
    items: ['Reportes diarios, semanales y mensuales', 'Comparativa por facultad o programa', 'Tendencias de acceso'],
    action: 'Abrir estadisticas'
  },
  {
    id: 'access',
    icon: '🚪',
    title: 'Control de accesos',
    description: 'Seguimiento en tiempo real de entradas y salidas.',
    items: ['Eventos en vivo', 'Log historico detallado', 'Intentos fallidos o denegados'],
    action: 'Ver accesos'
  },
  {
    id: 'faculties',
    icon: '🏫',
    title: 'Facultades / programas',
    description: 'Visualiza la distribucion academica y asistencia.',
    items: ['Resumen por facultad', 'Participacion por carrera', 'Ranking de asistencia'],
    action: 'Explorar programas'
  },
  {
    id: 'alerts',
    icon: '🔔',
    title: 'Alertas y notificaciones',
    description: 'Gestiona eventos inusuales y avisos de seguridad.',
    items: ['Accesos fuera de horario', 'Movimientos inusuales', 'Alertas de seguridad'],
    action: 'Revisar alertas'
  },
  {
    id: 'config',
    icon: '⚙️',
    title: 'Configuracion',
    description: 'Ajusta la operacion segun politicas de seguridad.',
    items: ['Roles y permisos', 'Parametros de horario y puntos', 'Integraciones con otros sistemas'],
    action: 'Abrir configuracion'
  },
  {
    id: 'reports',
    icon: '📥',
    title: 'Exportar / reportes',
    description: 'Descarga informacion consolidada para auditorias.',
    items: ['Reportes PDF y Excel', 'Estadisticas historicas', 'Resumenes de control de acceso'],
    action: 'Generar reportes'
  }
]

const Content = () => {
  const { token } = useAuth();
  const [usersSnapshot, setUsersSnapshot] = useState([]);
  const [usersSnapshotLoading, setUsersSnapshotLoading] = useState(false);
  const [usersSnapshotError, setUsersSnapshotError] = useState('');
  const [entriesToday, setEntriesToday] = useState(0);
  const [entryStatsLoading, setEntryStatsLoading] = useState(false);
  const [entryStatsError, setEntryStatsError] = useState('');
  const [entryRecords, setEntryRecords] = useState([]);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const fetchUsersSnapshot = async () => {
      try {
        if (isMounted) {
          setUsersSnapshotLoading(true);
          setUsersSnapshotError('');
        }

        const response = await apiRequest('/users', { token });
        const data = Array.isArray(response) ? response : response?.data || [];

        if (isMounted) {
          setUsersSnapshot(data);
        }
      } catch (error) {
        if (isMounted) {
          setUsersSnapshot([]);
          setUsersSnapshotError(error.message || 'No fue posible cargar los usuarios.');
        }
      } finally {
        if (isMounted) {
          setUsersSnapshotLoading(false);
        }
      }
    };

    fetchUsersSnapshot();

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

        const response = await apiRequest('/exitEntry', { token });
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

  const updatedAt = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit'
  })

  const activeUsersCount = usersSnapshot.reduce((count, user) => {
    return (user?.estado || '').toLowerCase() === 'activo' ? count + 1 : count;
  }, 0);

  const inactiveUsersCount = usersSnapshot.reduce((count, user) => {
    return (user?.estado || '').toLowerCase() === 'inactivo' ? count + 1 : count;
  }, 0);

  const totalUsersCount = usersSnapshot.length;

  const formatMetricValue = (value, loading, error) => {
    if (loading) return '...';
    if (error) return '--';
    return value.toLocaleString('es-CO');
  };

  const overviewStats = [
    {
      label: 'Ingresos hoy',
      value: formatMetricValue(entriesToday, entryStatsLoading, entryStatsError),
      detail: entryStatsError || 'Personas registradas el dia de hoy.',
      isError: Boolean(entryStatsError),
    },
    {
      label: 'Usuarios activos',
      value: formatMetricValue(activeUsersCount, usersSnapshotLoading, usersSnapshotError),
      detail: usersSnapshotError || 'Personas con estado activo en el sistema.',
      isError: Boolean(usersSnapshotError),
    },
    {
      label: 'Usuarios inactivos',
      value: formatMetricValue(inactiveUsersCount, usersSnapshotLoading, usersSnapshotError),
      detail: usersSnapshotError || 'Personas con estado inactivo o pendientes por reactivar.',
      isError: Boolean(usersSnapshotError),
    },
    {
      label: 'Total usuarios',
      value: formatMetricValue(totalUsersCount, usersSnapshotLoading, usersSnapshotError),
      detail: usersSnapshotError || 'Conteo total de registros en el directorio.',
      isError: Boolean(usersSnapshotError),
    },
  ];

  const formatPercentage = (value) => {
    if (!Number.isFinite(value) || value <= 0) return '0%';
    if (value >= 99.5) return '100%';
    if (value < 1) return '<1%';
    if (value < 10) return `${value.toFixed(1)}%`;
    return `${Math.round(value)}%`;
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
    if (!usersSnapshot.length) {
      return [
        {
          faculty: 'Sin datos',
          distribution: '0%',
          trend: 'Activos 0%',
          status: 'Sin registros disponibles',
        },
      ];
    }

    const facultyMap = new Map();

    usersSnapshot.forEach((user) => {
      const labelRaw = String(user?.facultad || 'Sin facultad').trim();
      const normalized = labelRaw.toLowerCase();
      if (!facultyMap.has(normalized)) {
        facultyMap.set(normalized, {
          faculty: labelRaw || 'Sin facultad',
          total: 0,
          active: 0,
        });
      }
      const entry = facultyMap.get(normalized);
      entry.total += 1;
      if ((user?.estado || '').toLowerCase() === 'activo') {
        entry.active += 1;
      }
    });

    return Array.from(facultyMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)
      .map((item) => {
        const distribution = totalUsersCount ? formatPercentage((item.total / totalUsersCount) * 100) : '0%';
        const activeRate = item.total ? (item.active / item.total) * 100 : 0;
        const status =
          activeRate >= 75 ? 'Alta asistencia' : activeRate >= 50 ? 'Estable' : 'Requiere seguimiento';

        return {
          faculty: item.faculty,
          distribution,
          trend: `Activos ${formatPercentage(activeRate)}`,
          status,
        };
      });
  }, [usersSnapshot, totalUsersCount]);

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
    if (!usersSnapshot.length) {
      return [
        { title: 'Permisos del sistema', detail: 'Sin usuarios registrados.' },
        { title: 'Estados', detail: 'Sin usuarios registrados.' },
        { title: 'Roles academicos', detail: 'Sin usuarios registrados.' },
      ];
    }

    const permissionCounts = new Map();
    const roleCounts = new Map();

    usersSnapshot.forEach((user) => {
      const permiso = (user?.permisoSistema || 'Sin permiso').trim();
      permissionCounts.set(permiso, (permissionCounts.get(permiso) || 0) + 1);

      const roleLabel = (user?.rolAcademico || 'Sin rol').trim();
      roleCounts.set(roleLabel, (roleCounts.get(roleLabel) || 0) + 1);
    });

    const formatEntries = (map) =>
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => `${label}: ${count}`)
        .join(' · ');

    const topRoles = Array.from(roleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => `${label}: ${count}`)
      .join(' · ');

    return [
      {
        title: 'Permisos del sistema',
        detail: formatEntries(permissionCounts),
      },
      {
        title: 'Estados',
        detail: `Activos: ${activeUsersCount} · Inactivos: ${inactiveUsersCount}`,
      },
      {
        title: 'Roles academicos',
        detail: topRoles || 'Sin roles registrados.',
      },
    ];
  }, [usersSnapshot, activeUsersCount, inactiveUsersCount]);

  const reportOptionsData = useMemo(() => {
    const now = new Date();
    const ranges = [
      { label: 'Ultimas 24 horas', days: 1, badge: '24h' },
      { label: 'Ultimos 7 dias', days: 7, badge: '7d' },
      { label: 'Ultimos 30 dias', days: 30, badge: '30d' },
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
    if (!usersSnapshot.length) {
      return [
        {
          segment: 'Sin registros',
          count: '0',
          status: 'Activos 0%',
        },
      ];
    }

    const roleMap = new Map();

    usersSnapshot.forEach((user) => {
      const roleLabel = (user?.rolAcademico || 'Sin rol').trim();
      const normalized = roleLabel.toLowerCase();

      if (!roleMap.has(normalized)) {
        roleMap.set(normalized, {
          segment: roleLabel,
          total: 0,
          active: 0,
        });
      }

      const entry = roleMap.get(normalized);
      entry.total += 1;
      if ((user?.estado || '').toLowerCase() === 'activo') {
        entry.active += 1;
      }
    });

    return Array.from(roleMap.values())
      .sort((a, b) => b.total - a.total)
      .map((item) => ({
        segment: item.segment,
        count: item.total.toLocaleString('es-CO'),
        status: `Activos ${formatPercentage(item.total ? (item.active / item.total) * 100 : 0)}`,
      }));
  }, [usersSnapshot]);

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

    const filtered = hours.filter((item) => item.value > 0);
    const items = (filtered.length ? filtered : hours.slice(6, 20)).map((item) => ({
      ...item,
      tooltip: `${item.label}: ${item.value} registro${item.value === 1 ? '' : 's'}`,
    }));

    const max = items.reduce((maxValue, item) => Math.max(maxValue, item.value), 0);

    return {
      max: Math.max(max, 1),
      items,
    };
  }, [entryRecords]);

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

  const handleScroll = (id) => {
    if (typeof window === 'undefined') return
    const section = document.getElementById(id)
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 pb-16 pt-6 transition-all sm:pt-8">
      <div className="mx-auto max-w-7xl space-y-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#00594e]">Panel del celador</p>
            <h1 className="text-3xl font-bold text-[#0f172a]">Centro de control y vigilancia</h1>
            <p className="text-sm text-[#475569]">Actualizado el {updatedAt}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded-md bg-[#00594e] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00594e]">
              Generar reporte PDF
            </button>
            <button className="rounded-md border border-[#00594e]/30 bg-white px-4 py-2 text-sm font-medium text-[#00594e] shadow-sm transition hover:bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B5A160]/60">
              Registrar incidencia
            </button>
          </div>
        </header>

        <section id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewStats.map((item) => (
            <article key={item.label} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#99a1af]">{item.label}</span>
              <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{item.value}</p>
              <p className={`mt-2 text-sm ${item.isError ? 'text-[#b91c1c]' : 'text-[#475569]'}`}>
                {item.detail}
              </p>
              <div className="absolute right-6 top-6 h-12 w-12 rounded-full bg-[#00594e]/10" />
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Accesos ultimos 7 dias</h2>
                <p className="text-sm text-[#64748b]">Comparativa diaria de registros confirmados</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                Pico: {Math.max(...lastSevenDaysTrend.items.map((item) => item.value)).toLocaleString('es-CO')}
              </span>
            </div>
            <div className="flex h-48 items-end gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
              {lastSevenDaysTrend.items.map((item) => (
                <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-36 w-full items-end overflow-hidden rounded-md bg-[#0f172a]/5">
                    <div
                      className="w-full rounded-t-md bg-[#00594e]"
                      style={{ height: `${Math.max((item.value / lastSevenDaysTrend.max) * 100, 6)}%` }}
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
                <h2 className="text-lg font-semibold text-[#0f172a]">Distribucion por hora (hoy)</h2>
                <p className="text-sm text-[#64748b]">Registro de entradas agrupadas por hora del dia</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                Total: {hourlyDistributionData.items.reduce((acc, item) => acc + item.value, 0).toLocaleString('es-CO')}
              </span>
            </div>
            <div className="overflow-x-auto">
              <div className="flex min-h-[12rem] items-end gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                {hourlyDistributionData.items.map((item) => (
                  <div key={item.label} className="flex w-12 flex-col items-center gap-2">
                    <div className="flex h-32 w-full items-end overflow-hidden rounded-md bg-[#B5A160]/10">
                      <div
                        className="w-full rounded-t-md bg-[#B5A160]"
                        style={{ height: `${Math.max((item.value / hourlyDistributionData.max) * 100, 6)}%` }}
                        title={item.tooltip}
                      />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">{item.label}</span>
                    <span className="text-[11px] text-[#0f172a]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>

        <UserStatsCharts
          className="mt-6"
          users={usersSnapshot}
          loading={usersSnapshotLoading}
          error={usersSnapshotError}
          permisoLabels={['Administrador', 'Celador', 'Usuario']}
          estadoLabels={['activo', 'inactivo']}
          title="Distribucion actual de usuarios"
          description="Datos consolidados del directorio para decisiones rapidas."
        />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0f172a]">Mapa de operaciones</h2>
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748b]">Areas clave</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {areaTiles.map((tile) => (
              <article key={tile.title} className="flex h-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">{tile.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0f172a]">{tile.title}</h3>
                    <p className="mt-1 text-sm text-[#475569]">{tile.description}</p>
                  </div>
                </div>
                <ul className="grid gap-2 text-sm text-[#475569]">
                  {tile.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-[#00594e]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => handleScroll(tile.id)}
                  className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[#00594e] transition hover:text-[#004037]"
                >
                  {tile.action}
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" />
                  </svg>
                </button>
              </article>
            ))}
          </div>
        </section>

        <section id="users" className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Usuarios habilitados</h2>
                <p className="text-sm text-[#64748b]">Resumen general de perfiles y estado de acceso</p>
              </div>
              <button className="text-sm font-semibold text-[#00594e] transition hover:text-[#004037]">Ver listado completo</button>
            </header>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Segmento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Cantidad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm text-[#334155]">
                  {userBreakdownData.map((row) => (
                    <tr key={row.segment}>
                      <td className="px-6 py-4 font-semibold">{row.segment}</td>
                      <td className="px-6 py-4">{row.count}</td>
                      <td className="px-6 py-4 text-[#00594e]">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-lg font-semibold text-[#0f172a]">Filtros rapidos</h3>
              <p className="mt-1 text-sm text-[#64748b]">Optimiza la vista de usuarios segun tipo o estado.</p>
            </div>
            <ul className="space-y-3 text-sm text-[#475569]">
              <li className="flex items-start gap-3">
                <span className="mt-[5px] inline-flex h-2 w-2 flex-none rounded-full bg-[#00594e]" aria-hidden="true" />
                Filtro por tipo: estudiantes, docentes, administrativos.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-[5px] inline-flex h-2 w-2 flex-none rounded-full bg-[#B5A160]" aria-hidden="true" />
                Filtro por estado: activo, inactivo o acceso pendiente.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-[5px] inline-flex h-2 w-2 flex-none rounded-full bg-slate-400" aria-hidden="true" />
                Consulta el detalle completo de cada usuario y su historial.
              </li>
            </ul>
            <button className="mt-auto inline-flex items-center gap-2 self-start rounded-md border border-[#00594e]/40 px-4 py-2 text-sm font-semibold text-[#00594e] transition hover:bg-[#00594e]/10">
              Configurar filtros
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h6" />
              </svg>
            </button>
          </article>
        </section>

        <section id="analytics" className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Estadisticas de asistencia</h2>
                <p className="text-sm text-[#64748b]">Seguimiento de accesos validados por periodo</p>
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-[#B5A160]">Actualizado</span>
            </header>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {attendanceSummaryData.map((item) => (
                <div key={item.period} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">{item.period}</p>
                  <p className="mt-3 text-2xl font-semibold text-[#0f172a]">{item.value}</p>
                  <p className="mt-2 text-xs text-[#475569]">{item.note}</p>
                  <p className="mt-1 text-xs font-semibold text-[#00594e]">{item.delta}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-dashed border-[#00594e]/30 bg-[#00594e]/5 p-6">
              <p className="text-sm font-semibold text-[#00594e]">Tendencia de acceso</p>
              <div className="mt-4 h-32 w-full rounded-md bg-gradient-to-r from-[#B5A160]/30 via-[#00594e]/40 to-[#0f172a]/20" />
              <p className="mt-3 text-xs text-[#475569]">Proyeccion generada con datos de los ultimos 30 dias.</p>
            </div>
          </article>

          <article id="faculties" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0f172a]">Facultades y programas</h2>
            <p className="text-sm text-[#64748b]">Distribucion de estudiantes y tendencia de asistencia</p>
            <ul className="mt-6 space-y-4">
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

        <section id="access" className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Control de accesos</h2>
                <p className="text-sm text-[#64748b]">Entradas y salidas en tiempo real</p>
              </div>
              <button className="text-sm font-semibold text-[#00594e] transition hover:text-[#004037]">Ver log completo</button>
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

          <article id="alerts" className="flex h-full flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#0f172a]">Alertas y notificaciones</h2>
              <p className="text-sm text-[#64748b]">Seguimiento de eventos relevantes</p>
            </div>
            <ul className="space-y-4 text-sm text-[#475569]">
              {alertFeedItems.length > 0 ? (
                alertFeedItems.map((alert) => (
                  <li key={alert.title} className="rounded-lg border border-[#00594e]/20 bg-[#00594e]/5 p-4">
                    <p className="text-sm font-semibold text-[#0f172a]">{alert.title}</p>
                    <p className="mt-1 text-xs text-[#475569]">{alert.context}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#00594e]">{alert.severity}</p>
                  </li>
                ))
              ) : (
                <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-[#64748b]">
                  No hay alertas activas en este momento.
                </li>
              )}
            </ul>
            <button className="mt-auto inline-flex items-center gap-2 self-start rounded-md border border-[#00594e]/40 px-4 py-2 text-sm font-semibold text-[#00594e] transition hover:bg-[#00594e]/10">
              Configurar notificaciones
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <article className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#0f172a]">Duracion de permanencia</h2>
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

          <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
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
            <button className="mt-auto inline-flex items-center gap-2 self-start rounded-md border border-[#00594e]/40 px-4 py-2 text-sm font-semibold text-[#00594e] transition hover:bg-[#00594e]/10">
              Abrir configuracion
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.983 4.084a1 1 0 011.034 0l1.286.788 1.472-.215a1 1 0 01.966.474l.77 1.333 1.36.533a1 1 0 01.622.806l.158 1.488 1.128 1.026a1 1 0 01.252 1.024l-.455 1.42.684 1.36a1 1 0 01-.124 1.053l-.96 1.143.092 1.498a1 1 0 01-.63.948l-1.396.52-.772 1.334a1 1 0 01-.964.478l-1.486-.217-1.29.792a1 1 0 01-1.034 0l-1.29-.792-1.486.217a1 1 0 01-.964-.478l-.772-1.334-1.396-.52a1 1 0 01-.63-.948l.092-1.498-.96-1.143a1 1 0 01-.124-1.053l.684-1.36-.455-1.42a1 1 0 01.252-1.024l1.128-1.026.158-1.488a1 1 0 01.622-.806l1.36-.533.77-1.333a1 1 0 01.966-.474l1.472.215 1.286-.788z" />
              </svg>
            </button>
          </article>

          <article id="reports" className="flex h-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#0f172a]">Exportar y reportes</h2>
              <p className="text-sm text-[#64748b]">Descarga datos para auditoria y seguimiento historico.</p>
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
            <button className="mt-auto inline-flex items-center gap-2 self-start rounded-md bg-[#00594e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2">
              Generar descarga
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
            </button>
          </article>
        </section>
      </div>
    </div>
  )
}

export default Content
