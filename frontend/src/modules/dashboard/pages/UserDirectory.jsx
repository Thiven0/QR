import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProfileCard from '../../../shared/components/ProfileCard';
import { apiRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';

const PERMISOS_SISTEMA = ['Administrador', 'Celador', 'Usuario'];
const ESTADOS = ['activo', 'inactivo'];

const EMPTY_FORM = {
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

const mapUserToForm = (user) => ({
  cedula: user.cedula || '',
  nombre: user.nombre || '',
  apellido: user.apellido || '',
  email: user.email || '',
  password: '',
  RH: user.RH || user.rh || '',
  facultad: user.facultad || '',
  telefono: user.telefono || '',
  imagen: user.imagen || '',
  imagenQR: user.imagenQR || '',
  rolAcademico: user.rolAcademico || user.rol || '',
  permisoSistema: user.permisoSistema || 'Usuario',
  estado: user.estado || 'inactivo',
});

const UserDirectory = () => {
  const { token, hasPermission } = useAuth();
  const isAdmin = hasPermission(['Administrador']);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [viewUser, setViewUser] = useState(null);

  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const response = await apiRequest('/users', { token });
      const data = Array.isArray(response) ? response : response?.data || [];
      setUsers(data);
    } catch (err) {
      setError(err.message || 'No fue posible obtener los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openEditModal = (user) => {
    setEditUserId(user._id);
    setEditForm(mapUserToForm(user));
    setEditErrors({});
    setFeedback('');
  };

  const closeEditModal = () => {
    setEditUserId(null);
    setEditForm(EMPTY_FORM);
    setEditErrors({});
    setSaving(false);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditFileChange = async (event) => {
    const { name, files } = event.target;
    if (!files?.length) return;

    try {
      const dataUrl = await readFileAsDataUrl(files[0]);
      setEditForm((prev) => ({
        ...prev,
        [name]: dataUrl,
      }));
    } catch (err) {
      console.error('No fue posible leer el archivo', err);
    }
  };

  const removeImageField = (field) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: '',
    }));
  };

  const validateEditForm = () => {
    const nextErrors = {};

    if (!editForm.cedula.trim()) nextErrors.cedula = 'La cedula es obligatoria';
    if (!editForm.nombre.trim()) nextErrors.nombre = 'El nombre es obligatorio';
    if (!editForm.email.trim()) nextErrors.email = 'El correo es obligatorio';
    if (!editForm.permisoSistema) nextErrors.permisoSistema = 'Selecciona un permiso';
    if (!editForm.estado) nextErrors.estado = 'Selecciona un estado';

    setEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildUpdatePayload = () => {
    const payload = {
      cedula: editForm.cedula.trim(),
      nombre: editForm.nombre.trim(),
      apellido: editForm.apellido.trim(),
      email: editForm.email.trim().toLowerCase(),
      RH: editForm.RH.trim().toUpperCase(),
      facultad: editForm.facultad.trim(),
      telefono: editForm.telefono.trim(),
      imagen: editForm.imagen,
      imagenQR: editForm.imagenQR,
      rolAcademico: editForm.rolAcademico.trim(),
      permisoSistema: editForm.permisoSistema,
      estado: editForm.estado,
    };

    if (editForm.password.trim()) {
      payload.password = editForm.password;
    }

    return payload;
  };

  const submitEditForm = async (event) => {
    event.preventDefault();
    if (!editUserId) return;
    if (!validateEditForm()) return;

    setSaving(true);
    setFeedback('');

    try {
      const payload = buildUpdatePayload();
      const response = await apiRequest(`/users/${editUserId}`, {
        method: 'PUT',
        token,
        data: payload,
      });

      const updatedUser = response.user || response.data || null;
      if (updatedUser) {
        setUsers((prev) =>
          prev.map((user) => (user._id === editUserId ? updatedUser : user))
        );

        if (viewUser?._id === editUserId) {
          setViewUser(updatedUser);
        }
      } else {
        await loadUsers();
      }

      setFeedback('Usuario actualizado correctamente.');
      closeEditModal();
    } catch (err) {
      const apiErrors = err.details?.errors;
      if (apiErrors && typeof apiErrors === 'object') {
        setEditErrors((prev) => ({ ...prev, ...apiErrors }));
      } else {
        setFeedback(err.message || 'No fue posible actualizar el usuario.');
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setFeedback('');

    try {
      await apiRequest(`/users/${deleteTarget._id}`, {
        method: 'DELETE',
        token,
      });

      setUsers((prev) => prev.filter((user) => user._id !== deleteTarget._id));

      if (viewUser?._id === deleteTarget._id) {
        setViewUser(null);
      }

      setFeedback('Usuario eliminado correctamente.');
      setDeleteTarget(null);
    } catch (err) {
      setFeedback(err.message || 'No fue posible eliminar al usuario.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0f172a]">Directorio de usuarios</h1>
            <p className="text-sm text-[#475569]">
              Consulta, edita y administra la informacion de los usuarios registrados en el sistema.
            </p>
          </div>
          {isAdmin && (
            <Link
              to="/dashboard/staff/register"
              className="inline-flex items-center gap-2 rounded-lg bg-[#00594e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2"
            >
              Registrar usuario
            </Link>
          )}
        </header>

        {feedback && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {feedback}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-[#B5A160] bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030]">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm font-medium text-[#00594e]">Cargando usuarios...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {users.map((user) => (
              <div
                key={user._id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0f766e] hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={user.imagen || 'https://ui-avatars.com/api/?background=00594e&color=fff&name=' + encodeURIComponent(user.nombre || 'Usuario')}
                    alt={user.nombre || 'Usuario'}
                    className="h-14 w-14 rounded-full border border-slate-200 object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-[#0f172a]">
                      {user.nombre} {user.apellido}
                    </span>
                    <span className="text-sm text-[#475569]">{user.email}</span>
                    <span className="text-xs font-semibold text-[#00594e]">{user.permisoSistema}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setViewUser(user)}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#0f172a] transition hover:bg-slate-100"
                  >
                    Ver
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="rounded-md border border-[#0f766e]/40 px-3 py-1.5 text-xs font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/10"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(user)}
                        className="rounded-md border border-[#b91c1c]/40 px-3 py-1.5 text-xs font-semibold text-[#b91c1c] transition hover:bg-[#b91c1c]/10"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {users.length === 0 && !loading && (
              <p className="text-sm text-[#475569]">
                No hay usuarios registrados actualmente. Utiliza el boton de registro para crear uno nuevo.
              </p>
            )}
          </div>
        )}
      </div>

      {viewUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setViewUser(null)}
        >
          <div
            className="relative w-full max-w-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewUser(null)}
              className="absolute right-4 top-4 rounded-full bg-[#b91c1c] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#991b1b]"
            >
              Cerrar
            </button>
            <ProfileCard user={viewUser} />
          </div>
        </div>
      )}

      {editUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeEditModal}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeEditModal}
              className="absolute right-4 top-4 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-[#0f172a] transition hover:bg-slate-300"
            >
              Cancelar
            </button>
            <h2 className="text-2xl font-semibold text-[#0f172a]">Editar usuario</h2>
            <p className="text-sm text-[#475569]">Actualiza los datos y guarda los cambios para sincronizar el directorio.</p>

            <form className="mt-6 space-y-6" onSubmit={submitEditForm}>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { name: 'cedula', label: 'Cedula', type: 'text', required: true },
                  { name: 'nombre', label: 'Nombre', type: 'text', required: true },
                  { name: 'apellido', label: 'Apellido', type: 'text' },
                  { name: 'email', label: 'Correo', type: 'email', required: true },
                  { name: 'telefono', label: 'Telefono', type: 'text' },
                  { name: 'RH', label: 'RH', type: 'text' },
                  { name: 'facultad', label: 'Facultad', type: 'text' },
                  { name: 'rolAcademico', label: 'Rol academico', type: 'text' },
                  { name: 'password', label: 'Password (opcional)', type: 'password' },
                ].map((field) => (
                  <label key={field.name} className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">
                      {field.label}
                    </span>
                    <input
                      name={field.name}
                      type={field.type}
                      value={editForm[field.name]}
                      onChange={handleEditChange}
                      required={field.required}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70"
                    />
                    {editErrors[field.name] && (
                      <span className="text-xs font-medium text-[#b45309]">{editErrors[field.name]}</span>
                    )}
                  </label>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Permiso del sistema</span>
                  <select
                    name="permisoSistema"
                    value={editForm.permisoSistema}
                    onChange={handleEditChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70"
                    required
                  >
                    {PERMISOS_SISTEMA.map((permiso) => (
                      <option key={permiso} value={permiso}>
                        {permiso}
                      </option>
                    ))}
                  </select>
                  {editErrors.permisoSistema && (
                    <span className="text-xs font-medium text-[#b45309]">{editErrors.permisoSistema}</span>
                  )}
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Estado</span>
                  <select
                    name="estado"
                    value={editForm.estado}
                    onChange={handleEditChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70"
                    required
                  >
                    {ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                  {editErrors.estado && (
                    <span className="text-xs font-medium text-[#b45309]">{editErrors.estado}</span>
                  )}
                </label>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Imagen de perfil</span>
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="edit-imagen"
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#00594e]/40 bg-[#00594e]/5 px-4 py-2 text-xs font-semibold text-[#00594e] transition hover:bg-[#00594e]/10"
                    >
                      Seleccionar archivo
                    </label>
                    {editForm.imagen && (
                      <>
                        <img src={editForm.imagen} alt="Preview perfil" className="h-12 w-12 rounded-lg object-cover shadow-sm" />
                        <button
                          type="button"
                          onClick={() => removeImageField('imagen')}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-[#0f172a] hover:bg-slate-100"
                        >
                          Quitar
                        </button>
                      </>
                    )}
                  </div>
                  <input
                    id="edit-imagen"
                    name="imagen"
                    type="file"
                    accept="image/*"
                    onChange={handleEditFileChange}
                    className="hidden"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Imagen QR</span>
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="edit-imagenQR"
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#B5A160]/40 bg-[#B5A160]/10 px-4 py-2 text-xs font-semibold text-[#8c7030] transition hover:bg-[#B5A160]/20"
                    >
                      Seleccionar archivo
                    </label>
                    {editForm.imagenQR && (
                      <>
                        <img src={editForm.imagenQR} alt="Preview QR" className="h-12 w-12 rounded-lg object-cover shadow-sm" />
                        <button
                          type="button"
                          onClick={() => removeImageField('imagenQR')}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-[#0f172a] hover:bg-slate-100"
                        >
                          Quitar
                        </button>
                      </>
                    )}
                  </div>
                  <input
                    id="edit-imagenQR"
                    name="imagenQR"
                    type="file"
                    accept="image/*"
                    onChange={handleEditFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5b55] focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#b91c1c]/40 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-[#b91c1c]">Eliminar usuario</h3>
            <p className="mt-2 text-sm text-[#475569]">
              Estas seguro de eliminar a <span className="font-semibold text-[#0f172a]">{deleteTarget.nombre} {deleteTarget.apellido}</span>? Esta accion no se puede deshacer.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteUser}
                className="rounded-lg bg-[#b91c1c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#991b1b] focus:outline-none focus:ring-2 focus:ring-[#b91c1c] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default UserDirectory;
