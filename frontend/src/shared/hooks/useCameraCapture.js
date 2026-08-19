import { useCallback, useEffect, useRef, useState } from 'react';

export const useCameraCapture = ({ autoOpen = true } = {}) => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraChecking, setCameraChecking] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopCameraStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          return;
        }
      });
    }

    streamRef.current = null;
  }, []);

  const attachStreamToVideo = useCallback((stream) => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    const videoElement = videoRef.current;
    videoElement.onloadedmetadata = () => {
      try {
        videoElement.play();
      } catch {
        return;
      }
    };
  }, []);

  const openCamera = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Tu navegador no permite abrir la camara desde esta pagina.');
      setCameraOpen(false);
      return false;
    }

    try {
      setCameraChecking(true);
      setCameraError('');
      stopCameraStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      setCameraOpen(true);
      return true;
    } catch (error) {
      setCameraError(error?.message || 'No fue posible acceder a la camara. Verifica los permisos.');
      stopCameraStream();
      setCameraOpen(false);
      return false;
    } finally {
      setCameraChecking(false);
    }
  }, [stopCameraStream]);

  const retryCamera = useCallback(async () => {
    setCameraError('');
    return openCamera();
  }, [openCamera]);

  const captureImage = useCallback(({ maxWidth, quality = 0.95, mimeType = 'image/jpeg' } = {}) => {
    if (!videoRef.current) {
      throw new Error('No encontramos video disponible para capturar.');
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const sourceWidth = video.videoWidth || 960;
    const sourceHeight = video.videoHeight || 720;
    const scale = maxWidth && sourceWidth > maxWidth ? maxWidth / sourceWidth : 1;
    canvas.width = Math.round(sourceWidth * scale);
    canvas.height = Math.round(sourceHeight * scale);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('No fue posible preparar la captura de la camara.');
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(mimeType, quality);
  }, []);

  useEffect(() => {
    if (autoOpen) {
      openCamera();
    }

    return () => {
      stopCameraStream();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [autoOpen, openCamera, stopCameraStream]);

  useEffect(() => {
    if (cameraOpen && streamRef.current && videoRef.current) {
      attachStreamToVideo(streamRef.current);
    }
  }, [attachStreamToVideo, cameraOpen]);

  return {
    cameraOpen,
    cameraChecking,
    cameraError,
    setCameraError,
    videoRef,
    openCamera,
    retryCamera,
    captureImage,
    stopCameraStream,
  };
};
