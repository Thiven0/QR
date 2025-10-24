import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterForm from '../../dashboard/components/RegisterUserForm';
import { apiRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';

const validateVisitor = (formData) => {
  const errors = {};

  if (!formData.nombre?.trim()) errors.nombre = 'El nombre es obligatorio.';
  if (!formData.correo?.trim()) {
    errors.correo = 'El correo es obligatorio.';
  } else if (!/\S+@\S+\.\S+/.test(formData.correo)) {
    errors.correo = 'Correo no valido.';
  }

  if (!formData.password?.trim()) {
    errors.password = 'La contrasena es obligatoria.';
  } else if (formData.password.length < 6) {
    errors.password = 'La contrasena debe tener al menos 6 caracteres.';
  }

  if (formData.cedula && !/^\d+$/.test(formData.cedula)) {
    errors.cedula = 'Solo numeros.';
  }

  if (formData.telefono && !/^\d+$/.test(formData.telefono)) {
    errors.telefono = 'Solo numeros.';
  }

  if (formData.rh && !/^(A|B|AB|O)[+-]$/.test(formData.rh)) {
    errors.rh = 'Ej: A+, O-';
  }

  return errors;
};

const RegisterVisitor = () => {
  const { establishSession } = useAuth();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData) => {
    if (submitting) return;

    const validationErrors = validateVisitor(formData);

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        cedula: formData.cedula,
        nombre: formData.nombre,
        apellido: formData.apellido,
        RH: formData.rh,
        facultad: formData.facultad,
        telefono: formData.telefono,
        email: formData.correo,
        password: formData.password,
        imagen: formData.imagen,
        imagenQR: formData.imagenQR,
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
                initialValues={{ rol: 'Visitante' }}
                disabledFields={['rol']}
                enablePassword
                submitLabel={submitting ? 'Registrando...' : 'Registrar visita'}
                isSubmitting={submitting}
              />
            </div>
          </article>

          <aside className="flex flex-col gap-6 rounded-2xl border border-[#00594e]/20 bg-white p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold text-[#0f172a]">Ticket temporal</h2>
              <p className="mt-2 text-sm text-[#475569]">
                Al completar el registro se iniciará sesión automáticamente. Tu ticket temporal tendrá una vigencia limitada;
                cuando expire, deberás registrar una nueva visita.
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-[#00594e]/40 bg-[#00594e]/5 px-4 py-4 text-sm text-[#00594e]">
              Mantén tus credenciales a la mano. Si el ticket expira se cerrará tu sesión automáticamente y tu estado pasará a inactivo.
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default RegisterVisitor;
