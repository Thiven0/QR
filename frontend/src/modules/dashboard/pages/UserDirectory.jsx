import { useEffect, useState } from 'react';
import ProfileCard from '../../../shared/components/ProfileCard';
import { apiRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';

const UserDirectory = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiRequest('/users', { token });
        setUsers(response.data || []);
        setError('');
      } catch (err) {
        setError(err.message || 'No fue posible obtener los usuarios');
      }
    };

    if (token) {
      fetchUsers();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8">
      <h1 className="text-2xl font-bold mb-6">Directorio de usuarios</h1>

      {error && (
        <div className="mb-6 rounded-lg border border-[#B5A160] bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030]">
          {error}
        </div>
      )}

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map((user) => (
          <button
            key={user._id}
            type="button"
            className="bg-white rounded shadow p-4 text-left transition hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-[#00594e]/60"
            onClick={() => setSelected(user)}
          >
            <div className="flex items-center gap-4">
              <img
                src={user.imagen || 'https://ui-avatars.com/api/?name=' + (user.nombre || 'Usuario')}
                alt={user.nombre || 'Usuario'}
                className="w-12 h-12 rounded-full object-cover border"
              />
              <div>
                <div className="font-semibold">{user.nombre} {user.apellido}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
                <div className="text-xs text-[#00594e] font-medium">{user.permisoSistema}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="relative max-w-md w-full">
            <button
              className="absolute top-2 right-2 bg-[#b91c1c] text-white rounded-full px-3 py-1 text-xs"
              onClick={() => setSelected(null)}
            >
              Cerrar
            </button>
            <ProfileCard user={selected} />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDirectory;
