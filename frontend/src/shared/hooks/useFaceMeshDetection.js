import { useEffect, useRef, useState } from 'react';

const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_ASSET_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
const LEFT_BROW = [70, 63, 105, 66, 107];
const RIGHT_BROW = [336, 296, 334, 293, 300];
const LEFT_EYE = [33, 160, 158, 133, 153, 144, 33];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380, 362];
const OUTER_LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61];
const NOSE_BRIDGE = [168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 98, 97];
const EYE_BLINK_COOLDOWN_MS = 1800;

const readBooleanEnv = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return !['false', '0', 'off', 'no'].includes(String(value).trim().toLowerCase());
};

const readNumberEnv = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const distance = (pointA, pointB) => {
  if (!pointA || !pointB) return 0;
  const dx = pointA.x - pointB.x;
  const dy = pointA.y - pointB.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const calculateEyeAspectRatio = (landmarks, eyeIndices) => {
  const points = eyeIndices.map((index) => landmarks[index]).filter(Boolean);
  if (points.length !== eyeIndices.length) return null;

  const verticalA = distance(points[1], points[5]);
  const verticalB = distance(points[2], points[4]);
  const horizontal = distance(points[0], points[3]);

  if (!horizontal) return null;
  return (verticalA + verticalB) / (2 * horizontal);
};

const clearCanvas = (canvasRef) => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
};

const drawPath = (context, landmarks, indices, strokeStyle) => {
  if (!indices.length) return;
  context.beginPath();

  indices.forEach((index, position) => {
    const point = landmarks[index];
    if (!point) return;
    const x = point.x * context.canvas.width;
    const y = point.y * context.canvas.height;
    if (position === 0) {
      context.moveTo(x, y);
      return;
    }
    context.lineTo(x, y);
  });

  context.strokeStyle = strokeStyle;
  context.lineWidth = 1.35;
  context.stroke();
};

const drawLandmarks = (context, landmarks, strokeStyle, fillStyle) => {
  drawPath(context, landmarks, FACE_OVAL, strokeStyle);
  drawPath(context, landmarks, LEFT_BROW, strokeStyle);
  drawPath(context, landmarks, RIGHT_BROW, strokeStyle);
  drawPath(context, landmarks, LEFT_EYE, strokeStyle);
  drawPath(context, landmarks, RIGHT_EYE, strokeStyle);
  drawPath(context, landmarks, OUTER_LIPS, strokeStyle);
  drawPath(context, landmarks, NOSE_BRIDGE, strokeStyle);

  context.fillStyle = fillStyle;
  for (const point of landmarks) {
    const x = point.x * context.canvas.width;
    const y = point.y * context.canvas.height;
    context.beginPath();
    context.arc(x, y, 1.4, 0, Math.PI * 2);
    context.fill();
  }
};

export const useFaceMeshDetection = ({
  videoRef,
  active = true,
  captureLocked = false,
  onBlinkCapture,
  autoBlinkOverride,
} = {}) => {
  const meshCanvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastProcessedAtRef = useRef(0);
  const eyeClosedRef = useRef(false);
  const blinkTimeoutRef = useRef(null);
  const lastBlinkAtRef = useRef(0);
  const captureLockedRef = useRef(captureLocked);
  const onBlinkCaptureRef = useRef(onBlinkCapture);
  const isFaceDetectedRef = useRef(false);
  const faceCountRef = useRef(0);

  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelError, setModelError] = useState('');
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [blinkDetected, setBlinkDetected] = useState(false);

  const meshVisible = readBooleanEnv(import.meta.env.VITE_FACE_CAPTURE_MESH_VISIBLE, true);
  const autoBlinkEnabled =
    autoBlinkOverride !== undefined
      ? Boolean(autoBlinkOverride)
      : readBooleanEnv(import.meta.env.VITE_FACE_CAPTURE_AUTO_BLINK, true);
  const blinkThreshold = readNumberEnv(import.meta.env.VITE_FACE_CAPTURE_BLINK_THRESHOLD, 0.2);
  const detectionFps = Math.max(1, readNumberEnv(import.meta.env.VITE_FACE_CAPTURE_DETECTION_FPS, 10));
  const detectionEnabled = active && (meshVisible || autoBlinkEnabled);

  useEffect(() => {
    onBlinkCaptureRef.current = onBlinkCapture;
  }, [onBlinkCapture]);

  useEffect(() => {
    captureLockedRef.current = captureLocked;
  }, [captureLocked]);

  useEffect(() => {
    if (!detectionEnabled) {
      setIsModelLoading(false);
      setModelError('');
      setIsFaceDetected(false);
      setFaceCount(0);
      setBlinkDetected(false);
      eyeClosedRef.current = false;
      clearCanvas(meshCanvasRef);
      return undefined;
    }

    let cancelled = false;

    const startDetection = async () => {
      try {
        setIsModelLoading(true);
        setModelError('');

        const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision');
        if (cancelled) return;

        const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
        if (cancelled) return;

        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          numFaces: 2,
        });

        if (cancelled) {
          landmarkerRef.current?.close?.();
          landmarkerRef.current = null;
          return;
        }

        const processFrame = () => {
          if (cancelled) return;

          const video = videoRef?.current;
          const canvas = meshCanvasRef.current;
          const landmarker = landmarkerRef.current;
          if (!video || !canvas || !landmarker) {
            animationFrameRef.current = window.requestAnimationFrame(processFrame);
            return;
          }

          if (video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
            animationFrameRef.current = window.requestAnimationFrame(processFrame);
            return;
          }

          const now = performance.now();
          if (now - lastProcessedAtRef.current < 1000 / detectionFps) {
            animationFrameRef.current = window.requestAnimationFrame(processFrame);
            return;
          }

          lastProcessedAtRef.current = now;

          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          const context = canvas.getContext('2d');
          if (!context) {
            animationFrameRef.current = window.requestAnimationFrame(processFrame);
            return;
          }

          context.clearRect(0, 0, canvas.width, canvas.height);

          const result = landmarker.detectForVideo(video, now);
          const faces = result?.faceLandmarks || [];

          if (faces.length !== faceCountRef.current) {
            faceCountRef.current = faces.length;
            setFaceCount(faces.length);
          }

          const detected = faces.length > 0;
          if (detected !== isFaceDetectedRef.current) {
            isFaceDetectedRef.current = detected;
            setIsFaceDetected(detected);
          }

          if (meshVisible && faces.length) {
            faces.slice(0, 2).forEach((landmarks, index) => {
              const isPrimaryFace = index === 0 && faces.length === 1;
              const stroke = isPrimaryFace ? 'rgba(45, 212, 191, 0.85)' : 'rgba(248, 113, 113, 0.75)';
              const fill = isPrimaryFace ? 'rgba(153, 246, 228, 0.95)' : 'rgba(254, 202, 202, 0.9)';
              drawLandmarks(context, landmarks, stroke, fill);
            });
          }

          if (!autoBlinkEnabled || captureLockedRef.current || faces.length !== 1) {
            eyeClosedRef.current = false;
            animationFrameRef.current = window.requestAnimationFrame(processFrame);
            return;
          }

          const landmarks = faces[0];
          const leftEar = calculateEyeAspectRatio(landmarks, LEFT_EYE.slice(0, 6));
          const rightEar = calculateEyeAspectRatio(landmarks, RIGHT_EYE.slice(0, 6));
          if (!Number.isFinite(leftEar) || !Number.isFinite(rightEar)) {
            eyeClosedRef.current = false;
            animationFrameRef.current = window.requestAnimationFrame(processFrame);
            return;
          }

          const ear = (leftEar + rightEar) / 2;
          const closingThreshold = blinkThreshold;
          const openingThreshold = blinkThreshold + 0.035;

          if (!eyeClosedRef.current && ear <= closingThreshold) {
            eyeClosedRef.current = true;
          } else if (eyeClosedRef.current && ear >= openingThreshold) {
            eyeClosedRef.current = false;
            const realNow = Date.now();
            if (realNow - lastBlinkAtRef.current >= EYE_BLINK_COOLDOWN_MS) {
              lastBlinkAtRef.current = realNow;
              setBlinkDetected(true);
              if (blinkTimeoutRef.current) {
                window.clearTimeout(blinkTimeoutRef.current);
              }
              blinkTimeoutRef.current = window.setTimeout(() => {
                setBlinkDetected(false);
              }, 900);
              onBlinkCaptureRef.current?.();
            }
          }

          animationFrameRef.current = window.requestAnimationFrame(processFrame);
        };

        animationFrameRef.current = window.requestAnimationFrame(processFrame);
      } catch (error) {
        if (!cancelled) {
          setModelError(error?.message || 'No fue posible activar la deteccion facial avanzada.');
          clearCanvas(meshCanvasRef);
        }
      } finally {
        if (!cancelled) {
          setIsModelLoading(false);
        }
      }
    };

    startDetection();

    return () => {
      cancelled = true;
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (blinkTimeoutRef.current) {
        window.clearTimeout(blinkTimeoutRef.current);
        blinkTimeoutRef.current = null;
      }
      landmarkerRef.current?.close?.();
      landmarkerRef.current = null;
      eyeClosedRef.current = false;
      isFaceDetectedRef.current = false;
      faceCountRef.current = 0;
      clearCanvas(meshCanvasRef);
    };
  }, [active, autoBlinkEnabled, blinkThreshold, detectionEnabled, detectionFps, meshVisible, videoRef]);

  return {
    meshCanvasRef,
    isModelLoading,
    modelError,
    isFaceDetected,
    faceCount,
    blinkDetected,
    isMeshEnabled: meshVisible,
    isAutoBlinkEnabled: autoBlinkEnabled,
  };
};
