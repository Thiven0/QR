import { useCallback, useEffect, useRef, useState } from 'react';
import { FiUserCheck } from 'react-icons/fi';
import { FaQrcode, FaUserCircle } from 'react-icons/fa';
import QrScanner from 'react-qr-scanner';
import clsx from 'clsx';
import useAuth from '../../auth/hooks/useAuth';
import { apiRequest, resolveAssetUrl } from '../../../services/apiClient';
import FaceCapture from './FaceCapture';

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
            src={resolveAssetUrl(user.imagen)}
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
            src={resolveAssetUrl(documentIdentity.photo)}
            alt={user.nombre ? `Documento de ${user.nombre}` : 'Documento escaneado'}
            className="h-24 w-36 rounded-lg border border-slate-200 object-cover"
          />
          <div className="flex-1 text-sm text-[#0f172a]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">Documento capturado</p>
            {documentData.cedula && <p className="font-semibold text-[#0f172a]">CC {documentData.cedula}</p>}
            {(documentData.nombres || documentData.apellidos) && (
              <p className="text-xs text-[#475569]">
                {[documentData.nombres, documentData.apellidos].filter(Boolean).join(' ')}
              </p>
            )}
            {birthDate && <p className="text-xs text-[#475569]">Nacimiento: {birthDate}</p>}
            {consentAcceptedAt && <p className="text-[11px] text-[#94a3b8]">Consentimiento: {consentAcceptedAt}</p>}
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

const buildFeedbackBox = (feedback) => {
  if (!feedback) return null;
  const isSuccess = feedback.type === 'success';
  const base = 'mt-6 rounded-lg border px-4 py-3 text-sm font-semibold transition';
  const tone = isSuccess
    ? 'border-[#0f766e] bg-[#0f766e]/10 text-[#0b5f58]'
    : 'border-[#b91c1c] bg-[#fee2e2] text-[#7f1d1d]';
  return <div className={`${base} ${tone}`}>{feedback.message}</div>;
};

const FACE_MATCH_THRESHOLD = 0.5;

const getSimilarityTone = (score, threshold = FACE_MATCH_THRESHOLD) => {
  if (score >= Math.max(threshold + 0.2, 0.75)) {
    return {
      label: 'Alta',
      accent: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      marker: 'bg-emerald-500',
    };
  }

  if (score >= threshold) {
    return {
      label: 'Media',
      accent: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      marker: 'bg-amber-500',
    };
  }

  return {
    label: 'Baja',
    accent: 'text-rose-700',
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    marker: 'bg-rose-500',
  };
};

const FacialSimilarityMeter = ({ score, threshold = FACE_MATCH_THRESHOLD }) => {
  if (typeof score !== 'number') return null;

  const normalizedScore = Math.min(1, Math.max(0, score));
  const markerPosition = `${normalizedScore * 100}%`;
  const thresholdPosition = `${Math.min(1, Math.max(0, threshold)) * 100}%`;
  const tone = getSimilarityTone(normalizedScore, threshold);

  return (
    <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0f766e]">Semaforo facial</p>
          <p className="mt-2 text-sm font-semibold text-[#0f172a]">Similitud facial</p>
          <p className="mt-1 text-xs text-[#475569]">Referencia visual del nivel de coincidencia detectado.</p>
        </div>
        <div className={clsx('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold', tone.badge)}>
          {tone.label}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#64748b]">Score detectado</p>
            <p className={clsx('text-2xl font-bold', tone.accent)}>{normalizedScore.toFixed(4)}</p>
          </div>
          <div className="text-right text-xs text-[#475569]">
            <p>Umbral minimo</p>
            <p className="font-semibold text-[#0f172a]">{threshold.toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="relative h-4 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            <div className="absolute inset-y-0 left-0 w-1/2 bg-rose-300/70" />
            <div className="absolute inset-y-0 left-1/2 w-1/4 bg-amber-300/80" />
            <div className="absolute inset-y-0 right-0 w-1/4 bg-emerald-400/80" />
            <div className="absolute inset-y-[-4px] w-px bg-[#0f172a]/60" style={{ left: thresholdPosition }} />
            <div className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg" style={{ left: markerPosition }}>
              <div className={clsx('h-full w-full rounded-full', tone.marker)} />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-[#64748b]">
            <span>Bajo</span>
            <span>Medio</span>
            <span>Alto</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-[#94a3b8]">
            <span>0.00</span>
            <span>1.00</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const renderQrFocusOverlay = () => (
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute inset-6 rounded-[1.75rem] border border-white/10 bg-black/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]" />

    <div className="absolute inset-6">
      <div className="absolute left-0 top-0 h-12 w-1 rounded-full bg-[#2dd4bf]/90 shadow-[0_0_18px_rgba(45,212,191,0.6)]" />
      <div className="absolute left-0 top-0 h-1 w-12 rounded-full bg-[#2dd4bf]/90 shadow-[0_0_18px_rgba(45,212,191,0.6)]" />

      <div className="absolute right-0 top-0 h-12 w-1 rounded-full bg-[#2dd4bf]/90 shadow-[0_0_18px_rgba(45,212,191,0.6)]" />
      <div className="absolute right-0 top-0 h-1 w-12 rounded-full bg-[#2dd4bf]/90 shadow-[0_0_18px_rgba(45,212,191,0.6)]" />

      <div className="absolute bottom-0 left-0 h-12 w-1 rounded-full bg-[#2dd4bf]/90 shadow-[0_0_18px_rgba(45,212,191,0.6)]" />
      <div className="absolute bottom-0 left-0 h-1 w-12 rounded-full bg-[#2dd4bf]/90 shadow-[0_0_18px_rgba(45,212,191,0.6)]" />

      <div className="absolute bottom-0 right-0 h-12 w-1 rounded-full bg-[#2dd4bf]/90 shadow-[0_0_18px_rgba(45,212,191,0.6)]" />
      <div className="absolute bottom-0 right-0 h-1 w-12 rounded-full bg-[#2dd4bf]/90 shadow-[0_0_18px_rgba(45,212,191,0.6)]" />

      <div className="absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent" />
      <div className="absolute left-1/2 top-10 h-[calc(100%-5rem)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
    </div>

    <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-black/45 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-sm">
      Enfoca el codigo QR dentro del visor
    </div>
  </div>
);

const FACE_CAMERA_RESTART_DELAY_MS = 1200;
const FACE_MAX_ATTEMPTS = 2;
const BLOCKED_USER_MESSAGE = 'El usuario se encuentra bloqueado. No se puede registrar el ingreso ni la salida.';

const QRScannerPage = () => {
  const { token } = useAuth();
  const [scannerKey, setScannerKey] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanMode, setScanMode] = useState('face');
  const audioContextRef = useRef(null);
  const faceFallbackTimeoutRef = useRef(null);
  const faceAttemptsRef = useRef(0);

  const [scanData, setScanData] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [lastRawText, setLastRawText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [movementType, setMovementType] = useState('entry');
  const [confirmingMovement, setConfirmingMovement] = useState(false);
  const [confirmationError, setConfirmationError] = useState('');
  const [movementNote, setMovementNote] = useState('');
  const [faceCaptureKey, setFaceCaptureKey] = useState(0);
  const [faceRetrying, setFaceRetrying] = useState(false);
  const [faceRetryMessage, setFaceRetryMessage] = useState('');
  const [faceIdentified, setFaceIdentified] = useState(false);

  const resetState = () => {
    setScanData(null);
    setError('');
    setFeedback(null);
    setProcessing(false);
    setLastRawText('');
    setResetting(false);
    setShowConfirmation(false);
    setMovementType('entry');
    setConfirmingMovement(false);
    setConfirmationError('');
    setMovementNote('');
  };

  const clearFaceFallback = useCallback(() => {
    if (faceFallbackTimeoutRef.current) {
      window.clearTimeout(faceFallbackTimeoutRef.current);
      faceFallbackTimeoutRef.current = null;
    }
  }, []);

  const resetFaceAttempts = useCallback(() => {
    faceAttemptsRef.current = 0;
    setFaceRetrying(false);
    setFaceRetryMessage('');
    setFaceIdentified(false);
  }, []);

  const restartFaceCapture = useCallback((message) => {
    clearFaceFallback();
    setFeedback({
      type: 'error',
      message,
    });
    setScanData(null);
    setShowConfirmation(false);
    setConfirmationError('');
    setFaceRetrying(true);
    setFaceRetryMessage('Reiniciando camara facial para un nuevo intento...');

    faceFallbackTimeoutRef.current = window.setTimeout(() => {
      setFaceRetrying(false);
      setFaceRetryMessage('');
      setError('');
      setFaceCaptureKey((prev) => prev + 1);
      faceFallbackTimeoutRef.current = null;
    }, FACE_CAMERA_RESTART_DELAY_MS);
  }, [clearFaceFallback]);

  const fallbackToQrAfterFaceFailure = useCallback((message) => {
    clearFaceFallback();
    setFeedback({
      type: 'error',
      message,
    });
    setScanData(null);
    setShowConfirmation(false);
    setConfirmationError('');
    setFaceRetrying(true);
    setFaceRetryMessage('Apagando camara facial y preparando el escaneo QR...');

    faceFallbackTimeoutRef.current = window.setTimeout(() => {
      setFaceRetrying(false);
      setFaceRetryMessage('');
      setScanMode('qr');
      setCameraActive(true);
      setError('');
      setScannerKey((prev) => prev + 1);
      faceFallbackTimeoutRef.current = null;
    }, FACE_CAMERA_RESTART_DELAY_MS);
  }, [clearFaceFallback]);

  const handleFaceAttemptFailure = useCallback((message) => {
    const nextAttempt = faceAttemptsRef.current + 1;
    faceAttemptsRef.current = nextAttempt;

    if (nextAttempt < FACE_MAX_ATTEMPTS) {
      restartFaceCapture(`${message} Reiniciando camara facial...`);
      return;
    }

    fallbackToQrAfterFaceFailure(`${message} Cambiando a escaneo QR...`);
  }, [fallbackToQrAfterFaceFailure, restartFaceCapture]);

  useEffect(() => {
    return () => {
      clearFaceFallback();
    };
  }, [clearFaceFallback]);

  const playBeep = useCallback((type = 'success') => {
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

      const gain = context.createGain();
      gain.connect(context.destination);

      const playTone = (frequency, startAt, duration, volume, waveType = 'sine') => {
        const oscillator = context.createOscillator();
        oscillator.type = waveType;
        oscillator.frequency.setValueAtTime(frequency, startAt);
        oscillator.connect(gain);

        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

        oscillator.start(startAt);
        oscillator.stop(startAt + duration);
      };

      if (type === 'error') {
        playTone(320, context.currentTime, 0.16, 0.2, 'triangle');
        playTone(220, context.currentTime + 0.14, 0.2, 0.18, 'triangle');
        return;
      }

      playTone(880, context.currentTime, 0.12, 0.22, 'sine');
      playTone(1175, context.currentTime + 0.09, 0.14, 0.18, 'sine');
    } catch {
      return;
    }
  }, []);

  const setValidatedUser = useCallback((userId, user, message, extra = {}) => {
    setScanData({
      rawText: extra.rawText || '',
      scannedAt: extra.scannedAt || new Date().toISOString(),
      parsed: extra.parsed || null,
      userId,
      user,
      activeRegistro: extra.activeRegistro || null,
      registro: extra.registro || null,
      score: extra.score,
      scanMethod: extra.scanMethod || 'qr',
      faceRecognitionLogId: extra.faceRecognitionLogId || null,
    });

    setFeedback({
      type: 'success',
      message: message || 'Usuario validado. Selecciona el movimiento y confirma el registro.',
    });

    if (!userId) {
      setShowConfirmation(false);
      return;
    }

    playBeep('success');

    const defaultMovement = (user?.estado || '').toLowerCase() === 'activo' ? 'exit' : 'entry';
    setMovementType(defaultMovement);
    setShowConfirmation(true);
    setConfirmationError('');
    setMovementNote('');
  }, [playBeep]);

  useEffect(() => {
    return () => {
      const context = audioContextRef.current;
      if (context?.close) {
        context.close().catch(() => {});
      }
      audioContextRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!showConfirmation) {
      setMovementNote('');
    }
  }, [showConfirmation]);

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

  const handleScan = async (data) => {
    const rawText = data?.text?.trim();

    if (!rawText || processing || rawText === lastRawText) {
      return;
    }

    if (!token) {
      setFeedback({
        type: 'error',
        message: 'Inicia sesion para procesar el escaneo.',
      });
      return;
    }

    setCameraActive(false);
    setProcessing(true);
    setFeedback(null);
    setError('');

    try {
      const parsedData = await parseScanData(rawText);
      const scannedAt = new Date().toISOString();
      const baseData = {
        rawText,
        scannedAt,
        parsed: parsedData,
        activeRegistro: null,
      };

      setScanData(baseData);
      setLastRawText(rawText);

      const validationResponse = await validateScanData(parsedData);
      const { userId, user, message, activeRegistro } = validationResponse;
      setValidatedUser(userId, user, message, {
        ...baseData,
        activeRegistro,
        scanMethod: 'qr',
      });
    } catch (scanError) {
      playBeep('error');
      const message = scanError.details?.code === 'SCANNED_USER_BLOCKED'
        ? BLOCKED_USER_MESSAGE
        : scanError.details?.message || scanError.message || 'No se pudo procesar el codigo escaneado.';
      setFeedback({
        type: 'error',
        message,
      });
      setLastRawText('');
    } finally {
      setProcessing(false);
      setTimeout(() => setLastRawText(''), 2000);
    }
  };

  const handleError = () => {
    setError('No fue posible acceder a la camara.');
  };

  const handleFaceResult = (result) => {
    if (!result?.match || !result?.userId || !result?.user) {
      playBeep('error');
      handleFaceAttemptFailure('No se encontro una coincidencia facial valida para este rostro.');
      return;
    }

    if ((result.user.estado || '').toLowerCase() === 'bloqueado') {
      clearFaceFallback();
      resetFaceAttempts();
      playBeep('error');
      setScanData(null);
      setShowConfirmation(false);
      setConfirmationError('');
      setFeedback({
        type: 'error',
        message: BLOCKED_USER_MESSAGE,
      });
      return;
    }

    clearFaceFallback();
    resetFaceAttempts();
    setFaceIdentified(true);
    setError('');
    setValidatedUser(result.userId, result.user, 'Usuario identificado por reconocimiento facial.', {
      score: result.score,
      scannedAt: new Date().toISOString(),
      scanMethod: 'face',
      faceRecognitionLogId: result.faceRecognitionLogId || null,
    });
  };

  const handleFaceError = (faceError) => {
    playBeep('error');
    const message = faceError?.details?.message || faceError?.message || 'No fue posible procesar el reconocimiento facial.';
    handleFaceAttemptFailure(message);
  };

  const handleReset = async () => {
    if (!token) {
      setFeedback({
        type: 'error',
        message: 'Inicia sesion para reiniciar el escaneo.',
      });
      return;
    }

    setCameraActive(true);
    setResetting(true);
    clearFaceFallback();
    resetFaceAttempts();
    resetState();
    setFaceCaptureKey((prev) => prev + 1);
    setScannerKey((prev) => prev + 1);

    try {
      const response = await apiRequest('/exitEntry/reset-scan', {
        method: 'POST',
        token,
      });

      const message = response?.message || response?.data?.message || 'Datos del escaneo limpiados. Puedes escanear nuevamente.';

      setFeedback({
        type: 'success',
        message,
      });
    } catch (resetError) {
      const message =
        resetError.details?.message || resetError.message || 'No se pudo limpiar la informacion del escaneo.';
      setFeedback({
        type: 'error',
        message,
      });
    } finally {
      setResetting(false);
      setProcessing(false);
      setLastRawText('');
    }
  };

  const handleConfirmMovement = async () => {
    if (!token) {
      setConfirmationError('Inicia sesion para confirmar el registro.');
      return;
    }
    if (!scanData?.userId) {
      setConfirmationError('No hay un usuario validado para registrar.');
      return;
    }

    setConfirmingMovement(true);
    setConfirmationError('');

    try {
      const payload = {
        userId: scanData.userId,
        direction: movementType,
        scanMethod: scanData.scanMethod || 'qr',
      };
      if (scanData.faceRecognitionLogId) {
        payload.faceRecognitionLogId = scanData.faceRecognitionLogId;
      }
      if (movementNote.trim()) {
        payload.exitObservation = movementNote.trim();
      }

      const response = await apiRequest('/exitEntry/from-scan', {
        method: 'POST',
        token,
        data: payload,
      });

      const registro = response.data || response.registro || response;
      const updatedUser = response.user || scanData.user;

      setScanData((prev) => ({
        ...(prev || {}),
        registro,
        user: updatedUser,
        activeRegistro: null,
      }));

      setFeedback({
        type: 'success',
        message: response.message || 'Registro confirmado correctamente.',
      });
      setShowConfirmation(false);
      setMovementNote('');
    } catch (confirmError) {
      const message =
        confirmError.details?.message || confirmError.message || 'No se pudo confirmar el movimiento del usuario.';
      setConfirmationError(message);
    } finally {
      setConfirmingMovement(false);
    }
  };

  return (
    <>
      <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="rounded-2xl border border-[#00594e]/15 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4 rounded-xl border-2 border-[#00594e] bg-[#00594e]/5 px-4 py-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f766e]/10 text-[#0f766e]">
                <FiUserCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#0f172a]">Escanear usuario</p>
                <p className="text-xs text-[#475569]">Registra ingresos y salidas.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0f766e]">
                    {scanMode === 'qr' ? 'Escaner QR' : 'Reconocimiento facial'}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-[#0f172a]">Escanear usuario</h2>
                  <p className="mt-2 text-sm text-[#475569]">
                    {scanMode === 'qr'
                      ? 'Apunta la camara hacia el codigo para registrar ingresos y salidas del usuario.'
                      : 'Captura el rostro del usuario para identificarlo y registrar su movimiento.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        clearFaceFallback();
                        resetFaceAttempts();
                        setScanMode('face');
                        setCameraActive(false);
                        setError('');
                        setFaceCaptureKey((prev) => prev + 1);
                      }}
                      className={clsx(
                        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition',
                        scanMode === 'face' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#475569] hover:bg-white/80'
                      )}
                    >
                      <FaUserCircle className="h-4 w-4" />
                      Rostro
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearFaceFallback();
                        resetFaceAttempts();
                        setScanMode('qr');
                        setCameraActive(true);
                        setError('');
                      }}
                      className={clsx(
                        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition',
                        scanMode === 'qr' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#475569] hover:bg-white/80'
                      )}
                    >
                      <FaQrcode className="h-4 w-4" />
                      QR
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={resetting}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resetting ? 'Reiniciando...' : 'Reiniciar'}
                  </button>
                </div>
              </div>

              <div className="mt-6">
                {scanMode === 'qr' ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#0f172a]">
                    <div className="relative aspect-[4/3] w-full">
                      {cameraActive ? (
                        <QrScanner
                          key={scannerKey}
                          delay={400}
                          onError={handleError}
                          onScan={handleScan}
                          style={{ width: '100%', height: '100%' }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[#0f172a] text-white/80">
                          <p className="text-sm font-medium">Escaneo pausado hasta reiniciar.</p>
                        </div>
                      )}
                      {renderQrFocusOverlay()}
                    </div>
                  </div>
                ) : faceRetrying ? (
                  <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-slate-200 bg-[#0f172a] px-6 text-center text-white/80">
                    <p className="text-sm font-medium">{faceRetryMessage || 'Procesando camara facial...'}</p>
                  </div>
                ) : faceIdentified ? (
                  <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-slate-200 bg-[#0f172a] px-6 text-center">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Rostro confirmado</p>
                      <p className="mt-3 text-xl font-bold text-white">Camara facial apagada</p>
                      <p className="mt-2 text-sm text-white/70">Usuario identificado correctamente. Continua con la confirmacion del registro.</p>
                    </div>
                  </div>
                ) : (
                  <FaceCapture
                    key={faceCaptureKey}
                    mode="identify"
                    enableAutoBlink={true}
                    onResult={handleFaceResult}
                    onError={handleFaceError}
                  />
                )}
              </div>

              {error && (
                <div className="mt-4 rounded-lg border border-[#b91c1c]/40 bg-[#fee2e2] px-4 py-3 text-sm font-semibold text-[#7f1d1d]">
                  {error}
                </div>
              )}
              {buildFeedbackBox(feedback)}
            </section>

            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0f766e]">Lectura actual</p>
              <h3 className="mt-2 text-2xl font-bold text-[#0f172a]">Usuario escaneado</h3>
              <p className="mt-2 text-sm text-[#475569]">
                Revisa la informacion antes de confirmar el movimiento.
              </p>

              {processing ? (
                <div className="mt-6 rounded-xl border border-dashed border-[#0f766e]/30 bg-[#0f766e]/5 px-4 py-6 text-sm font-semibold text-[#0f766e]">
                  Procesando escaneo...
                </div>
              ) : scanData?.user ? (
                <div className="mt-4 space-y-4">
                  {renderUserDetails(scanData.user)}
                  {typeof scanData?.score === 'number' && (
                    <div className="rounded-lg border border-[#0f766e]/20 bg-[#0f766e]/5 px-4 py-2 text-xs font-semibold text-[#0f766e]">
                      Similitud facial: {scanData.score.toFixed(4)}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowConfirmation(true);
                        setConfirmationError('');
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-[#0f766e]/40 px-4 py-2 text-sm font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/10"
                    >
                      Abrir confirmacion
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-sm text-[#475569]">
                  Esperando un escaneo. Mantenga el codigo dentro del marco para ver la lectura aqui.
                </p>
              )}
            </aside>
          </div>
        </div>
      </section>

      {showConfirmation && scanData?.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowConfirmation(false);
              setConfirmationError('');
            }}
          />
          <div className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setShowConfirmation(false);
                setConfirmationError('');
              }}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-[#475569] transition hover:bg-slate-200"
              aria-label="Cerrar confirmacion"
            >
              &times;
            </button>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
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
                  <span className="ml-1 font-semibold capitalize">{scanData.user.estado || 'desconocido'}</span>
                </span>
                {scanData?.registro?.horaEntrada && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[#0f172a]">
                    Ultimo movimiento:
                    <span className="ml-1 font-semibold">{scanData.registro.horaEntrada}</span>
                  </span>
                )}
              </div>

              {scanData.scanMethod === 'face' && typeof scanData.score === 'number' && (
                <FacialSimilarityMeter score={scanData.score} threshold={FACE_MATCH_THRESHOLD} />
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {MOVEMENT_OPTIONS.map((option) => {
                  const isSelected = movementType === option.id;
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
                        onChange={() => setMovementType(option.id)}
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

              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-[#f8fafc] p-4 sm:max-h-72">
                {renderUserDetails(scanData.user)}
              </div>

              <div className={clsx('space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-[#475569]')}>
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">Observaciones del registro</p>
                  <p className="mt-1 text-xs">
                    Agrega un comentario opcional para dejar constancia en el historial del movimiento.
                  </p>
                </div>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#0f172a] focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40"
                  rows={3}
                  placeholder="Anotacion (opcional)"
                  value={movementNote}
                  onChange={(event) => setMovementNote(event.target.value)}
                />
                <p className="text-[11px] text-[#94a3b8]">
                  La observacion se almacena junto al registro para futuras referencias.
                </p>
              </div>

              {confirmationError && (
                <div className="rounded-lg border border-[#b91c1c]/40 bg-[#fee2e2] px-4 py-2 text-sm font-semibold text-[#7f1d1d]">
                  {confirmationError}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmationError('');
                }}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#475569] transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMovement}
                disabled={confirmingMovement}
                className="inline-flex items-center justify-center rounded-lg bg-[#00594e] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#00463f] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
              >
                {confirmingMovement ? 'Registrando...' : 'Confirmar registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QRScannerPage;
