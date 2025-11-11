import { useState } from 'react';
import QRCode from 'qrcode';
import Input from '../../../shared/components/Input';
import { useForm } from '../../../shared/hooks/useForm';
import { apiRequest } from '../../../services/apiClient';
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
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrError, setQrError] = useState('');

  const isSubmitting = status === 'loading';

  const setFieldValue = (name, value) => {
    if (name === 'imagenQR') {
      setQrError('');
    }
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = async (event) => {
    const { name, files } = event.target;
    if (!files?.length) return;

    try {
      setQrError('');
      const dataUrl = await readFileAsDataUrl(files[0]);
      setFieldValue(name, dataUrl);
    } catch (error) {
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

  const generateQrFromForm = async () => {
    setQrError('');

    const requiresFacultad = form.permisoSistema === 'Usuario';
    const requiredFields = ['nombre', 'cedula', 'RH', 'telefono'];
    if (requiresFacultad) {
      requiredFields.splice(2, 0, 'facultad');
    }

    const missingFields = requiredFields.filter(
      (field) => !String(form[field] || '').trim()
    );

    if (missingFields.length) {
      const fieldsLabel = requiresFacultad
        ? 'nombre, cedula, facultad, RH y telefono'
        : 'nombre, cedula, RH y telefono';
      setQrError(
        `Completa los campos obligatorios (${fieldsLabel}) antes de generar el QR.`
      );
      return;
    }

    try {
      setQrGenerating(true);
      const rawText = buildQrRawText();
      const dataUrl = await QRCode.toDataURL(rawText, {
        width: 512,
        errorCorrectionLevel: 'M',
        margin: 1,
      });
      setFieldValue('imagenQR', dataUrl);
    } catch (error) {
      setQrError('No fue posible generar el codigo QR. Intenta nuevamente.');
    } finally {
      setQrGenerating(false);
    }
  };

  const buildPayload = () => ({
    cedula: form.cedula.trim(),
    nombre: form.nombre.trim(),
    apellido: form.apellido.trim(),
    email: form.email.trim().toLowerCase(),
    password: form.password ? form.password : undefined,
    RH: form.RH.trim().toUpperCase(),
    facultad: form.facultad.trim(),
    telefono: form.telefono.trim(),
    imagen: form.imagen,
    imagenQR: form.imagenQR,
    rolAcademico: form.rolAcademico.trim(),
    permisoSistema: form.permisoSistema,
    estado: form.estado,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    setErrors({});

    try {
      await apiRequest('/users', {
        method: 'POST',
        token,
        data: buildPayload(),
      });

      setStatus('success');
      setMessage('Usuario registrado correctamente.');
      reset(INITIAL_FORM);
    } catch (error) {
      setStatus('error');
      const apiErrors = error.details?.errors;
      if (apiErrors && typeof apiErrors === 'object') {
        setErrors(apiErrors);
      } else {
        setMessage(error.message || 'No fue posible completar el registro');
      }
    }
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
              {status === 'success' && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {message}
                </div>
              )}

              {status === 'error' && message && (
                <div className="rounded-lg border border-[#B5A160] bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030]">
                  {message}
                </div>
              )}

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
                      <span className="text-sm font-medium text-[#00594e]">Facultad</span>
                      <select
                        name="facultad"
                        value={form.facultad}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70"
                      >
                        <option value="">Seleccione una facultad</option>
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

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-3">
                    <span className="text-sm font-medium text-[#00594e]">Imagen de perfil</span>
                    <label
                      htmlFor="imagen"
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#00594e]/40 bg-[#00594e]/5 px-4 py-3 text-sm font-semibold text-[#00594e] transition hover:bg-[#00594e]/10"
                    >
                      Seleccionar archivo
                    </label>
                    <input
                      id="imagen"
                      name="imagen"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {form.imagen && (
                      <img src={form.imagen} alt="Preview perfil" className="h-20 w-20 rounded-lg object-cover shadow-sm" />
                    )}
                    {errors.imagen && (
                      <p className="text-xs font-medium text-[#b45309]">{errors.imagen}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <span className="text-sm font-medium text-[#00594e]">Imagen QR</span>
                    <label
                      htmlFor="imagenQR"
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#B5A160]/40 bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030] transition hover:bg-[#B5A160]/20"
                    >
                      Seleccionar archivo
                    </label>
                    <button
                      type="button"
                      onClick={generateQrFromForm}
                      disabled={qrGenerating}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#00594e]/40 bg-white px-4 py-2 text-xs font-semibold text-[#00594e] transition hover:bg-[#00594e]/10 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {qrGenerating ? 'Generando QR...' : 'Generar QR con datos del formulario'}
                    </button>
                    <input
                      id="imagenQR"
                      name="imagenQR"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {form.imagenQR && (
                      <img src={form.imagenQR} alt="Preview QR" className="h-20 w-20 rounded-lg object-cover shadow-sm" />
                    )}
                    {qrError && (
                      <p className="text-xs font-medium text-[#b45309]">{qrError}</p>
                    )}
                    {errors.imagenQR && (
                      <p className="text-xs font-medium text-[#b45309]">{errors.imagenQR}</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-[#00594e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Registrando...' : 'Registrar usuario'}
                </button>
              </form>
            </div>
          </article>

          <aside className="flex flex-col gap-6 rounded-2xl border border-[#00594e]/20 bg-white p-8 shadow-sm">
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
    </section>
  );
};

export default RegisterGuard;
