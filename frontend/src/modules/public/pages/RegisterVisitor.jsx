import { useState } from 'react';
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

const RegisterVisitor = () => {
  const { establishSession } = useAuth();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (formData) => {
    if (submitting) return;

    const validationErrors = validateVisitor(formData);

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSubmitting(true);
      const qrImage = await generateQrImage(formData);

      const payloadData = {
        ...formData,
        imagenQR: qrImage,
      };

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
      };

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
      if (error instanceof Error && error.message?.includes('QR')) {
        setErrors({
          general: 'No fue posible generar el codigo QR. Intenta nuevamente.',
        });
        setSubmitting(false);
        return;
      }

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

  return (
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
              />
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
  );
};

export default RegisterVisitor;
