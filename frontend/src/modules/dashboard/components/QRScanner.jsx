import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiTruck, FiUserCheck } from 'react-icons/fi';
import QrScanner from 'react-qr-scanner';
import clsx from 'clsx';
import useAuth from '../../auth/hooks/useAuth';
import { apiRequest } from '../../../services/apiClient';

const TAB_USER = 'user';
const TAB_VEHICLE = 'vehicle';

const TAB_ITEMS = [
  {
    id: TAB_USER,
    label: 'Usuarios',
    description: 'Registra ingresos o salidas',
    icon: FiUserCheck,
    accent: '#0f766e',
  },
  {
    id: TAB_VEHICLE,
    label: 'Vehiculos',
    description: 'Gestiona el estado del vehiculo',
    icon: FiTruck,
    accent: '#b45309',
  },
];

const MOVEMENT_OPTIONS = [
  {
    id: 'entry',
    title: 'Ingresando',
    description: 'Marcara el ingreso y dejara al usuario en estado activo.',
  },
  {
    id: 'exit',
    title: 'Saliendo',
    description: 'Cerrara la sesion actual y dejara al usuario inactivo.',
  },
];

const formatDocumentDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const renderUserDetails = (user) => {
  if (!user || typeof user !== 'object') return null;

  const entries = Object.entries(user).filter(
    ([key]) => key !== 'imagen' && key !== 'imagenQR' && key !== 'password' && key !== 'documentIdentity' && key !== 'dataConsent'
  );
  const documentIdentity = user.documentIdentity;
  const documentData = documentIdentity?.extractedData || {};
  const birthDate = documentData.fechaNacimiento ? formatDocumentDate(documentData.fechaNacimiento) : null;
  const consentAcceptedAt = user.dataConsent?.acceptedAt ? formatDocumentDate(user.dataConsent.acceptedAt) : null;

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

      {documentIdentity?.photo && (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row">
          <img
            src={documentIdentity.photo}
            alt={user.nombre ? `Documento de ${user.nombre}` : 'Documento escaneado'}
            className="h-24 w-36 rounded-lg border border-slate-200 object-cover"
          />
          <div className="flex-1 text-sm text-[#0f172a]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">Documento capturado</p>
            {documentData.cedula && (
              <p className="font-semibold text-[#0f172a]">CC {documentData.cedula}</p>
            )}
            {(documentData.nombres || documentData.apellidos) && (
              <p className="text-xs text-[#475569]">
                {[documentData.nombres, documentData.apellidos].filter(Boolean).join(' ')}
              </p>
            )}
            {birthDate && (
              <p className="text-xs text-[#475569]">Nacimiento: {birthDate}</p>
            )}
            {consentAcceptedAt && (
              <p className="text-[11px] text-[#94a3b8]">Consentimiento: {consentAcceptedAt}</p>
            )}
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
  const { token, user: authUser } = useAuth();
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
  const [showUserConfirmation, setShowUserConfirmation] = useState(false);
  const [userMovementType, setUserMovementType] = useState('entry');
  const [confirmingUserMovement, setConfirmingUserMovement] = useState(false);
  const [userConfirmationError, setUserConfirmationError] = useState('');
  const [exitWithoutVehicleAcknowledged, setExitWithoutVehicleAcknowledged] = useState(false);
  const [exitWithoutVehicleNote, setExitWithoutVehicleNote] = useState('');

  // Vehicle scan state
  const [vehicleScanData, setVehicleScanData] = useState(null);
  const [vehicleError, setVehicleError] = useState('');
  const [vehicleFeedback, setVehicleFeedback] = useState(null);
  const [vehicleProcessing, setVehicleProcessing] = useState(false);
  const [vehicleLastRawText, setVehicleLastRawText] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [showVehicleConfirmation, setShowVehicleConfirmation] = useState(false);
  const [vehicleMovementType, setVehicleMovementType] = useState('entry');
  const [confirmingVehicleMovement, setConfirmingVehicleMovement] = useState(false);
  const [vehicleConfirmationError, setVehicleConfirmationError] = useState('');
  const [vehicleSelectionLocked, setVehicleSelectionLocked] = useState(false);

  const activeVehicle = userScanData?.activeRegistro?.vehiculo || null;
  const requiresVehicleWarning = userMovementType === 'exit' && !!activeVehicle;
  const vehicleDisplayLabel = activeVehicle?.plate || activeVehicle?.type || 'vehiculo registrado';
  const guardDisplayName = useMemo(() => {
    if (!authUser) return '';
    return [authUser?.nombre, authUser?.apellido].filter(Boolean).join(' ').trim();
  }, [authUser]);

  const resetUserState = () => {
    setUserScanData(null);
    setUserError('');
    setUserFeedback(null);
    setUserProcessing(false);
    setUserLastRawText('');
    setUserResetting(false);
    setShowUserConfirmation(false);
    setUserMovementType('entry');
    setConfirmingUserMovement(false);
    setUserConfirmationError('');
    setExitWithoutVehicleAcknowledged(false);
    setExitWithoutVehicleNote('');
  };

  const resetVehicleState = () => {
    setVehicleScanData(null);
    setVehicleError('');
    setVehicleFeedback(null);
    setVehicleProcessing(false);
    setVehicleLastRawText('');
    setSelectedVehicleId('');
    setShowVehicleConfirmation(false);
    setVehicleMovementType('entry');
    setConfirmingVehicleMovement(false);
    setVehicleConfirmationError('');
    setVehicleSelectionLocked(false);
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
        activeRegistro: null,
      };

      setUserScanData(baseData);
      setUserLastRawText(rawText);
      playBeep();

      const validationResponse = await validateScanData(parsedData);
      const { userId, user, message, activeRegistro } = validationResponse;

      setUserScanData((prev) => ({
        ...(prev || baseData),
        userId,
        user,
        activeRegistro: activeRegistro || null,
      }));

      setUserFeedback({
        type: 'success',
        message: message || 'Usuario validado. Selecciona el movimiento y confirma el registro.',
      });

      if (!userId) {
        setShowUserConfirmation(false);
        return;
      }

      const defaultMovement = (user?.estado || '').toLowerCase() === 'activo' ? 'exit' : 'entry';
      setUserMovementType(defaultMovement);
      setShowUserConfirmation(true);
      setUserConfirmationError('');
      setExitWithoutVehicleAcknowledged(false);
      setExitWithoutVehicleNote('');
    } catch (error) {
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
      const { userId, user, message, activeRegistro } = validationResponse;

      if (!userId) {
        setVehicleFeedback({
          type: 'error',
          message: 'No se pudo identificar al usuario escaneado.',
        });
        setVehicleLastRawText('');
        return;
      }

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
        activeRegistro: activeRegistro || null,
      });

      const lockedVehicleId = activeRegistro?.vehiculo?._id || '';
      const defaultMovement = (user?.estado || '').toLowerCase() === 'activo' ? 'exit' : 'entry';

      if (lockedVehicleId) {
        setSelectedVehicleId(lockedVehicleId);
        setVehicleSelectionLocked(true);
      } else {
        setSelectedVehicleId(vehiclesData[0]?._id || '');
        setVehicleSelectionLocked(false);
      }

      setVehicleMovementType(defaultMovement);
      setVehicleConfirmationError('');
      setVehicleFeedback({
        type: 'success',
        message: message || 'Selecciona un vehiculo para cambiar su estado.',
      });
      setShowVehicleConfirmation(true);
    } catch (error) {
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

  const buildVehicleWarningObservation = () => {
    if (!activeVehicle) return '';
    const timestamp = new Date().toLocaleString('es-CO');
    const responsible = guardDisplayName || 'Operador';
    return `Salida sin vehiculo confirmada desde el escaner de usuarios el ${timestamp} por ${responsible}. El vehiculo ${vehicleDisplayLabel} permanece activo dentro de la institucion.`;
  };

  useEffect(() => {
    if (!showUserConfirmation) {
      setExitWithoutVehicleAcknowledged(false);
      setExitWithoutVehicleNote('');
    }
  }, [showUserConfirmation]);

  useEffect(() => {
    if (userMovementType !== 'exit') {
      setExitWithoutVehicleAcknowledged(false);
      setExitWithoutVehicleNote('');
    }
  }, [userMovementType]);

  const handleConfirmUserMovement = async () => {
    if (!token) {
      setUserConfirmationError('Inicia sesion para confirmar el registro.');
      return;
    }
    if (!userScanData?.userId) {
      setUserConfirmationError('No hay un usuario validado para registrar.');
      return;
    }
    if (requiresVehicleWarning && !exitWithoutVehicleAcknowledged) {
      setUserConfirmationError('Confirma que el usuario sale sin su vehiculo antes de continuar.');
      return;
    }

    setConfirmingUserMovement(true);
    setUserConfirmationError('');

    try {
      const exitObservation = requiresVehicleWarning
        ? [buildVehicleWarningObservation(), exitWithoutVehicleNote.trim()].filter(Boolean).join(' ')
        : undefined;
      const payload = {
        userId: userScanData.userId,
        direction: userMovementType,
      };
      if (exitObservation) {
        payload.exitObservation = exitObservation;
      }

      const response = await apiRequest('/exitEntry/from-scan', {
        method: 'POST',
        token,
        data: payload,
      });

      const registro = response.data || response.registro || response;
      const updatedUser = response.user || userScanData.user;

      setUserScanData((prev) => ({
        ...(prev || {}),
        registro,
        user: updatedUser,
        activeRegistro: null,
      }));

      setUserFeedback({
        type: 'success',
        message: response.message || 'Registro confirmado correctamente.',
      });
      setShowUserConfirmation(false);
      setExitWithoutVehicleAcknowledged(false);
      setExitWithoutVehicleNote('');
    } catch (error) {
      const message =
        error.details?.message ||
        error.message ||
        'No se pudo confirmar el movimiento del usuario.';
      setUserConfirmationError(message);
    } finally {
      setConfirmingUserMovement(false);
    }
  };

  const handleConfirmVehicleMovement = async () => {
    if (!token) {
      setVehicleConfirmationError('Inicia sesion para confirmar el registro.');
      return;
    }
    if (!vehicleScanData?.userId) {
      setVehicleConfirmationError('No hay un usuario validado para registrar.');
      return;
    }
    if (!selectedVehicleId) {
      setVehicleConfirmationError('Selecciona un vehiculo para continuar.');
      return;
    }

    setConfirmingVehicleMovement(true);
    setVehicleConfirmationError('');

    try {
      const response = await apiRequest('/exitEntry/from-scan', {
        method: 'POST',
        token,
        data: {
          userId: vehicleScanData.userId,
          direction: vehicleMovementType,
          vehicleId: selectedVehicleId,
        },
      });

      const registro = response.data || response.registro || response;
      const updatedVehicle = response.vehicle || registro?.vehiculo || null;
      const updatedUser = response.user || vehicleScanData.user;

      setVehicleScanData((prev) => {
        if (!prev) return prev;
        const updatedVehicles = Array.isArray(prev.vehicles)
          ? prev.vehicles.map((vehicle) =>
              updatedVehicle && vehicle._id === updatedVehicle._id ? updatedVehicle : vehicle
            )
          : prev.vehicles;

        return {
          ...prev,
          registro,
          user: updatedUser,
          vehicles: updatedVehicles,
        };
      });

      setVehicleFeedback({
        type: 'success',
        message: response.message || 'Registro confirmado correctamente. El vehiculo quedo actualizado.',
      });
      setShowVehicleConfirmation(false);
    } catch (error) {
      const message =
        error.details?.message ||
        error.message ||
        'No se pudo confirmar el movimiento con vehiculo.';
      setVehicleConfirmationError(message);
    } finally {
      setConfirmingVehicleMovement(false);
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
    <>
    <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border border-[#00594e]/15 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            {TAB_ITEMS.map(({ id, label, description, icon: Icon, accent }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleTabChange(id)}
                  aria-pressed={isActive}
                  className={`group flex w-full items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'border-[#00594e] bg-[#00594e]/5 shadow-md ring-0'
                      : 'border-slate-200 hover:border-[#0f766e]/60 hover:bg-[#0f766e]/5'
                  }`}
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isActive ? `${accent}1a` : '#f1f5f9',
                      color: accent,
                    }}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-base font-semibold text-[#0f172a]">{label}</span>
                    <span className="text-xs text-[#475569]">{description}</span>
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isActive
                        ? 'bg-[#00594e] text-white'
                        : 'bg-slate-100 text-[#475569]'
                    }`}
                  >
                    {isActive ? 'Activo' : 'Seleccionar'}
                  </span>
                </button>
              );
            })}
          </div>
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
              disabled={processing || resetting || confirmingVehicleMovement}
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
                userScanData && userScanData.user ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 text-sm text-[#475569]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">Usuario validado</p>
                      <p className="mt-2 text-base font-semibold text-[#0f172a]">
                        {`${userScanData.user.nombre || ''} ${userScanData.user.apellido || ''}`.trim() ||
                          'Sin nombre'}
                      </p>
                      <p className="text-xs text-[#94a3b8]">{userScanData.user.email || 'Sin correo'}</p>
                      <p className="mt-2 text-xs text-[#475569]">
                        Confirma el movimiento en el modal para registrar la entrada o salida.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUserConfirmationError('');
                        setShowUserConfirmation(true);
                      }}
                      className="inline-flex w-full items-center justify-center rounded-lg border border-[#0f766e]/40 px-4 py-2 text-sm font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/10"
                    >
                      Abrir confirmacion
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[#475569]">
                    Esperando un escaneo. Mantenga el codigo dentro del marco para ver la lectura aqui.
                  </p>
                )
              ) : vehicleScanData ? (
                vehicleScanData.vehicles && vehicleScanData.vehicles.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 text-sm text-[#475569]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">
                        Vehiculos asociados
                      </p>
                      <p className="mt-2 text-xs">
                        Selecciona el vehiculo correcto antes de confirmar el movimiento.
                      </p>
                      {vehicleSelectionLocked && selectedVehicle && (
                        <p className="mt-2 text-xs font-semibold text-[#b45309]">
                          El usuario ingreso con el vehiculo {selectedVehicle.plate || selectedVehicle.type || 'asignado'}.
                          No es posible cambiarlo para registrar la salida.
                        </p>
                      )}
                    </div>
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {vehicleScanData.vehicles.map((vehicle) => {
                            const isSelected = selectedVehicleId === vehicle._id;
                            const disabled = vehicleSelectionLocked && vehicle._id !== selectedVehicleId;
                            return (
                              <button
                                key={vehicle._id}
                                type="button"
                                onClick={() => {
                                  if (disabled) return;
                                  setSelectedVehicleId(vehicle._id);
                                }}
                                disabled={disabled}
                                className={`w-full rounded-xl border p-4 text-left transition ${
                                  isSelected
                                    ? 'border-[#0f766e] bg-[#ecfeff] shadow-md'
                                    : 'border-slate-200 bg-white hover:border-[#0f766e]/60 hover:shadow-sm'
                                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
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
                        <button
                          type="button"
                          onClick={() => {
                            setVehicleConfirmationError('');
                            setShowVehicleConfirmation(true);
                          }}
                        disabled={!selectedVehicleId}
                        className="inline-flex items-center justify-center rounded-lg border border-[#0f766e]/40 px-4 py-2 text-sm font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/10 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Abrir confirmacion
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[#b91c1c]">
                    {vehicleFeedback?.type === 'error'
                      ? vehicleFeedback.message
                      : 'No hay vehiculos registrados para este usuario.'}
                  </p>
                )
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

    {showUserConfirmation && userScanData?.user && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => {
            setShowUserConfirmation(false);
            setUserConfirmationError('');
          }}
        />
        <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              setShowUserConfirmation(false);
              setUserConfirmationError('');
            }}
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-[#475569] transition hover:bg-slate-200"
            aria-label="Cerrar confirmacion"
          >
            &times;
          </button>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0f766e]">Confirmar registro</p>
              <h3 className="text-2xl font-bold text-[#0f172a]">Selecciona el movimiento</h3>
              <p className="text-sm text-[#475569]">
                Indica si el usuario esta ingresando o saliendo antes de guardar el registro.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[#0f172a]">
                Estado actual:
                <span className="ml-1 font-semibold capitalize">{userScanData.user.estado || 'desconocido'}</span>
              </span>
              {userScanData?.registro?.horaEntrada && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[#0f172a]">
                  Ultimo movimiento:
                  <span className="ml-1 font-semibold">{userScanData.registro.horaEntrada}</span>
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {MOVEMENT_OPTIONS.map((option) => {
                const isSelected = userMovementType === option.id;
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition ${
                      isSelected ? 'border-[#00594e] bg-[#00594e]/5' : 'border-slate-200 hover:border-[#0f766e]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="movement-type"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => setUserMovementType(option.id)}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#0f172a]">{option.title}</p>
                      <p className="text-xs text-[#475569]">{option.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-[#f8fafc] p-4">
              {renderUserDetails(userScanData.user)}
            </div>

            <div
              className={clsx(
                'space-y-3 rounded-xl border p-4',
                requiresVehicleWarning
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-white text-[#475569]'
              )}
            >
              <div>
                <p className="text-sm font-semibold text-[#0f172a]">
                  Observaciones del registro
                </p>
                {requiresVehicleWarning ? (
                  <p className="mt-1 text-xs text-amber-800">
                    El usuario ingreso con el vehiculo {vehicleDisplayLabel}. Si confirmas la salida desde este escaner,
                    el vehiculo permanecera activo dentro de la institucion. Confirma que abandona el campus sin su vehiculo y registra una nota si corresponde.
                  </p>
                ) : (
                  <p className="mt-1 text-xs">
                    Agrega un comentario opcional para dejar constancia en el historial del movimiento.
                  </p>
                )}
              </div>
              {requiresVehicleWarning && (
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={exitWithoutVehicleAcknowledged}
                    onChange={(event) => setExitWithoutVehicleAcknowledged(event.target.checked)}
                  />
                  Confirmo que el usuario sale sin su vehiculo.
                </label>
              )}
              <textarea
                className={clsx(
                  'w-full rounded-lg px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:ring-2',
                  requiresVehicleWarning
                    ? 'border border-amber-200 focus:border-amber-400 focus:ring-amber-300'
                    : 'border border-slate-200 focus:border-[#0f766e] focus:ring-[#0f766e]/40'
                )}
                rows={3}
                placeholder="Anotacion (opcional)"
                value={exitWithoutVehicleNote}
                onChange={(event) => setExitWithoutVehicleNote(event.target.value)}
              />
              {requiresVehicleWarning ? (
                <p className="text-[11px] font-semibold text-amber-700">
                  Esta confirmacion registrara una observacion en el historial del movimiento.
                </p>
              ) : (
                <p className="text-[11px] text-[#94a3b8]">
                  La observacion se almacena junto al registro para futuras referencias.
                </p>
              )}
            </div>

            {userConfirmationError && (
              <div className="rounded-lg border border-[#b91c1c]/40 bg-[#fee2e2] px-4 py-2 text-sm font-semibold text-[#7f1d1d]">
                {userConfirmationError}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowUserConfirmation(false);
                  setUserConfirmationError('');
                }}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#475569] transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmUserMovement}
                disabled={confirmingUserMovement}
                className="inline-flex items-center justify-center rounded-lg bg-[#00594e] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#00463f] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
              >
                {confirmingUserMovement ? 'Registrando...' : 'Confirmar registro'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    {showVehicleConfirmation &&
      vehicleScanData?.user &&
      Array.isArray(vehicleScanData.vehicles) &&
      vehicleScanData.vehicles.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowVehicleConfirmation(false);
              setVehicleConfirmationError('');
            }}
          />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setShowVehicleConfirmation(false);
                setVehicleConfirmationError('');
              }}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-[#475569] transition hover:bg-slate-200"
              aria-label="Cerrar confirmacion"
            >
            &times;
            </button>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0f766e]">Confirmar registro</p>
                <h3 className="text-2xl font-bold text-[#0f172a]">Usuario y vehiculo</h3>
                <p className="text-sm text-[#475569]">
                  Define el movimiento y selecciona el vehiculo que se activara junto al registro.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[#0f172a]">
                  Estado actual:
                  <span className="ml-1 font-semibold capitalize">{vehicleScanData.user.estado || 'desconocido'}</span>
                </span>
                {vehicleScanData?.registro?.horaEntrada && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[#0f172a]">
                    Ultimo movimiento:
                    <span className="ml-1 font-semibold">{vehicleScanData.registro.horaEntrada}</span>
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {MOVEMENT_OPTIONS.map((option) => {
                  const isSelected = vehicleMovementType === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition ${
                        isSelected ? 'border-[#00594e] bg-[#00594e]/5' : 'border-slate-200 hover:border-[#0f766e]/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="vehicle-movement-type"
                        value={option.id}
                        checked={isSelected}
                        onChange={() => setVehicleMovementType(option.id)}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#0f172a]">{option.title}</p>
                        <p className="text-xs text-[#475569]">{option.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {vehicleSelectionLocked && (
                <div className="rounded-lg border border-[#b45309]/40 bg-[#fef3c7] px-4 py-2 text-xs font-semibold text-[#92400e]">
                  El usuario tiene un vehiculo asociado a su ingreso. Debe registrar la salida con el mismo vehiculo.
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">Selecciona vehiculo</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {vehicleScanData.vehicles.map((vehicle) => {
                    const isSelected = selectedVehicleId === vehicle._id;
                    const disabled = vehicleSelectionLocked && vehicle._id !== selectedVehicleId;
                    return (
                      <label
                        key={vehicle._id}
                        className={`flex cursor-pointer flex-col rounded-xl border-2 px-4 py-3 transition ${
                          isSelected ? 'border-[#0f766e] bg-[#ecfeff]' : 'border-slate-200 hover:border-[#0f766e]/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#0f172a]">{vehicle.type || 'Sin tipo'}</p>
                            <p className="text-xs text-[#475569]">Placa: {vehicle.plate || 'Sin placa'}</p>
                          </div>
                          <input
                            type="radio"
                            name="vehicle-selection"
                            value={vehicle._id}
                            checked={isSelected}
                            disabled={disabled}
                            onChange={() => {
                              if (disabled) return;
                              setSelectedVehicleId(vehicle._id);
                            }}
                            className="mt-1"
                          />
                        </div>
                        <p className="mt-2 text-xs text-[#475569]">
                          Estado actual:{' '}
                          <span className="font-semibold capitalize">{vehicle.estado || 'desconocido'}</span>
                        </p>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-[#f8fafc] p-4">
                {renderUserDetails(vehicleScanData.user)}
              </div>

              {vehicleConfirmationError && (
                <div className="rounded-lg border border-[#b91c1c]/40 bg-[#fee2e2] px-4 py-2 text-sm font-semibold text-[#7f1d1d]">
                  {vehicleConfirmationError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowVehicleConfirmation(false);
                    setVehicleConfirmationError('');
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#475569] transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVehicleMovement}
                  disabled={confirmingVehicleMovement || !selectedVehicleId}
                  className="inline-flex items-center justify-center rounded-lg bg-[#0f766e] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0c5b55] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
                >
                  {confirmingVehicleMovement ? 'Registrando...' : 'Confirmar registro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QRScannerPage;
