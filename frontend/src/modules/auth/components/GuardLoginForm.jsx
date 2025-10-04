import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../../../shared/components/Input';
import useAuth from '../hooks/useAuth';
import { useForm } from '../../../shared/hooks/useForm';

const GuardLoginForm = () => {
  const { form, handleChange } = useForm({ email: '', password: '' });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      await login({ email: form.email, password: form.password });
      setStatus('success');
      navigate('/dashboard');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'No fue posible iniciar sesión');
    }
  };

  return (
    <div className="space-y-6">
      {status === 'success' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Sesión iniciada correctamente.
        </div>
      )}
      {status === 'error' && (
        <div className="rounded-lg border border-[#B5A160] bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030]">
          {message}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Correo electrónico"
          autoComplete="email"
          required
        />
        <Input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Contraseña"
          autoComplete="current-password"
          required
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full rounded-lg bg-[#00594e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === 'loading' ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
};

export default GuardLoginForm;
