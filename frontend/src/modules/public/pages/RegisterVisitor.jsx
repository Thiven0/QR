import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useNavigate } from 'react-router-dom';
import RegisterForm from '../../dashboard/components/RegisterUserForm';
import { apiRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';

const validateVisitor = (formData) => {
  const errors = {};

  if (!formData.nombre?.trim()) errors.nombre = 'El nombre es obligatorio.';
  if (!formData.cedula?.trim()) {
    errors.cedula = 'La cedula es obligatoria.';
  } else if (!/^\d+$/.test(formData.cedula)) {
    errors.cedula = 'Solo numeros.';
  }
  if (!formData.correo?.trim()) {
    errors.correo = 'El correo es obligatorio.';
  } else if (!/\S+@\S+\.\S+/.test(formData.correo)) {
    errors.correo = 'Correo no valido.';
  }

  if (!formData.password?.trim()) {
    errors.password = 'La contraseña es obligatoria.';
  } else if (formData.password.length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres.';
  }

  if (!formData.telefono?.trim()) {
    errors.telefono = 'El telefono es obligatorio.';
  } else if (!/^\d+$/.test(formData.telefono)) {
    errors.telefono = 'Solo numeros.';
  }

  if (!formData.rh?.trim()) {
    errors.rh = 'Selecciona un tipo de sangre.';
  }

  if (!formData.facultad?.trim()) {
    errors.facultad = 'Selecciona una facultad.';
  }

  return errors;
};

const DATA_TREATMENT_URL = 'https://drive.google.com/file/d/1JtSP0Fa19TKU0kzNwhDqC6BQIe2c_JK8/view';
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No fue posible leer el archivo seleccionado'));
    reader.readAsDataURL(file);
  });

const sanitizeMetadataForSubmission = (formValues, metadata) => {
  const base =
    metadata && typeof metadata === 'object'
      ? { ...metadata }
      : {};

  const overrides = {
    cedula: formValues.cedula,
    nombres: formValues.nombre,
    apellidos: formValues.apellido,
    fechaNacimiento: formValues.fechaNacimiento,
  };

  Object.entries(overrides).forEach(([key, value]) => {
    if (value && typeof value === 'string' && value.trim()) {
      base[key] = value.trim();
    }
  });

  return Object.entries(base).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        acc[key] = trimmed;
      }
      return acc;
    }
    if (Array.isArray(value)) {
      if (value.length) {
        acc[key] = value;
      }
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
};

const RegisterVisitor = () => {
  const { establishSession } = useAuth();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [documentImage, setDocumentImage] = useState('');
  const [documentMetadata, setDocumentMetadata] = useState(null);
  const [documentOcrError, setDocumentOcrError] = useState('');
  const [documentLoading, setDocumentLoading] = useState(false);
  const [formOverrides, setFormOverrides] = useState(null);
  const [dataConsentAccepted, setDataConsentAccepted] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraCapturing, setCameraCapturing] = useState(false);
  const [cameraChecking, setCameraChecking] = useState(false);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const buildQrRawText = (data) => {
    const fullName = [data.nombre, data.apellido].filter(Boolean).join(' ').trim();
    const lines = [
      fullName,
      data.cedula,
      data.facultad,
      data.rh,
      data.telefono,
    ];
    return lines.filter(Boolean).join('\n\n');
  };

  const generateQrImage = async (data) => {
    const rawText = buildQrRawText(data);
    return QRCode.toDataURL(rawText, {
      width: 512,
      errorCorrectionLevel: 'M',
      margin: 1,
    });
  };

  const resetDocumentFeedback = () => {
    setDocumentOcrError('');
  };

  const stopCameraStream = () => {
    const stream = cameraStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {
          // ignore stop errors
        }
      });
    }
    cameraStreamRef.current = null;
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
    setCameraCapturing(false);
  };

  const attachStreamToVideo = (stream) => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    const videoElement = videoRef.current;
    videoElement.onloadedmetadata = () => {
      try {
        videoElement.play();
      } catch (_) {
        // Autoplay might be blocked; user interaction already happened via button.
      }
    };
  };

  const handleOpenCamera = async () => {
    if (cameraChecking || cameraCapturing) return;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Tu navegador no permite abrir la camara desde esta pagina.');
      return;
    }

    try {
      setCameraChecking(true);
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      cameraStreamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      setCameraError(error?.message || 'No fue posible acceder a la camara. Verifica los permisos.');
      stopCameraStream();
      setCameraOpen(false);
    } finally {
      setCameraChecking(false);
    }
  };

  const handleCaptureFromCamera = () => {
    if (!videoRef.current) {
      setCameraError('No encontramos video disponible para capturar.');
      return;
    }

    try {
      setCameraCapturing(true);
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setDocumentImage(dataUrl);
      setDocumentMetadata(null);
      setFormOverrides(null);
      resetDocumentFeedback();
      handleFieldChange('documentImage');
      handleCloseCamera();
    } catch (error) {
      setCameraError('No fue posible capturar la imagen. Intenta nuevamente.');
    } finally {
      setCameraCapturing(false);
    }
  };

  useEffect(() => {
    if (cameraOpen && cameraStreamRef.current && videoRef.current) {
      attachStreamToVideo(cameraStreamRef.current);
    }
  }, [cameraOpen]);

  useEffect(() => () => stopCameraStream(), []);

  const handleDocumentFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (event.target.value) {
      event.target.value = '';
    }
    if (!file) return;

    if (!file.type?.startsWith('image/')) {
      setErrors((prev) => ({
        ...prev,
        documentImage: 'Solo se permiten imagenes en formato PNG o JPG.',
      }));
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      setErrors((prev) => ({
        ...prev,
        documentImage: 'La imagen supera el limite de 5MB.',
      }));
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setDocumentImage(dataUrl);
      setDocumentMetadata(null);
      resetDocumentFeedback();
      setFormOverrides(null);
      handleFieldChange('documentImage');
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        documentImage: error.message || 'No fue posible leer el archivo seleccionado.',
      }));
    }
  };

  const handleRemoveDocumentImage = () => {
    setDocumentImage('');
    setDocumentMetadata(null);
    resetDocumentFeedback();
    handleFieldChange('documentImage');
  };

  const handleExtractDocumentData = async () => {
    if (!documentImage) {
      setErrors((prev) => ({
        ...prev,
        documentImage: 'Debes adjuntar la foto de tu cedula antes de continuar.',
      }));
      return;
    }

    try {
      setDocumentLoading(true);
      resetDocumentFeedback();
      const response = await apiRequest('/visitors/ocr', {
        method: 'POST',
        data: { image: documentImage },
      });

      const metadata = response?.data || null;
      setDocumentMetadata(metadata);

      if (metadata) {
        const overrides = {};
        if (metadata.cedula) overrides.cedula = metadata.cedula;
        if (metadata.nombres) overrides.nombre = metadata.nombres;
        if (metadata.apellidos) overrides.apellido = metadata.apellidos;
        if (metadata.fechaNacimiento) overrides.fechaNacimiento = metadata.fechaNacimiento;
        setFormOverrides(Object.keys(overrides).length ? overrides : null);
      }
    } catch (error) {
      setDocumentMetadata(null);
      setDocumentOcrError(error.message || 'No fue posible extraer los datos del documento.');
    } finally {
      setDocumentLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    if (submitting) return;

    const validationErrors = validateVisitor(formData);

    const combinedErrors = { ...validationErrors };

    if (!documentImage) {
      combinedErrors.documentImage = 'Debes adjuntar la foto de tu cedula.';
    }

    if (!dataConsentAccepted) {
      combinedErrors.dataConsent = 'Debes aceptar el tratamiento de datos personales.';
    }

    if (Object.keys(combinedErrors).length) {
      setErrors(combinedErrors);
      return;
    }

    setSubmitting(true);
    let qrImage;
    try {
      qrImage = await generateQrImage(formData);
    } catch (qrError) {
      setErrors({
        general: 'No fue posible generar el codigo QR. Verifica los datos e intenta nuevamente.',
      });
      setSubmitting(false);
      return;
    }

    try {
      const payloadData = {
        ...formData,
        imagenQR: qrImage,
      };

      const metadataPayload = sanitizeMetadataForSubmission(payloadData, documentMetadata || {});

      const payload = {
        cedula: payloadData.cedula,
        nombre: payloadData.nombre,
        apellido: payloadData.apellido,
        RH: payloadData.rh,
        facultad: payloadData.facultad,
        telefono: payloadData.telefono,
        email: payloadData.correo,
        password: payloadData.password,
        imagen: payloadData.imagen,
        imagenQR: payloadData.imagenQR,
        documentImage,
        documentMetadata: Object.keys(metadataPayload).length ? metadataPayload : undefined,
        dataConsent: {
          accepted: true,
          documentUrl: DATA_TREATMENT_URL,
        },
      };

      if (!payload.documentMetadata) {
        delete payload.documentMetadata;
      }

      const response = await apiRequest('/visitors/register', {
        method: 'POST',
        data: payload,
      });

      establishSession({
        user: response.user,
        token: response.token,
        ticket: response.ticket || null,
      });

      navigate('/dashboard');
    } catch (error) {
      const apiErrors = error.details?.errors;
      if (apiErrors) {
        setErrors(apiErrors);
      } else {
        setErrors({
          general: error.message || 'No fue posible completar el registro.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (field) => {
    setErrors((prev) => {
      if (!prev[field] && !prev.general) return prev;
      const next = { ...prev };
      delete next[field];
      delete next.general;
      return next;
    });
  };

  const handleConsentToggle = (event) => {
    setDataConsentAccepted(event.target.checked);
    handleFieldChange('dataConsent');
  };

  return (
    <>
      <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#00594e]">Registro de visita temporal</p>
          <h1 className="text-3xl font-bold text-[#0f172a]">Registra tu visita</h1>
          <p className="text-sm text-[#475569]">
            Completa el formulario para generar tu ticket temporal de acceso. Recuerda que el ticket tiene vigencia limitada.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="space-y-4">
              {errors.general && (
                <div className="rounded-lg border border-[#B5A160] bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030]">
                  {errors.general}
                </div>
              )}

              <RegisterForm
                onSubmit={handleSubmit}
                errors={errors}
                onFieldChange={handleFieldChange}
                initialValues={{ rol: 'Usuario' }}
                disabledFields={['rol']}
                enablePassword
                submitLabel={submitting ? 'Registrando...' : 'Registrar visita'}
                isSubmitting={submitting}
                showRoleField={false}
                showQrField={false}
                showBirthDateField
                externalValues={formOverrides}
              >
                <section className="rounded-2xl border border-dashed border-[#00594e]/40 bg-[#ecfdf5] p-4">
                  <header className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0f766e]">Documento de identidad</p>
                    <p className="text-sm text-[#0f172a]">
                      Captura o adjunta la foto de tu cedula y extrae automaticamente los datos clave. El sistema rellenara el formulario y podras editarlos antes de guardar.
                    </p>
                  </header>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <input
                      id="document-upload-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleDocumentFileChange}
                    />
                    <button
                      type="button"
                      onClick={handleOpenCamera}
                      disabled={cameraChecking}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#0f766e] bg-white px-4 py-2 text-sm font-semibold text-[#0f766e] shadow-sm transition hover:bg-[#0f766e]/5 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {cameraChecking ? 'Abriendo camara...' : 'Abrir camara'}
                    </button>
                    <label
                      htmlFor="document-upload-input"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#0f172a] shadow-sm transition hover:bg-slate-50"
                    >
                      Subir foto
                    </label>
                    {documentImage && (
                      <button
                        type="button"
                        onClick={handleRemoveDocumentImage}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-[#fee2e2] px-4 py-2 text-sm font-semibold text-[#b91c1c] shadow-sm transition hover:bg-[#fecaca]"
                      >
                        Remover imagen
                      </button>
                    )}
                  </div>

                  {errors.documentImage && (
                    <p className="mt-2 text-xs font-medium text-[#b45309]">{errors.documentImage}</p>
                  )}
                  {cameraError && (
                    <p className="mt-2 text-xs font-medium text-[#b45309]">{cameraError}</p>
                  )}

                  {documentImage && (
                    <div className="mt-4 flex flex-col gap-4 lg:flex-row">
                      <img
                        src={documentImage}
                        alt="Documento de identidad"
                        className="h-28 w-44 rounded-lg border border-[#0f766e]/30 object-cover shadow-sm lg:h-32 lg:w-52"
                      />
                      <div className="flex-1 space-y-3 text-sm text-[#475569]">
                        <p>Presiona el boton para extraer automaticamente los datos. Podras corregir cualquier campo antes de enviar.</p>
                        <button
                          type="button"
                          onClick={handleExtractDocumentData}
                          disabled={documentLoading}
                          className="inline-flex items-center justify-center rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5f58] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {documentLoading ? 'Extrayendo datos...' : 'Extraer datos automaticamente'}
                        </button>
                        {documentOcrError && (
                          <p className="text-xs font-medium text-[#b45309]">{documentOcrError}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {documentMetadata && (
                    <div className="mt-4 rounded-2xl border border-[#0f766e]/30 bg-white p-4 shadow-sm">
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
                      {typeof documentMetadata.confidence === 'number' && (
                        <p className="mt-2 text-xs text-[#475569]">
                          Confianza OCR aproximada: {Math.round(documentMetadata.confidence)}%
                        </p>
                      )}
                      <p className="mt-1 text-xs text-[#475569]">
                        Estos datos se han rellenado automaticamente. Si algo no coincide, ajustalo antes de enviar el formulario.
                      </p>
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <label className="flex items-start gap-3 text-sm text-[#0f172a]">
                    <input
                      type="checkbox"
                      checked={dataConsentAccepted}
                      onChange={handleConsentToggle}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0f766e] focus:ring-[#0f766e]"
                    />
                    <span>
                      Acepto el{' '}
                      <a
                        href={DATA_TREATMENT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#0f766e] underline hover:text-[#0c5f58]"
                      >
                        tratamiento de datos personales
                      </a>{' '}
                      y autorizo el almacenamiento de la foto de mi documento de identidad.
                    </span>
                  </label>
                  {errors.dataConsent && (
                    <p className="mt-2 text-xs font-medium text-[#b45309]">{errors.dataConsent}</p>
                  )}
                </section>
              </RegisterForm>
            </div>
          </article>

          <aside className="flex flex-col gap-6 rounded-2xl border border-[#00594e]/20 bg-white p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold text-[#0f172a]">Ticket temporal</h2>
              <p className="mt-2 text-sm text-[#475569]">
                Al completar el registro se iniciara sesion automaticamente. Tu ticket temporal tendra una vigencia limitada;
                cuando expire, deberas registrar una nueva visita.
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-[#00594e]/40 bg-[#00594e]/5 px-4 py-4 text-sm text-[#00594e]">
              Manten tus credenciales a la mano. Si el ticket expira se cerrara tu sesion automaticamente y tu estado pasara a inactivo.
            </div>
          </aside>
        </div>
      </div>  
      </section>

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={handleCloseCamera} />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#0f766e]">Camara</p>
                <h3 className="text-xl font-semibold text-[#0f172a]">Captura la cedula</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseCamera}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-[#0f172a]"
                aria-label="Cerrar camara"
              >
                X
              </button>
            </div>

            <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            </div>

            <p className="mt-3 text-sm text-[#475569]">
              Alinea el documento dentro del recuadro y asegurate de que este bien iluminado antes de capturar.
            </p>

            {cameraError && (
              <p className="mt-2 text-xs font-medium text-[#b45309]">{cameraError}</p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleCloseCamera}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0f172a] shadow-sm transition hover:bg-slate-50 sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCaptureFromCamera}
                disabled={cameraCapturing}
                className="w-full rounded-lg bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5f58] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {cameraCapturing ? 'Capturando...' : 'Capturar foto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RegisterVisitor;

