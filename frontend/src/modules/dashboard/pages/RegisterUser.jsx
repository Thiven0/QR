import { useState } from 'react';
import RegisterForm from '../components/RegisterUserForm';
import { apiRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';

const validate = (formData) => {
  const newErrors = {};

  if (formData.cedula && !/^\d+$/.test(formData.cedula)) newErrors.cedula = 'Solo números.';
  if (formData.nombre && !/^[a-zA-ZÀ-ſ\s]+$/.test(formData.nombre)) newErrors.nombre = 'Solo letras.';
  if (formData.apellido && !/^[a-zA-ZÀ-ſ\s]+$/.test(formData.apellido)) newErrors.apellido = 'Solo letras.';
  if (formData.telefono && !/^\d+$/.test(formData.telefono)) newErrors.telefono = 'Solo números.';
  if (formData.correo && !/\S+@\S+\.\S+/.test(formData.correo)) newErrors.correo = 'Correo no válido.';
  if (formData.rh && !/^(A|B|AB|O)[+-]$/.test(formData.rh)) newErrors.rh = 'Ej: A+, O-';

  return newErrors;
};

const RegisterUser = () => {
  const { token } = useAuth();
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [externalValues, setExternalValues] = useState(null);
  const [qrInput, setQrInput] = useState('');
  const [parsingQr, setParsingQr] = useState(false);
  const [parseError, setParseError] = useState('');

  const handleSubmit = async (formData) => {
    const validationErrors = validate(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSuccess('');
      return;
    }

    try {
      const payload = {
        cedula: formData.cedula,
        nombre: formData.nombre,
        apellido: formData.apellido,
        RH: formData.rh,
        facultad: formData.facultad,
        telefono: formData.telefono,
        email: formData.correo,
        imagen: formData.imagen,
        imagenQR: formData.imagenQR,
        rolAcademico: formData.rol,
        estado: formData.estado ? formData.estado.toLowerCase() : 'inactivo',
        permisoSistema: 'Usuario',
      };

      const response = await apiRequest('/users', {
        method: 'POST',
        token,
        data: payload,
      });

      const successMessage = response.generatedPassword
        ? 'Usuario registrado con éxito. Contraseña temporal: ' + response.generatedPassword
        : 'Usuario registrado con éxito.';

      setSuccess(successMessage);
      setErrors({});
    } catch (error) {
      const apiErrors = error.details?.errors;
      if (apiErrors) {
        setErrors(apiErrors);
        setSuccess('');
        return;
      }
      setErrors({ general: error.message || 'Error al registrar usuario.' });
      setSuccess('');
    }
  };

  const handleFieldChange = (field) => {
    if (success) setSuccess('');
    if (parseError) setParseError('');

    setErrors((prev) => {
      if (!prev[field] && !prev.general) return prev;
      const next = { ...prev };
      delete next[field];
      delete next.general;
      return next;
    });
  };

  const handleParseQr = async () => {
    const value = qrInput.trim();

    if (!value) {
      setParseError('Ingresa el texto o JSON contenido en el QR.');
      return;
    }

    setParsingQr(true);
    setParseError('');

    try {
      const response = await apiRequest('/users/parse-qr', {
        method: 'POST',
        token,
        data: { qrData: value },
      });

      const data = response?.data || response;
      const mapped = {
        cedula: data.cedula || '',
        nombre: data.nombre || '',
        apellido: data.apellido || '',
        rol: data.rolAcademico || data.rol || '',
        facultad: data.programa || data.facultad || '',
        rh: data.tipo_sangre || data.RH || data.rh || '',
        telefono: data.telefono || '',
        correo: data.email || data.correo || '',
      };

      setExternalValues(mapped);
      setSuccess('Datos precargados desde el QR. Completa y guarda el registro.');
      setErrors({});
    } catch (error) {
      const message =
        error.details?.message ||
        error.message ||
        'No fue posible interpretar el QR.';
      setParseError(message);
    } finally {
      setParsingQr(false);
    }
  };

  return (
    <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#00594e]">Control de visitantes</p>
          <h1 className="text-3xl font-bold text-[#0f172a]">Registrar nuevo usuario</h1>
          <p className="max-w-3xl text-sm text-[#475569]">
            Registra estudiantes, docentes o visitantes frecuentes para habilitar su acceso mediante código QR y mantener la bitácora centralizada del dashboard.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.45fr_0.9fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="space-y-4">
              {success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {success}
                </div>
              )}
              {errors.general && (
                <div className="rounded-lg border border-[#B5A160] bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030]">
                  {errors.general}
                </div>
              )}

              <RegisterForm
                key={success ? 'reset-' + success : 'form'}
                onSubmit={handleSubmit}
                errors={errors}
                onFieldChange={handleFieldChange}
                externalValues={externalValues}
              />
            </div>
          </article>

          <aside className="flex flex-col gap-6 rounded-2xl border border-[#00594e]/20 bg-white p-8 shadow-sm">
            <div className="space-y-3 rounded-xl border border-dashed border-[#00594e]/30 bg-[#f8fafc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00594e]">
                Obtener datos desde QR
              </p>
              <p className="text-sm text-[#475569]">
                Pega el texto o JSON leido del codigo QR para precargar el formulario de registro.
              </p>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/60"
                rows={4}
                placeholder="Contenido del QR..."
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
              />
              {parseError && (
                <div className="rounded-lg border border-[#b91c1c]/40 bg-[#fee2e2] px-3 py-2 text-xs font-semibold text-[#7f1d1d]">
                  {parseError}
                </div>
              )}
              <button
                type="button"
                onClick={handleParseQr}
                disabled={parsingQr}
                className="inline-flex items-center justify-center rounded-lg bg-[#00594e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {parsingQr ? 'Procesando QR...' : 'Cargar texto QR'}
              </button>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#0f172a]">Recomendaciones</h2>
              <p className="mt-2 text-sm text-[#475569]">
                Verifica los datos antes de guardar y asegúrate de que el QR cargado corresponda al usuario.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-[#475569]">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#00594e]" />
                Utiliza el correo institucional cuando sea posible para acelerar la validación.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#B5A160]" />
                Incluye un QR nítido para evitar errores en los escaneos de ingreso.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-slate-400" />
                Mantén la bitácora con anotaciones de autorizaciones especiales o restricciones vigentes.
              </li>
            </ul>
            <div className="rounded-lg border border-dashed border-[#00594e]/40 bg-[#00594e]/5 px-4 py-4 text-sm text-[#00594e]">
              Recuerda sincronizar la información con el panel de guardias para que el equipo reciba las actualizaciones en tiempo real.
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default RegisterUser;
