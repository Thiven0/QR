import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { apiRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';
import { utils as XLSXUtils, writeFile as writeXLSXFile } from 'xlsx';
import { FiEdit2, FiTrash2, FiPlusCircle, FiAlertTriangle } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const formatDateTime = (value) => {
  if (!value) return 'Sin registrar';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const formatTime = (value) => value || 'Sin registrar';

const formatDurationValue = (value) => {
  if (!value) return 'Sin calcular';

  const normalized = String(value).trim();
  const segments = normalized.split(':').map((segment) => segment.padStart(2, '0'));

  if (segments.length === 2) {
    return `${segments[0]}:${segments[1]}:00`;
  }

  if (segments.length === 3) {
    return `${segments[0]}:${segments[1]}:${segments[2]}`;
  }

  if (segments.length === 1 && /^\d+$/.test(segments[0])) {
    const minutes = segments[0];
    return `${minutes.padStart(2, '0')}:00:00`;
  }

  return normalized;
};

const getRegistroTimestamp = (registro, candidates = []) => {
  if (!registro) return undefined;

  for (const key of candidates) {
    const value = registro[key];
    if (value) return value;
  }

  return undefined;
};

const toDateTimeLocalValue = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getNowDateTimeLocal = () => {
  const now = new Date();
  now.setSeconds(0, 0);
  return toDateTimeLocalValue(now);
};

const parseDateTimeInput = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const extractTimeFromInput = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [, timePart] = value.split('T');
  if (!timePart) return null;
  return timePart.length === 5 ? `${timePart}:00` : timePart;
};

const formatTimeForPayload = (date) =>
  date
    ? date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : undefined;

const formatMinutesLabel = (minutes) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return '<1 min';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours <= 0) {
    return `${minutes} min`;
  }
  return `${hours}h ${String(Math.round(remaining)).padStart(2, '0')}m`;
};

const RegistroDirectory = () => {
  const { token } = useAuth();
  const [registros, setRegistros] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    cedula: '',
    fechaEntrada: getNowDateTimeLocal(),
    fechaSalida: '',
    observaciones: '',
  });
  const [createErrors, setCreateErrors] = useState({});
  const [createSaving, setCreateSaving] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    fechaEntrada: '',
    fechaSalida: '',
    observaciones: '',
    cierreMotivo: '',
    cierreForzado: false,
  });
  const [editErrors, setEditErrors] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const resetCreateForm = useCallback(() => {
    setCreateForm({
      cedula: '',
      fechaEntrada: getNowDateTimeLocal(),
      fechaSalida: '',
      observaciones: '',
    });
    setCreateErrors({});
  }, []);

  const handleCreateFormChange = useCallback((field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleEditFormChange = useCallback((field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const fetchRegistros = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const response = await apiRequest('/exitEntry', { token });
      const data = Array.isArray(response) ? response : response?.data || [];
      setRegistros(data);
    } catch (err) {
      setError(err.message || 'No fue posible obtener los registros');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateErrors({});
    resetCreateForm();
  };

  const openEditModal = (registro) => {
    setEditTarget(registro);
    setEditErrors({});
    setEditForm({
      fechaEntrada: toDateTimeLocalValue(registro.fechaEntrada),
      fechaSalida: toDateTimeLocalValue(registro.fechaSalida),
      observaciones: registro.observaciones || '',
      cierreMotivo: registro.cierreMotivo || '',
      cierreForzado: Boolean(registro.cierreForzado),
    });
  };

  const closeEditModal = () => {
    setEditTarget(null);
    setEditErrors({});
  };

  const openDeleteModal = (registro, event) => {
    if (event) {
      event.stopPropagation();
    }
    setDeleteTarget(registro);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
  };

  const sortedRegistros = useMemo(() => {
    return [...registros].sort((a, b) => {
      const createdA = getRegistroTimestamp(a, ['createdAt', 'created_at', 'fechaEntrada']);
      const createdB = getRegistroTimestamp(b, ['createdAt', 'created_at', 'fechaEntrada']);

      const dateA = new Date(createdA || 0).getTime();
      const dateB = new Date(createdB || 0).getTime();
      return dateB - dateA;
    });
  }, [registros]);

  const filteredRegistros = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    return sortedRegistros.filter((registro) => {
      const usuario = registro.usuario || {};
      const administrador = registro.administrador || {};

      const matchesSearch =
        !normalizedSearch ||
        [
          usuario.nombre,
          usuario.apellido,
          usuario.email,
          usuario.cedula,
          administrador.nombre,
          administrador.email,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      const entrada = registro.fechaEntrada ? new Date(registro.fechaEntrada) : null;
      const matchesStart = start ? (entrada ? entrada >= start : false) : true;
      const matchesEnd = end ? (entrada ? entrada <= end : false) : true;

      const isOpen = !registro?.fechaSalida;
      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'abiertos' && isOpen) ||
        (statusFilter === 'cerrados' && !isOpen);

      return matchesSearch && matchesStart && matchesEnd && matchesStatus;
    });
  }, [sortedRegistros, searchTerm, statusFilter, startDate, endDate]);

  const lineChartData = useMemo(() => {
    if (!filteredRegistros.length) {
      return { labels: [], counts: [] };
    }

    const resolveStart = () => {
      if (startDate) {
        const value = new Date(startDate);
        value.setHours(0, 0, 0, 0);
        return value;
      }
      const fallback = new Date();
      fallback.setHours(0, 0, 0, 0);
      fallback.setDate(fallback.getDate() - 6);
      return fallback;
    };

    const resolveEnd = () => {
      if (endDate) {
        const value = new Date(endDate);
        value.setHours(0, 0, 0, 0);
        return value;
      }
      const fallback = new Date();
      fallback.setHours(0, 0, 0, 0);
      return fallback;
    };

    let start = resolveStart();
    let end = resolveEnd();
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }

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

    filteredRegistros.forEach((registro) => {
      if (!registro.fechaEntrada) return;
      const date = new Date(registro.fechaEntrada);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().slice(0, 10);
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.count += 1;
      }
    });

    return {
      labels: buckets.map((bucket) => bucket.label),
      counts: buckets.map((bucket) => bucket.count),
    };
  }, [filteredRegistros, startDate, endDate]);

  const chartHasData = lineChartData.counts.some((value) => value > 0);
  const chartTotal = lineChartData.counts.reduce((acc, value) => acc + value, 0);

  const renderStatusBadge = (registro) => {
    const isOpen = !registro?.fechaSalida;
    const baseClasses = 'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold w-fit';

    const mainBadge = isOpen ? (
      <span className={`${baseClasses} bg-[#dcfce7] text-[#166534]`}>
        <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
        En progreso
      </span>
    ) : (
      <span className={`${baseClasses} bg-[#fef3c7] text-[#92400e]`}>
        <span className="h-2 w-2 rounded-full bg-[#f97315]" />
        Finalizado
      </span>
    );

    const forcedBadge = registro?.cierreForzado ? (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#fee2e2] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#b91c1c]">
        <span className="h-2 w-2 rounded-full bg-[#b91c1c]" />
        Cierre por ticket
      </span>
    ) : null;

    return (
      <div className="flex flex-col gap-1">
        {mainBadge}
        {forcedBadge}
      </div>
    );
  };

  const handleExport = () => {
    if (!filteredRegistros.length) {
      setError('No hay registros para exportar con los filtros aplicados.');
      return;
    }

    const headers = [
      'Usuario',
      'Correo',
      'Rol',
      'Vehiculo',
      'Placa vehiculo',
      'Porteria',
      'Entrada',
      'Hora entrada',
      'Salida',
      'Hora salida',
      'Duracion',
      'Cierre forzado',
    ];
    const rows = filteredRegistros.map((registro) => {
      const usuario = registro.usuario || {};
      const administrador = registro.administrador || {};
      const vehiculo = registro.vehiculo || {};
      return [
        `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim(),
        usuario.email || '',
        usuario.rolAcademico || '',
        vehiculo.type || '',
        vehiculo.plate || '',
        administrador.nombre || '',
        formatDateTime(registro.fechaEntrada),
        formatTime(registro.horaEntrada),
        formatDateTime(registro.fechaSalida),
        formatTime(registro.horaSalida),
        formatDurationValue(registro.duracionSesion),
        registro.cierreForzado ? `Si (${registro.cierreMotivo || 'ticket'})` : 'No',
      ];
    });

    const worksheet = XLSXUtils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(workbook, worksheet, 'Historial');
    writeXLSXFile(workbook, `historial-registros-${Date.now()}.xlsx`);
  };

  const chartData = {
    labels: lineChartData.labels,
    datasets: [
      {
        label: 'Registros por dia',
        data: lineChartData.counts,
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15, 118, 110, 0.15)',
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: '#0f172a' },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#0f172a', precision: 0 },
        grid: { color: 'rgba(148, 163, 184, 0.2)' },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y} registros`,
        },
      },
    },
  };

  const refreshDisabled = loading;
  const exportDisabled = !filteredRegistros.length;
  const totalRegistros = filteredRegistros.length;
  const openCount = filteredRegistros.filter((registro) => !registro?.fechaSalida).length;
  const closedCount = totalRegistros - openCount;

  const resolveRegistroKey = (registro, fallback) => {
    if (!registro) return fallback;
    return (
      registro._id ??
      registro.id ??
      registro.uuid ??
      registro.codigo ??
      registro.ticket ??
      registro.token ??
      fallback
    );
  };

  const selectedKey = selected ? resolveRegistroKey(selected, 'selected') : null;

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('todos');
    setStartDate('');
    setEndDate('');
    setSelected(null);
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    const cedula = createForm.cedula.trim();
    if (!cedula) {
      nextErrors.cedula = 'Ingresa la cédula del usuario';
    }
    const entryDate = parseDateTimeInput(createForm.fechaEntrada);
    if (!entryDate) {
      nextErrors.fechaEntrada = 'Selecciona la fecha y hora de entrada';
    }
    const exitDate = parseDateTimeInput(createForm.fechaSalida);
    if (entryDate && exitDate && exitDate < entryDate) {
      nextErrors.fechaSalida = 'La salida no puede ser anterior a la entrada';
    }

    if (Object.keys(nextErrors).length) {
      setCreateErrors(nextErrors);
      return;
    }

    try {
      setCreateSaving(true);
      setCreateErrors({});
      const payload = {
        cedula,
        fechaEntrada: entryDate.toISOString(),
        horaEntrada: extractTimeFromInput(createForm.fechaEntrada) || formatTimeForPayload(entryDate),
        observaciones: createForm.observaciones?.trim() || undefined,
      };

      if (exitDate) {
        payload.fechaSalida = exitDate.toISOString();
        payload.horaSalida = extractTimeFromInput(createForm.fechaSalida) || formatTimeForPayload(exitDate);
      }

      await apiRequest('/exitEntry', {
        method: 'POST',
        token,
        data: payload,
      });
      closeCreateModal();
      fetchRegistros();
    } catch (err) {
      setCreateErrors({ api: err.message || 'No fue posible crear el registro' });
    } finally {
      setCreateSaving(false);
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editTarget) return;
    const nextErrors = {};
    const entryDate = parseDateTimeInput(editForm.fechaEntrada);
    if (!entryDate) {
      nextErrors.fechaEntrada = 'Selecciona la fecha y hora de entrada';
    }
    const exitDate = parseDateTimeInput(editForm.fechaSalida);
    if (entryDate && exitDate && exitDate < entryDate) {
      nextErrors.fechaSalida = 'La salida no puede ser anterior a la entrada';
    }

    if (Object.keys(nextErrors).length) {
      setEditErrors(nextErrors);
      return;
    }

    try {
      setEditSaving(true);
      setEditErrors({});
      const payload = {
        fechaEntrada: entryDate ? entryDate.toISOString() : undefined,
        horaEntrada: extractTimeFromInput(editForm.fechaEntrada) || formatTimeForPayload(entryDate),
        observaciones: editForm.observaciones?.trim() || undefined,
        cierreMotivo: editForm.cierreMotivo?.trim() || undefined,
        cierreForzado: Boolean(editForm.cierreForzado),
      };

      if (exitDate) {
        payload.fechaSalida = exitDate.toISOString();
        payload.horaSalida = extractTimeFromInput(editForm.fechaSalida) || formatTimeForPayload(exitDate);
      } else if (editForm.fechaSalida === '') {
        payload.fechaSalida = '';
        payload.horaSalida = '';
      }

      await apiRequest(`/exitEntry/${editTarget._id}`, {
        method: 'PUT',
        token,
        data: payload,
      });
      closeEditModal();
      fetchRegistros();
    } catch (err) {
      setEditErrors({ api: err.message || 'No fue posible actualizar el registro' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteRegistro = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiRequest(`/exitEntry/${deleteTarget._id}`, {
        method: 'DELETE',
        token,
      });
      closeDeleteModal();
      fetchRegistros();
    } catch (err) {
      setError(err.message || 'No fue posible eliminar el registro');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="text-center sm:text-left">
          <h1 className="text-3xl font-bold text-[#0f172a]">Historial de registros</h1>
          <p className="mt-2 text-sm text-[#475569]">
            Consulta las entradas y salidas registradas por los administradores y celadores.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-[#B5A160] bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030]">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-5">
            <label className="sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Buscar</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Nombre, correo o usuario de porteria"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/40"
              />
            </label>
            <label>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Estado</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/40"
              >
                <option value="todos">Todos</option>
                <option value="abiertos">En progreso</option>
                <option value="cerrados">Finalizados</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Desde</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/40"
              />
            </label>
            <label>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Hasta</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/40"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-100"
            >
              Restablecer filtros
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#0f766e]/60 px-4 py-2 text-sm font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/10"
              >
                <FiPlusCircle className="h-4 w-4" />
                Nuevo registro
              </button>
              <button
                type="button"
                onClick={fetchRegistros}
                disabled={refreshDisabled}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5b55] focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Actualizando...' : 'Actualizar'}
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exportDisabled}
                className="inline-flex items-center gap-2 rounded-lg bg-[#B5A160] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9a8952] focus:outline-none focus:ring-2 focus:ring-[#B5A160] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Exportar Excel
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[#0f172a]">Actividad por fecha</h3>
                  <p className="text-sm text-[#475569]">
                    Total de {chartTotal} {chartTotal === 1 ? 'registro' : 'registros'} en el periodo seleccionado.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#0f766e]/10 px-3 py-1 text-xs font-semibold text-[#0f766e]">
                  <span className="h-2 w-2 rounded-full bg-[#0f766e]" />
                  {chartTotal} en total
                </span>
              </div>
              <div className="mt-4 h-64">
                {chartHasData ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-[#64748b]">
                    No hay datos suficientes para graficar el periodo seleccionado.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#475569]">Registros totales</span>
                <p className="mt-2 text-3xl font-bold text-[#0f172a]">{totalRegistros}</p>
                <p className="text-sm text-[#475569]">Resultados segun los filtros aplicados.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-[#dcfce7] p-5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#166534]">En progreso</span>
                <p className="mt-2 text-3xl font-bold text-[#166534]">{openCount}</p>
                <p className="text-sm text-[#166534] opacity-80">Registros sin hora de salida.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-[#fef3c7] p-5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#92400e]">Finalizados</span>
                <p className="mt-2 text-3xl font-bold text-[#92400e]">{closedCount}</p>
                <p className="text-sm text-[#92400e] opacity-80">Registros con salida registrada.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1100px] divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#475569]">
                    Usuario
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#475569]">
                    Vehiculo
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#475569]">
                    Porteria
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#475569]">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#475569]">
                    Entrada
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#475569]">
                    Salida
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#475569]">
                    Duracion
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#475569]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm font-semibold text-[#475569]">
                      Cargando registros...
                    </td>
                  </tr>
                ) : filteredRegistros.length ? (
                  filteredRegistros.map((registro, index) => {
                    const usuario = registro.usuario || {};
                    const administrador = registro.administrador || {};
                    const rowKey = resolveRegistroKey(registro, index);
                    const isSelected = selectedKey !== null && rowKey === selectedKey;
                    const alertStatus = (registro.alertStatus || 'none').toLowerCase();
                    const isAlerting = alertStatus === 'pending' || alertStatus === 'acknowledged';

                    return (
                      <tr
                        key={rowKey}
                        onClick={() =>
                          setSelected((current) => {
                            if (!current) return registro;
                            const currentKey = resolveRegistroKey(current, 'current');
                            return currentKey === rowKey ? null : registro;
                          })
                        }
                        className={`cursor-pointer transition hover:bg-[#f0fdfa] ${isSelected ? 'bg-[#ecfeff]' : ''} ${
                          isAlerting ? 'bg-[#fff7ed]' : ''
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="font-semibold text-[#0f172a]">
                            {`${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-[#475569]">{usuario.email || 'Sin correo'}</div>
                          {(usuario.rolAcademico || '').toLowerCase() === 'visitante' && (
                            <span className="mt-1 inline-flex w-fit items-center rounded-full bg-[#0f172a]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0f172a]">
                              Visitante
                            </span>
                          )}
                          {isAlerting && (
                            <span
                              className={`mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                alertStatus === 'pending'
                                  ? 'bg-[#fef3c7] text-[#b45309]'
                                  : 'bg-[#fffbeb] text-[#92400e]'
                              }`}
                            >
                              <FiAlertTriangle className="h-3.5 w-3.5" />
                              {alertStatus === 'pending' ? 'Alerta' : 'En revisión'}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {registro.vehiculo ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-[#0f172a]">
                                {registro.vehiculo.type || 'Vehiculo'}
                              </span>
                              <span className="text-xs text-[#475569]">
                                Placa: {registro.vehiculo.plate || 'Sin placa'}
                              </span>
                              <span className="mt-1 inline-flex w-fit items-center rounded-full bg-[#0f766e]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0f766e]">
                                Con vehiculo
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                              Sin vehiculo
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="font-semibold text-[#0f172a]">{administrador.nombre || 'Sin asignar'}</div>
                          <div className="text-xs text-[#475569]">{administrador.email || 'Sin correo'}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">{renderStatusBadge(registro)}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="font-medium text-[#0f172a]">{formatDateTime(registro.fechaEntrada)}</div>
                          <div className="text-xs text-[#475569]">{formatTime(registro.horaEntrada)}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="font-medium text-[#0f172a]">{formatDateTime(registro.fechaSalida)}</div>
                          <div className="text-xs text-[#475569]">{formatTime(registro.horaSalida)}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="font-semibold text-[#0f172a]">{formatDurationValue(registro.duracionSesion)}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditModal(registro);
                              }}
                              className="rounded-full border border-slate-200 p-1 text-[#0f172a] transition hover:bg-slate-100"
                            >
                              <span className="sr-only">Editar registro</span>
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => openDeleteModal(registro, event)}
                              className="rounded-full border border-slate-200 p-1 text-[#b91c1c] transition hover:bg-[#fee2e2]"
                            >
                              <span className="sr-only">Eliminar registro</span>
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm font-semibold text-[#475569]">
                      No se encontraron registros con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={closeCreateModal}>
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#0f172a]">Nuevo registro manual</h3>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-full bg-slate-100 p-2 text-[#0f172a] transition hover:bg-slate-200"
              >
                <span className="sr-only">Cerrar</span>
                ×
              </button>
            </div>
            <p className="mt-1 text-sm text-[#475569]">
              Ingresa la cédula del usuario y la hora de ingreso/salida para documentar el movimiento.
            </p>
            <form className="mt-4 space-y-4" onSubmit={handleCreateSubmit}>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Cédula del usuario</span>
                <input
                  type="text"
                  value={createForm.cedula}
                  onChange={(event) => handleCreateFormChange('cedula', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40"
                  placeholder="Documento completo"
                />
                {createErrors.cedula && (
                  <span className="text-xs font-semibold text-[#b91c1c]">{createErrors.cedula}</span>
                )}
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Fecha y hora de entrada</span>
                <input
                  type="datetime-local"
                  value={createForm.fechaEntrada}
                  onChange={(event) => handleCreateFormChange('fechaEntrada', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40"
                />
                {createErrors.fechaEntrada && (
                  <span className="text-xs font-semibold text-[#b91c1c]">{createErrors.fechaEntrada}</span>
                )}
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">
                  Fecha y hora de salida (opcional)
                </span>
                <input
                  type="datetime-local"
                  value={createForm.fechaSalida}
                  onChange={(event) => handleCreateFormChange('fechaSalida', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40"
                />
                {createErrors.fechaSalida && (
                  <span className="text-xs font-semibold text-[#b91c1c]">{createErrors.fechaSalida}</span>
                )}
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Observaciones</span>
                <textarea
                  value={createForm.observaciones}
                  onChange={(event) => handleCreateFormChange('observaciones', event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40"
                  placeholder="Notas adicionales del movimiento"
                />
              </label>
              {createErrors.api && (
                <div className="rounded-lg border border-[#b91c1c]/50 bg-[#fee2e2] px-3 py-2 text-xs font-semibold text-[#b91c1c]">
                  {createErrors.api}
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-100"
                  disabled={createSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5b55] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {createSaving ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={closeEditModal}>
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#0f172a]">Editar registro</h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-full bg-slate-100 p-2 text-[#0f172a] transition hover:bg-slate-200"
              >
                <span className="sr-only">Cerrar</span>
                ×
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleEditSubmit}>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Fecha y hora de entrada</span>
                <input
                  type="datetime-local"
                  value={editForm.fechaEntrada}
                  onChange={(event) => handleEditFormChange('fechaEntrada', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40"
                />
                {editErrors.fechaEntrada && (
                  <span className="text-xs font-semibold text-[#b91c1c]">{editErrors.fechaEntrada}</span>
                )}
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Fecha y hora de salida</span>
                <input
                  type="datetime-local"
                  value={editForm.fechaSalida}
                  onChange={(event) => handleEditFormChange('fechaSalida', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40"
                />
                {editErrors.fechaSalida && (
                  <span className="text-xs font-semibold text-[#b91c1c]">{editErrors.fechaSalida}</span>
                )}
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Observaciones</span>
                <textarea
                  value={editForm.observaciones}
                  onChange={(event) => handleEditFormChange('observaciones', event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Motivo de cierre</span>
                <input
                  type="text"
                  value={editForm.cierreMotivo}
                  onChange={(event) => handleEditFormChange('cierreMotivo', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40"
                  placeholder="Opcional"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
                <input
                  type="checkbox"
                  checked={editForm.cierreForzado}
                  onChange={(event) => handleEditFormChange('cierreForzado', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0f766e] focus:ring-[#0f766e]"
                />
                Cierre forzado
              </label>
              {editErrors.api && (
                <div className="rounded-lg border border-[#b91c1c]/50 bg-[#fee2e2] px-3 py-2 text-xs font-semibold text-[#b91c1c]">
                  {editErrors.api}
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-100"
                  disabled={editSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5b55] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {editSaving ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={closeDeleteModal}>
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-[#b91c1c]">Eliminar registro</h3>
            <p className="mt-2 text-sm text-[#475569]">
              Confirmas que deseas eliminar el movimiento de{' '}
              <span className="font-semibold text-[#0f172a]">
                {`${deleteTarget.usuario?.nombre || ''} ${deleteTarget.usuario?.apellido || ''}`.trim() || 'Usuario'}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-100"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteRegistro}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#b91c1c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-semibold text-[#0f172a]">Detalle del registro</h3>
                <p className="mt-1 text-sm text-[#475569]">
                  Consulta la informacion completa del movimiento seleccionado.
                </p>
                {(() => {
                  const currentStatus = (selected.alertStatus || 'none').toLowerCase();
                  if (currentStatus === 'none') return null;
                  const labelMap = {
                    pending: { text: 'Alerta por permanencia', color: 'text-[#b45309]', bg: 'bg-[#fef3c7]' },
                    acknowledged: { text: 'Alerta en revisión', color: 'text-[#b45309]', bg: 'bg-[#fffbeb]' },
                    resolved: { text: 'Alerta resuelta', color: 'text-[#0f766e]', bg: 'bg-[#ecfdf5]' },
                  };
                  const styles = labelMap[currentStatus] || labelMap.pending;
                  return (
                    <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${styles.bg} ${styles.color}`}>
                      <FiAlertTriangle className="h-4 w-4" />
                      {styles.text}
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-3">
                {renderStatusBadge(selected)}
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="inline-flex items-center justify-center rounded-full bg-[#b91c1c] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#991b1b]"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">Usuario</h4>
                <div className="mt-3 space-y-2 text-sm text-[#475569]">
                  <p>
                    <span className="font-semibold text-[#0f172a]">Nombre:</span>{' '}
                    {`${selected.usuario?.nombre || ''} ${selected.usuario?.apellido || ''}`.trim() || 'Sin nombre'}
                  </p>
                  <p>
                    <span className="font-semibold text-[#0f172a]">Correo:</span>{' '}
                    {selected.usuario?.email || 'Sin correo'}
                  </p>
                  <p>
                    <span className="font-semibold text-[#0f172a]">Documento:</span>{' '}
                    {selected.usuario?.cedula || 'Sin documento'}
                  </p>
                  {selected.usuario?.rolAcademico && (
                    <p>
                      <span className="font-semibold text-[#0f172a]">Rol:</span>{' '}
                      <span className="capitalize">{selected.usuario.rolAcademico}</span>
                      {(selected.usuario.rolAcademico || '').toLowerCase() === 'visitante' && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-[#0f172a]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0f172a]">
                          Visitante
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </section>
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">Porteria</h4>
                <div className="mt-3 space-y-2 text-sm text-[#475569]">
                  <p>
                    <span className="font-semibold text-[#0f172a]">Nombre:</span>{' '}
                    {selected.administrador?.nombre || 'Sin asignar'}
                  </p>
                  <p>
                    <span className="font-semibold text-[#0f172a]">Correo:</span>{' '}
                    {selected.administrador?.email || 'Sin correo'}
                  </p>
                </div>
              </section>

              <section className="md:col-span-2">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">Vehiculo asociado</h4>
                {selected.vehiculo ? (
                  <div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-[#f8fafc] p-4 text-sm text-[#475569] sm:grid-cols-2">
                    <p>
                      <span className="font-semibold text-[#0f172a]">Tipo:</span> {selected.vehiculo.type || 'Sin tipo'}
                    </p>
                    <p>
                      <span className="font-semibold text-[#0f172a]">Placa:</span> {selected.vehiculo.plate || 'Sin placa'}
                    </p>
                    <p>
                      <span className="font-semibold text-[#0f172a]">Color:</span> {selected.vehiculo.color || 'Sin color'}
                    </p>
                    <p>
                      <span className="font-semibold text-[#0f172a]">Estado:</span>{' '}
                      <span className="capitalize">{selected.vehiculo.estado || 'desconocido'}</span>
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-4 py-2 text-sm text-[#94a3b8]">
                    Este registro no tiene un vehiculo asociado.
                  </p>
                )}
              </section>
            </div>

            <section className="mt-6">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">Horarios</h4>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 text-sm text-[#475569]">
                <div className="rounded-lg border border-slate-200 bg-[#f8fafc] p-4">
                  <p className="font-semibold text-[#0f172a]">Entrada</p>
                  <p>{formatDateTime(selected.fechaEntrada)}</p>
                  <p className="text-xs text-[#64748b]">Hora registrada: {formatTime(selected.horaEntrada)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-[#f8fafc] p-4">
                  <p className="font-semibold text-[#0f172a]">Salida</p>
                  <p>{formatDateTime(selected.fechaSalida)}</p>
                  <p className="text-xs text-[#64748b]">Hora registrada: {formatTime(selected.horaSalida)}</p>
                </div>
              </div>
            </section>

            <section className="mt-6">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">Resumen</h4>
              <div className="mt-3 rounded-lg border border-slate-200 bg-[#ecfeff] p-4 text-sm text-[#0f172a]">
                <p>
                  <span className="font-semibold">Duracion de la sesion:</span>{' '}
                  {formatDurationValue(selected.duracionSesion)}
                </p>
                {selected.cierreForzado && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#b45309]">
                    Cierre por ticket expirado
                  </p>
                )}
                <p className="mt-1 text-xs text-[#0f172a]/70">
                  Creado el {formatDateTime(getRegistroTimestamp(selected, ['createdAt', 'created_at']))} - Actualizado el{' '}
                  {formatDateTime(getRegistroTimestamp(selected, ['updatedAt', 'updated_at']))}
                </p>
              </div>
            </section>

            {selected.observaciones && (
              <section className="mt-6 rounded-lg border border-dashed border-slate-200 bg-[#f8fafc] p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-[#475569]">Observaciones</h4>
                <p className="mt-2 text-sm text-[#334155] leading-relaxed">{selected.observaciones}</p>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroDirectory;
