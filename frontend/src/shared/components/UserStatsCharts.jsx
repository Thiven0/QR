import { useMemo } from 'react';

const FALLBACK_LABEL = 'Sin especificar';

const normalizeOrder = (values = []) => values.map((value) => String(value).toLowerCase());

const capitalizeLabel = (label) => {
  if (!label) return FALLBACK_LABEL;
  const safeLabel = String(label).trim();
  if (!safeLabel) return FALLBACK_LABEL;
  return safeLabel.charAt(0).toUpperCase() + safeLabel.slice(1);
};

const buildDistribution = (items = [], key, order = []) => {
  const normalizedOrder = normalizeOrder(order);
  const distribution = new Map();

  order.forEach((label, index) => {
    const normalized = String(label).toLowerCase();
    distribution.set(normalized, {
      label,
      count: 0,
      orderIndex: index,
    });
  });

  let dynamicIndex = order.length;

  items.forEach((item) => {
    const rawValue = item?.[key];
    const trimmedValue =
      typeof rawValue === 'string'
        ? rawValue.trim()
        : rawValue === undefined || rawValue === null
          ? ''
          : String(rawValue);

    const normalized = trimmedValue ? trimmedValue.toLowerCase() : FALLBACK_LABEL.toLowerCase();
    const orderPosition = normalizedOrder.indexOf(normalized);

    if (!distribution.has(normalized)) {
      distribution.set(normalized, {
        label: orderPosition >= 0 ? order[orderPosition] : capitalizeLabel(trimmedValue || FALLBACK_LABEL),
        count: 0,
        orderIndex: orderPosition >= 0 ? orderPosition : dynamicIndex++,
      });
    }

    const entry = distribution.get(normalized);
    entry.count += 1;
  });

  return Array.from(distribution.values()).sort((a, b) => a.orderIndex - b.orderIndex);
};

const formatPercentageLabel = (value) => {
  if (value <= 0) return '0%';
  if (value < 1) return '<1%';
  if (value >= 10) return `${Math.round(value)}%`;
  return `${value.toFixed(1)}%`;
};

const ChartCard = ({ title, description, data, loading, accentColor }) => {
  if (loading) {
    return (
      <article className="flex h-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <div className="h-4 w-36 rounded bg-slate-200/70 animate-pulse" />
          <div className="h-3 w-48 rounded bg-slate-200/50 animate-pulse" />
        </div>
        <div className="mt-2 flex h-36 items-end gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-28 w-full items-end rounded-lg bg-slate-100/60">
                <div className="w-full rounded-t-lg bg-slate-300/80 animate-pulse" style={{ height: `${40 + index * 10}%` }} />
              </div>
              <div className="h-3 w-12 rounded bg-slate-200/70 animate-pulse" />
              <div className="h-3 w-16 rounded bg-slate-200/50 animate-pulse" />
            </div>
          ))}
        </div>
      </article>
    );
  }

  const hasData = data.some((item) => item.count > 0);
  const maxCount = data.reduce((max, item) => Math.max(max, item.count), 0) || 1;

  return (
    <article className="flex h-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-[#0f172a]">{title}</h3>
        {description && <p className="mt-1 text-xs text-[#64748b]">{description}</p>}
      </div>
      <div className="mt-1 flex flex-1 items-end gap-4">
        {hasData ? (
          data.map((item) => {
            const ratio = item.count > 0 ? (item.count / maxCount) * 100 : 0;
            const height = item.count > 0 ? Math.max(ratio, 12) : 0;

            return (
              <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-36 w-full items-end justify-center overflow-hidden rounded-lg bg-[#0f172a]/5">
                  <div
                    className="w-[70%] rounded-t-lg transition-all duration-300"
                    style={{ height: `${height}%`, backgroundColor: accentColor }}
                  />
                </div>
                <span className="text-center text-xs font-semibold text-[#0f172a]">{item.label}</span>
                <span className="text-center text-[11px] text-[#475569]">
                  {item.count.toLocaleString('es-CO')} <span className="text-[#00594e]">({item.percentageLabel})</span>
                </span>
              </div>
            );
          })
        ) : (
          <div className="flex h-36 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
            <p className="text-xs text-[#64748b]">No hay datos para graficar.</p>
          </div>
        )}
      </div>
    </article>
  );
};

const UserStatsCharts = ({
  users = [],
  loading = false,
  error = '',
  permisoLabels = [],
  estadoLabels = [],
  className = '',
  title = 'Resumen de usuarios',
  description = 'Distribucion en tiempo real por tipo de permiso y estado.',
}) => {
  const totalUsers = Array.isArray(users) ? users.length : 0;

  const { permisoData, estadoData } = useMemo(() => {
    const withPercentages = (distribution) =>
      distribution.map((item) => {
        const percentageValue = totalUsers ? (item.count / totalUsers) * 100 : 0;
        return {
          ...item,
          percentage: percentageValue,
          percentageLabel: formatPercentageLabel(percentageValue),
        };
      });

    return {
      permisoData: withPercentages(buildDistribution(users, 'permisoSistema', permisoLabels)),
      estadoData: withPercentages(buildDistribution(users, 'estado', estadoLabels)),
    };
  }, [users, permisoLabels, estadoLabels, totalUsers]);

  const containerClasses = ['space-y-4'];
  if (className) {
    containerClasses.push(className);
  }

  return (
    <section className={containerClasses.join(' ')}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0f172a]">{title}</h2>
          <p className="text-sm text-[#475569]">{description}</p>
        </div>
        <div className="sm:text-right">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Total de usuarios</span>
          <p className="text-lg font-semibold text-[#0f172a]">{totalUsers.toLocaleString('es-CO')}</p>
        </div>
      </div>

      {error && !loading && (
        <div className="rounded-lg border border-[#B5A160]/50 bg-[#B5A160]/10 px-4 py-3 text-sm text-[#8c7030]">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Por permiso del sistema"
          description="Distribucion por nivel de acceso asignado."
          data={permisoData}
          loading={loading}
          accentColor="#0f766e"
        />
        <ChartCard
          title="Por estado"
          description="Usuarios activos frente a inactivos."
          data={estadoData}
          loading={loading}
          accentColor="#B5A160"
        />
      </div>
    </section>
  );
};

export default UserStatsCharts;
