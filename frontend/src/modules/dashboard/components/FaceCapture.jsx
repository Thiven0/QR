import { useCallback, useMemo, useState } from 'react';
import { FiCamera, FiRefreshCcw, FiX } from 'react-icons/fi';
import clsx from 'clsx';
import { apiRequest } from '../../../services/apiClient';
import { useCameraCapture } from '../../../shared/hooks/useCameraCapture';
import { useFaceMeshDetection } from '../../../shared/hooks/useFaceMeshDetection';
import useAuth from '../../auth/hooks/useAuth';

const getErrorMessage = (error, fallback) => error?.details?.message || error?.message || fallback;

const FaceCapture = ({ mode = 'identify', userId, onResult, onError, onCancel }) => {
  const { token } = useAuth();
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { cameraOpen, cameraChecking, cameraError, setCameraError, videoRef, retryCamera, captureImage } =
    useCameraCapture();

  const handleCapture = useCallback(async () => {
    if (!cameraOpen || cameraChecking || capturing || processing) return;

    try {
      setCapturing(true);
      setProcessing(true);
      setCameraError('');

      const image = captureImage();

      if (mode === 'capture') {
        onResult?.({ image });
        return;
      }

      if (mode === 'enroll' && !userId) {
        throw new Error('No se encontro el usuario para registrar el rostro.');
      }

      const response = await apiRequest(mode === 'identify' ? '/face/identify' : '/face/enroll', {
        method: 'POST',
        token,
        data: mode === 'identify' ? { image } : { userId, image },
      });

      const data = response?.data || response;
      onResult?.(data);
    } catch (error) {
      const message = getErrorMessage(
        error,
        mode === 'identify' ? 'No fue posible identificar el rostro.' : 'No fue posible registrar el rostro.'
      );
      setCameraError(message);
      onError?.(error);
    } finally {
      setCapturing(false);
      setProcessing(false);
    }
  }, [cameraChecking, cameraOpen, captureImage, capturing, mode, onError, onResult, processing, setCameraError, token, userId]);

  const {
    meshCanvasRef,
    isModelLoading,
    modelError,
    isFaceDetected,
    faceCount,
    blinkDetected,
    isMeshEnabled,
    isAutoBlinkEnabled,
  } = useFaceMeshDetection({
    videoRef,
    active: cameraOpen && !cameraChecking,
    captureLocked: capturing || processing,
    onBlinkCapture: handleCapture,
  });

  const handleRetryCamera = async () => {
    if (cameraChecking || capturing || processing) return;
    await retryCamera();
  };

  const detectionTone = useMemo(() => {
    if (faceCount > 1) {
      return {
        border: 'border-rose-400/90',
        badge: 'bg-rose-500/85 text-white',
        message: 'Se detectaron multiples rostros. Deja solo una persona en camara.',
      };
    }

    if (isFaceDetected) {
      return {
        border: 'border-emerald-400/90',
        badge: 'bg-emerald-500/85 text-white',
        message: isAutoBlinkEnabled
          ? 'Rostro detectado. Parpadea una vez para capturar automaticamente.'
          : 'Rostro detectado. Puedes capturar manualmente cuando estes listo.',
      };
    }

    if (isModelLoading) {
      return {
        border: 'border-sky-300/80',
        badge: 'bg-sky-500/80 text-white',
        message: 'Activando malla facial y deteccion de parpadeo...',
      };
    }

    return {
      border: 'border-white/70',
      badge: 'bg-black/55 text-white',
      message: isMeshEnabled
        ? 'Buscando un rostro dentro del marco.'
        : 'Ubica tu rostro dentro del marco para continuar.',
    };
  }, [faceCount, isAutoBlinkEnabled, isFaceDetected, isMeshEnabled, isModelLoading]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#0f172a]">
      <div className="relative aspect-[4/3] w-full bg-[#0f172a]">
        {cameraOpen ? (
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-white/80">
            <p className="text-sm font-medium">
              {cameraChecking ? 'Abriendo camara...' : 'La camara no esta lista. Revisa permisos o intenta de nuevo.'}
            </p>
          </div>
        )}

        <canvas ref={meshCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

        <div className="pointer-events-none absolute inset-0 border-[12px] border-transparent">
          <div className={clsx('absolute inset-6 rounded-2xl border-2 border-dashed transition', detectionTone.border)} />
        </div>

        <div className="pointer-events-none absolute left-4 top-4 flex max-w-[80%] flex-col gap-2">
          <div className={clsx('inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold shadow-lg', detectionTone.badge)}>
            {faceCount > 1 ? 'Multiples rostros' : isFaceDetected ? 'Rostro detectado' : isModelLoading ? 'Analizando' : 'Esperando rostro'}
          </div>
          <div className="rounded-xl bg-black/45 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-sm">
            {detectionTone.message}
          </div>
          {blinkDetected && (
            <div className="inline-flex w-fit rounded-full bg-[#B5A160] px-3 py-1 text-xs font-semibold text-[#0f172a] shadow-lg">
              Parpadeo detectado. Capturando...
            </div>
          )}
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            aria-label="Cancelar captura facial"
          >
            <FiX className="h-4 w-4" />
          </button>
        )}

        {processing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-center text-white">
            <div>
              <p className="text-sm font-semibold">Procesando rostro...</p>
              <p className="mt-1 text-xs text-white/75">Validando la imagen y consultando el servicio facial.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 bg-[#111827] px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
          <p className="text-sm font-semibold text-white">
            {mode === 'identify' ? 'Reconocimiento facial' : mode === 'capture' ? 'Captura facial' : 'Enrolamiento facial'}
          </p>
          <p className="text-xs text-white/70">
            {mode === 'identify'
              ? 'Ubica un solo rostro dentro del marco para buscar coincidencias.'
              : 'Captura un solo rostro nitido dentro del marco para continuar.'}
          </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRetryCamera}
              disabled={cameraChecking || processing}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCcw className="h-4 w-4" />
              {cameraChecking ? 'Abriendo...' : 'Reintentar'}
            </button>
            <button
              type="button"
              onClick={handleCapture}
              disabled={!cameraOpen || cameraChecking || capturing || processing}
              className={clsx(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
                mode === 'identify'
                  ? 'bg-[#0f766e] text-white hover:bg-[#0c5b55]'
                  : 'bg-[#B5A160] text-[#0f172a] hover:bg-[#a58f54]'
              )}
            >
              <FiCamera className="h-4 w-4" />
              {capturing || processing ? 'Procesando...' : 'Capturar'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-medium text-white/75">
          <span className={clsx('rounded-full border px-2.5 py-1', isMeshEnabled ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-white/15 bg-white/5')}>
            Malla facial {isMeshEnabled ? 'activa' : 'desactivada'}
          </span>
          <span className={clsx('rounded-full border px-2.5 py-1', isAutoBlinkEnabled ? 'border-[#B5A160]/50 bg-[#B5A160]/10 text-[#f3e9bf]' : 'border-white/15 bg-white/5')}>
            Parpadeo {isAutoBlinkEnabled ? 'automatico' : 'manual'}
          </span>
          {isAutoBlinkEnabled && !isFaceDetected && !isModelLoading && cameraOpen && (
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1">
              Esperando rostro para habilitar auto-captura
            </span>
          )}
          {modelError && (
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-amber-100">
              MediaPipe no disponible. Se mantiene la captura manual.
            </span>
          )}
        </div>
      </div>

      {cameraError && (
        <div className="border-t border-[#7f1d1d]/30 bg-[#450a0a] px-4 py-3 text-sm font-semibold text-[#fecaca]">
          {cameraError}
        </div>
      )}

      {!cameraError && modelError && (
        <div className="border-t border-amber-300/20 bg-amber-950/60 px-4 py-3 text-sm font-semibold text-amber-100">
          {modelError}
        </div>
      )}
    </div>
  );
};

export default FaceCapture;
