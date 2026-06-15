import { useState } from 'react';
import { FiCamera, FiRefreshCcw, FiX } from 'react-icons/fi';
import clsx from 'clsx';
import { apiRequest } from '../../../services/apiClient';
import { useCameraCapture } from '../../../shared/hooks/useCameraCapture';
import useAuth from '../../auth/hooks/useAuth';

const getErrorMessage = (error, fallback) => error?.details?.message || error?.message || fallback;

const FaceCapture = ({ mode = 'identify', userId, onResult, onError, onCancel }) => {
  const { token } = useAuth();
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { cameraOpen, cameraChecking, cameraError, setCameraError, videoRef, retryCamera, captureImage } =
    useCameraCapture();

  const handleRetryCamera = async () => {
    if (cameraChecking || capturing || processing) return;
    await retryCamera();
  };

  const handleCapture = async () => {
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
  };

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

        <div className="pointer-events-none absolute inset-0 border-[12px] border-transparent">
          <div className="absolute inset-6 rounded-2xl border-2 border-dashed border-white/70" />
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

      <div className="flex flex-col gap-3 border-t border-white/10 bg-[#111827] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
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

      {cameraError && (
        <div className="border-t border-[#7f1d1d]/30 bg-[#450a0a] px-4 py-3 text-sm font-semibold text-[#fecaca]">
          {cameraError}
        </div>
      )}
    </div>
  );
};

export default FaceCapture;
