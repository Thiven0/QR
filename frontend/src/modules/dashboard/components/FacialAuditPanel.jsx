import { useEffect, useMemo, useState } from 'react';
import { FiEye, FiRefreshCcw } from 'react-icons/fi';
import { apiRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';
import FaceCaptureViewer from './FaceCaptureViewer';

const STATUS_LABELS = {
  matched: 'Coincidencia',
  unmatched: 'Sin coincidencia',
  error: 'Error',
};

const FacialAuditPanel = ({ standalone = false }) => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [filters, setFilters] = useState({ start: '', end: '', status: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewerAttempt, setViewerAttempt] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!token) return undefined;
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const query = new URLSearchParams({ page: String(pagination.page), limit: String(pagination.limit) });
        if (filters.start) query.set('start', filters.start);
        if (filters.end) query.set('end', filters.end);
        if (filters.status) query.set('status', filters.status);
        const response = await apiRequest(`/face/logs?${query.toString()}`, { token, signal: controller.signal });
        const payload = response?.data || response || {};
        setItems(payload.items || []);
        setPagination((current) => ({ ...current, ...(payload.pagination || {}) }));
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setItems([]);
        setError(loadError.message || 'No fue posible cargar la auditoria facial.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [filters.end, filters.start, filters.status, pagination.limit, pagination.page, refreshKey, token]);

  const viewerCaptures = useMemo(() => viewerAttempt ? [{
    label: STATUS_LABELS[viewerAttempt.status] || 'Intento facial',
    logId: viewerAttempt.id,
    createdAt: viewerAttempt.createdAt,
  }] : [], [viewerAttempt]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPagination((current) => ({ ...current, page: 1 }));
  };

  return (
    <section className={standalone ? 'space-y-6' : 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0f766e]">Auditoria facial privada</p>
          <h2 className="mt-2 text-2xl font-bold text-[#0f172a]">Historial completo de intentos</h2>
          <p className="mt-2 text-sm text-[#64748b]">Consulta coincidencias, intentos fallidos, errores y su captura protegida.</p>
        </div>
        <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-[#334155] transition hover:bg-slate-50">
          <FiRefreshCcw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-semibold text-[#334155]">Desde
          <input type="date" value={filters.start} onChange={(event) => updateFilter('start', event.target.value)} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-[#0f766e]" />
        </label>
        <label className="text-sm font-semibold text-[#334155]">Hasta
          <input type="date" value={filters.end} onChange={(event) => updateFilter('end', event.target.value)} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-[#0f766e]" />
        </label>
        <label className="text-sm font-semibold text-[#334155]">Resultado
          <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-[#0f766e]">
            <option value="">Todos</option><option value="matched">Coincidencia</option><option value="unmatched">Sin coincidencia</option><option value="error">Error</option>
          </select>
        </label>
      </div>

      {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[840px] w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-[#64748b]"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Resultado</th><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Operador</th><th className="px-4 py-3 text-right">Score</th><th className="px-4 py-3 text-center">Captura</th></tr></thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748b]">Cargando auditoria...</td></tr> : items.length ? items.map((attempt) => (
              <tr key={attempt.id}>
                <td className="px-4 py-3 text-xs text-[#475569]">{new Date(attempt.createdAt).toLocaleString('es-CO')}</td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${attempt.status === 'matched' ? 'bg-emerald-100 text-emerald-700' : attempt.status === 'unmatched' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{STATUS_LABELS[attempt.status] || attempt.status}</span></td>
                <td className="px-4 py-3"><p className="font-semibold text-[#0f172a]">{attempt.matchedUser?.nombre || 'Identidad no revelada'}</p><p className="text-xs text-[#64748b]">{attempt.errorMessage || attempt.matchedUser?.cedula || 'Sin detalle'}</p></td>
                <td className="px-4 py-3 text-[#475569]">{attempt.actor?.nombre || 'Sistema'}</td>
                <td className="px-4 py-3 text-right font-semibold text-[#0f172a]">{typeof attempt.score === 'number' ? attempt.score.toFixed(4) : '--'}</td>
                <td className="px-4 py-3 text-center">{attempt.hasCapture ? <button type="button" onClick={() => setViewerAttempt(attempt)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#0f766e]/25 text-[#0f766e] transition hover:bg-[#ecfdf5]" aria-label="Ver captura facial" title="Ver captura"><FiEye className="h-4 w-4" /></button> : <span className="text-xs text-[#94a3b8]">No disponible</span>}</td>
              </tr>
            )) : <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748b]">No hay intentos para los filtros seleccionados.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#475569]">
        <span>{pagination.total.toLocaleString('es-CO')} intentos</span>
        <div className="flex items-center gap-2"><button type="button" disabled={pagination.page <= 1 || loading} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40">Anterior</button><span>Pagina {pagination.page} de {pagination.totalPages}</span><button type="button" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40">Siguiente</button></div>
      </div>

      <FaceCaptureViewer isOpen={Boolean(viewerAttempt)} captures={viewerCaptures} onClose={() => setViewerAttempt(null)} title="Captura del intento facial" />
    </section>
  );
};

export default FacialAuditPanel;
