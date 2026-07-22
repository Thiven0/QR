import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const CHART_COLORS = ['#00594e', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#94a3b8', '#b5a160'];

const buildConicGradient = (segments = []) => {
  const total = segments.reduce((acc, segment) => acc + (segment.value || 0), 0);
  if (total <= 0) return '#e2e8f0';

  let accumulator = 0;
  const stops = segments.map((segment) => {
    const start = (accumulator / total) * 360;
    accumulator += segment.value || 0;
    const end = (accumulator / total) * 360;
    return `${segment.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${stops.join(', ')})`;
};

const ensureDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    const clone = new Date(value.getTime());
    return Number.isNaN(clone.getTime()) ? null : clone;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number);
      if (
        Number.isFinite(year) &&
        Number.isFinite(month) &&
        Number.isFinite(day)
      ) {
        const date = new Date(year, month - 1, day);
        return Number.isNaN(date.getTime()) ? null : date;
      }
      return null;
    }
  }

  const date = new Date(value);
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

const formatMinutesToHuman = (value) => {
  if (!Number.isFinite(value) || value <= 0) return '0 min';
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  if (hours <= 0) return `${minutes} min`;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

const formatPercent = (value, fractionDigits = 1) => {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(fractionDigits)}%`;
};

const formatScore = (value, fractionDigits = 2) => {
  if (!Number.isFinite(value)) return '0.00';
  return value.toFixed(fractionDigits);
};

const average = (values = []) => {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};

const median = (values = []) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const percentile = (values = [], p = 0.9) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[index];
};

const standardDeviation = (values = []) => {
  if (!values.length) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
};

const formatSignedPercent = (value, fractionDigits = 1) => {
  if (!Number.isFinite(value)) return 'Sin base';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(fractionDigits)}%`;
};

const createEmptyFaceStats = () => ({
  summary: {
    totalAttempts: 0,
    matchedAttempts: 0,
    unmatchedAttempts: 0,
    errorAttempts: 0,
    successRate: 0,
    averageScore: 0,
    averageDetectionScore: 0,
    averageComparedProfiles: 0,
  },
  dailySeries: [],
  scoreBands: [],
  topMatchedUsers: [],
  recentAttempts: [],
});

const DashboardStats = () => {
  const { token } = useAuth();

  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [visitorTickets, setVisitorTickets] = useState([]);
  const [faceStats, setFaceStats] = useState(createEmptyFaceStats);
  const [, setLoading] = useState(false);
  const [faceStatsError, setFaceStatsError] = useState('');
  const [downloadingReport, setDownloadingReport] = useState(false);

  const [dateRange, setDateRange] = useState(getDefaultRange);
  const [facultyFilter, setFacultyFilter] = useState('');
  const reportRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    let mounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);

        const [usersResponse, recordsResponse, ticketsResponse] = await Promise.all([
          apiRequest('/users?includeVisitorTicket=true', { token }),
          apiRequest('/exitEntry', { token }),
          apiRequest('/visitors/tickets', { token }),
        ]);

        if (!mounted) return;

        const usersPayload = Array.isArray(usersResponse) ? usersResponse : usersResponse?.data || [];
        const recordsPayload = Array.isArray(recordsResponse) ? recordsResponse : recordsResponse?.data || [];
        const ticketsPayload = Array.isArray(ticketsResponse) ? ticketsResponse : ticketsResponse?.data || [];

        setUsers(usersPayload);
        setRecords(recordsPayload);
        setVisitorTickets(ticketsPayload);
      } catch (err) {
        if (mounted) {
          toast.error(err.message || 'No fue posible obtener la informacion.', { id: 'statistics-load-error' });
          setUsers([]);
          setRecords([]);
          setVisitorTickets([]);
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

  useEffect(() => {
    if (!token) return;

    let mounted = true;
    const fetchFaceStats = async () => {
      try {
        setFaceStatsError('');

        const query = new URLSearchParams();
        if (dateRange.start) query.set('start', dateRange.start);
        if (dateRange.end) query.set('end', dateRange.end);
        if (facultyFilter) query.set('faculty', facultyFilter);

        const response = await apiRequest(`/face/stats?${query.toString()}`, { token });
        if (!mounted) return;

        const payload = response?.data || response || createEmptyFaceStats();
        setFaceStats({
          ...createEmptyFaceStats(),
          ...payload,
          summary: {
            ...createEmptyFaceStats().summary,
            ...(payload.summary || {}),
          },
        });
      } catch (err) {
        if (!mounted) return;
        setFaceStats(createEmptyFaceStats());
        setFaceStatsError(err.message || 'No fue posible obtener las metricas faciales.');
      }
    };

    fetchFaceStats();

    return () => {
      mounted = false;
    };
  }, [token, dateRange.start, dateRange.end, facultyFilter]);

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

  const dailyEntriesSeries = useMemo(() => {
    if (!filteredRecords.length) {
      return { max: 1, items: [] };
    }

    let windowStart = rangeStart ? new Date(rangeStart) : null;
    let windowEnd = rangeEnd ? new Date(rangeEnd) : null;

    filteredRecords.forEach((record) => {
      const date = record.fechaEntradaDate;
      if (!date) return;
      if (!windowStart || date < windowStart) windowStart = new Date(date);
      if (!windowEnd || date > windowEnd) windowEnd = new Date(date);
    });

    if (!windowStart || !windowEnd) {
      return { max: 1, items: [] };
    }

    windowStart.setHours(0, 0, 0, 0);
    windowEnd.setHours(0, 0, 0, 0);

    const countsByDay = new Map();
    filteredRecords.forEach((record) => {
      const date = record.fechaEntradaDate;
      if (!date) return;
      const day = new Date(date);
      day.setHours(0, 0, 0, 0);
      const key = day.toISOString().slice(0, 10);
      countsByDay.set(key, (countsByDay.get(key) || 0) + 1);
    });

    const items = [];
    const cursor = new Date(windowStart);
    while (cursor <= windowEnd) {
      const key = cursor.toISOString().slice(0, 10);
      const value = countsByDay.get(key) || 0;
      items.push({
        key,
        label: cursor.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
        tooltip: cursor.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }),
        value,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const max = items.reduce((acc, item) => Math.max(acc, item.value), 0);
    return {
      max: Math.max(max, 1),
      items,
    };
  }, [filteredRecords, rangeStart, rangeEnd]);

  const peakHourBars = useMemo(() => {
    if (!filteredRecords.length) {
      return { max: 1, items: [] };
    }

    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    filteredRecords.forEach((record) => {
      const date = record.fechaEntradaDate;
      if (!date) return;
      const hour = date.getHours();
      hours[hour].count += 1;
    });

    const max = hours.reduce((acc, item) => Math.max(acc, item.count), 0);
    const sortedByCount = [...hours].sort((a, b) => b.count - a.count);
    const topHours = sortedByCount.slice(0, 6);
    const hasData = topHours.some((item) => item.count > 0);
    const dataset = hasData ? topHours : hours.slice(0, 6);

    const items = dataset
      .map((item) => ({
        hour: item.hour,
        label: `${item.hour.toString().padStart(2, '0')}:00`,
        value: item.count,
      }))
      .sort((a, b) => {
        if (b.value === a.value) {
          return a.hour - b.hour;
        }
        return b.value - a.value;
      });

    return {
      max: Math.max(max, 1),
      items,
    };
  }, [filteredRecords]);

  const entriesByRole = useMemo(() => {
    if (!filteredRecords.length) {
      return { total: 0, max: 1, items: [] };
    }

    const totals = new Map();
    filteredRecords.forEach((record) => {
      const user = userMap[record.userId];
      const roleFromRecord =
        record?.rolAcademico ||
        record?.usuario?.rolAcademico ||
        record?.usuario?.rol_academico ||
        record?.user?.rolAcademico ||
        record?.user?.rol_academico;
      const role = (user?.rolAcademico || roleFromRecord || 'Sin rol academico').toString().trim() || 'Sin rol academico';
      totals.set(role, (totals.get(role) || 0) + 1);
    });

    const items = Array.from(totals.entries())
      .map(([role, count], index) => ({
        role,
        count,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);

    const max = items.reduce((acc, item) => Math.max(acc, item.count), 0);

    return {
      total: filteredRecords.length,
      max: Math.max(max, 1),
      items,
    };
  }, [filteredRecords, userMap]);

  const heatmapData = useMemo(() => {
    const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    const matrix = days.map((label) => ({
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

  const userRoleSummary = useMemo(() => {
    if (!users.length) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        activeRate: 0,
        byPermission: [],
        visitors: { total: 0, active: 0, activeRate: 0 },
        topFaculties: [],
      };
    }

    const total = users.length;
    let active = 0;
    const permissionMap = new Map();
    const facultyCounts = new Map();

    users.forEach((user) => {
      const estado = String(user?.estado || '').toLowerCase();
      const isActive = estado === 'activo';
      if (isActive) active += 1;

      const permission = user?.permisoSistema || 'Sin permiso';
      const permissionEntry = permissionMap.get(permission) || { label: permission, total: 0, active: 0 };
      permissionEntry.total += 1;
      if (isActive) permissionEntry.active += 1;
      permissionMap.set(permission, permissionEntry);

      const facultyLabel = (user?.facultad || 'Sin facultad').trim() || 'Sin facultad';
      facultyCounts.set(facultyLabel, (facultyCounts.get(facultyLabel) || 0) + 1);
    });

    const byPermission = Array.from(permissionMap.values())
      .map((entry) => ({
        ...entry,
        inactive: entry.total - entry.active,
        percentage: entry.total ? (entry.total / total) * 100 : 0,
        activeRate: entry.total ? (entry.active / entry.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const visitors = users.filter(
      (user) => String(user?.rolAcademico || '').toLowerCase() === 'visitante'
    );
    const activeVisitors = visitors.filter(
      (user) => String(user?.estado || '').toLowerCase() === 'activo'
    );

    const topFaculties = Array.from(facultyCounts.entries())
      .map(([faculty, count]) => ({ faculty, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      active,
      inactive: total - active,
      activeRate: total ? (active / total) * 100 : 0,
      byPermission,
      visitors: {
        total: visitors.length,
        active: activeVisitors.length,
        activeRate: visitors.length ? (activeVisitors.length / visitors.length) * 100 : 0,
      },
      topFaculties,
    };
  }, [users]);

  const userRegistrationTrend = useMemo(() => {
    const reference = new Date();
    reference.setHours(0, 0, 0, 0);
    const monthKeys = [];
    const monthMap = new Map();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(reference.getFullYear(), reference.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthKeys.push(key);
      monthMap.set(key, { date, value: 0 });
    }

    users.forEach((user) => {
      const createdAt = ensureDate(user?.created_at || user?.createdAt);
      if (!createdAt) return;
      createdAt.setHours(0, 0, 0, 0);
      const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
      const bucket = monthMap.get(key);
      if (bucket) {
        bucket.value += 1;
      }
    });

    const items = monthKeys.map((key) => {
      const bucket = monthMap.get(key);
      const labelDate = bucket?.date || new Date();
      return {
        label: labelDate.toLocaleDateString('es-CO', { month: 'short' }),
        tooltip: labelDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
        value: bucket?.value || 0,
      };
    });

    const max = items.reduce((acc, item) => Math.max(acc, item.value), 0);

    return {
      max: Math.max(max, 1),
      items,
    };
  }, [users]);

  const derivedVisitorTickets = useMemo(
    () =>
      users
        .map((user) => {
          const ticket = user?.visitorTicket;
          if (!ticket) return null;
          return {
            ...ticket,
            user,
            createdAt: ticket.createdAt || user.created_at || user.createdAt || null,
            userId: user._id,
          };
        })
        .filter(Boolean),
    [users]
  );

  const visitorTicketAnalytics = useMemo(() => {
    const ticketSource = visitorTickets.length ? visitorTickets : derivedVisitorTickets;
    const visitorUsers = users.filter(
      (user) => String(user?.rolAcademico || '').toLowerCase() === 'visitante'
    );
    const activeVisitorUsers = visitorUsers.filter(
      (user) => String(user?.estado || '').toLowerCase() === 'activo'
    );
    if (!ticketSource.length && !visitorUsers.length) {
      return {
        total: 0,
        active: 0,
        expired: 0,
        activeShare: 0,
        averageLifetime: '0 min',
        uniqueVisitors: 0,
        recurrentVisitors: 0,
        activeVisitorUsers: 0,
        conversionRate: 0,
        dailySeries: { max: 1, items: [] },
      };
    }

    const now = Date.now();
    let active = 0;
    let expired = 0;
    let lifetimeMinutesSum = 0;
    let lifetimeSamples = 0;

    const ticketPerUser = new Map();
    const dailyMap = new Map();

    const ticketUserIds = new Set();

    ticketSource.forEach((ticket) => {
      const userRef = ticket?.user;
      const userId =
        typeof userRef === 'string'
          ? userRef
          : userRef?._id || userRef?.id || null;

      if (userId) {
        const key = userId.toString();
        ticketUserIds.add(key);
        ticketPerUser.set(key, (ticketPerUser.get(key) || 0) + 1);
      }

      const expiresAt = ensureDate(ticket?.expiresAt);
      const createdAt = ensureDate(ticket?.createdAt);
      const isExpired =
        typeof ticket?.isExpired === 'boolean'
          ? ticket.isExpired
          : expiresAt
          ? expiresAt.getTime() <= now
          : true;

      if (isExpired) {
        expired += 1;
      } else {
        active += 1;
      }

      if (createdAt && expiresAt) {
        const diff = expiresAt.getTime() - createdAt.getTime();
        if (Number.isFinite(diff) && diff > 0) {
          lifetimeMinutesSum += diff / 60000;
          lifetimeSamples += 1;
        }
      }

      if (createdAt) {
        const key = createdAt.toISOString().slice(0, 10);
        dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
      }
    });

    const visitorsWithoutTicket = visitorUsers.filter((user) => {
      const userId = user?._id || user?.id || null;
      if (!userId) return false;
      return !ticketUserIds.has(userId.toString());
    });

    visitorsWithoutTicket.forEach((user) => {
      const userId = user?._id || user?.id || null;
      if (!userId) return;
      const key = userId.toString();
      if (!ticketPerUser.has(key)) {
        ticketPerUser.set(key, 0);
      }
    });

    expired += visitorsWithoutTicket.length;
    const total = ticketSource.length + visitorsWithoutTicket.length;

    const reference = new Date();
    reference.setHours(0, 0, 0, 0);
    const dailyItems = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(reference);
      day.setDate(reference.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      const value = dailyMap.get(key) || 0;
      dailyItems.push({
        label: day.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
        tooltip: day.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' }),
        value,
      });
    }
    const dailyMax = dailyItems.reduce((acc, item) => Math.max(acc, item.value), 0);

    const uniqueVisitors = ticketPerUser.size;
    const recurrentVisitors = Array.from(ticketPerUser.values()).filter((count) => count > 1).length;

    return {
      total,
      active,
      expired,
      activeShare: total ? (active / total) * 100 : 0,
      averageLifetime: lifetimeSamples ? formatMinutesToHuman(lifetimeMinutesSum / lifetimeSamples) : '0 min',
      uniqueVisitors,
      recurrentVisitors,
      activeVisitorUsers: activeVisitorUsers.length,
      conversionRate: uniqueVisitors ? (activeVisitorUsers.length / uniqueVisitors) * 100 : 0,
      dailySeries: {
        max: Math.max(dailyMax, 1),
        items: dailyItems,
      },
    };
  }, [visitorTickets, derivedVisitorTickets, users]);

  const userStatusDonut = useMemo(() => {
    const items = [
      {
        label: 'Activos',
        value: userRoleSummary.active,
        color: CHART_COLORS[0],
      },
      {
        label: 'Inactivos',
        value: userRoleSummary.inactive,
        color: CHART_COLORS[3],
      },
    ];
    const total = userRoleSummary.total;
    const gradient = total > 0 ? buildConicGradient(items) : '#e2e8f0';
    return {
      total,
      items,
      gradient,
    };
  }, [userRoleSummary]);

  const ticketStatusDonut = useMemo(() => {
    const items = [
      {
        label: 'Vigentes',
        value: visitorTicketAnalytics.active,
        color: CHART_COLORS[1],
      },
      {
        label: 'Expirados',
        value: visitorTicketAnalytics.expired,
        color: CHART_COLORS[3],
      },
    ];
    const total = visitorTicketAnalytics.total;
    const gradient = total > 0 ? buildConicGradient(items) : '#e2e8f0';
    return {
      total,
      items,
      gradient,
    };
  }, [visitorTicketAnalytics]);

  const adminLeaderboard = useMemo(() => {
    const adminMap = new Map();
    filteredRecords.forEach((record) => {
      const admin = record?.administrador;
      const adminId =
        typeof admin === 'string' ? admin : admin?._id || admin?.id || null;
      if (!adminId) return;
      const entry = adminMap.get(adminId) || { admin, adminId, count: 0 };
      entry.count += 1;
      entry.admin = admin;
      adminMap.set(adminId, entry);
    });

    return Array.from(adminMap.values())
      .map((entry) => {
        const admin = entry.admin;
        const fullName = admin
          ? `${admin.nombre || ''} ${admin.apellido || ''}`.trim() || admin.email || 'Sin asignar'
          : 'Sin asignar';
        return {
          id: entry.adminId,
          name: fullName,
          email: admin?.email || '',
          count: entry.count,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  const topAdminSeries = useMemo(() => {
    if (!adminLeaderboard.length) {
      return { max: 1, items: [] };
    }
    const items = adminLeaderboard.slice(0, 5);
    const max = items.reduce((acc, admin) => Math.max(acc, admin.count), 0);
    return {
      max: Math.max(max, 1),
      items,
    };
  }, [adminLeaderboard]);

  const openSessions = useMemo(() => {
    return normalizedRecords
      .filter((record) => !ensureDate(record?.fechaSalida))
      .map((record) => {
        const user = userMap[record.userId];
        const admin = record?.administrador;
        const startedAt = record.fechaEntradaDate || ensureDate(record?.fechaEntrada);

        const userName = user
          ? `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.email || 'Sin nombre'
          : 'Sin nombre';
        const adminName = admin
          ? `${admin.nombre || ''} ${admin.apellido || ''}`.trim() || admin.email || 'Sin asignar'
          : 'Sin asignar';

        return {
          id: record._id,
          userName,
          userEstado: user?.estado || 'Sin estado',
          adminName,
          startedAt,
          horaEntrada: record?.horaEntrada,
        };
      })
      .sort((a, b) => {
        const aTime = a.startedAt instanceof Date ? a.startedAt.getTime() : ensureDate(a.startedAt)?.getTime() || 0;
        const bTime = b.startedAt instanceof Date ? b.startedAt.getTime() : ensureDate(b.startedAt)?.getTime() || 0;
        return bTime - aTime;
      });
  }, [normalizedRecords, userMap]);

  const summaryCards = useMemo(
    () => [
      {
        id: 'daily',
        label: 'Hoy',
        value: summaryMetrics.daily,
        description: 'Entradas registradas en la fecha seleccionada.',
      },
      {
        id: 'weekly',
        label: 'Ultimos 7 dias',
        value: summaryMetrics.weekly,
        description: 'Total de accesos en la ultima semana.',
      },
      {
        id: 'monthly',
        label: 'Ultimos 30 dias',
        value: summaryMetrics.monthly,
        description: 'Registros en el mes movil.',
      },
      {
        id: 'active-users',
        label: 'Usuarios activos',
        value: userRoleSummary.active,
        description:
          userRoleSummary.total > 0
            ? `${formatPercent(userRoleSummary.activeRate)} de ${userRoleSummary.total.toLocaleString('es-CO')} usuarios`
            : 'Sin usuarios registrados.',
      },
      {
        id: 'active-tickets',
        label: 'Tickets vigentes',
        value: visitorTicketAnalytics.active,
        description:
          visitorTicketAnalytics.total > 0
            ? `${formatPercent(visitorTicketAnalytics.activeShare)} de ${visitorTicketAnalytics.total.toLocaleString('es-CO')} tickets`
            : 'Sin tickets registrados.',
      },
    ],
    [summaryMetrics, userRoleSummary, visitorTicketAnalytics]
  );

  const faceSummaryCards = useMemo(
    () => [
      {
        id: 'face-total',
        label: 'Intentos faciales',
        value: faceStats.summary.totalAttempts,
        description: 'Escaneos faciales procesados en el periodo filtrado.',
      },
      {
        id: 'face-success',
        label: 'Tasa de acierto',
        value: formatPercent(faceStats.summary.successRate, 1),
        description: `${faceStats.summary.matchedAttempts.toLocaleString('es-CO')} coincidencias validas`,
      },
      {
        id: 'face-score',
        label: 'Score promedio',
        value: formatScore(faceStats.summary.averageScore, 3),
        description: 'Promedio de similitud entre coincidencias aceptadas.',
      },
      {
        id: 'face-detection',
        label: 'Deteccion promedio',
        value: formatScore(faceStats.summary.averageDetectionScore, 3),
        description: `Promedio de ${faceStats.summary.averageComparedProfiles.toLocaleString('es-CO')} perfiles comparados por intento`,
      },
    ],
    [faceStats]
  );

  const faceDailySeries = useMemo(() => {
    const items = Array.isArray(faceStats.dailySeries) ? faceStats.dailySeries : [];
    const max = items.reduce((acc, item) => Math.max(acc, item.total || 0), 0);
    return {
      max: Math.max(max, 1),
      items,
    };
  }, [faceStats.dailySeries]);

  const faceScoreBands = useMemo(() => {
    const items = Array.isArray(faceStats.scoreBands) ? faceStats.scoreBands : [];
    const max = items.reduce((acc, item) => Math.max(acc, item.count || 0), 0);
    return {
      max: Math.max(max, 1),
      items,
    };
  }, [faceStats.scoreBands]);

  const previousPeriodComparison = useMemo(() => {
    if (!rangeStart || !rangeEnd) {
      return {
        current: filteredRecords.length,
        previous: 0,
        delta: filteredRecords.length,
        deltaPercent: null,
        days: 0,
      };
    }

    const currentStart = new Date(rangeStart);
    currentStart.setHours(0, 0, 0, 0);
    const currentEnd = new Date(rangeEnd);
    currentEnd.setHours(23, 59, 59, 999);

    const days = Math.max(1, Math.round((currentEnd.getTime() - currentStart.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setHours(0, 0, 0, 0);
    previousStart.setDate(previousStart.getDate() - (days - 1));

    const previous = normalizedRecords.filter((record) => {
      const withinRange = record.fechaEntradaDate >= previousStart && record.fechaEntradaDate <= previousEnd;
      const matchesFaculty = !facultyFilter || record.faculty.toLowerCase() === facultyFilter.toLowerCase();
      return withinRange && matchesFaculty;
    }).length;

    return {
      current: filteredRecords.length,
      previous,
      delta: filteredRecords.length - previous,
      deltaPercent: previous > 0 ? ((filteredRecords.length - previous) / previous) * 100 : null,
      days,
    };
  }, [filteredRecords.length, normalizedRecords, rangeStart, rangeEnd, facultyFilter]);

  const statisticalInsights = useMemo(() => {
    const dailyValues = dailyEntriesSeries.items.map((item) => item.value);
    const completedSessions = filteredRecords.filter((record) => ensureDate(record.fechaSalida)).length;
    const closedRate = filteredRecords.length ? (completedSessions / filteredRecords.length) * 100 : 0;
    const mean = average(dailyValues);
    const stdDev = standardDeviation(dailyValues);

    return {
      mean,
      median: median(dailyValues),
      p90: percentile(dailyValues, 0.9),
      stdDev,
      variationCoefficient: mean > 0 ? (stdDev / mean) * 100 : 0,
      closedRate,
      openRate: filteredRecords.length ? 100 - closedRate : 0,
      sampleDays: dailyValues.length,
    };
  }, [dailyEntriesSeries.items, filteredRecords]);

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
        min: 'Sin datos',
        max: 'Sin datos',
        p90: 'Sin datos',
        count: 0,
        total: 'Sin datos',
      };
    }

    const sum = durations.reduce((acc, value) => acc + value, 0);
    const averageMinutes = sum / durations.length;

    const sorted = [...durations].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const medianMinutes =
      sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];

    const percentileValue = (p) => {
      if (!sorted.length) return null;
      const index = Math.min(sorted.length - 1, Math.floor(((p / 100) * sorted.length) - 1e-9));
      return sorted[index];
    };

    const minMinutes = sorted[0];
    const maxMinutes = sorted[sorted.length - 1];
    const p90Minutes = percentileValue(90);

    return {
      average: formatMinutesToHuman(averageMinutes),
      median: formatMinutesToHuman(medianMinutes),
      count: durations.length,
      min: formatMinutesToHuman(minMinutes),
      max: formatMinutesToHuman(maxMinutes),
      p90: formatMinutesToHuman(p90Minutes),
      total: formatMinutesToHuman(sum),
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

  const sanitizeUnsupportedColors = (doc) => {
    const regex = /(oklab|oklch)/i;
    const root = doc.querySelector('[data-report-root]');
    if (!root) return;

    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const element = walker.currentNode;
      const styles = doc.defaultView?.getComputedStyle(element);
      if (!styles) continue;

      const backgroundImage = styles.backgroundImage;
      if (backgroundImage && regex.test(backgroundImage)) {
        element.style.backgroundImage = 'none';
        const bgColor = styles.backgroundColor;
        if (!bgColor || bgColor === 'transparent' || regex.test(bgColor)) {
          element.style.backgroundColor = '#ffffff';
        } else {
          element.style.backgroundColor = bgColor;
        }
      }

      const background = styles.background;
      if (background && regex.test(background)) {
        element.style.background = '#ffffff';
      }

      const backgroundColor = styles.backgroundColor;
      if (backgroundColor && regex.test(backgroundColor)) {
        element.style.backgroundColor = '#ffffff';
      }

      const color = styles.color;
      if (color && regex.test(color)) {
        element.style.color = '#0f172a';
      }

      const borderColor = styles.borderColor;
      if (borderColor && regex.test(borderColor)) {
        element.style.borderColor = '#e2e8f0';
      }

      const boxShadow = styles.boxShadow;
      if (boxShadow && regex.test(boxShadow)) {
        element.style.boxShadow = 'none';
      }
    }
  };

  const handleDownloadReport = async () => {
    if (downloadingReport) return;
    if (!reportRef.current) {
      toast.error('No fue posible encontrar el contenido del reporte.', { id: 'statistics-report-error' });
      return;
    }

    try {
      setDownloadingReport(true);
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        scrollY: -window.scrollY,
        onclone: (clonedDoc) => {
          sanitizeUnsupportedColors(clonedDoc);
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const dateLabel = new Date().toISOString().slice(0, 10);
      pdf.save(`reporte-estadisticas-${dateLabel}.pdf`);
      toast.success('Reporte PDF generado correctamente.');
    } catch (err) {
      toast.error(err.message || 'No fue posible generar el PDF.', { id: 'statistics-report-error' });
    } finally {
      setDownloadingReport(false);
    }
  };

  const totalFiltered = filteredRecords.length;

  return (
    <section ref={reportRef} data-report-root className="min-h-screen bg-[#f8fafc] px-4 pb-16 pt-6 sm:pt-8">
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
              onClick={handleDownloadReport}
              disabled={downloadingReport}
              className="inline-flex items-center gap-2 rounded-md bg-[#00594e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {downloadingReport ? 'Generando...' : 'Descargar reporte'}
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
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {summaryCards.map((card) => (
            <div key={card.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#64748b]">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold text-[#0f172a]">
                {typeof card.value === 'number' ? card.value.toLocaleString('es-CO') : card.value}
              </p>
              <p className="mt-1 text-xs text-[#475569]">{card.description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00594e]">Indicadores estadisticos</p>
              <h2 className="mt-2 text-2xl font-bold text-[#0f172a]">Lectura analitica del periodo</h2>
              <p className="mt-2 text-sm text-[#64748b]">
                Resume dispersion, comportamiento diario y comparacion contra el periodo inmediatamente anterior.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[#475569]">
              <span className="font-semibold text-[#0f172a]">Periodo previo comparable:</span>{' '}
              {previousPeriodComparison.days.toLocaleString('es-CO')} dias,{' '}
              {previousPeriodComparison.previous.toLocaleString('es-CO')} accesos
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#64748b]">Variacion vs previo</p>
              <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{formatSignedPercent(previousPeriodComparison.deltaPercent, 1)}</p>
              <p className="mt-1 text-xs text-[#475569]">
                Delta absoluto: {previousPeriodComparison.delta >= 0 ? '+' : ''}
                {previousPeriodComparison.delta.toLocaleString('es-CO')} accesos.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#64748b]">Promedio diario</p>
              <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{formatScore(statisticalInsights.mean, 1)}</p>
              <p className="mt-1 text-xs text-[#475569]">Media de accesos por dia dentro del rango filtrado.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#64748b]">Mediana diaria</p>
              <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{formatScore(statisticalInsights.median, 1)}</p>
              <p className="mt-1 text-xs text-[#475569]">Mitad de los dias queda por debajo y mitad por encima de este valor.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#64748b]">Desviacion estandar</p>
              <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{formatScore(statisticalInsights.stdDev, 1)}</p>
              <p className="mt-1 text-xs text-[#475569]">Cuanto se dispersan los accesos diarios respecto a la media.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#64748b]">Percentil 90 diario</p>
              <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{formatScore(statisticalInsights.p90, 1)}</p>
              <p className="mt-1 text-xs text-[#475569]">Solo el 10% de los dias supera este nivel de accesos.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#64748b]">Tasa de cierre</p>
              <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{formatPercent(statisticalInsights.closedRate, 1)}</p>
              <p className="mt-1 text-xs text-[#475569]">
                Sesiones con salida registrada. Variabilidad: {formatPercent(statisticalInsights.variationCoefficient, 1)}.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0f766e]">Reconocimiento facial</p>
              <h2 className="mt-2 text-2xl font-bold text-[#0f172a]">Reporte de escaneo facial</h2>
              <p className="mt-2 text-sm text-[#64748b]">
                Consolida intentos, aciertos, errores de procesamiento y usuarios reconocidos por rostro.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[#475569]">
              Coincidencias: <span className="font-semibold text-[#0f172a]">{faceStats.summary.matchedAttempts.toLocaleString('es-CO')}</span>
              {' '}de{' '}
              <span className="font-semibold text-[#0f172a]">{faceStats.summary.totalAttempts.toLocaleString('es-CO')}</span>
            </div>
          </div>

          {faceStatsError && <p className="mt-4 text-sm font-semibold text-[#b91c1c]">{faceStatsError}</p>}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {faceSummaryCards.map((card) => (
              <div key={card.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#64748b]">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{card.value}</p>
                <p className="mt-1 text-xs text-[#475569]">{card.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="min-w-0 rounded-xl border border-slate-200 p-5">
              <header>
                <h3 className="text-lg font-semibold text-[#0f172a]">Evolucion diaria</h3>
                <p className="text-sm text-[#64748b]">Intentos diarios con desglose visual entre volumen y coincidencias.</p>
              </header>
              <div className="mt-5 w-full overflow-x-auto rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                <div className="flex min-h-[15rem] min-w-max items-end gap-3">
                {faceDailySeries.items.length ? (
                  faceDailySeries.items.map((item) => {
                    const totalHeight = Math.max(((item.total || 0) / faceDailySeries.max) * 100, item.total ? 8 : 0);
                    const matchedHeight = item.total
                      ? Math.max(((item.matched || 0) / (item.total || 1)) * totalHeight, item.matched ? 8 : 0)
                      : 0;

                    return (
                      <div key={item.date} className="flex w-12 shrink-0 flex-col items-center gap-2">
                        <div className="flex h-40 w-full items-end overflow-hidden rounded-md bg-slate-200/70">
                          <div
                            className="relative w-full rounded-t-md bg-[#cbd5e1]"
                            style={{ height: `${totalHeight}%` }}
                            title={`${item.label}: ${item.total} intentos, ${item.matched} coincidencias, ${item.error} errores`}
                          >
                            <div
                              className="absolute bottom-0 w-full rounded-t-md bg-[#0f766e]"
                              style={{ height: `${matchedHeight}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#64748b]">{item.label}</span>
                        <span className="text-xs text-[#0f172a]">{item.total.toLocaleString('es-CO')}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex w-full min-w-[16rem] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-[#64748b]">
                    Aun no hay intentos faciales en el periodo seleccionado.
                  </div>
                )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#475569]">
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#0f766e]" />Coincidencias</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#cbd5e1]" />Intentos totales</span>
                <span className="inline-flex items-center gap-2"><span className="font-semibold text-[#0f172a]">Sin match:</span> {faceStats.summary.unmatchedAttempts.toLocaleString('es-CO')}</span>
                <span className="inline-flex items-center gap-2"><span className="font-semibold text-[#0f172a]">Errores:</span> {faceStats.summary.errorAttempts.toLocaleString('es-CO')}</span>
              </div>
            </article>

            <article className="min-w-0 rounded-xl border border-slate-200 p-5">
              <header>
                <h3 className="text-lg font-semibold text-[#0f172a]">Distribucion de scores</h3>
                <p className="text-sm text-[#64748b]">Frecuencia de similitudes observadas durante los escaneos.</p>
              </header>
              <div className="mt-5 space-y-3">
                {faceScoreBands.items.length ? (
                  faceScoreBands.items.map((band) => (
                    <div key={band.label}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-semibold text-[#0f172a]">{band.label}</span>
                        <span className="text-[#475569]">{band.count.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#0ea5e9]"
                          style={{ width: `${Math.max(((band.count || 0) / faceScoreBands.max) * 100, band.count ? 8 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-[#64748b]">
                    No hay suficientes scores para construir la distribucion.
                  </div>
                )}
              </div>
            </article>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-xl border border-slate-200 p-5">
              <header>
                <h3 className="text-lg font-semibold text-[#0f172a]">Usuarios mas reconocidos</h3>
                <p className="text-sm text-[#64748b]">Ranking de coincidencias faciales exitosas dentro del periodo.</p>
              </header>
              <div className="mt-4 space-y-3">
                {faceStats.topMatchedUsers.length ? (
                  faceStats.topMatchedUsers.map((user, index) => (
                    <div key={user.userId} className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#0f172a]">{index + 1}. {user.nombre}</p>
                          <p className="text-xs text-[#64748b]">{user.facultad}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold text-[#0f766e]">{user.count.toLocaleString('es-CO')} matches</p>
                          <p className="text-xs text-[#64748b]">Score prom. {formatScore(user.averageScore, 3)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-[#64748b]">
                    No hay coincidencias faciales registradas para este filtro.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 p-5">
              <header>
                <h3 className="text-lg font-semibold text-[#0f172a]">Intentos recientes</h3>
                <p className="text-sm text-[#64748b]">Ultimos eventos faciales con operador, estado y confianza.</p>
              </header>
              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm text-[#334155]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Resultado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Usuario</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Operador</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#64748b]">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {faceStats.recentAttempts.length ? (
                      faceStats.recentAttempts.map((attempt) => (
                        <tr key={attempt.id}>
                          <td className="px-4 py-3 text-xs text-[#475569]">
                            {new Date(attempt.createdAt).toLocaleString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={[
                                'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                attempt.status === 'matched'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : attempt.status === 'unmatched'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-rose-100 text-rose-700',
                              ].join(' ')}
                            >
                              {attempt.status === 'matched'
                                ? 'Coincidencia'
                                : attempt.status === 'unmatched'
                                  ? 'Sin match'
                                  : 'Error'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-[#0f172a]">{attempt.matchedUser?.nombre || 'Sin coincidencia'}</p>
                            <p className="text-xs text-[#64748b]">
                              {attempt.errorMessage || attempt.matchedUser?.facultad || 'Sin detalle adicional'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#475569]">
                            {attempt.actor?.nombre || 'Sistema'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[#0f172a]">
                            {attempt.score !== null ? formatScore(attempt.score, 3) : '--'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-[#64748b]">
                          No hay intentos recientes para mostrar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="flex flex-col items-center gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="w-full">
              <h2 className="text-lg font-semibold text-[#0f172a]">Usuarios por estado</h2>
              <p className="text-sm text-[#64748b]">Distribucion entre perfiles activos e inactivos.</p>
            </header>
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-32 w-32">
                <div
                  className="h-full w-full rounded-full"
                  style={{
                    background: userStatusDonut.gradient.startsWith('conic-gradient')
                      ? userStatusDonut.gradient
                      : undefined,
                    backgroundColor: userStatusDonut.gradient.startsWith('conic-gradient')
                      ? undefined
                      : userStatusDonut.gradient,
                  }}
                />
                <div className="absolute inset-5 flex items-center justify-center rounded-full bg-white text-center">
                  <div>
                    <p className="text-xs text-[#94a3b8]">Usuarios</p>
                    <p className="text-lg font-semibold text-[#0f172a]">
                      {userStatusDonut.total.toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <ul className="w-full space-y-2 text-sm text-[#475569]">
              {userStatusDonut.items.some((item) => item.value > 0) ? (
                userStatusDonut.items.map((item) => (
                  <li key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2">
                    <span className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold text-[#0f172a]">{item.label}</span>
                    </span>
                    <span>{item.value.toLocaleString('es-CO')}</span>
                  </li>
                ))
              ) : (
                <li className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-center text-sm text-[#64748b]">
                  Registra usuarios para ver el reparto por estado.
                </li>
              )}
            </ul>
          </article>
          <article className="flex flex-col items-center gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="w-full">
              <h2 className="text-lg font-semibold text-[#0f172a]">Tickets vigentes vs expirados</h2>
              <p className="text-sm text-[#64748b]">Comparativa del estado de los tickets de visitantes.</p>
            </header>
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-32 w-32">
                <div
                  className="h-full w-full rounded-full"
                  style={{
                    background: ticketStatusDonut.gradient.startsWith('conic-gradient')
                      ? ticketStatusDonut.gradient
                      : undefined,
                    backgroundColor: ticketStatusDonut.gradient.startsWith('conic-gradient')
                      ? undefined
                      : ticketStatusDonut.gradient,
                  }}
                />
                <div className="absolute inset-5 flex items-center justify-center rounded-full bg-white text-center">
                  <div>
                    <p className="text-xs text-[#94a3b8]">Tickets</p>
                    <p className="text-lg font-semibold text-[#0f172a]">
                      {visitorTicketAnalytics.total.toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <ul className="w-full space-y-2 text-sm text-[#475569]">
              {ticketStatusDonut.items.some((item) => item.value > 0) ? (
                ticketStatusDonut.items.map((item) => (
                  <li key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2">
                    <span className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold text-[#0f172a]">{item.label}</span>
                    </span>
                    <span>{item.value.toLocaleString('es-CO')}</span>
                  </li>
                ))
              ) : (
                <li className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-center text-sm text-[#64748b]">
                  Todavia no existen tickets generados para este reporte.
                </li>
              )}
            </ul>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="flex min-w-0 flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header>
              <h2 className="text-lg font-semibold text-[#0f172a]">Entradas por día</h2>
              <p className="text-sm text-[#64748b]">Registros diarios dentro del rango seleccionado.</p>
            </header>
            {dailyEntriesSeries.items.length > 0 ? (
              <div className="-mx-2 overflow-x-auto px-2">
                <div className="flex items-end gap-2">
                  {dailyEntriesSeries.items.map((item) => (
                    <div key={item.key} className="flex min-w-[2.2rem] flex-shrink-0 flex-col items-center gap-2">
                      <div className="flex h-48 w-full items-end overflow-hidden rounded-md bg-slate-100">
                        <div
                          className="w-full rounded-t-md bg-[#00594e]"
                          style={{
                            height: `${Math.max(
                              (item.value / dailyEntriesSeries.max) * 100,
                              item.value > 0 ? 6 : 0
                            )}%`,
                          }}
                          title={`${item.tooltip}: ${item.value.toLocaleString('es-CO')} entradas`}
                        />
                      </div>
                      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#64748b]">
                        {item.label}
                      </span>
                      <span className="text-xs text-[#0f172a]">{item.value.toLocaleString('es-CO')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#64748b]">
                No hay registros suficientes en el periodo filtrado para mostrar la tendencia diaria.
              </p>
            )}
          </article>
          <article className="flex min-w-0 flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header>
              <h2 className="text-lg font-semibold text-[#0f172a]">Hora pico</h2>
              <p className="text-sm text-[#64748b]">Franjas con mayor volumen de entradas registradas.</p>
            </header>
            {peakHourBars.items.length > 0 ? (
              <div className="space-y-4">
                {peakHourBars.items.map((item) => (
                  <div key={item.hour} className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-semibold text-[#0f172a]">
                      <span>{item.label}</span>
                      <span>{item.value.toLocaleString('es-CO')} registros</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#f2c66d]"
                        style={{
                          width: `${Math.max(
                            (item.value / peakHourBars.max) * 100,
                            item.value > 0 ? 10 : 0
                          )}%`,
                        }}
                        title={`${item.label}: ${item.value.toLocaleString('es-CO')} registros`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#64748b]">
                Aún no se registran accesos para calcular las horas de mayor demanda.
              </p>
            )}
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header>
              <h2 className="text-lg font-semibold text-[#0f172a]">Entradas por rol académico</h2>
              <p className="text-sm text-[#64748b]">
                Distribucion de accesos segun el rol academico del usuario ({entriesByRole.total.toLocaleString('es-CO')} registros).
              </p>
            </header>
            {entriesByRole.items.length > 0 ? (
              <div className="space-y-4">
                {entriesByRole.items.map((item) => (
                  <div key={item.role} className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-semibold text-[#0f172a]">
                      <span>{item.role}</span>
                      <span>{item.count.toLocaleString('es-CO')} entradas</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(
                            (item.count / entriesByRole.max) * 100,
                            item.count > 0 ? 12 : 0
                          )}%`,
                          backgroundColor: item.color,
                        }}
                        title={`${item.role}: ${item.count.toLocaleString('es-CO')} registros`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#64748b]">
                Filtra por un rango con datos para visualizar la distribucion de entradas por rol academico.
              </p>
            )}
          </article>
          <article className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header>
              <h2 className="text-lg font-semibold text-[#0f172a]">Top operadores de registro</h2>
              <p className="text-sm text-[#64748b]">
                Administradores asociados a registros durante el periodo seleccionado.
              </p>
            </header>
            {topAdminSeries.items.length > 0 ? (
              <div className="space-y-4">
                {topAdminSeries.items.map((admin, index) => (
                  <div key={admin.id || admin.email || index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-semibold text-[#0f172a]">
                      <span>
                        <span className="mr-2 rounded-full bg-[#00594e]/10 px-2 py-0.5 text-xs font-semibold text-[#00594e]">
                          #{index + 1}
                        </span>
                        {admin.name}
                      </span>
                      <span>{admin.count.toLocaleString('es-CO')} accesos</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#00594e]"
                        style={{
                          width: `${Math.max(
                            (admin.count / topAdminSeries.max) * 100,
                            admin.count > 0 ? 12 : 0
                          )}%`,
                        }}
                        title={`${admin.name}: ${admin.count.toLocaleString('es-CO')} accesos`}
                      />
                    </div>
                    {admin.email && (
                      <p className="text-xs text-[#64748b]">Contacto: {admin.email}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#64748b]">
                No hay actividad registrada para administradores en este periodo.
              </p>
            )}
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header>
              <h2 className="text-lg font-semibold text-[#0f172a]">Distribucion de roles</h2>
              <p className="text-sm text-[#64748b]">
                Total de usuarios registrados: {userRoleSummary.total.toLocaleString('es-CO')} (
                {formatPercent(userRoleSummary.activeRate)} activos)
              </p>
            </header>
            <div className="space-y-4">
              {userRoleSummary.byPermission.length > 0 ? (
                userRoleSummary.byPermission.map((role) => (
                  <div key={role.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-semibold text-[#0f172a]">
                      <span>{role.label}</span>
                      <span>
                        {role.total.toLocaleString('es-CO')} ({formatPercent(role.percentage)})
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#00594e]"
                        style={{
                          width: `${Math.max(role.percentage, role.percentage > 0 ? 4 : 0)}%`,
                        }}
                        title={`Activos: ${role.active.toLocaleString('es-CO')} (${formatPercent(role.activeRate)})`}
                      />
                    </div>
                    <p className="text-xs text-[#64748b]">
                      Activos: {role.active.toLocaleString('es-CO')} • Inactivos: {role.inactive.toLocaleString('es-CO')} •{' '}
                      Tasa de actividad: {formatPercent(role.activeRate)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#64748b]">No hay usuarios suficientes para mostrar la distribucion.</p>
              )}
            </div>
            <footer className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-[#475569]">
              <span className="font-semibold text-[#0f172a]">Visitantes activos:</span>{' '}
              {userRoleSummary.visitors.active.toLocaleString('es-CO')} de{' '}
              {userRoleSummary.visitors.total.toLocaleString('es-CO')} ({formatPercent(userRoleSummary.visitors.activeRate)})
            </footer>
          </article>

          <article className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Altas de usuarios (12 meses)</h2>
                <p className="text-sm text-[#64748b]">Tendencia de registros nuevos por mes.</p>
              </div>
            </header>
            <div className="flex items-end gap-3 overflow-x-auto">
              {userRegistrationTrend.items.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex min-w-[2.5rem] flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end overflow-hidden rounded-md bg-slate-100">
                    <div
                      className="w-full rounded-t-md bg-[#00594e]"
                      style={{
                        height: `${Math.max(
                          (item.value / userRegistrationTrend.max) * 100,
                          item.value > 0 ? 6 : 0
                        )}%`,
                      }}
                      title={`${item.tooltip}: ${item.value.toLocaleString('es-CO')} usuarios`}
                    />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">{item.label}</span>
                  <span className="text-xs text-[#0f172a]">{item.value.toLocaleString('es-CO')}</span>
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">Facultades destacadas</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#475569]">
                {userRoleSummary.topFaculties.length > 0 ? (
                  userRoleSummary.topFaculties.map((row) => (
                    <li
                      key={row.faculty}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2"
                    >
                      <span className="font-semibold text-[#0f172a]">{row.faculty}</span>
                      <span>{row.count.toLocaleString('es-CO')} usuarios</span>
                    </li>
                  ))
                ) : (
                  <li className="rounded-lg border border-slate-200 px-4 py-2 text-xs text-[#94a3b8]">
                    No hay facultades registradas.
                  </li>
                )}
              </ul>
            </div>
          </article>
        </section>

        <section className="grid gap-6">
          <article className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header>
              <h2 className="text-lg font-semibold text-[#0f172a]">Tickets de visitantes</h2>
              <p className="text-sm text-[#64748b]">
                {visitorTicketAnalytics.total.toLocaleString('es-CO')} tickets generados - Conversion:{' '}
                {formatPercent(visitorTicketAnalytics.conversionRate)}
              </p>
            </header>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#64748b]">Activos</p>
                <p className="mt-2 text-2xl font-semibold text-[#0f172a]">
                  {visitorTicketAnalytics.active.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-[#475569]">{formatPercent(visitorTicketAnalytics.activeShare)} vigentes</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#64748b]">Expirados</p>
                <p className="mt-2 text-2xl font-semibold text-[#0f172a]">
                  {visitorTicketAnalytics.expired.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-[#475569]">
                  Recurrentes: {visitorTicketAnalytics.recurrentVisitors.toLocaleString('es-CO')}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-[#475569]">
              <p>
                <span className="font-semibold text-[#0f172a]">Promedio de vigencia:</span>{' '}
                {visitorTicketAnalytics.averageLifetime}
              </p>
              <p>
                <span className="font-semibold text-[#0f172a]">Visitantes activos:</span>{' '}
                {visitorTicketAnalytics.activeVisitorUsers.toLocaleString('es-CO')} de{' '}
                {visitorTicketAnalytics.uniqueVisitors.toLocaleString('es-CO')} unicos
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">Tickets por dia (14 dias)</h3>
              <div className="mt-4 flex items-end gap-2 overflow-x-auto">
                {visitorTicketAnalytics.dailySeries.items.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="flex min-w-[2rem] flex-col items-center gap-2">
                    <div className="flex h-32 w-full items-end overflow-hidden rounded-md bg-slate-100">
                      <div
                        className="w-full rounded-t-md bg-[#B5A160]"
                        style={{
                          height: `${Math.max(
                            (item.value / visitorTicketAnalytics.dailySeries.max) * 100,
                            item.value > 0 ? 6 : 0
                          )}%`,
                        }}
                        title={`${item.tooltip}: ${item.value.toLocaleString('es-CO')} tickets`}
                      />
                    </div>
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#64748b]">
                      {item.label}
                    </span>
                    <span className="text-xs text-[#0f172a]">{item.value.toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header>
            <h2 className="text-lg font-semibold text-[#0f172a]">Entradas sin cierre</h2>
            <p className="text-sm text-[#64748b]">
              Usuarios que permanecen activos sin registrar salida (ultimos cinco casos).
            </p>
          </header>
          <ul className="mt-4 space-y-3 text-sm text-[#475569]">
            {openSessions.slice(0, 5).length > 0 ? (
              openSessions.slice(0, 5).map((session) => (
                <li key={session.id} className="rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#0f172a]">{session.userName}</span>
                    <span className="text-xs text-[#94a3b8] capitalize">{session.userEstado}</span>
                  </div>
                  <div className="mt-1 text-xs text-[#64748b]">
                    Desde{' '}
                    {session.horaEntrada ||
                      (session.startedAt
                        ? new Date(session.startedAt).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'hora desconocida')}{' '}
                    - Supervisado por {session.adminName}
                  </div>
                </li>
              ))
            ) : (
              <li className="rounded-lg border border-slate-200 px-4 py-3 text-xs text-[#94a3b8]">
                No hay sesiones abiertas pendientes.
              </li>
            )}
          </ul>
          <p className="mt-3 text-xs text-[#94a3b8]">
            Los cambios se actualizan al escanear un nuevo ingreso o registrar la salida correspondiente.
          </p>
        </section>


        <section className="grid gap-6 lg:grid-cols-2">
          <article className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Asistencia semanal</h2>
                <p className="text-sm text-[#64748b]">Comparativa de entradas por semana.</p>
              </div>
            </div>
            <div className="flex min-h-[12rem] items-end gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
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
            <div className="flex min-h-[12rem] items-end gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
              {monthlyBars.items.map((item) => (
                <div key={item.label} className="flex flex-1 min-w-[2.75rem] flex-col items-center gap-2">
                  <div className="flex h-36 w-full items-end overflow-hidden rounded-md bg-[#B5A160]/10">
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
            <div className="mt-4 max-h-[24rem] overflow-y-auto rounded-lg border border-slate-200 bg-white">
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
            <div className="grid gap-3 text-sm text-[#475569] sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-[#0f172a]">Promedio por sesion</span>
                <span className="text-[#00594e]">{sessionDurationSummary.average}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-[#0f172a]">Mediana</span>
                <span className="text-[#00594e]">{sessionDurationSummary.median}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-[#0f172a]">Percentil 90</span>
                <span className="text-[#00594e]">{sessionDurationSummary.p90}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-[#0f172a]">Min - Max</span>
                <span className="text-[#00594e]">
                  {sessionDurationSummary.min} / {sessionDurationSummary.max}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-[#0f172a]">Tiempo total</span>
                <span className="text-[#00594e]">{sessionDurationSummary.total}</span>
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
