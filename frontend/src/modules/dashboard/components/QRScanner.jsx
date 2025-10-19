import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QrScanner from 'react-qr-scanner';
import useAuth from '../../auth/hooks/useAuth';
import { apiRequest } from '../../../services/apiClient';

const PARSED_FIELDS_ORDER = [
  { key: 'nombre' },
  { key: 'cedula' },
  { key: 'programa' },
  { key: 'tipo_sangre' },
  { key: 'telefono' },
];

const TAB_USER = 'user';
const TAB_VEHICLE = 'vehicle';

const renderParsedData = (parsed) => {
  if (!parsed || typeof parsed !== 'object') return null;

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-slate-200 bg-[#f8fafc] p-4">
      {PARSED_FIELDS_ORDER.map(({ key }) => (
        <div key={key} className="space-y-1">
          <p className="text-xs font-semibold text-[#0f766e]">{key}</p>
          <p className="rounded-md bg-white px-3 py-2 text-sm text-[#0f172a] shadow-sm">
            {parsed[key] ? String(parsed[key]) : 'Sin registrar'}
          </p>
        </div>
      ))}
    </div>
  );
};

const renderUserDetails = (user) => {
  if (!user || typeof user !== 'object') return null;

  const entries = Object.entries(user).filter(([key]) => key !== 'imagen' && key !== 'imagenQR' && key !== 'password');

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-[#0f172a]/10 bg-[#f1f5f9] p-4">
      {user.imagen && (
        <div className="flex items-center gap-4">
          <img
            src={user.imagen}
            alt={user.nombre ? `Foto de ${user.nombre}` : 'Foto del usuario'}
            className="h-20 w-20 rounded-full border border-slate-200 object-cover shadow-sm"
          />
          <div>
            <p className="text-sm font-semibold text-[#0f172a]">
              {user.nombre} {user.apellido}
            </p>
            {user.email && <p className="text-xs text-[#475569]">{user.email}</p>}
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">{key}</p>
            <p className="break-words text-sm text-[#0f172a]">{String(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const VehicleStatusChip = ({ estado }) => {
  const isActive = String(estado).toLowerCase() === 'activo';
  const classes = isActive
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-slate-200 text-slate-700 border-slate-300';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${classes}`}>
      {isActive ? 'Activo' : 'Inactivo'}
    </span>
  );
};

const renderVehicleDetails = (vehicle) => {
  if (!vehicle) return null;

  const rows = [
    { label: 'Tipo', value: vehicle.type || 'Sin especificar' },
    { label: 'Marca', value: vehicle.brand || 'Sin marca' },
    { label: 'Modelo', value: vehicle.model || 'Sin modelo' },
    { label: 'Color', value: vehicle.color || 'Sin color' },
    { label: 'Placa / identificador', value: vehicle.plate || 'Sin placa' },
    { label: 'Notas', value: vehicle.notes || 'Sin notas' },
  ];

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0f172a]">Resumen del vehiculo</h3>
        <VehicleStatusChip estado={vehicle.estado} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">{label}</p>
            <p className="text-sm text-[#1f2937]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const buildFeedbackBox = (feedback) => {
  if (!feedback) return null;
  const isSuccess = feedback.type === 'success';
  const base =
    'mt-6 rounded-lg border px-4 py-3 text-sm font-semibold transition';
  const tone = isSuccess
    ? 'border-[#0f766e] bg-[#0f766e]/10 text-[#0b5f58]'
    : 'border-[#b91c1c] bg-[#fee2e2] text-[#7f1d1d]';
  return <div className={`${base} ${tone}`}>{feedback.message}</div>;
};

const QRScannerPage = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState(TAB_USER);
  const [scannerKey, setScannerKey] = useState(0);
  const [cameraActive, setCameraActive] = useState(true);
  const audioContextRef = useRef(null);

  // User scan state
  const [userScanData, setUserScanData] = useState(null);
  const [userError, setUserError] = useState('');
  const [userFeedback, setUserFeedback] = useState(null);
  const [userProcessing, setUserProcessing] = useState(false);
  const [userLastRawText, setUserLastRawText] = useState('');
  const [userResetting, setUserResetting] = useState(false);

  // Vehicle scan state
  const [vehicleScanData, setVehicleScanData] = useState(null);
  const [vehicleError, setVehicleError] = useState('');
  const [vehicleFeedback, setVehicleFeedback] = useState(null);
  const [vehicleProcessing, setVehicleProcessing] = useState(false);
  const [vehicleLastRawText, setVehicleLastRawText] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [togglingVehicle, setTogglingVehicle] = useState(false);

  const resetUserState = () => {
    setUserScanData(null);
    setUserError('');
    setUserFeedback(null);
    setUserProcessing(false);
    setUserLastRawText('');
    setUserResetting(false);
  };

  const resetVehicleState = () => {
    setVehicleScanData(null);
    setVehicleError('');
    setVehicleFeedback(null);
    setVehicleProcessing(false);
    setVehicleLastRawText('');
    setSelectedVehicleId('');
    setTogglingVehicle(false);
  };

  const playBeep = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const context = audioContextRef.current;
      if (context.state === 'suspended') {
        context.resume().catch(() => {});
      }

      const duration = 0.15;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.connect(gain);
      gain.connect(context.destination);

      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + duration);
    } catch (error) {
      console.error('No se pudo reproducir el aviso sonoro del escaneo.', error);
    }
  }, [audioContextRef]);

  useEffect(() => {
    return () => {
      const context = audioContextRef.current;
      if (context?.close) {
        context.close().catch(() => {});
      }
      audioContextRef.current = null;
    };
  }, [audioContextRef]);

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setScannerKey((prev) => prev + 1);
    setCameraActive(true);
    if (tab === TAB_USER) {
      resetUserState();
    } else {
      resetVehicleState();
    }
  };

  const parseScanData = async (rawText) => {
    const parsedResponse = await apiRequest('/users/parse-scan', {
      method: 'POST',
      data: { rawText },
      token,
    });
    return parsedResponse.data;
  };

  const validateScanData = async (parsedData) => {
    return apiRequest('/users/validate-scan', {
      method: 'POST',
      data: { data: parsedData },
      token,
    });
  };

  const handleUserScan = async (data) => {
    const rawText = data?.text?.trim();

    if (!rawText || userProcessing || rawText === userLastRawText) {
      return;
    }

    if (!token) {
      setUserFeedback({
        type: 'error',
        message: 'Inicia sesion para procesar el escaneo.',
      });
      return;
    }

    setCameraActive(false);
    setUserProcessing(true);
    setUserFeedback(null);
    setUserError('');

    try {
      const parsedData = await parseScanData(rawText);
      const scannedAt = new Date().toISOString();
      const baseData = {
        rawText,
        scannedAt,
        parsed: parsedData,
      };

      setUserScanData(baseData);
      setUserLastRawText(rawText);
      playBeep();

      const validationResponse = await validateScanData(parsedData);
      const { userId, user, message } = validationResponse;

      setUserScanData((prev) => ({
        ...(prev || baseData),
        userId,
        user,
      }));

      setUserFeedback({
        type: 'success',
        message: message || 'Usuario encontrado',
      });

      if (userId) {
        const registroResponse = await apiRequest('/exitEntry/from-scan', {
          method: 'POST',
          data: { userId },
          token,
        });

        setUserScanData((prev) => ({
          ...(prev || baseData),
          userId,
          user,
          registro: registroResponse.data || registroResponse.registro || registroResponse,
        }));
      }
    } catch (error) {
      console.error(error);
      const message =
        error.details?.message ||
        error.message ||
        'No se pudo procesar el codigo escaneado.';
      setUserFeedback({
        type: 'error',
        message,
      });
      setUserLastRawText('');
    } finally {
      setUserProcessing(false);
      setTimeout(() => setUserLastRawText(''), 2000);
    }
  };

  const handleVehicleScan = async (data) => {
    const rawText = data?.text?.trim();

    if (!rawText || vehicleProcessing || rawText === vehicleLastRawText) {
      return;
    }

    if (!token) {
      setVehicleFeedback({
        type: 'error',
        message: 'Inicia sesion para procesar el escaneo.',
      });
      return;
    }

    setCameraActive(false);
    setVehicleProcessing(true);
    setVehicleFeedback(null);
    setVehicleError('');

    try {
      const parsedData = await parseScanData(rawText);
      const scannedAt = new Date().toISOString();
      const baseData = {
        rawText,
        scannedAt,
        parsed: parsedData,
      };

      setVehicleScanData(baseData);
      setVehicleLastRawText(rawText);
      playBeep();

      const validationResponse = await validateScanData(parsedData);
      const { userId, user, message } = validationResponse;

      const vehiclesResponse = await apiRequest(`/users/${userId}/vehicles`, {
        token,
      });
      const vehiclesData = Array.isArray(vehiclesResponse)
        ? vehiclesResponse
        : vehiclesResponse?.data || [];

      if (!vehiclesData.length) {
        setVehicleScanData({
          ...(baseData || {}),
          userId,
          user,
          vehicles: [],
        });
        setVehicleFeedback({
          type: 'error',
          message: 'El usuario no tiene vehiculos asociados.',
        });
        setSelectedVehicleId('');
        return;
      }

      setVehicleScanData({
        ...(baseData || {}),
        userId,
        user,
        vehicles: vehiclesData,
      });
      setSelectedVehicleId(vehiclesData[0]._id);
      setVehicleFeedback({
        type: 'success',
        message: message || 'Selecciona un vehiculo para cambiar su estado.',
      });
    } catch (error) {
      console.error(error);
      const message =
        error.details?.message ||
        error.message ||
        'No se pudo procesar el codigo escaneado.';
      setVehicleError(message);
      setVehicleLastRawText('');
    } finally {
      setVehicleProcessing(false);
      setTimeout(() => setVehicleLastRawText(''), 2000);
    }
  };

  const handleScan = (data) => {
    if (activeTab === TAB_USER) {
      handleUserScan(data);
    } else {
      handleVehicleScan(data);
    }
  };

  const handleError = (error) => {
    console.error(error);
    if (activeTab === TAB_USER) {
      setUserError('No fue posible acceder a la camara.');
    } else {
      setVehicleError('No fue posible acceder a la camara.');
    }
  };

  const handleUserReset = async () => {
    if (!token) {
      setUserFeedback({
        type: 'error',
        message: 'Inicia sesion para reiniciar el escaneo.',
      });
      return;
    }

    setCameraActive(true);
    setUserResetting(true);
    resetUserState();
    setScannerKey((prev) => prev + 1);

    try {
      const response = await apiRequest('/exitEntry/reset-scan', {
        method: 'POST',
        token,
      });

      const message =
        response?.message ||
        response?.data?.message ||
        'Datos del escaneo limpiados. Puedes escanear nuevamente.';

      setUserFeedback({
        type: 'success',
        message,
      });
    } catch (error) {
      console.error(error);
      const message =
        error.details?.message ||
        error.message ||
        'No se pudo limpiar la informacion del escaneo.';
      setUserFeedback({
        type: 'error',
        message,
      });
    } finally {
      setUserResetting(false);
      setUserProcessing(false);
      setUserLastRawText('');
    }
  };

  const handleVehicleReset = () => {
    resetVehicleState();
    setCameraActive(true);
    setScannerKey((prev) => prev + 1);
  };

  const handleReset = () => {
    if (activeTab === TAB_USER) {
      handleUserReset();
    } else {
      handleVehicleReset();
    }
  };

  const handleToggleVehicle = async () => {
    if (!selectedVehicleId || !token) {
      setVehicleFeedback({
        type: 'error',
        message: 'Selecciona un vehiculo para continuar.',
      });
      return;
    }

    setTogglingVehicle(true);

    try {
      const response = await apiRequest(`/vehicles/${selectedVehicleId}/toggle-status`, {
        method: 'POST',
        token,
      });

      const updatedVehicle = response.data || response.vehicle || null;
      const updatedUser = response.user || null;

      setVehicleScanData((prev) => {
        if (!prev) return prev;
        const nextVehicles = (prev.vehicles || []).map((vehicle) =>
          vehicle._id === updatedVehicle._id ? updatedVehicle : vehicle
        );
        return {
          ...prev,
          vehicles: nextVehicles,
          user: updatedUser || prev.user,
        };
      });

      setVehicleFeedback({
        type: 'success',
        message: response.message || `Vehiculo marcado como ${updatedVehicle?.estado || 'actualizado'}.`,
      });
    } catch (error) {
      console.error(error);
      const message =
        error.details?.message ||
        error.message ||
        'No fue posible actualizar el estado del vehiculo.';
      setVehicleFeedback({
        type: 'error',
        message,
      });
    } finally {
      setTogglingVehicle(false);
    }
  };

  const selectedVehicle = useMemo(() => {
    if (!vehicleScanData?.vehicles?.length || !selectedVehicleId) return null;
    return vehicleScanData.vehicles.find((vehicle) => vehicle._id === selectedVehicleId) || null;
  }, [vehicleScanData, selectedVehicleId]);

  const instructionTitle =
    activeTab === TAB_USER ? 'Escanear usuario' : 'Escanear vehiculo';
  const instructionDescription =
    activeTab === TAB_USER
      ? 'Apunta la camara hacia el codigo para registrar ingresos y salidas del usuario.'
      : 'Escanea el codigo del usuario y selecciona el vehiculo para cambiar su estado.';

  const feedbackNode =
    activeTab === TAB_USER
      ? buildFeedbackBox(userFeedback)
      : buildFeedbackBox(vehicleFeedback);

  const errorMessage = activeTab === TAB_USER ? userError : vehicleError;
  const processing = activeTab === TAB_USER ? userProcessing : vehicleProcessing;
  const resetting = activeTab === TAB_USER ? userResetting : false;

  return (
    <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="text-sm font-medium text-center text-[#64748b] border-b border-slate-200">
          <ul className="flex flex-wrap -mb-px">
            {[{ id: TAB_USER, label: 'Usuarios' }, { id: TAB_VEHICLE, label: 'Vehiculos' }].map((tab) => {
              const isActive = activeTab === tab.id;
              const baseClasses =
                'inline-block px-5 py-3 border-b-2 border-transparent rounded-t-lg transition-colors';
              const activeClasses = 'text-[#00594e] border-[#00594e] font-semibold';
              const inactiveClasses =
                'text-[#475569] hover:text-[#0f172a] hover:border-slate-300';
              return (
                <li key={tab.id} className="me-2">
                  <button
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.45fr_0.9fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#00594e]">Control de accesos</p>
              <h1 className="text-3xl font-bold text-[#0f172a]">{instructionTitle}</h1>
              <p className="text-sm text-[#475569]">{instructionDescription}</p>
            </div>

            <div className="mt-8 rounded-2xl border-2 border-dashed border-[#00594e]/40 bg-[#f1f5f9] p-6">
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-900/5">
                {cameraActive ? (
                  <QrScanner
                    key={scannerKey}
                    delay={400}
                    onError={handleError}
                    onScan={handleScan}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white text-center text-sm font-semibold text-[#475569]">
                    Camara detenida tras el ultimo escaneo.
                    <br />
                    Usa &quot;Escanear nuevamente&quot; para reactivarla.
                  </div>
                )}
              </div>
              {processing && (
                <p className="mt-3 text-center text-sm font-medium text-[#00594e]">Procesando escaneo...</p>
              )}
            </div>

            {errorMessage && (
              <div className="mt-6 rounded-lg border border-[#B5A160] bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030]">
                {errorMessage}
              </div>
            )}

            {feedbackNode}

            <button
              type="button"
              onClick={handleReset}
              disabled={processing || resetting || togglingVehicle}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00594e] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#00463f] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
            >
              {activeTab === TAB_USER
                ? resetting
                  ? 'Limpiando...'
                  : 'Escanear nuevamente'
                : 'Limpiar informacion'}
            </button>
          </article>

          <aside className="flex flex-col gap-6 rounded-2xl border border-[#00594e]/20 bg-white p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold text-[#0f172a]">Resultado del escaneo</h2>
              {activeTab === TAB_USER ? (
                userScanData ? (
                  <div className="mt-4 space-y-6">
                    <div>
                      <p className="text-sm font-semibold text-[#0f172a]">Datos escaneados</p>
                      {renderParsedData(userScanData.parsed)}
                    </div>

                    {userScanData.user && (
                      <div>
                        <p className="text-sm font-semibold text-[#0f172a]">Usuario validado</p>
                        {renderUserDetails(userScanData.user)}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[#475569]">
                    Esperando un escaneo. Mantenga el codigo dentro del marco para ver la lectura aqui.
                  </p>
                )
              ) : vehicleScanData ? (
                <div className="mt-4 space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">Datos escaneados</p>
                    {renderParsedData(vehicleScanData.parsed)}
                  </div>

                  {vehicleScanData.user && (
                    <div>
                      <p className="text-sm font-semibold text-[#0f172a]">Propietario</p>
                      {renderUserDetails(vehicleScanData.user)}
                    </div>
                  )}

                  {vehicleScanData.vehicles && vehicleScanData.vehicles.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">
                        Selecciona un vehiculo
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {vehicleScanData.vehicles.map((vehicle) => {
                          const isSelected = selectedVehicleId === vehicle._id;
                          return (
                            <button
                              key={vehicle._id}
                              type="button"
                              onClick={() => setSelectedVehicleId(vehicle._id)}
                              className={`w-full rounded-xl border p-4 text-left transition ${
                                isSelected
                                  ? 'border-[#0f766e] bg-[#ecfeff] shadow-md'
                                  : 'border-slate-200 bg-white hover:border-[#0f766e]/60 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-[#0f172a]">
                                    {vehicle.type || 'Sin tipo'}
                                  </p>
                                  <p className="text-xs text-[#475569]">
                                    Placa: {vehicle.plate || 'Sin placa'}
                                  </p>
                                </div>
                                <VehicleStatusChip estado={vehicle.estado} />
                              </div>
                              <div className="mt-3 space-y-1 text-xs text-[#475569]">
                                <p>Color: {vehicle.color || 'Sin color'}</p>
                                <p>Modelo: {vehicle.model || 'Sin modelo'}</p>
                              </div>
                              {isSelected && (
                                <span className="mt-3 inline-flex items-center rounded-full bg-[#0f766e]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#0f766e]">
                                  Seleccionado
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {renderVehicleDetails(selectedVehicle)}
                      <button
                        type="button"
                        onClick={handleToggleVehicle}
                        disabled={togglingVehicle || !selectedVehicleId}
                        className="inline-flex items-center justify-center rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0c5b55] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {togglingVehicle ? 'Actualizando...' : 'Cambiar estado del vehiculo'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-[#b91c1c]">
                      {vehicleFeedback?.type === 'error'
                        ? vehicleFeedback.message
                        : 'No hay vehiculos registrados para este usuario.'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#475569]">
                  Esperando un escaneo. Mantenga el codigo dentro del marco para ver la lectura aqui.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default QRScannerPage;
