import { useState } from 'react';
import Input from '../../../shared/components/Input';
import { useForm } from '../../../shared/hooks/useForm';
import { apiRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';

const RegisterGuard = () => {
  const { form, handleChange, reset } = useForm({ nombre: '', email: '', password: '' });
  const { token } = useAuth();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const saveUser = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      await apiRequest('/users', {
        method: 'POST',
        token,
        data: {
          nombre: form.nombre,
          email: form.email,
          password: form.password,
          permisoSistema: 'Celador',
        },
      });

      setStatus('success');
      setMessage('Celador registrado correctamente.');
      reset({ nombre: '', email: '', password: '' });
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'No fue posible completar el registro');
    }
  };

  return (
    <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#00594e]">Gestión de guardias</p>
          <h1 className="text-3xl font-bold text-[#0f172a]">Registrar nuevo celador</h1>
          <p className="max-w-3xl text-sm text-[#475569]">
            Completa la información básica para agregar un nuevo miembro al equipo de seguridad. Estos datos se utilizarán para generar sus credenciales de acceso y habilitar el escáner QR.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.45fr_0.9fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="space-y-4">
              {status === 'success' && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {message}
                </div>
              )}
              {status === 'error' && (
                <div className="rounded-lg border border-[#B5A160] bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030]">
                  {message}
                </div>
              )}

              <form className="space-y-6" onSubmit={saveUser}>
                <Input
                  type="text"
                  placeholder="Nombre completo"
                  onChange={handleChange}
                  value={form.nombre}
                  name="nombre"
                  required
                />
                <Input
                  type="email"
                  placeholder="Correo electrónico"
                  onChange={handleChange}
                  value={form.email}
                  name="email"
                  autoComplete="email"
                  required
                />
                <Input
                  type="password"
                  placeholder="Contraseña"
                  onChange={handleChange}
                  value={form.password}
                  name="password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full rounded-lg bg-[#00594e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {status === 'loading' ? 'Registrando...' : 'Registrar celador'}
                </button>
              </form>
            </div>
          </article>

          <aside className="flex flex-col gap-6 rounded-2xl border border-[#00594e]/20 bg-white p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold text-[#0f172a]">Recomendaciones</h2>
              <p className="mt-2 text-sm text-[#475569]">
                Antes de completar el registro valida que los datos coincidan con la documentación presentada por el guardia.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-[#475569]">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#00594e]" />
                Correo institucional activo y verificado.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#B5A160]" />
                Documento de identidad actualizado en archivos.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-slate-400" />
                Definir una contraseña temporal y solicitar cambio al primer ingreso.
              </li>
            </ul>
            <div className="rounded-lg border border-dashed border-[#00594e]/40 bg-[#00594e]/5 px-4 py-4 text-sm text-[#00594e]">
              Recuerda notificar al nuevo celador que las rondas se documentan desde el dashboard principal.
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default RegisterGuard;
