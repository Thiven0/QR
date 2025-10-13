import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';

const formatDateTime = (value) => {
  if (!value) return 'Sin registrar';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
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

const RegistroDirectory = () => {
  const { token } = useAuth();
  const [registros, setRegistros] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  console.log(selected)
  useEffect(() => {
    const fetchRegistros = async () => {
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
    };

    fetchRegistros();
  }, [token]);

  const sortedRegistros = useMemo(() => {
    return [...registros].sort((a, b) => {
      const createdA = getRegistroTimestamp(a, ['createdAt', 'created_at', 'fechaEntrada']);
      const createdB = getRegistroTimestamp(b, ['createdAt', 'created_at', 'fechaEntrada']);

      const dateA = new Date(createdA || 0).getTime();
      const dateB = new Date(createdB || 0).getTime();
      return dateB - dateA;
    });
  }, [registros]);

  const renderStatusBadge = (registro) => {
    const isOpen = !registro?.fechaSalida;
    const baseClasses = 'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold';

    if (isOpen) {
      return (
        <span className={`${baseClasses}  bg-[#dcfce7] text-[#166534]`}>
          <span className="h-2 w-2 rounded-full  bg-[#16a34a]" />
          En progreso
        </span>
      );
    }

    return (
      <span className={`${baseClasses} bg-[#fef3c7] text-[#92400e]`}>
        <span className="h-2 w-2 rounded-full bg-[#f97315]" />
        Finalizado
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4">
      <div className="mx-auto flex max-w-6xl flex-col items-center">
        <h1 className="text-3xl font-bold text-[#0f172a]">Historial de registros</h1>
        <p className="mt-2 text-sm text-[#475569] text-center">
          Consulta las entradas y salidas registradas por los administradores y celadores.
        </p>

        {error && (
          <div className="mt-6 w-full max-w-4xl rounded-lg border border-[#B5A160] bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030]">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-10 text-sm font-medium text-[#00594e]">Cargando registros...</p>
        ) : (
          <div className="mt-10 grid w-full max-w-5xl grid-cols-1 gap-4 lg:grid-cols-2">
            {sortedRegistros.length === 0 ? (
              <p className="text-sm text-[#475569]">
                No se encontraron registros. Empieza escaneando un codigo QR para generar movimientos.
              </p>
            ) : (
              sortedRegistros.map((registro) => {
                const usuario = registro?.usuario || {};
                const administrador = registro?.administrador || {};

                return (
                  <button
                    key={registro._id}
                    type="button"
                    className="flex h-full flex-col gap-4 rounded-xl border border-[#e2e8f0] bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#0f766e] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#00594e]/60"
                    onClick={() => setSelected(registro)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold text-[#0f172a]">
                        {usuario?.nombre} {usuario?.apellido}
                      </h2>
                      {renderStatusBadge(registro)}
                    </div>
                    <div className="space-y-2 text-sm text-[#475569]">
                      <p>
                        <span className="font-semibold text-[#0f172a]">Correo:</span>{' '}
                        {usuario?.email || 'Sin correo'}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0f172a]">Administrador:</span>{' '}
                        {administrador?.nombre ? `${administrador.nombre}` : 'N/A'}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0f172a]">Entrada:</span>{' '}
                        {formatDateTime(registro.fechaEntrada)} (hora {formatTime(registro.horaEntrada)})
                      </p>
                      <p>
                        <span className="font-semibold text-[#0f172a]">Salida:</span>{' '}
                        {formatDateTime(registro.fechaSalida)}{' '}
                        {registro.horaSalida ? `(hora ${formatTime(registro.horaSalida)})` : ''}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0f172a]">Duracion:</span>{' '}
                        {formatDurationValue(registro.duracionSesion)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="absolute right-4 top-4 rounded-full bg-[#b91c1c] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#991b1b]"
              onClick={() => setSelected(null)}
              type="button"
            >
              Cerrar
            </button>

            <h3 className="text-2xl font-semibold text-[#0f172a]">Detalle del registro</h3>
            <p className="mt-1 text-sm text-[#475569]">
              Consulta la informacion completa del movimiento seleccionado.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">Usuario</h4>
                <div className="mt-3 space-y-2 text-sm text-[#475569]">
                  <p><span className="font-semibold text-[#0f172a]">Nombre:</span> {selected.usuario?.nombre} {selected.usuario?.apellido}</p>
                  <p><span className="font-semibold text-[#0f172a]">Correo:</span> {selected.usuario?.email || 'Sin correo'}</p>
                  
                </div>
              </section>

              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">Administrador / Celador</h4>
                <div className="mt-3 space-y-2 text-sm text-[#475569]">
                  <p><span className="font-semibold text-[#0f172a]">Nombre:</span> {selected.administrador?.nombre || 'Sin asignar'}</p>
                  <p><span className="font-semibold text-[#0f172a]">Correo:</span> {selected.administrador?.email || 'Sin correo'}</p>
                </div>
              </section>
            </div>

            <section className="mt-6">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">Tiempos</h4>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 text-sm text-[#475569]">
                <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <p className="font-semibold text-[#0f172a]">Entrada</p>
                  <p>{formatDateTime(selected.fechaEntrada)}</p>
                  <p className="text-xs text-[#64748b]">Hora registrada: {formatTime(selected.horaEntrada)}</p>
                </div>
                <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <p className="font-semibold text-[#0f172a]">Salida</p>
                  <p>{formatDateTime(selected.fechaSalida)}</p>
                  <p className="text-xs text-[#64748b]">Hora registrada: {formatTime(selected.horaSalida)}</p>
                </div>
              </div>
            </section>

            <section className="mt-6">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0f766e]">Resumen</h4>
              <div className="mt-3 rounded-lg border border-[#e2e8f0] bg-[#ecfeff] p-4 text-sm text-[#0f172a]">
                <p><span className="font-semibold">Duracion de la sesion:</span> {formatDurationValue(selected.duracionSesion)}</p>
                <p className="mt-1 text-xs text-[#0f172a]/70">
                  Creado el {formatDateTime(getRegistroTimestamp(selected, ['createdAt', 'created_at']))} - Actualizado el {formatDateTime(getRegistroTimestamp(selected, ['updatedAt', 'updated_at']))}
                </p>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroDirectory;
