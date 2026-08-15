import { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import QrScanner from 'react-qr-scanner';
import { toast } from 'sonner';
import Input from '../../../shared/components/Input';
import FaceCapture from '../components/FaceCapture';
import { useForm } from '../../../shared/hooks/useForm';
import { apiRequest, resolveAssetUrl, uploadImageSource } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';

const PERMISOS_SISTEMA = ['Administrador', 'Celador', 'Usuario'];
const ESTADOS = ['activo', 'inactivo'];
const ROLES_ACADEMICOS = ['Estudiante', 'Profesor', 'Egresado'];
const FACULTADES = [
  'Administracion de Empresas',
  'Contaduria Publica',
  'Derecho',
  'Economia',
  'Finanza y Negocios Internacionales',
  'Arquitectura',
  'Biologia',
  'Ingenieria Agroforestal',
  'Ingenieria Agroindustrial',
  'Ingenieria de Sistemas',
  'Ingenieria en Energias',
  'Ingenieria Civil',
  'Medicina Veterinaria y Zootecnia',
];

const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const TEST_NAMES = ['Valentina', 'Santiago', 'Camila', 'Mateo', 'Isabella', 'Samuel', 'Lucia', 'Nicolas'];
const TEST_LAST_NAMES = ['Martinez', 'Gonzalez', 'Rodriguez', 'Lopez', 'Hernandez', 'Garcia', 'Diaz', 'Torres'];
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

const INITIAL_FORM = {
  cedula: '',
  nombre: '',
  apellido: '',
  email: '',
  password: '',
  RH: '',
  facultad: '',
  telefono: '',
  imagen: '',
  imagenQR: '',
  rolAcademico: '',
  permisoSistema: 'Usuario',
  estado: 'inactivo',
};

const FACE_STATUS = {
  IDLE: 'idle',
  CHECKING: 'checking',
  READY: 'ready',
  SERVICE_ERROR: 'service_error',
  VALIDATION_ERROR: 'validation_error',
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const RegisterGuard = () => {
  const { form, handleChange, reset, setForm } = useForm(INITIAL_FORM);
  const { token } = useAuth();
  const audioContextRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [errors, setErrors] = useState({});
  const [qrError, setQrError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scannerKey, setScannerKey] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [showFaceCaptureModal, setShowFaceCaptureModal] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState([]);
  const [faceCaptureStatus, setFaceCaptureStatus] = useState(FACE_STATUS.IDLE);
  const [faceFeedback, setFaceFeedback] = useState('');
  const [documentImage, setDocumentImage] = useState('');
  const [documentMetadata, setDocumentMetadata] = useState(null);
  const [documentOcrError, setDocumentOcrError] = useState('');
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentCameraOpen, setDocumentCameraOpen] = useState(false);
  const [documentCameraError, setDocumentCameraError] = useState('');
  const [documentCameraChecking, setDocumentCameraChecking] = useState(false);
  const [documentCameraCapturing, setDocumentCameraCapturing] = useState(false);
  const documentVideoRef = useRef(null);
  const documentCameraStreamRef = useRef(null);

  const isSubmitting = status === 'loading';

  useEffect(() => {
    return () => {
      const ctx = audioContextRef.current;
      if (ctx?.close) {
        ctx.close().catch(() => {});
      }
      audioContextRef.current = null;
      const stream = documentCameraStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            return;
          }
        });
      }
    };
  }, []);

  useEffect(() => {
    const requiresFacultad = form.permisoSistema === 'Usuario';
    const requiredFields = ['nombre', 'cedula', 'RH', 'telefono'];
    if (requiresFacultad) {
      requiredFields.splice(2, 0, 'facultad');
    }

    const missingFields = requiredFields.some((field) => !String(form[field] || '').trim());
    if (missingFields) {
      setForm((prev) => (prev.imagenQR ? { ...prev, imagenQR: '' } : prev));
      return undefined;
    }

    let cancelled = false;

    const syncQrPreview = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(buildQrRawText(), {
          width: 512,
          errorCorrectionLevel: 'M',
          margin: 1,
        });

        if (!cancelled) {
          setQrError('');
          setForm((prev) => (prev.imagenQR === dataUrl ? prev : { ...prev, imagenQR: dataUrl }));
        }
      } catch {
        if (!cancelled) {
          setQrError('No fue posible generar el codigo QR automaticamente.');
        }
      }
    };

    syncQrPreview();

    return () => {
      cancelled = true;
    };
  }, [form.nombre, form.apellido, form.cedula, form.facultad, form.RH, form.telefono, form.permisoSistema, setForm]);

  useEffect(() => {
    if (documentCameraOpen && documentCameraStreamRef.current && documentVideoRef.current) {
      documentVideoRef.current.srcObject = documentCameraStreamRef.current;
      documentVideoRef.current.onloadedmetadata = () => {
        try {
          documentVideoRef.current?.play();
        } catch {
          return;
        }
      };
    }
  }, [documentCameraOpen]);

  const setFieldValue = (name, value) => {
    if (name === 'imagenQR') {
      setQrError('');
    }
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetDocumentFeedback = () => {
    setDocumentOcrError('');
    setDocumentMetadata(null);
  };

  const stopDocumentCameraStream = () => {
    const stream = documentCameraStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          return;
        }
      });
    }
    documentCameraStreamRef.current = null;
  };

  const closeDocumentCamera = () => {
    stopDocumentCameraStream();
    if (documentVideoRef.current) {
      documentVideoRef.current.srcObject = null;
    }
    setDocumentCameraOpen(false);
    setDocumentCameraCapturing(false);
  };

  const openDocumentCamera = async () => {
    if (documentCameraChecking || documentCameraCapturing) return;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setDocumentCameraError('Tu navegador no permite abrir la camara desde esta pagina.');
      return;
    }

    try {
      setDocumentCameraChecking(true);
      setDocumentCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      documentCameraStreamRef.current = stream;
      setDocumentCameraOpen(true);
      if (documentVideoRef.current) {
        documentVideoRef.current.srcObject = stream;
        documentVideoRef.current.onloadedmetadata = () => {
          try {
            documentVideoRef.current?.play();
          } catch {
            return;
          }
        };
      }
    } catch (error) {
      setDocumentCameraError(error?.message || 'No fue posible acceder a la camara. Verifica los permisos.');
      closeDocumentCamera();
    } finally {
      setDocumentCameraChecking(false);
    }
  };

  const captureDocumentFromCamera = () => {
    if (!documentVideoRef.current) {
      setDocumentCameraError('No encontramos video disponible para capturar.');
      return;
    }

    try {
      setDocumentCameraCapturing(true);
      const video = documentVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setDocumentImage(dataUrl);
      resetDocumentFeedback();
      closeDocumentCamera();
    } catch {
      setDocumentCameraError('No fue posible capturar la imagen del documento. Intenta nuevamente.');
    } finally {
      setDocumentCameraCapturing(false);
    }
  };

  const applyDocumentMetadata = (metadata = {}) => {
    const overrides = {};
    if (metadata.cedula) overrides.cedula = metadata.cedula;
    if (metadata.nombres) overrides.nombre = metadata.nombres;
    if (metadata.apellidos) overrides.apellido = metadata.apellidos;

    if (!Object.keys(overrides).length) return;

    setForm((prev) => ({ ...prev, ...overrides }));
  };

  const handleDocumentFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (event.target.value) {
      event.target.value = '';
    }
    if (!file) return;

    if (!file.type?.startsWith('image/')) {
      setDocumentOcrError('Solo se permiten imagenes en formato PNG o JPG.');
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      setDocumentOcrError('La imagen supera el limite de 5MB.');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setDocumentImage(dataUrl);
      resetDocumentFeedback();
    } catch {
      setDocumentOcrError('No fue posible leer el archivo seleccionado.');
    }
  };

  const handleRemoveDocumentImage = () => {
    setDocumentImage('');
    resetDocumentFeedback();
  };

  const handleExtractDocumentData = async () => {
    if (!documentImage) {
      setDocumentOcrError('Debes adjuntar la foto de la cedula antes de continuar.');
      return;
    }

    try {
      setDocumentLoading(true);
      setDocumentOcrError('');
      const response = await apiRequest('/visitors/ocr', {
        method: 'POST',
        data: { image: documentImage },
      });

      const metadata = response?.data || response;
      setDocumentMetadata(metadata || null);
      applyDocumentMetadata(metadata || {});
      toast.info('Datos del documento cargados. Verifica y completa los campos restantes antes de guardar.');
      setStatus('success');
    } catch (error) {
      setDocumentMetadata(null);
      setDocumentOcrError(error.message || 'No fue posible extraer los datos del documento.');
    } finally {
      setDocumentLoading(false);
    }
  };

  const handleFileChange = async (event) => {
    const { name, files } = event.target;
    if (!files?.length) return;

    try {
      const dataUrl = await readFileAsDataUrl(files[0]);
      if (name === 'imagen') {
        setErrors((prev) => {
          if (!prev.imagen) return prev;
          const next = { ...prev };
          delete next.imagen;
          return next;
        });
      }
      setFieldValue(name, dataUrl);
      if (name === 'imagen') {
        await analyzeProfileImage(dataUrl);
      }
    } catch {
      if (name === 'imagen') {
        setFaceCaptureStatus(FACE_STATUS.VALIDATION_ERROR);
        setFaceFeedback('No fue posible leer la imagen seleccionada. Intenta con otro archivo.');
        return;
      }
      setQrError('No fue posible leer la imagen seleccionada. Intenta con otro archivo.');
    }
  };

  const buildQrRawText = () => {
    const fullName = [form.nombre, form.apellido].filter(Boolean).join(' ').trim();
    const lines = [
      fullName,
      form.cedula,
      form.facultad,
      form.RH,
      form.telefono,
    ];

    return lines.filter(Boolean).join('\n\n');
  };


  const analyzeProfileImage = async (image) => {
    const normalizedImage = String(image || '').trim();
    setFaceDescriptor([]);

    if (!normalizedImage) {
      setFaceCaptureStatus(FACE_STATUS.IDLE);
      setFaceFeedback('');
      return;
    }

    try {
      setFaceCaptureStatus(FACE_STATUS.CHECKING);
      setFaceFeedback('Validando el rostro de la foto seleccionada...');

      const response = await apiRequest('/face/extract', {
        method: 'POST',
        token,
        data: { image: normalizedImage },
      });

      const data = response?.data || response;
      setFaceDescriptor(Array.isArray(data?.embedding) ? data.embedding : []);
      setFaceCaptureStatus(FACE_STATUS.READY);
      setFaceFeedback('Rostro validado. Se usara esta misma imagen para el perfil y el embedding facial.');
    } catch (error) {
      setFaceDescriptor([]);
      if ([503, 504].includes(error.status)) {
        setFaceCaptureStatus(FACE_STATUS.SERVICE_ERROR);
        setFaceFeedback('No fue posible validar el rostro por ahora. El usuario se registrara solo con la foto de perfil.');
        return;
      }

      setFaceCaptureStatus(FACE_STATUS.VALIDATION_ERROR);
      setFaceFeedback(error.message || 'La foto debe contener un solo rostro visible para generar el embedding.');
    }
  };

  const buildPayload = ({ profileImage, qrImage }) => ({
    cedula: form.cedula.trim(),
    nombre: form.nombre.trim(),
    apellido: form.apellido.trim(),
    email: form.email.trim().toLowerCase(),
    password: form.password ? form.password : undefined,
    RH: form.RH.trim().toUpperCase(),
    facultad: form.facultad.trim(),
    telefono: form.telefono.trim(),
    imagen: profileImage,
    imagenQR: qrImage,
    faceImage: form.imagen,
    faceDescriptor,
    rolAcademico: form.rolAcademico.trim(),
    permisoSistema: form.permisoSistema,
    estado: form.estado,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setErrors({});
    setFaceFeedback('');

    if (!form.imagen) {
      setStatus('error');
      setErrors((prev) => ({ ...prev, imagen: 'La foto de perfil es obligatoria.' }));
      return;
    }

    if (faceCaptureStatus === FACE_STATUS.VALIDATION_ERROR) {
      setStatus('error');
      toast.error('La foto de perfil debe contener un solo rostro visible para generar el embedding facial.');
      return;
    }

    if (faceCaptureStatus === FACE_STATUS.CHECKING) {
      setStatus('error');
      toast.warning('Espera a que termine la validacion facial antes de registrar el usuario.');
      return;
    }

    try {
      const uploadedProfileImage = await uploadImageSource('profile', form.imagen, {
        token,
        fileName: `${form.cedula || form.nombre || 'usuario'}-perfil.jpg`,
      });
      const uploadedQrImage = await uploadImageSource('qr', form.imagenQR, {
        token,
        fileName: `${form.cedula || form.nombre || 'usuario'}-qr.png`,
      });

      const response = await apiRequest('/users', {
        method: 'POST',
        token,
        data: buildPayload({ profileImage: uploadedProfileImage, qrImage: uploadedQrImage }),
      });

      const generatedPasswordMessage = response?.generatedPassword
        ? ` Contraseña temporal: ${response.generatedPassword}`
        : '';

      const faceRegistrationMessage = response?.faceRegistration?.registered
        ? ' Rostro enrolado correctamente.'
        : response?.warnings?.[0]
          ? ` ${response.warnings[0]}`
          : '';
      const successMessage = `Usuario registrado correctamente.${generatedPasswordMessage}${faceRegistrationMessage}`;

      setFaceCaptureStatus(FACE_STATUS.IDLE);
      setFaceDescriptor([]);
      toast.success(successMessage, { duration: 8000 });
      reset(INITIAL_FORM);
      setDocumentImage('');
      setDocumentMetadata(null);
      setDocumentOcrError('');
      if (!response?.faceRegistration?.registered && response?.faceRegistration?.message) {
        setFaceFeedback(response.faceRegistration.message);
      }

      setStatus('success');
    } catch (error) {
      setStatus('error');
      const apiErrors = error.details?.errors;
      if (apiErrors && typeof apiErrors === 'object') {
        setErrors(apiErrors);
        if (apiErrors.general) {
          toast.error(apiErrors.general);
        }
      } else {
        const failureMessage = error.message || 'No fue posible completar el registro';
        toast.error(failureMessage);
      }
    }
  };

  const handleOpenFaceCapture = () => {
    setShowFaceCaptureModal(true);
  };

  const handleRemoveProfileImage = () => {
    setFieldValue('imagen', '');
    setFaceDescriptor([]);
    setFaceCaptureStatus(FACE_STATUS.IDLE);
    setFaceFeedback('');
    setErrors((prev) => {
      if (!prev.imagen) return prev;
      const next = { ...prev };
      delete next.imagen;
      return next;
    });
  };

  const handleFaceCaptureSuccess = async (payload) => {
    const image = payload?.image || '';
    if (!image) {
      setFaceCaptureStatus(FACE_STATUS.VALIDATION_ERROR);
      setFaceFeedback('No fue posible conservar la captura del rostro.');
      return;
    }

    setFieldValue('imagen', image);
    setErrors((prev) => {
      if (!prev.imagen) return prev;
      const next = { ...prev };
      delete next.imagen;
      return next;
    });
    setShowFaceCaptureModal(false);
    await analyzeProfileImage(image);
  };

  const handleFaceCaptureError = (error) => {
    setFaceCaptureStatus(FACE_STATUS.VALIDATION_ERROR);
    setFaceFeedback(error?.message || 'No fue posible capturar el rostro.');
  };

  const normalizeString = (value = '') =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const splitNameParts = (fullName = '') => {
    const parts = fullName
      .split(/\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) {
      return { nombre: '', apellido: '' };
    }
    if (parts.length === 1) {
      return { nombre: parts[0], apellido: '' };
    }
    if (parts.length === 2) {
      return { nombre: parts[0], apellido: parts[1] };
    }
    const apellido = parts.slice(-2).join(' ');
    const nombre = parts.slice(0, -2).join(' ');
    return { nombre, apellido };
  };

  const resolveFacultad = (value = '') => {
    if (!value) return '';
    const target = normalizeString(value);
    const match = FACULTADES.find((fac) => normalizeString(fac) === target);
    return match || value;
  };

  const mapParsedQrData = (data = {}) => {
    const fullName = data.nombre || data.nombres || '';
    const providedNombre = data.nombre || '';
    const providedApellido = data.apellido || '';
    const shouldSplit = !providedApellido && fullName && !data.nombres;
    const nameParts = shouldSplit ? splitNameParts(fullName) : { nombre: providedNombre, apellido: providedApellido };

    return {
      cedula: data.cedula || '',
      nombre: nameParts.nombre || providedNombre || '',
      apellido: nameParts.apellido || providedApellido || '',
      rolAcademico: data.rolAcademico || data.rol || '',
      facultad: resolveFacultad(data.programa || data.facultad || ''),
      RH: (data.tipo_sangre || data.RH || data.rh || '').toUpperCase(),
      telefono: data.telefono || '',
      email: data.email || data.correo || '',
    };
  };

  const handleScan = async (scanData) => {
    const text = scanData?.text?.trim();
    if (!text || isScanning) return;

    setIsScanning(true);
    setScannerError('');

    try {
      const response = await apiRequest('/users/parse-qr', {
        method: 'POST',
        token,
        data: { qrData: text },
      });

      const data = response?.data || response;
      const mapped = mapParsedQrData(data);

      setForm((prev) => ({
        ...prev,
        ...mapped,
      }));

      playBeep();
      toast.info('Datos precargados desde el QR. Verifica y completa antes de guardar.');
      setStatus('success');
      setShowScanner(false);
      setScannerKey((prev) => prev + 1);
    } catch (error) {
      const message =
        error.details?.message ||
        error.message ||
        'No fue posible interpretar el QR.';
      setScannerError(message);
    } finally {
      setIsScanning(false);
    }
  };

  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const duration = 0.15;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      return;
    }
  };

  const pickRandom = (values = []) => values[Math.floor(Math.random() * values.length)] || '';

  const fillTestData = () => {
    const nombre = pickRandom(TEST_NAMES);
    const apellido = `${pickRandom(TEST_LAST_NAMES)} ${pickRandom(TEST_LAST_NAMES)}`;
    const cedula = String(Math.floor(10000000 + Math.random() * 89999999));
    const telefono = `3${String(Math.floor(100000000 + Math.random() * 899999999)).slice(0, 9)}`;
    const permisoSistema = 'Usuario';
    const facultad = pickRandom(FACULTADES);
    const rolAcademico = pickRandom(ROLES_ACADEMICOS);
    const RH = pickRandom(TIPOS_SANGRE);
    const emailSlug = `${nombre}.${apellido.split(' ')[0]}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    setForm((prev) => ({
      ...prev,
      cedula,
      nombre,
      apellido,
      email: `${emailSlug}${cedula.slice(-3)}@correo.test`,
      password: 'Test1234',
      RH,
      facultad,
      telefono,
      rolAcademico,
      permisoSistema,
      estado: 'activo',
    }));

    toast.info('Datos de prueba cargados. Solo falta la foto del usuario.');
    setStatus('success');
    setErrors({});
    setScannerError('');
    setQrError('');
  };

  return (
    <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#00594e]">Gestion de usuarios</p>
          <h1 className="text-3xl font-bold text-[#0f172a]">Registrar usuario del sistema</h1>
          <p className="max-w-3xl text-sm text-[#475569]">
            Completa la informacion solicitada para crear un usuario con permisos en el panel. Todos los campos corresponden al modelo de datos vigente.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.45fr_0.9fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="space-y-6">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      name: 'cedula',
                      label: 'Cedula',
                      type: 'text',
                      required: true,
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                    },
                    { name: 'nombre', label: 'Nombre', type: 'text', required: true },
                    { name: 'apellido', label: 'Apellido', type: 'text' },
                    { name: 'email', label: 'Correo', type: 'email', required: true },
                    { name: 'password', label: 'Password (opcional)', type: 'password', required: false },
                    {
                      name: 'telefono',
                      label: 'Telefono',
                      type: 'text',
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                    },
                    { name: 'RH', label: 'RH', type: 'select' },
                  ].map((field) => {
                    const handleFieldChange = (event) => {
                      if (['cedula', 'telefono'].includes(field.name)) {
                        const sanitized = event.target.value.replace(/\D/g, '');
                        event.target.value = sanitized;
                      }
                      handleChange(event);
                    };

                    if (field.name === 'RH') {
                      return (
                        <div key={field.name}>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-[#00594e]">{field.label}</span>
                            <select
                              name="RH"
                              value={form.RH}
                              onChange={handleChange}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70"
                            >
                              <option value="">Selecciona el tipo de sangre</option>
                              {TIPOS_SANGRE.map((tipo) => (
                                <option key={tipo} value={tipo}>
                                  {tipo}
                                </option>
                              ))}
                            </select>
                          </label>
                          {errors.RH && (
                            <p className="mt-2 text-xs font-medium text-[#b45309]">{errors.RH}</p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={field.name}>
                        <Input
                          type={field.type}
                          placeholder={field.label}
                          onChange={handleFieldChange}
                          value={form[field.name]}
                          name={field.name}
                          required={field.required}
                          inputMode={field.inputMode}
                          pattern={field.pattern}
                        />
                        {errors[field.name] && (
                          <p className="mt-2 text-xs font-medium text-[#b45309]">{errors[field.name]}</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-[#00594e]">Rol academico</span>
                      <select
                        name="rolAcademico"
                        value={form.rolAcademico}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70"
                      >
                        <option value="">Seleccione un rol</option>
                        {ROLES_ACADEMICOS.map((rol) => (
                          <option key={rol} value={rol}>
                            {rol}
                          </option>
                        ))}
                      </select>
                    </label>
                    {errors.rolAcademico && (
                      <p className="mt-2 text-xs font-medium text-[#b45309]">{errors.rolAcademico}</p>
                    )}
                  </div>

                  <div>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-[#00594e]">Programa</span>
                      <select
                        name="facultad"
                        value={form.facultad}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70"
                      >
                        <option value="">Seleccione un programa</option>
                        {FACULTADES.map((facultad) => (
                          <option key={facultad} value={facultad}>
                            {facultad}
                          </option>
                        ))}
                      </select>
                    </label>
                    {errors.facultad && (
                      <p className="mt-2 text-xs font-medium text-[#b45309]">{errors.facultad}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-[#00594e]">Permiso del sistema</span>
                      <select
                        name="permisoSistema"
                        value={form.permisoSistema}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70"
                        required
                      >
                        {PERMISOS_SISTEMA.map((permiso) => (
                          <option key={permiso} value={permiso}>
                            {permiso}
                          </option>
                        ))}
                      </select>
                    </label>
                    {errors.permisoSistema && (
                      <p className="mt-2 text-xs font-medium text-[#b45309]">{errors.permisoSistema}</p>
                    )}
                  </div>

                  <div>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-[#00594e]">Estado</span>
                      <select
                        name="estado"
                        value={form.estado}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70"
                        required
                      >
                        {ESTADOS.map((estado) => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </select>
                    </label>
                    {errors.estado && (
                      <p className="mt-2 text-xs font-medium text-[#b45309]">{errors.estado}</p>
                    )}
                  </div>
                </div>

                <section className="space-y-4 rounded-2xl border border-dashed border-[#00594e]/40 bg-[#ecfdf5] p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0f766e]">Documento de identidad</p>
                      <p className="mt-2 text-sm text-[#0f172a]">
                        Captura o adjunta la foto de la cedula para extraer automaticamente cedula, nombres y apellidos.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={openDocumentCamera}
                        disabled={documentCameraChecking}
                        className="inline-flex items-center justify-center rounded-lg border border-[#0f766e] bg-white px-4 py-2 text-xs font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/5 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {documentCameraChecking ? 'Abriendo camara...' : 'Abrir camara'}
                      </button>
                      <label
                        htmlFor="document-upload-input"
                        className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#0f172a] transition hover:bg-slate-50"
                      >
                        Subir foto
                      </label>
                    </div>
                  </div>

                  <input
                    id="document-upload-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleDocumentFileChange}
                  />

                  {documentImage ? (
                    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row">
                      <img
                        src={documentImage}
                        alt="Documento de identidad"
                        className="h-28 w-44 rounded-lg border border-[#0f766e]/30 object-cover shadow-sm lg:h-32 lg:w-52"
                      />
                      <div className="flex-1 space-y-3 text-sm text-[#475569]">
                        <p>Extrae los datos detectados y revisalos antes de guardar el usuario.</p>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={handleExtractDocumentData}
                            disabled={documentLoading}
                            className="inline-flex items-center justify-center rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5f58] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {documentLoading ? 'Extrayendo datos...' : 'Extraer datos automaticamente'}
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveDocumentImage}
                            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-[#fee2e2] px-4 py-2 text-sm font-semibold text-[#b91c1c] shadow-sm transition hover:bg-[#fecaca]"
                          >
                            Remover imagen
                          </button>
                        </div>
                        {documentOcrError && (
                          <p className="text-xs font-medium text-[#b45309]">{documentOcrError}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-[#64748b]">
                      Aun no hay foto del documento. Puedes tomarla con camara o subir un archivo para precargar los datos.
                    </div>
                  )}

                  {documentMetadata && (
                    <div className="rounded-2xl border border-[#0f766e]/30 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0f766e]">Datos detectados</p>
                      <dl className="mt-3 grid gap-3 text-sm text-[#0f172a] sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-[#475569]">Numero de cedula</dt>
                          <dd className="mt-1 font-medium">{documentMetadata.cedula || 'No detectado'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-[#475569]">Nombres</dt>
                          <dd className="mt-1 font-medium">{documentMetadata.nombres || 'No detectado'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-[#475569]">Apellidos</dt>
                          <dd className="mt-1 font-medium">{documentMetadata.apellidos || 'No detectado'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-[#475569]">Fecha de nacimiento</dt>
                          <dd className="mt-1 font-medium">{documentMetadata.fechaNacimiento || 'No detectada'}</dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </section>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00594e]">Foto del usuario</p>
                      <h2 className="mt-2 text-xl font-semibold text-[#0f172a]">Perfil e identidad facial en una sola imagen</h2>
                      <p className="mt-2 max-w-2xl text-sm text-[#475569]">
                        La foto de perfil es obligatoria. Si el servicio facial esta disponible, se reutilizara la misma imagen para generar el embedding del usuario.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleOpenFaceCapture}
                        className="inline-flex items-center justify-center rounded-lg border border-[#B5A160]/40 bg-white px-4 py-2 text-xs font-semibold text-[#8c7030] transition hover:bg-[#B5A160]/10"
                      >
                        Tomar con camara
                      </button>
                      <label
                        htmlFor="imagen"
                        className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#00594e]/40 bg-white px-4 py-2 text-xs font-semibold text-[#00594e] transition hover:bg-[#00594e]/10"
                      >
                        Subir archivo
                      </label>
                    </div>
                  </div>

                  <input
                    id="imagen"
                    name="imagen"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                    {form.imagen && (
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <img src={resolveAssetUrl(form.imagen)} alt="Preview perfil" className="h-20 w-20 rounded-xl object-cover shadow-sm" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[#0f172a]">Foto lista</p>
                          <p className="mt-1 text-xs text-[#64748b]">
                            Esta imagen se usara como foto de perfil y, si es valida, tambien para el embedding facial.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveProfileImage}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-[#475569] transition hover:bg-slate-100"
                        >
                          Quitar foto
                        </button>
                      </div>
                    )}

                    {!form.imagen && (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-[#64748b]">
                        Aun no hay foto. Toma una imagen frontal o sube una foto clara del usuario.
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[#475569]">
                        {faceCaptureStatus === FACE_STATUS.IDLE && 'Al seleccionar una foto se validara automaticamente el rostro para intentar registrar el embedding.'}
                        {faceCaptureStatus === FACE_STATUS.CHECKING && 'Validando rostro y preparando el embedding facial...'}
                        {faceCaptureStatus === FACE_STATUS.READY && 'Rostro validado correctamente. Esta misma imagen servira para perfil y reconocimiento facial.'}
                        {faceCaptureStatus === FACE_STATUS.SERVICE_ERROR && 'La foto de perfil quedo lista. Si el servicio facial no responde, el usuario se podra crear sin embedding.'}
                        {faceCaptureStatus === FACE_STATUS.VALIDATION_ERROR && 'La foto no permite generar el embedding. Usa una imagen frontal con un solo rostro visible.'}
                    </div>

                    {faceFeedback && (
                      <div
                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                          faceCaptureStatus === FACE_STATUS.READY
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : faceCaptureStatus === FACE_STATUS.CHECKING
                              ? 'border border-[#00594e]/30 bg-[#00594e]/5 text-[#00594e]'
                              : faceCaptureStatus === FACE_STATUS.SERVICE_ERROR
                                ? 'border border-[#B5A160]/40 bg-[#B5A160]/10 text-[#8c7030]'
                                : 'border border-[#b91c1c]/40 bg-[#fee2e2] text-[#7f1d1d]'
                        }`}
                      >
                        {faceFeedback}
                      </div>
                    )}

                    {errors.imagen && (
                      <p className="text-xs font-medium text-[#b45309]">{errors.imagen}</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || faceCaptureStatus === FACE_STATUS.CHECKING}
                  className="w-full rounded-lg bg-[#00594e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Registrando...' : 'Registrar usuario'}
                </button>
              </form>
            </div>
          </article>

          <aside className="flex flex-col gap-6 rounded-2xl border border-[#00594e]/20 bg-white p-8 shadow-sm">
            <div className="space-y-3 rounded-xl border border-dashed border-[#00594e]/30 bg-[#f8fafc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00594e]">
                Escanear QR y precargar
              </p>
              <p className="text-sm text-[#475569]">
                Si la persona ya cuenta con un QR institucional, puedes leerlo para completar el formulario automaticamente.
              </p>
              <div className="grid gap-3 sm:grid-cols-1">
                <button
                  type="button"
                  onClick={fillTestData}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#B5A160]/40 bg-white px-4 py-2 text-xs font-semibold text-[#8c7030] transition hover:bg-[#B5A160]/10"
                >
                  Rellenar datos de prueba
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowScanner(true);
                    setScannerError('');
                    setScannerKey((prev) => prev + 1);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#00594e]/40 bg-white px-4 py-2 text-xs font-semibold text-[#00594e] transition hover:bg-[#00594e]/10"
                >
                  Abrir escaner QR
                </button>
              </div>
              {scannerError && (
                <div className="rounded-lg border border-[#b91c1c]/40 bg-[#fee2e2] px-3 py-2 text-xs font-semibold text-[#7f1d1d]">
                  {scannerError}
                </div>
              )}
            </div>
            <div className="space-y-4 rounded-xl border border-dashed border-[#B5A160]/30 bg-[#fffaf0] p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8c7030]">Preview del QR</p>
                <p className="mt-2 text-sm text-[#475569]">
                  El QR del carnet se genera automaticamente con los datos del formulario y quedara guardado como imagen del usuario.
                </p>
              </div>

              {form.imagenQR ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[#B5A160]/30 bg-white p-3">
                  <img src={resolveAssetUrl(form.imagenQR)} alt="Preview QR" className="h-20 w-20 rounded-xl object-contain shadow-sm" />
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">QR listo</p>
                    <p className="mt-1 text-xs text-[#64748b]">
                      Esta imagen se guardara en el perfil del usuario y servira para el carnet.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#B5A160]/30 bg-white px-4 py-3 text-sm text-[#64748b]">
                  Completa nombre, cedula, RH y telefono. Si el permiso es Usuario, tambien debes elegir la facultad.
                </div>
              )}

              {qrError && (
                <div className="rounded-lg border border-[#b91c1c]/40 bg-[#fee2e2] px-3 py-2 text-xs font-semibold text-[#7f1d1d]">
                  {qrError}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#0f172a]">Recomendaciones</h2>
              <p className="mt-2 text-sm text-[#475569]">
                Verifica que el permiso seleccionado coincida con las funciones que el usuario realizara dentro del campus y que los datos personales esten actualizados.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-[#475569]">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#00594e]" />
                Usa correos oficiales para los roles administrativos y registra notas internas si el acceso es temporal.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#B5A160]" />
                El QR debe ser nitido y corresponder al usuario para evitar bloqueos en la entrada.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-slate-400" />
                Considera asignar el estado inactivo cuando se trate de registros anticipados que aun no deben acceder.
              </li>
            </ul>
            <div className="rounded-lg border border-dashed border-[#00594e]/40 bg-[#00594e]/5 px-4 py-4 text-sm text-[#00594e]">
              Los usuarios creados apareceran inmediatamente en el directorio y podran ser editados o desactivados desde alli.
            </div>
          </aside>
        </div>
      </div>

      {documentCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={closeDocumentCamera} />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#0f766e]">Camara</p>
                <h3 className="text-xl font-semibold text-[#0f172a]">Captura la cedula</h3>
              </div>
              <button
                type="button"
                onClick={closeDocumentCamera}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-[#0f172a]"
                aria-label="Cerrar camara"
              >
                X
              </button>
            </div>

            <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-black">
              <video ref={documentVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            </div>

            <p className="mt-3 text-sm text-[#475569]">
              Alinea el documento dentro del recuadro y asegurate de que este bien iluminado antes de capturar.
            </p>

            {documentCameraError && (
              <p className="mt-2 text-xs font-medium text-[#b45309]">{documentCameraError}</p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={closeDocumentCamera}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0f172a] shadow-sm transition hover:bg-slate-50 sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={captureDocumentFromCamera}
                disabled={documentCameraCapturing}
                className="w-full rounded-lg bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5f58] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {documentCameraCapturing ? 'Capturando...' : 'Capturar foto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowScanner(false);
              setScannerError('');
              setIsScanning(false);
              setScannerKey((prev) => prev + 1);
            }}
          />
          <div className="relative z-10 w-full max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00594e]">Escanear QR</p>
                <h3 className="text-2xl font-bold text-[#0f172a]">Precargar datos del usuario</h3>
                <p className="text-sm text-[#475569]">
                  Apunta la camara al codigo QR del usuario para completar automaticamente los campos del formulario.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowScanner(false);
                  setScannerError('');
                  setIsScanning(false);
                  setScannerKey((prev) => prev + 1);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-[#475569] transition hover:bg-slate-200"
              >
                &times;
              </button>
            </div>

            {scannerError && (
              <div className="rounded-lg border border-[#b91c1c]/40 bg-[#fee2e2] px-3 py-2 text-xs font-semibold text-[#7f1d1d]">
                {scannerError}
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-black/80">
              <QrScanner
                key={scannerKey}
                delay={500}
                style={{ width: '100%', transform: 'scaleX(-1)' }}
                onError={() => setScannerError('No fue posible acceder a la camara. Revisa los permisos.')}
                onScan={handleScan}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowScanner(false);
                  setScannerError('');
                  setIsScanning(false);
                  setScannerKey((prev) => prev + 1);
                }}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#475569] transition hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showFaceCaptureModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={() => setShowFaceCaptureModal(false)}>
          <div className="w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#B5A160]">Captura facial</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0f172a]">Captura el rostro del nuevo usuario</h3>
                  <p className="mt-2 text-sm text-[#475569]">
                    Toma una imagen nitida con un solo rostro. El enrolamiento se completara al guardar el formulario.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFaceCaptureModal(false)}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[#0f172a] transition hover:bg-slate-200"
                >
                  Cerrar
                </button>
              </div>

              <FaceCapture
                mode="capture"
                enableAutoBlink={false}
                onResult={handleFaceCaptureSuccess}
                onError={handleFaceCaptureError}
                onCancel={() => setShowFaceCaptureModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default RegisterGuard;
