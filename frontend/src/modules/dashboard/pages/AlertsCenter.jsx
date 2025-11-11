import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiCheck, FiRefreshCcw, FiClock } from 'react-icons/fi';
import useAuth from '../../auth/hooks/useAuth';
import { apiRequest } from '../../../services/apiClient';

const ALERT_THRESHOLD_MINUTES = 5;

const STATUS_STYLES = {
  pending: {
    label: 'Pendiente',
    badge: 'bg-[#fef3c7] text-[#b45309]',
  },
  acknowledged: {
    label: 'En revisión',
    badge: 'bg-[#fffbeb] text-[#b45309]',
  },
  resolved: {
    label: 'Resuelta',
    badge: 'bg-[#ecfdf5] text-[#0f766e]',
  },
  none: {
    label: 'Sin alerta',
    badge: 'bg-slate-100 text-[#475569]',
  },
};

const formatDateTime = (value) => {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Formato inválido';
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatElapsedMinutes = (minutes) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return '<1 min';
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  if (hours <= 0) return `${remaining} min`;
  return `${hours}h ${remaining.toString().padStart(2, '0')}m`;
};

const AlertsCenter = () => {
  const { token, hasPermission } = useAuth();
  const canAccess = hasPermission(['Administrador', 'Celador']);

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchAlerts = useCallback(async () => {
    if (!token || !canAccess) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest(
        `/exitEntry/alerts?thresholdMinutes=${ALERT_THRESHOLD_MINUTES}`,
        { token },
      );
      const data = Array.isArray(response) ? response : response?.data || [];
      setAlerts(data);
    } catch (err) {
      setError(err.message || 'No fue posible obtener las alertas.');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [token, canAccess]);

  const handleAlertUpdate = useCallback(
    async (alertId, status) => {
      if (!token || !alertId) return;
      setUpdatingId(alertId);
      setError('');
      try {
        await apiRequest(`/exitEntry/${alertId}/alert`, {
          method: 'PATCH',
          token,
          data: { status },
        });
        fetchAlerts();
      } catch (err) {
        setError(err.message || 'No fue posible actualizar la alerta.');
      } finally {
        setUpdatingId(null);
      }
    },
    [token, fetchAlerts],
  );

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const stats = useMemo(() => {
    return alerts.reduce(
      (acc, alert) => {
        const status = (alert?.alertStatus || 'pending').toLowerCase();
        acc.total += 1;
        if (status === 'pending') acc.pending += 1;
        if (status === 'acknowledged') acc.review += 1;
        if (status === 'resolved') acc.resolved += 1;
        return acc;
      },
      { total: 0, pending: 0, review: 0, resolved: 0 },
    );
  }, [alerts]);

  if (!canAccess) {
    return (
      <section className="min-h-screen bg-[#f8fafc] px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-[#0f172a]">Alertas de permanencia</h1>
          <p className="mt-3 text-sm text-[#64748b]">
            No tienes permisos para acceder a este módulo.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#f8fafc] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f97316]">Seguridad</p>
            <h1 className="text-3xl font-bold text-[#0f172a]">Centro de alertas</h1>
            <p className="text-sm text-[#475569]">
              Supervisión de usuarios con más de {ALERT_THRESHOLD_MINUTES} minutos dentro del campus.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchAlerts}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-[#f97316]/40 px-4 py-2 text-sm font-semibold text-[#b45309] transition hover:bg-[#fff7ed] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiRefreshCcw className="h-4 w-4" />
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </header>

        {error && (
          <div className="rounded-xl border border-[#b91c1c]/50 bg-[#fee2e2] px-4 py-3 text-sm font-semibold text-[#b91c1c]">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Alertas activas</p>
            <p className="mt-2 text-3xl font-bold text-[#0f172a]">{stats.total}</p>
            <p className="text-xs text-[#475569]">Última actualización en tiempo real.</p>
          </article>
          <article className="rounded-2xl border border-[#f97316]/30 bg-[#fff7ed] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#b45309]">Pendientes</p>
            <p className="mt-2 text-3xl font-bold text-[#b45309]">{stats.pending}</p>
            <p className="text-xs text-[#b45309]/80">Sin revisión asignada.</p>
          </article>
          <article className="rounded-2xl border border-[#f97316]/30 bg-[#fffbeb] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#b45309]">En revisión</p>
            <p className="mt-2 text-3xl font-bold text-[#b45309]">{stats.review}</p>
            <p className="text-xs text-[#b45309]/80">Monitoreo activo.</p>
          </article>
          <article className="rounded-2xl border border-[#0f766e]/30 bg-[#ecfdf5] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">Resueltas</p>
            <p className="mt-2 text-3xl font-bold text-[#0f766e]">{stats.resolved}</p>
            <p className="text-xs text-[#0f766e]/80">Registradas correctamente.</p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#475569]">
                    Usuario
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#475569]">
                    Responsable
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#475569]">
                    Tiempo en campus
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#475569]">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#475569]">
                    Entrada
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#475569]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm font-semibold text-[#475569]">
                      Cargando alertas...
                    </td>
                  </tr>
                ) : alerts.length ? (
                  alerts.map((alert) => {
                    const id = alert?._id || alert?.id;
                    const userDoc = alert?.usuario || {};
                    const adminDoc = alert?.administrador || {};
                    const statusKey = (alert?.alertStatus || 'pending').toLowerCase();
                    const statusStyle = STATUS_STYLES[statusKey] || STATUS_STYLES.pending;

                    return (
                      <tr key={id} className="hover:bg-[#f8fafc]">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-[#0f172a]">
                            {[userDoc?.nombre, userDoc?.apellido].filter(Boolean).join(' ') || userDoc?.email || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-[#94a3b8]">Cedula: {userDoc?.cedula || 'N/D'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-[#0f172a]">
                            {[adminDoc?.nombre, adminDoc?.apellido].filter(Boolean).join(' ') || adminDoc?.email || 'Sin asignar'}
                          </p>
                          <p className="text-xs text-[#94a3b8]">Permiso: {adminDoc?.permisoSistema || 'N/A'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="inline-flex items-center gap-2 rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-semibold text-[#b45309]">
                            <FiClock className="h-3.5 w-3.5" />
                            {formatElapsedMinutes(alert?.alertElapsedMinutes)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyle.badge}`}>
                            {statusStyle.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-[#475569]">
                          {formatDateTime(alert?.fechaEntrada)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {statusKey !== 'acknowledged' && statusKey !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => handleAlertUpdate(id, 'acknowledged')}
                                disabled={updatingId === id}
                                className="rounded-full border border-[#f97316]/40 px-3 py-1 text-xs font-semibold text-[#b45309] transition hover:bg-[#fff7ed] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                En revisión
                              </button>
                            )}
                            {statusKey !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => handleAlertUpdate(id, 'resolved')}
                                disabled={updatingId === id}
                                className="inline-flex items-center gap-1 rounded-full border border-[#0f766e]/40 px-3 py-1 text-xs font-semibold text-[#0f766e] transition hover:bg-[#ecfdf5] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <FiCheck className="h-3.5 w-3.5" />
                                Resolver
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm font-semibold text-[#475569]">
                      No hay alertas activas actualmente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
};

export default AlertsCenter;
