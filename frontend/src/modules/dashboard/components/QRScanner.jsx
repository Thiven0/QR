import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiLock,
  FiLogIn,
  FiLogOut,
  FiRefreshCw,
  FiSettings,
  FiUnlock,
  FiUserCheck,
  FiUserPlus,
  FiVideo,
  FiVideoOff,
  FiZap,
} from 'react-icons/fi';
import { FaQrcode, FaUserCircle } from 'react-icons/fa';
import QrScanner from 'react-qr-scanner';
import clsx from 'clsx';
import { toast } from 'sonner';
import useAuth from '../../auth/hooks/useAuth';
import { apiRequest, resolveAssetUrl } from '../../../services/apiClient';
import { closeTurnstile, getTurnstileStatus, openTurnstile } from '../../../services/turnstileApi';
import ModalDialog from '../../../shared/components/ModalDialog';
import VisitorRegistrationWorkflow from '../../public/components/VisitorRegistrationWorkflow';
import FaceCapture from './FaceCapture';

const REGISTRATION_DIALOG = {
  MANUAL: 'manual',
  AUTO_SUCCESS: 'auto-success',
  FACE_WARNING: 'face-warning',
  AUTO_ERROR: 'auto-error',
};

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

const CompactUserIdentity = ({ user, expanded, onToggle }) => {
  if (!user) return null;

  const fullName = [user.nombre, user.apellido].filter(Boolean).join(' ') || 'Usuario sin nombre';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="block w-full text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0f766e]/40"
      >
        <span className="grid md:grid-cols-2">
          <span className="block min-h-52 overflow-hidden bg-slate-100 md:min-h-56">
            {user.imagen ? (
              <img
                src={resolveAssetUrl(user.imagen)}
                alt={`Foto de ${fullName}`}
                className="h-52 w-full object-cover md:h-56"
              />
            ) : (
              <span className="flex h-52 w-full items-center justify-center text-slate-400 md:h-56">
                <FaUserCircle className="h-24 w-24" aria-hidden="true" />
              </span>
            )}
          </span>
          <span className="flex min-w-0 items-center p-5 sm:p-6">
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold leading-tight text-[#0f172a]">{fullName}</span>
              <span className="mt-3 block text-sm font-medium text-[#475569]">CC {user.cedula || 'Sin cédula'}</span>
              <span className="mt-1 block text-sm text-[#475569]">{user.facultad || 'Sin facultad registrada'}</span>
              <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#0f766e]">
                {expanded ? 'Ocultar información completa' : 'Ver información completa'}
                {expanded ? <FiChevronUp className="h-5 w-5" aria-hidden="true" /> : <FiChevronDown className="h-5 w-5" aria-hidden="true" />}
              </span>
            </span>
          </span>
        </span>
      </button>

      {expanded && <div className="border-t border-slate-200 p-3">{renderUserDetails(user)}</div>}
    </div>
  );
};

const CompactSimilarity = ({ score, threshold = FACE_MATCH_THRESHOLD, expanded, onToggle }) => {
  if (typeof score !== 'number') return null;

  const normalizedScore = Math.min(1, Math.max(0, score));
  const tone = getSimilarityTone(normalizedScore, threshold);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0f766e]/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Coincidencia facial</span>
          <span className="mt-1 block text-xs text-[#475569]">
            {expanded ? 'Ocultar semáforo facial' : 'Ver semáforo facial'}
          </span>
        </span>
        <span className={clsx('text-xl font-bold', tone.accent)}>{normalizedScore.toFixed(4)}</span>
        <span className={clsx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', tone.badge)}>{tone.label}</span>
        {expanded ? (
          <FiChevronUp className="h-5 w-5 flex-none text-[#0f766e]" aria-hidden="true" />
        ) : (
          <FiChevronDown className="h-5 w-5 flex-none text-[#0f766e]" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-200 p-3">
          <FacialSimilarityMeter score={normalizedScore} threshold={threshold} />
        </div>
      )}
    </div>
  );
};

const MovementSummary = ({ direction, completed = false }) => {
  const isEntry = direction === 'entry';
  const Icon = completed ? FiCheckCircle : isEntry ? FiLogIn : FiLogOut;

  return (
    <div className={clsx('flex items-start gap-3 rounded-xl border px-4 py-3', completed ? 'border-emerald-200 bg-emerald-50' : 'border-[#0f766e]/25 bg-[#0f766e]/5')}>
      <span className={clsx('mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full', completed ? 'bg-emerald-100 text-emerald-700' : 'bg-[#0f766e]/10 text-[#0f766e]')}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className={clsx('text-xs font-bold uppercase tracking-[0.18em]', completed ? 'text-emerald-700' : 'text-[#0f766e]')}>
          {isEntry ? `Ingreso ${completed ? 'registrado' : 'detectado'}` : `Salida ${completed ? 'registrada' : 'detectada'}`}
        </p>
        <p className="mt-1 text-sm text-[#475569]">
          {completed
            ? `El movimiento se guardó correctamente como ${isEntry ? 'ingreso' : 'salida'}.`
            : isEntry
              ? 'El usuario está inactivo; el sistema registrará su ingreso.'
              : 'El usuario está activo; el sistema registrará su salida.'}
        </p>
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

const FACE_RESULT_DELAY_MS = 5000;
const FACE_MAX_ATTEMPTS = 2;
const BLOCKED_USER_MESSAGE = 'El usuario se encuentra bloqueado. No se puede registrar el ingreso ni la salida.';

const QRScannerPage = () => {
  const { token } = useAuth();
  const [scannerKey, setScannerKey] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [scanMode, setScanMode] = useState('face');
  const audioContextRef = useRef(null);
  const faceFallbackTimeoutRef = useRef(null);
  const autoRegistrationRestartTimeoutRef = useRef(null);
  const faceCountdownIntervalRef = useRef(null);
  const cameraEnabledRef = useRef(true);
  const confirmMovementRef = useRef(null);
  const faceAttemptsRef = useRef(0);
  const scannerBeforeVisitorRef = useRef({ resumeQr: false, resumeFace: false });

  const [scanData, setScanData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [lastRawText, setLastRawText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [registrationDialog, setRegistrationDialog] = useState(null);
  const [userDetailsExpanded, setUserDetailsExpanded] = useState(false);
  const [similarityExpanded, setSimilarityExpanded] = useState(false);
  const [autoRegistrationEnabled, setAutoRegistrationEnabled] = useState(false);
  const [autoRegistrationPending, setAutoRegistrationPending] = useState(null);
  const [movementType, setMovementType] = useState('entry');
  const [confirmingMovement, setConfirmingMovement] = useState(false);
  const [confirmationError, setConfirmationError] = useState('');
  const [movementNote, setMovementNote] = useState('');
  const [faceCaptureKey, setFaceCaptureKey] = useState(0);
  const [faceRetrying, setFaceRetrying] = useState(false);
  const [faceRetryMessage, setFaceRetryMessage] = useState('');
  const [faceIdentified, setFaceIdentified] = useState(false);
  const [faceCaptureBusy, setFaceCaptureBusy] = useState(false);
  const [faceResultCountdown, setFaceResultCountdown] = useState(null);
  const [showVisitorRegistration, setShowVisitorRegistration] = useState(false);
  const [visitorRegistrationBusy, setVisitorRegistrationBusy] = useState(false);
  const [visitorRegistrationDirty, setVisitorRegistrationDirty] = useState(false);
  const [showTurnstile, setShowTurnstile] = useState(false);
  const [turnstileStatus, setTurnstileStatus] = useState(null);
  const [turnstileLoading, setTurnstileLoading] = useState(false);

  const openRegistrationDialog = useCallback((dialog) => {
    setUserDetailsExpanded(false);
    setSimilarityExpanded(false);
    setRegistrationDialog(dialog);
  }, []);

  const closeRegistrationDialog = useCallback(() => {
    setRegistrationDialog(null);
    setConfirmationError('');
    setUserDetailsExpanded(false);
    setSimilarityExpanded(false);
  }, []);

  const refreshTurnstileStatus = useCallback(async () => {
    if (!token) return;
    setTurnstileLoading(true);
    try {
      const response = await getTurnstileStatus(token);
      setTurnstileStatus(response.turnstile || null);
    } catch (error) {
      const message = error.details?.message || error.message || 'No se pudo consultar la talanquera.';
      toast.error(message, { id: 'turnstile-status' });
    } finally {
      setTurnstileLoading(false);
    }
  }, [token]);

  const handleTurnstileCommand = useCallback(async (command) => {
    if (!token) return;
    setTurnstileLoading(true);
    try {
      const response = command === 'open' ? await openTurnstile(token) : await closeTurnstile(token);
      setTurnstileStatus(response.turnstile || null);
      toast[response.turnstile?.success ? 'success' : 'error'](response.message, { id: 'turnstile-command' });
    } catch (error) {
      const message = error.details?.message || error.message || 'No se pudo controlar la talanquera.';
      toast.error(message, { id: 'turnstile-command' });
    } finally {
      setTurnstileLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (showTurnstile) refreshTurnstileStatus();
  }, [showTurnstile, refreshTurnstileStatus]);

  const resetState = () => {
    setScanData(null);
    setProcessing(false);
    setLastRawText('');
    setResetting(false);
    setRegistrationDialog(null);
    setUserDetailsExpanded(false);
    setSimilarityExpanded(false);
    setMovementType('entry');
    setConfirmingMovement(false);
    setConfirmationError('');
    setMovementNote('');
  };

  useEffect(() => {
    cameraEnabledRef.current = cameraEnabled;
  }, [cameraEnabled]);

  const clearFaceCountdown = useCallback(() => {
    if (faceCountdownIntervalRef.current) {
      window.clearInterval(faceCountdownIntervalRef.current);
      faceCountdownIntervalRef.current = null;
    }
    setFaceResultCountdown(null);
  }, []);

  const startFaceCountdown = useCallback(() => {
    clearFaceCountdown();
    setFaceResultCountdown(Math.ceil(FACE_RESULT_DELAY_MS / 1000));
    faceCountdownIntervalRef.current = window.setInterval(() => {
      setFaceResultCountdown((current) => {
        if (typeof current !== 'number') return current;
        return Math.max(0, current - 1);
      });
    }, 1000);
  }, [clearFaceCountdown]);

  const clearFaceFallback = useCallback(() => {
    if (faceFallbackTimeoutRef.current) {
      window.clearTimeout(faceFallbackTimeoutRef.current);
      faceFallbackTimeoutRef.current = null;
    }
    clearFaceCountdown();
  }, [clearFaceCountdown]);

  const clearAutoRegistrationRestart = useCallback(() => {
    if (autoRegistrationRestartTimeoutRef.current) {
      window.clearTimeout(autoRegistrationRestartTimeoutRef.current);
      autoRegistrationRestartTimeoutRef.current = null;
    }
    clearFaceCountdown();
  }, [clearFaceCountdown]);

  const resetFaceAttempts = useCallback(() => {
    faceAttemptsRef.current = 0;
    setFaceRetrying(false);
    setFaceRetryMessage('');
    setFaceIdentified(false);
  }, []);

  const handleOpenVisitorRegistration = useCallback(() => {
    if (processing || confirmingMovement) return;

    scannerBeforeVisitorRef.current = {
      resumeQr: cameraEnabled && scanMode === 'qr' && cameraActive,
      resumeFace: cameraEnabled && scanMode === 'face' && !faceIdentified,
    };

    clearFaceFallback();
    setCameraActive(false);
    setFaceRetrying(false);
    setFaceRetryMessage('');
    setShowVisitorRegistration(true);
  }, [cameraActive, cameraEnabled, clearFaceFallback, confirmingMovement, faceIdentified, processing, scanMode]);

  const closeVisitorRegistration = useCallback(() => {
    const { resumeQr, resumeFace } = scannerBeforeVisitorRef.current;
    setShowVisitorRegistration(false);
    setVisitorRegistrationBusy(false);
    setVisitorRegistrationDirty(false);

    if (resumeQr) {
      setCameraActive(true);
      setScannerKey((prev) => prev + 1);
    }
    if (resumeFace) {
      setCameraEnabled(true);
      setFaceCaptureKey((prev) => prev + 1);
    }

    scannerBeforeVisitorRef.current = { resumeQr: false, resumeFace: false };
  }, []);

  const handleRequestCloseVisitorRegistration = useCallback(() => {
    if (visitorRegistrationBusy) return;
    if (visitorRegistrationDirty) {
      const shouldDiscard = window.confirm('Hay informacion sin guardar. Deseas cerrar y descartar el registro?');
      if (!shouldDiscard) return;
    }
    closeVisitorRegistration();
  }, [closeVisitorRegistration, visitorRegistrationBusy, visitorRegistrationDirty]);

  const restartFaceCapture = useCallback((message, details = {}) => {
    clearFaceFallback();
    toast.error(message, { id: 'qr-scanner-result' });
    setScanData(null);
    setConfirmationError('');
    setFaceRetrying(true);
    setFaceRetryMessage('Reiniciando camara facial para un nuevo intento...');
    openRegistrationDialog({
      kind: REGISTRATION_DIALOG.FACE_WARNING,
      message,
      score: details.score,
      threshold: details.threshold ?? FACE_MATCH_THRESHOLD,
      attempt: details.attempt,
      nextAction: 'face',
    });
    startFaceCountdown();

    faceFallbackTimeoutRef.current = window.setTimeout(() => {
      clearFaceCountdown();
      if (!cameraEnabledRef.current) {
        faceFallbackTimeoutRef.current = null;
        return;
      }
      setRegistrationDialog(null);
      setFaceRetrying(false);
      setFaceRetryMessage('');
      setFaceCaptureKey((prev) => prev + 1);
      faceFallbackTimeoutRef.current = null;
    }, FACE_RESULT_DELAY_MS);
  }, [clearFaceCountdown, clearFaceFallback, openRegistrationDialog, startFaceCountdown]);

  const fallbackToQrAfterFaceFailure = useCallback((message, details = {}) => {
    clearFaceFallback();
    toast.error(message, { id: 'qr-scanner-result' });
    setScanData(null);
    setConfirmationError('');
    setFaceRetrying(true);
    setFaceRetryMessage('Apagando camara facial y preparando el escaneo QR...');
    openRegistrationDialog({
      kind: REGISTRATION_DIALOG.FACE_WARNING,
      message,
      score: details.score,
      threshold: details.threshold ?? FACE_MATCH_THRESHOLD,
      attempt: details.attempt,
      nextAction: 'qr',
    });
    startFaceCountdown();

    faceFallbackTimeoutRef.current = window.setTimeout(() => {
      clearFaceCountdown();
      if (!cameraEnabledRef.current) {
        faceFallbackTimeoutRef.current = null;
        return;
      }
      setRegistrationDialog(null);
      setFaceRetrying(false);
      setFaceRetryMessage('');
      setScanMode('qr');
      setCameraActive(true);
      setScannerKey((prev) => prev + 1);
      faceFallbackTimeoutRef.current = null;
    }, FACE_RESULT_DELAY_MS);
  }, [clearFaceCountdown, clearFaceFallback, openRegistrationDialog, startFaceCountdown]);

  const handleFaceAttemptFailure = useCallback((message, details = {}) => {
    const nextAttempt = faceAttemptsRef.current + 1;
    faceAttemptsRef.current = nextAttempt;
    const failureDetails = { ...details, attempt: nextAttempt };

    if (nextAttempt < FACE_MAX_ATTEMPTS) {
      restartFaceCapture(message, failureDetails);
      return;
    }

    fallbackToQrAfterFaceFailure(message, failureDetails);
  }, [fallbackToQrAfterFaceFailure, restartFaceCapture]);

  const handleFaceBusyChange = useCallback((busy) => {
    setFaceCaptureBusy(busy);
  }, []);

  const handleToggleCamera = useCallback(() => {
    if (cameraEnabledRef.current) {
      cameraEnabledRef.current = false;
      setCameraEnabled(false);
      setCameraActive(false);
      clearFaceFallback();
      clearAutoRegistrationRestart();
      setAutoRegistrationPending(null);
      setFaceCaptureBusy(false);

      if (registrationDialog?.kind === REGISTRATION_DIALOG.FACE_WARNING) {
        if (registrationDialog.nextAction === 'qr') {
          setScanMode('qr');
        }
        setRegistrationDialog(null);
        setFaceRetrying(false);
        setFaceRetryMessage('');
        setFaceIdentified(false);
      } else if (registrationDialog?.kind === REGISTRATION_DIALOG.AUTO_SUCCESS) {
        setRegistrationDialog(null);
        setScanData(null);
        resetFaceAttempts();
      }

      toast.success('Cámara apagada. Permanecerá inactiva hasta que la enciendas.', {
        id: 'qr-scanner-camera-power',
      });
      return;
    }

    cameraEnabledRef.current = true;
    setCameraEnabled(true);
    setFaceRetrying(false);
    setFaceRetryMessage('');

    if (scanMode === 'qr') {
      setCameraActive(true);
      setScannerKey((prev) => prev + 1);
    } else if (!faceIdentified) {
      setCameraActive(false);
      setFaceCaptureKey((prev) => prev + 1);
    }

    toast.success('Cámara encendida y lista para escanear.', {
      id: 'qr-scanner-camera-power',
    });
  }, [
    clearAutoRegistrationRestart,
    clearFaceFallback,
    faceIdentified,
    registrationDialog,
    resetFaceAttempts,
    scanMode,
  ]);

  useEffect(() => {
    return () => {
      clearFaceFallback();
      clearAutoRegistrationRestart();
    };
  }, [clearAutoRegistrationRestart, clearFaceFallback]);

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
    const feedbackMessage = message || 'Usuario validado. Selecciona el movimiento y confirma el registro.';
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

    toast.success(feedbackMessage, { id: 'qr-scanner-result' });

    if (!userId) {
      setRegistrationDialog(null);
      return;
    }

    playBeep('success');

    const defaultMovement = (user?.estado || '').toLowerCase() === 'activo' ? 'exit' : 'entry';
    setMovementType(defaultMovement);
    if (extra.scanMethod === 'face' && autoRegistrationEnabled) {
      setRegistrationDialog(null);
      setAutoRegistrationPending({ userId, direction: defaultMovement });
      return;
    }

    openRegistrationDialog({
      kind: REGISTRATION_DIALOG.MANUAL,
      direction: defaultMovement,
    });
    setConfirmationError('');
    setMovementNote('');
  }, [autoRegistrationEnabled, openRegistrationDialog, playBeep]);

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
    if (registrationDialog?.kind !== REGISTRATION_DIALOG.MANUAL) {
      setMovementNote('');
    }
  }, [registrationDialog]);

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
      toast.error('Inicia sesion para procesar el escaneo.', { id: 'qr-scanner-result' });
      return;
    }

    setCameraActive(false);
    setProcessing(true);

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
      toast.error(message, { id: 'qr-scanner-result' });
      setLastRawText('');
    } finally {
      setProcessing(false);
      setTimeout(() => setLastRawText(''), 2000);
    }
  };

  const handleError = () => {
    const message = 'No fue posible acceder a la camara.';
    toast.error(message, { id: 'qr-scanner-camera' });
  };

  const handleFaceResult = (result) => {
    if (!result?.match || !result?.userId || !result?.user) {
      playBeep('error');
      handleFaceAttemptFailure('La similitud facial no alcanza el mínimo requerido para confirmar la identidad.', {
        score: result?.score,
        threshold: result?.threshold,
      });
      return;
    }

    if ((result.user.estado || '').toLowerCase() === 'bloqueado') {
      clearFaceFallback();
      resetFaceAttempts();
      playBeep('error');
      setScanData(null);
      setRegistrationDialog(null);
      setConfirmationError('');
      toast.error(BLOCKED_USER_MESSAGE, { id: 'qr-scanner-result' });
      return;
    }

    clearFaceFallback();
    resetFaceAttempts();
    setFaceIdentified(true);
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
    handleFaceAttemptFailure(message, {
      score: faceError?.details?.score,
      threshold: faceError?.details?.threshold,
    });
  };

  const handleReset = async () => {
    if (!token) {
      toast.error('Inicia sesion para reiniciar el escaneo.', { id: 'qr-scanner-reset' });
      return;
    }

    setCameraActive(scanMode === 'qr' && cameraEnabledRef.current);
    setResetting(true);
    clearFaceFallback();
    clearAutoRegistrationRestart();
    setAutoRegistrationPending(null);
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

      toast.success(message, { id: 'qr-scanner-reset' });
    } catch (resetError) {
      const message =
        resetError.details?.message || resetError.message || 'No se pudo limpiar la informacion del escaneo.';
      toast.error(message, { id: 'qr-scanner-reset' });
    } finally {
      setResetting(false);
      setProcessing(false);
      setLastRawText('');
    }
  };

  const handleConfirmMovement = async ({ direction = movementType, automatic = false } = {}) => {
    if (!token) {
      const message = 'Inicia sesion para confirmar el registro.';
      setConfirmationError(message);
      toast.error(message, { id: 'qr-scanner-access-registration' });
      if (automatic) {
        openRegistrationDialog({ kind: REGISTRATION_DIALOG.AUTO_ERROR, direction, message });
      }
      return;
    }
    if (!scanData?.userId) {
      const message = 'No hay un usuario validado para registrar.';
      setConfirmationError(message);
      if (automatic) {
        openRegistrationDialog({ kind: REGISTRATION_DIALOG.AUTO_ERROR, direction, message });
      }
      return;
    }

    setConfirmingMovement(true);
    setConfirmationError('');

    try {
      const payload = {
        userId: scanData.userId,
        direction,
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

      toast.success(response.message || 'Registro confirmado correctamente.', {
        id: 'qr-scanner-access-registration',
      });
      setMovementNote('');

      if (automatic) {
        openRegistrationDialog({
          kind: REGISTRATION_DIALOG.AUTO_SUCCESS,
          direction,
          message: response.message || `${direction === 'entry' ? 'Ingreso' : 'Salida'} registrado correctamente.`,
        });
        setFaceRetrying(true);
        setFaceRetryMessage('Registro realizado. Preparando camara para el siguiente usuario...');
        clearAutoRegistrationRestart();
        startFaceCountdown();
        autoRegistrationRestartTimeoutRef.current = window.setTimeout(() => {
          clearFaceCountdown();
          if (!cameraEnabledRef.current) {
            autoRegistrationRestartTimeoutRef.current = null;
            return;
          }
          setRegistrationDialog(null);
          setScanData(null);
          setFaceIdentified(false);
          resetFaceAttempts();
          setFaceRetrying(false);
          setFaceRetryMessage('');
          setFaceCaptureKey((prev) => prev + 1);
          autoRegistrationRestartTimeoutRef.current = null;
        }, FACE_RESULT_DELAY_MS);
      } else {
        closeRegistrationDialog();
        setScanData(null);
        resetFaceAttempts();
        if (cameraEnabledRef.current) {
          if (scanMode === 'qr') {
            setCameraActive(true);
            setScannerKey((prev) => prev + 1);
          } else {
            setFaceCaptureKey((prev) => prev + 1);
          }
        }
      }
    } catch (confirmError) {
      const message =
        confirmError.details?.message || confirmError.message || 'No se pudo confirmar el movimiento del usuario.';
      setConfirmationError(message);
      toast.error(message, { id: 'qr-scanner-access-registration' });
      if (automatic) {
        openRegistrationDialog({
          kind: REGISTRATION_DIALOG.AUTO_ERROR,
          direction,
          message,
        });
      }
    } finally {
      setConfirmingMovement(false);
    }
  };

  confirmMovementRef.current = handleConfirmMovement;

  useEffect(() => {
    if (!autoRegistrationPending || confirmingMovement) return;

    setAutoRegistrationPending(null);
    confirmMovementRef.current?.({
      direction: autoRegistrationPending.direction,
      automatic: true,
    });
  }, [autoRegistrationPending, confirmingMovement]);

  const dialogKind = registrationDialog?.kind;
  const dialogDirection = registrationDialog?.direction || movementType;
  const isManualDialog = dialogKind === REGISTRATION_DIALOG.MANUAL;
  const isAutoSuccessDialog = dialogKind === REGISTRATION_DIALOG.AUTO_SUCCESS;
  const isFaceWarningDialog = dialogKind === REGISTRATION_DIALOG.FACE_WARNING;
  const isAutoErrorDialog = dialogKind === REGISTRATION_DIALOG.AUTO_ERROR;
  const dialogScore = isFaceWarningDialog ? registrationDialog?.score : scanData?.score;
  const dialogThreshold = isFaceWarningDialog
    ? registrationDialog?.threshold ?? FACE_MATCH_THRESHOLD
    : FACE_MATCH_THRESHOLD;
  const scannerControlsDisabled =
    processing || confirmingMovement || resetting || faceRetrying || Boolean(registrationDialog) || showVisitorRegistration;
  const cameraPowerDisabled =
    processing || confirmingMovement || resetting || faceCaptureBusy || visitorRegistrationBusy;
  const faceCountdownSeconds = faceResultCountdown ?? Math.ceil(FACE_RESULT_DELAY_MS / 1000);
  const faceCountdownProgress = Math.max(
    0,
    Math.min(100, (faceCountdownSeconds / Math.ceil(FACE_RESULT_DELAY_MS / 1000)) * 100)
  );

  return (
    <>
      <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="rounded-2xl border border-[#00594e]/15 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-[#00594e] bg-[#00594e]/5 px-4 py-4">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f766e]/10 text-[#0f766e]">
                  <FiUserCheck className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">Escanear usuario</p>
                  <p className="text-xs text-[#475569]">Registra ingresos y salidas.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenVisitorRegistration}
                disabled={processing || confirmingMovement}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00594e] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00483f] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiUserPlus className="h-4 w-4" aria-hidden="true" />
                Crear visitante
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
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

                <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_auto] lg:items-end">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Método de identificación</p>
                    <div className="inline-grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Método de identificación">
                      <button
                        type="button"
                        onClick={() => {
                          clearFaceFallback();
                          resetFaceAttempts();
                          setScanMode('face');
                          setCameraActive(false);
                          if (cameraEnabledRef.current) {
                            setFaceCaptureKey((prev) => prev + 1);
                          }
                        }}
                        disabled={scannerControlsDisabled}
                        aria-pressed={scanMode === 'face'}
                        aria-label="Usar reconocimiento facial"
                        title="Reconocimiento facial"
                        className={clsx(
                          'inline-flex h-10 w-11 items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40 disabled:cursor-not-allowed disabled:opacity-50',
                          scanMode === 'face'
                            ? 'bg-[#00594e] text-white shadow-sm'
                            : 'text-[#475569] hover:bg-slate-100'
                        )}
                      >
                        <FaUserCircle className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearFaceFallback();
                          resetFaceAttempts();
                          setScanMode('qr');
                          setCameraActive(cameraEnabledRef.current);
                          if (cameraEnabledRef.current) {
                            setScannerKey((prev) => prev + 1);
                          }
                        }}
                        disabled={scannerControlsDisabled}
                        aria-pressed={scanMode === 'qr'}
                        aria-label="Usar escáner QR"
                        title="Escáner QR"
                        className={clsx(
                          'inline-flex h-10 w-11 items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40 disabled:cursor-not-allowed disabled:opacity-50',
                          scanMode === 'qr'
                            ? 'bg-[#00594e] text-white shadow-sm'
                            : 'text-[#475569] hover:bg-slate-100'
                        )}
                      >
                        <FaQrcode className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Automatización</p>
                    <button
                      type="button"
                      onClick={() => {
                        if (scanMode === 'face') {
                          setAutoRegistrationEnabled((enabled) => !enabled);
                        }
                      }}
                      disabled={scannerControlsDisabled || scanMode !== 'face'}
                      aria-pressed={autoRegistrationEnabled}
                      aria-label={autoRegistrationEnabled ? 'Desactivar registro automático' : 'Activar registro automático'}
                      title={
                        scanMode !== 'face'
                          ? 'Disponible únicamente con reconocimiento facial'
                          : autoRegistrationEnabled
                            ? 'Registro automático activado'
                            : 'Registro automático desactivado'
                      }
                      className={clsx(
                        'inline-flex h-12 w-12 items-center justify-center rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40 disabled:cursor-not-allowed disabled:opacity-50',
                        autoRegistrationEnabled && scanMode === 'face'
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
                      )}
                    >
                      <FiZap className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Herramientas</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleToggleCamera}
                        disabled={cameraPowerDisabled}
                        aria-pressed={cameraEnabled}
                        aria-label={cameraEnabled ? 'Apagar cámara' : 'Encender cámara'}
                        title={cameraEnabled ? 'Apagar cámara' : 'Encender cámara'}
                        className={clsx(
                          'inline-flex h-12 w-12 items-center justify-center rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40 disabled:cursor-not-allowed disabled:opacity-50',
                          cameraEnabled
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        )}
                      >
                        {cameraEnabled ? (
                          <FiVideoOff className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <FiVideo className="h-5 w-5" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTurnstile(true)}
                        disabled={scannerControlsDisabled}
                        aria-label="Controlar talanquera"
                        title="Controlar talanquera"
                        className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#0f766e] transition hover:bg-[#0f766e]/5 focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FiSettings className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={scannerControlsDisabled}
                        aria-label={resetting ? 'Reiniciando escáner' : 'Reiniciar escáner'}
                        title={resetting ? 'Reiniciando escáner' : 'Reiniciar escáner'}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#475569] transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FiRefreshCw className={clsx('h-5 w-5', resetting && 'animate-spin')} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {showVisitorRegistration ? (
                  <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-slate-200 bg-[#0f172a] px-6 text-center text-white/80">
                    <p className="text-sm font-medium">Camara pausada durante el registro del visitante.</p>
                  </div>
                ) : !cameraEnabled ? (
                  <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-slate-200 bg-[#0f172a] px-6 text-center">
                    <div>
                      <FiVideoOff className="mx-auto h-9 w-9 text-white/60" aria-hidden="true" />
                      <p className="mt-3 text-xl font-bold text-white">Cámara apagada</p>
                      <p className="mt-2 text-sm text-white/70">Enciéndela desde Herramientas cuando quieras continuar.</p>
                    </div>
                  </div>
                ) : scanMode === 'qr' ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#0f172a]">
                    <div className="relative aspect-[4/3] w-full">
                      {cameraActive ? (
                        <QrScanner
                          key={scannerKey}
                          delay={400}
                          onError={handleError}
                          onScan={handleScan}
                          style={{ width: '100%', height: '100%', transform: 'scaleX(-1)' }}
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
                      <p className="mt-2 text-sm text-white/70">
                        {autoRegistrationEnabled
                          ? 'Registrando el movimiento automaticamente...'
                          : 'Usuario identificado correctamente. Continua con la confirmacion del registro.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <FaceCapture
                    key={faceCaptureKey}
                    mode="identify"
                    enableAutoBlink={true}
                    onResult={handleFaceResult}
                    onError={handleFaceError}
                    onBusyChange={handleFaceBusyChange}
                  />
                )}
              </div>

            </section>

            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0f766e]">Lectura actual</p>
              <h3 className="mt-2 text-2xl font-bold text-[#0f172a]">Usuario escaneado</h3>
              <p className="mt-2 text-sm text-[#475569]">
                {autoRegistrationEnabled && scanMode === 'face'
                  ? 'Los rostros validados se registran automaticamente.'
                  : 'Revisa la informacion antes de confirmar el movimiento.'}
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
                  {!autoRegistrationEnabled && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          openRegistrationDialog({
                            kind: REGISTRATION_DIALOG.MANUAL,
                            direction: movementType,
                          });
                          setConfirmationError('');
                        }}
                        className="inline-flex items-center justify-center rounded-lg border border-[#0f766e]/40 px-4 py-2 text-sm font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/10"
                      >
                        Abrir confirmación
                      </button>
                    </div>
                  )}
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

      <ModalDialog
        isOpen={showVisitorRegistration}
        title="Crear visitante"
        description="Completa los datos, captura el documento y registra el rostro antes de generar el ticket temporal."
        onClose={handleRequestCloseVisitorRegistration}
        closeDisabled={visitorRegistrationBusy}
      >
        {showVisitorRegistration && (
          <VisitorRegistrationWorkflow
            presentation="modal"
            onBusyChange={setVisitorRegistrationBusy}
            onDirtyChange={setVisitorRegistrationDirty}
            onCloseAfterSuccess={closeVisitorRegistration}
          />
        )}
      </ModalDialog>

      <ModalDialog
        isOpen={showTurnstile}
        title="Talanquera"
        description="El control manual no altera los registros de ingreso o salida."
        eyebrow="Control de acceso"
        onClose={() => setShowTurnstile(false)}
        closeDisabled={turnstileLoading}
      >
        <div className="mx-auto max-w-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="text-sm font-semibold text-[#0f172a]">
                {turnstileStatus?.mode === 'serial' ? 'Arduino conectado' : turnstileStatus?.mode === 'simulated' ? 'Modo simulacion' : 'Talanquera desactivada'}
              </p>
              <p className="mt-1 text-xs text-[#475569]">
                {turnstileStatus?.mode === 'serial'
                  ? `${turnstileStatus.configuredPort} a ${turnstileStatus.baudRate} baudios`
                  : turnstileStatus?.fallbackReason || 'No se requiere un Arduino para continuar registrando accesos.'}
              </p>
            </div>
            <span className={clsx('inline-flex h-10 w-10 items-center justify-center rounded-full', turnstileStatus?.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
              {turnstileStatus?.isOpen ? <FiUnlock className="h-5 w-5" /> : <FiLock className="h-5 w-5" />}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="border border-slate-200 p-3">
              <dt className="text-xs text-[#475569]">Estado</dt>
              <dd className="mt-1 font-semibold text-[#0f172a]">{turnstileStatus?.isOpen ? 'Abierta' : 'Cerrada'}</dd>
            </div>
            <div className="border border-slate-200 p-3">
              <dt className="text-xs text-[#475569]">Conexion</dt>
              <dd className="mt-1 font-semibold text-[#0f172a]">{turnstileStatus?.connected ? 'Disponible' : 'No disponible'}</dd>
            </div>
          </dl>

          <div className="border border-slate-200 bg-white p-3">
            <p className="text-xs text-[#475569]">Ultima respuesta del Arduino</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-[#0f172a]">
              {turnstileStatus?.response || 'Sin respuesta recibida'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => handleTurnstileCommand('open')} disabled={turnstileLoading} className="inline-flex items-center gap-2 rounded-lg bg-[#00594e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00463f] disabled:cursor-not-allowed disabled:bg-slate-400">
              <FiUnlock className="h-4 w-4" /> Abrir
            </button>
            <button type="button" onClick={() => handleTurnstileCommand('close')} disabled={turnstileLoading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-[#475569] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
              <FiLock className="h-4 w-4" /> Cerrar
            </button>
            <button type="button" onClick={refreshTurnstileStatus} disabled={turnstileLoading} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-[#475569] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60" aria-label="Actualizar estado" title="Actualizar estado">
              <FiRefreshCw className={clsx('h-4 w-4', turnstileLoading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </ModalDialog>

      {registrationDialog && (isFaceWarningDialog || scanData?.user) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
          <div
            className="absolute inset-0 bg-black/45"
            onClick={isManualDialog ? closeRegistrationDialog : undefined}
          />

          <div
            className="relative z-10 flex max-h-[calc(100vh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="registration-dialog-title"
          >
            {isManualDialog && (
              <button
                type="button"
                onClick={closeRegistrationDialog}
                className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-[#475569] transition hover:bg-slate-200"
                aria-label="Cerrar confirmación"
              >
                &times;
              </button>
            )}

            {(isFaceWarningDialog || isAutoSuccessDialog) && (
              <button
                type="button"
                onClick={handleToggleCamera}
                disabled={cameraPowerDisabled}
                className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-[#475569] shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40 disabled:cursor-not-allowed disabled:opacity-50"
                aria-pressed={cameraEnabled}
                aria-label={cameraEnabled ? 'Apagar cámara' : 'Encender cámara'}
                title={cameraEnabled ? 'Apagar cámara' : 'Encender cámara'}
              >
                {cameraEnabled ? (
                  <FiVideoOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <FiVideo className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            )}

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
              <header className="pr-10">
                <p className={clsx('text-xs font-semibold uppercase tracking-[0.28em]', isFaceWarningDialog || isAutoErrorDialog ? 'text-rose-700' : 'text-[#0f766e]')}>
                  {isManualDialog
                    ? 'Confirmar registro'
                    : isAutoSuccessDialog
                      ? `${dialogDirection === 'entry' ? 'Ingreso' : 'Salida'} registrado correctamente`
                      : isFaceWarningDialog
                        ? 'Reconocimiento no válido'
                        : 'Registro detenido'}
                </p>
                <h3 id="registration-dialog-title" className="mt-2 text-2xl font-bold text-[#0f172a]">
                  {isManualDialog
                    ? `Confirmar ${dialogDirection === 'entry' ? 'ingreso' : 'salida'}`
                    : isAutoSuccessDialog
                      ? 'Registro automático'
                      : isFaceWarningDialog
                        ? 'No se pudo confirmar la identidad'
                        : 'Error en el registro automático'}
                </h3>
                <p className="mt-2 text-sm text-[#475569]">
                  {isManualDialog
                    ? 'El movimiento se detectó automáticamente según el estado actual del usuario.'
                    : isAutoSuccessDialog
                      ? 'El registro se completó sin necesidad de confirmación manual.'
                      : isFaceWarningDialog
                        ? 'Revisa el resultado de la validación facial antes del siguiente paso.'
                        : 'El flujo quedó detenido para evitar registrar un movimiento duplicado o contrario.'}
                </p>
              </header>

              {isFaceWarningDialog ? (
                <>
                  {typeof dialogScore === 'number' && (
                    <CompactSimilarity
                      score={dialogScore}
                      threshold={dialogThreshold}
                      expanded={similarityExpanded}
                      onToggle={() => setSimilarityExpanded((expanded) => !expanded)}
                    />
                  )}

                  <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
                    <FiAlertTriangle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold">{registrationDialog.message}</p>
                      {typeof dialogScore === 'number' && (
                        <p className="mt-1 text-xs">Umbral requerido: {dialogThreshold.toFixed(2)}</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-[#475569]">
                    <p className="font-semibold text-[#0f172a]">Intento {registrationDialog.attempt || 1} de {FACE_MAX_ATTEMPTS}</p>
                    <p className="mt-1 text-xs">
                      {registrationDialog.nextAction === 'qr'
                        ? 'Se cambiará automáticamente al lector QR.'
                        : 'La cámara facial se reiniciará para realizar el segundo intento.'}
                    </p>
                    <div className="mt-3" aria-live="polite">
                      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#0f766e]">
                        <span>{registrationDialog.nextAction === 'qr' ? 'Lector QR listo' : 'Cámara facial lista'}</span>
                        <span>{faceCountdownSeconds} s</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                        <div
                          className="h-full rounded-full bg-[#0f766e] transition-[width] duration-1000 ease-linear"
                          style={{ width: `${faceCountdownProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <CompactUserIdentity
                    user={scanData.user}
                    expanded={userDetailsExpanded}
                    onToggle={() => setUserDetailsExpanded((expanded) => !expanded)}
                  />

                  {scanData.scanMethod === 'face' && typeof dialogScore === 'number' && (
                    <CompactSimilarity
                      score={dialogScore}
                      threshold={dialogThreshold}
                      expanded={similarityExpanded}
                      onToggle={() => setSimilarityExpanded((expanded) => !expanded)}
                    />
                  )}

                  <MovementSummary direction={dialogDirection} completed={isAutoSuccessDialog} />

                  {isManualDialog && (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-[#475569]">
                      <div>
                        <p className="text-sm font-semibold text-[#0f172a]">Observaciones del registro</p>
                        <p className="mt-1 text-xs">Agrega un comentario opcional para dejar constancia en el historial.</p>
                      </div>
                      <textarea
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#0f172a] focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/40"
                        rows={3}
                        placeholder="Anotación (opcional)"
                        value={movementNote}
                        onChange={(event) => setMovementNote(event.target.value)}
                      />
                    </div>
                  )}

                  {isAutoSuccessDialog && (
                    <div className="rounded-xl bg-slate-100 px-4 py-3 text-[#475569]" aria-live="polite">
                      <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                        <span>Preparando la cámara para el siguiente usuario</span>
                        <span className="whitespace-nowrap text-[#0f766e]">{faceCountdownSeconds} s</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                        <div
                          className="h-full rounded-full bg-[#0f766e] transition-[width] duration-1000 ease-linear"
                          style={{ width: `${faceCountdownProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {(confirmationError || isAutoErrorDialog) && (
                    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
                      <FiAlertTriangle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
                      <p className="text-sm font-semibold">{registrationDialog.message || confirmationError}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {isManualDialog && (
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeRegistrationDialog}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#475569] transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmMovement()}
                  disabled={confirmingMovement}
                  className="inline-flex items-center justify-center rounded-lg bg-[#00594e] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#00463f] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
                >
                  {confirmingMovement
                    ? 'Registrando...'
                    : `Confirmar ${dialogDirection === 'entry' ? 'ingreso' : 'salida'}`}
                </button>
              </div>
            )}

            {isAutoErrorDialog && (
              <div className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={closeRegistrationDialog}
                  className="inline-flex items-center justify-center rounded-lg bg-[#00594e] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#00463f]"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default QRScannerPage;
