import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';

const VEHICLE_TYPES = ['Carro', 'Moto', 'Bicicleta'];

const buildInitialForm = () => ({
  owner: '',
  type: VEHICLE_TYPES[0],
  brand: '',
  model: '',
  color: '',
  plate: '',
  notes: '',
  imagen: '',
});

const normalizeVehicleOwner = (vehicle) => {
  if (!vehicle?.owner) return null;
  if (typeof vehicle.owner === 'object') return vehicle.owner;
  return { _id: vehicle.owner };
};

const formatOwnerName = (owner) => {
  if (!owner) return 'Sin propietario';
  const displayName = `${owner.nombre || ''} ${owner.apellido || ''}`.trim();
  if (displayName) return displayName;
  return owner.email || owner.cedula || 'Sin propietario';
};

const UserVehicles = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token, hasPermission } = useAuth();

  const canViewVehicles = hasPermission(['Administrador', 'Celador']);
  const canEditVehicles = hasPermission(['Administrador']);
  const imageInputRef = useRef(null);
  const consumedStateRef = useRef(false);

  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [form, setForm] = useState(buildInitialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');

  const viewParam = searchParams.get('view');
  const ownerFilter = searchParams.get('owner') || '';
  const editParam = searchParams.get('edit');
  const view = viewParam === 'register' && canEditVehicles ? 'register' : 'list';
  const navigationIntent = location.state?.intent;
  const ownerFilterUser = useMemo(() => {
    if (!ownerFilter) return null;
    return users.find((user) => user._id === ownerFilter) || null;
  }, [ownerFilter, users]);

  const clearOwnerFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete('owner');
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const setViewMode = (mode, { edit, replace } = {}) => {
    const params = new URLSearchParams(searchParams);
    params.set('view', mode);
    if (edit) {
      params.set('edit', edit);
    } else {
      params.delete('edit');
    }
    setSearchParams(params, { replace });
  };

  const resetForm = () => {
    setForm(buildInitialForm());
    setEditingId(null);
    setUserQuery('');
    setShowUserSuggestions(false);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const loadVehicles = useCallback(async () => {
    if (!token || !canViewVehicles) return;

    setLoadingVehicles(true);
    setError('');

    try {
      const response = await apiRequest('/vehicles', { token });
      const data = Array.isArray(response) ? response : response?.data || [];
      setVehicles(data);
    } catch (err) {
      setError(err.message || 'No fue posible obtener los vehiculos registrados.');
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  }, [token, canViewVehicles]);

  const loadUsers = useCallback(async () => {
    if (!token || !canEditVehicles) return;

    setLoadingUsers(true);
    try {
      const response = await apiRequest('/users', { token });
      const data = Array.isArray(response) ? response : response?.data || [];
      setUsers(data);
    } catch (err) {
      console.warn('No fue posible obtener el listado de usuarios.', err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [token, canEditVehicles]);

  const populateFormFromVehicle = useCallback(
    (vehicle) => {
      const owner = normalizeVehicleOwner(vehicle);
      const ownerName = formatOwnerName(owner);
      setForm({
        owner: owner?._id || '',
        type: vehicle.type || VEHICLE_TYPES[0],
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        color: vehicle.color || '',
        plate: vehicle.plate || '',
        notes: vehicle.notes || '',
        imagen: vehicle.imagen || '',
      });
      setEditingId(vehicle._id);
      setUserQuery(ownerName);
      setShowUserSuggestions(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    },
    []
  );

  useEffect(() => {
    if (!viewParam) {
      setSearchParams({ view: 'list' }, { replace: true });
    } else if (viewParam === 'register' && !canEditVehicles) {
      setSearchParams({ view: 'list' }, { replace: true });
    }
  }, [viewParam, canEditVehicles, setSearchParams]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!canEditVehicles) return;
    if (!form.owner) return;
    if (userQuery) return;
    const ownerUser = users.find((user) => user._id === form.owner);
    if (ownerUser) {
      setUserQuery(formatOwnerName(ownerUser));
    }
  }, [users, form.owner, canEditVehicles, userQuery]);

  useEffect(() => {
    if (view !== 'register') return;
    if (!editParam) {
      if (editingId) {
        resetForm();
      }
      return;
    }
    const vehicle = vehicles.find((item) => item._id === editParam);
    if (vehicle) {
      populateFormFromVehicle(vehicle);
    }
  }, [view, editParam, vehicles, editingId, populateFormFromVehicle]);

  useEffect(() => {
    if (!canEditVehicles || consumedStateRef.current) return;
    if (navigationIntent !== 'register') return;
    const userFromState = location.state?.user;
    if (userFromState?._id) {
      consumedStateRef.current = true;
      setViewMode('register', { replace: true });
      setForm((prev) => ({
        ...prev,
        owner: userFromState._id,
      }));
      setUserQuery(formatOwnerName(userFromState));
    }
  }, [location.state, canEditVehicles, navigationIntent]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      setForm((prev) => ({ ...prev, imagen: '' }));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFeedback('Selecciona un archivo de imagen valido.');
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, imagen: reader.result }));
      }
    };
    reader.onerror = () => {
      setFeedback('No fue posible leer la imagen seleccionada.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, imagen: null }));
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const buildPayload = () => ({
    owner: form.owner,
    type: form.type,
    brand: form.brand.trim(),
    model: form.model.trim(),
    color: form.color.trim(),
    plate: form.plate.trim().toUpperCase(),
    notes: form.notes.trim(),
    ...(form.imagen === null
      ? { imagen: null }
      : typeof form.imagen === 'string' && form.imagen
        ? { imagen: form.imagen }
        : {}),
  });

  const submitForm = async (event) => {
    event.preventDefault();
    if (!token || !canEditVehicles) return;

    const payload = buildPayload();
    if (!payload.owner) {
      setFeedback('Selecciona el usuario propietario del vehiculo.');
      return;
    }
    if (!payload.type) {
      setFeedback('Selecciona un tipo de vehiculo valido.');
      return;
    }

    setSaving(true);
    setFeedback('');

    try {
      if (editingId) {
        await apiRequest(`/vehicles/${editingId}`, {
          method: 'PUT',
          token,
          data: payload,
        });
        setFeedback('Vehiculo actualizado correctamente.');
      } else {
        await apiRequest('/vehicles', {
          method: 'POST',
          token,
          data: payload,
        });
        setFeedback('Vehiculo registrado correctamente.');
      }

      resetForm();
      await loadVehicles();
      setViewMode('list', { replace: true });
    } catch (err) {
      setFeedback(err.message || 'No fue posible guardar el vehiculo.');
    } finally {
      setSaving(false);
    }
  };

  const startEditVehicle = (vehicle) => {
    if (!vehicle || !canEditVehicles) return;
    populateFormFromVehicle(vehicle);
    setFeedback('');
    setViewMode('register', { edit: vehicle._id });
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!vehicleId || !token || !canEditVehicles) return;

    setDeletingId(vehicleId);
    setFeedback('');

    try {
      await apiRequest(`/vehicles/${vehicleId}`, {
        method: 'DELETE',
        token,
      });
      setFeedback('Vehiculo eliminado correctamente.');
      if (editingId === vehicleId) {
        resetForm();
        setViewMode('list', { replace: true });
      }
      await loadVehicles();
    } catch (err) {
      setFeedback(err.message || 'No fue posible eliminar el vehiculo.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!userQuery) return users;
    const search = userQuery.trim().toLowerCase();
    return users.filter((user) => {
      const name = `${user.nombre || ''} ${user.apellido || ''}`.toLowerCase();
      return (
        name.includes(search) ||
        (user.email || '').toLowerCase().includes(search) ||
        (user.cedula || '').toLowerCase().includes(search)
      );
    });
  }, [users, userQuery]);

  const filteredVehicles = useMemo(() => {
    const search = vehicleSearch.trim().toLowerCase();
    const byStatus = statusFilter.toLowerCase();

    return vehicles
      .filter((vehicle) => {
        if (byStatus !== 'todos') {
          const currentStatus = String(vehicle.estado || '').toLowerCase();
          if (currentStatus !== byStatus) {
            return false;
          }
        }

        const owner = normalizeVehicleOwner(vehicle);
        if (ownerFilter && (!owner || owner._id !== ownerFilter)) {
          return false;
        }

        if (!search) return true;

        const matchesOwner =
          owner &&
          [owner.nombre, owner.apellido, owner.email, owner.cedula]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
        const matchesVehicle = [
          vehicle.type,
          vehicle.brand,
          vehicle.model,
          vehicle.color,
          vehicle.plate,
          vehicle.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
        return matchesOwner || matchesVehicle;
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
        const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
  }, [vehicles, vehicleSearch, statusFilter, ownerFilter]);

  if (!canViewVehicles) {
    return (
      <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-[#0f172a]">Acceso restringido</h1>
          <p className="mt-3 text-sm text-[#475569]">
            No tienes permisos para visualizar los vehiculos registrados. Si consideras que esto es un error, contacta al administrador del sistema.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#f8fafc] px-4 pb-16 pt-6 sm:pt-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#00594e]">Panel / Vehiculos</p>
            <h1 className="text-3xl font-bold text-[#0f172a]">Gestion de vehiculos</h1>
            <p className="text-sm text-[#475569]">
              Consulta y administra los vehiculos registrados en el sistema.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadVehicles}
              disabled={loadingVehicles}
              className="inline-flex items-center gap-2 rounded-md border border-[#00594e]/40 px-4 py-2 text-sm font-semibold text-[#00594e] transition hover:bg-[#00594e]/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loadingVehicles ? 'Actualizando...' : 'Actualizar lista'}
            </button>
            {canEditVehicles && view === 'list' && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setFeedback('');
                  setViewMode('register', { replace: true });
                }}
                className="inline-flex items-center gap-2 rounded-md bg-[#00594e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#004037]"
              >
                Registrar vehiculo
              </button>
            )}
            {view === 'register' && (
              <button
                type="button"
                onClick={() => setViewMode('list', { replace: true })}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-100"
              >
                Ver listado
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-[#b91c1c]/40 bg-[#b91c1c]/10 px-4 py-3 text-sm font-semibold text-[#b91c1c]">
            {error}
          </div>
        )}

        {feedback && (
          <div className="rounded-xl border border-[#0f766e]/30 bg-[#0f766e]/10 px-4 py-3 text-sm font-semibold text-[#0f766e]">
            {feedback}
          </div>
        )}

        {view === 'list' && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Vehiculos registrados</h2>
                <p className="text-sm text-[#64748b]">
                  {loadingVehicles
                    ? 'Cargando informacion...'
                    : `${filteredVehicles.length} vehiculo${filteredVehicles.length === 1 ? '' : 's'} encontrados.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={vehicleSearch}
                  onChange={(event) => setVehicleSearch(event.target.value)}
                  placeholder="Buscar por placa, usuario, marca..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#334155] focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/30 sm:w-64"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#334155] focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/30"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="activo">Solo activos</option>
                  <option value="inactivo">Solo inactivos</option>
                </select>
              </div>
            </header>
            {ownerFilterUser && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#0f766e]/30 bg-[#0f766e]/5 px-3 py-2 text-xs text-[#0f172a]">
                <p>
                  Mostrando vehículos asociados a{' '}
                  <span className="font-semibold text-[#0f766e]">{formatOwnerName(ownerFilterUser)}</span>.
                </p>
                <button
                  type="button"
                  onClick={clearOwnerFilter}
                  className="rounded-full border border-[#0f766e]/40 px-3 py-1 font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/10"
                >
                  Ver todos
                </button>
              </div>
            )}
            <div className="mt-4 space-y-3">
              {filteredVehicles.length > 0 ? (
                <ul className="space-y-2 text-sm text-[#334155]">
                  {filteredVehicles.map((vehicle) => {
                    const isActive = String(vehicle.estado || '').toLowerCase() === 'activo';
                    const owner = normalizeVehicleOwner(vehicle);
                    const ownerName = formatOwnerName(owner);
                    return (
                      <li
                        key={vehicle._id}
                        className="flex flex-col gap-3 rounded-lg border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex flex-1 items-center gap-4">
                          {vehicle.imagen ? (
                            <img
                              src={vehicle.imagen}
                              alt={`Foto de ${vehicle.type || 'vehiculo'}`}
                              className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[11px] font-semibold text-[#94a3b8]">
                              Sin foto
                            </div>
                          )}
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-[#0f172a]">{vehicle.type}</p>
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                                  isActive
                                    ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                    : 'border-slate-300 bg-slate-200 text-slate-700'
                                }`}
                              >
                                {isActive ? 'Activo' : 'Inactivo'}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">
                                {vehicle.plate || 'Sin placa'}
                              </span>
                            </div>
                            <p className="text-xs text-[#475569]">
                              {vehicle.brand || 'Marca desconocida'} {vehicle.model ? `- ${vehicle.model}` : ''}
                            </p>
                            <p className="text-xs text-[#475569]">
                              Propietario:{' '}
                              <span className="font-semibold text-[#0f172a]">{ownerName}</span>
                              {owner?.email && ` · ${owner.email}`}
                            </p>
                            {vehicle.notes && <p className="text-xs text-[#94a3b8]">Notas: {vehicle.notes}</p>}
                          </div>
                        </div>
                        {canEditVehicles && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEditVehicle(vehicle)}
                              className="inline-flex items-center rounded-md border border-[#0f766e]/40 px-3 py-1 text-xs font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/10"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVehicle(vehicle._id)}
                              disabled={deletingId === vehicle._id}
                              className="inline-flex items-center rounded-md border border-[#b91c1c]/40 px-3 py-1 text-xs font-semibold text-[#b91c1c] transition hover:bg-[#b91c1c]/10 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {deletingId === vehicle._id ? 'Eliminando...' : 'Eliminar'}
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-[#64748b]">
                  {loadingVehicles ? 'Cargando informacion...' : 'No hay vehiculos que coincidan con los filtros.'}
                </p>
              )}
            </div>
          </section>
        )}

        {view === 'register' && (
          canEditVehicles ? (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <header className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold text-[#0f172a]">
                  {editingId ? 'Editar vehiculo' : 'Registrar vehiculo'}
                </h2>
                <p className="text-sm text-[#64748b]">
                  Selecciona un usuario propietario e ingresa los datos del vehiculo.
                </p>
              </header>
              <form className="mt-5 space-y-4" onSubmit={submitForm}>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[#00594e]">
                  Usuario propietario
                  <div className="relative mt-1">
                    <input
                      value={userQuery}
                      onChange={(event) => {
                        const value = event.target.value;
                        setUserQuery(value);
                        setShowUserSuggestions(true);
                        if (!value.trim()) {
                          setForm((prev) => ({ ...prev, owner: '' }));
                        }
                      }}
                      onFocus={() => setShowUserSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => setShowUserSuggestions(false), 150);
                      }}
                      placeholder={loadingUsers ? 'Cargando usuarios...' : 'Buscar por nombre, correo o documento'}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#334155] focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/40"
                    />
                    {showUserSuggestions && (
                      <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {loadingUsers ? (
                          <div className="px-3 py-2 text-xs text-[#64748b]">Cargando usuarios...</div>
                        ) : filteredUsers.length > 0 ? (
                          <ul className="divide-y divide-slate-100">
                            {filteredUsers.map((user) => (
                              <li key={user._id}>
                                <button
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    setForm((prev) => ({ ...prev, owner: user._id }));
                                    setUserQuery(formatOwnerName(user));
                                    setShowUserSuggestions(false);
                                  }}
                                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs transition hover:bg-[#00594e]/10 ${
                                    form.owner === user._id ? 'bg-[#00594e]/10 text-[#0f172a]' : 'text-[#475569]'
                                  }`}
                                >
                                  <span className="font-semibold text-[#0f172a]">{formatOwnerName(user)}</span>
                                  <span className="text-[11px] text-[#64748b]">{user.email || 'Sin correo registrado'}</span>
                                  {user.cedula && (
                                    <span className="text-[11px] text-[#94a3b8]">Documento: {user.cedula}</span>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="px-3 py-2 text-xs text-[#64748b]">
                            {userQuery.trim()
                              ? 'No se encontraron usuarios con ese criterio.'
                              : 'Escribe para buscar un usuario.'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {form.owner && (
                    <p className="mt-1 text-[11px] text-[#64748b]">
                      Usuario seleccionado: <span className="font-semibold text-[#0f172a]">{userQuery}</span>
                    </p>
                  )}
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[#00594e]">
                  Tipo de vehiculo
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#334155] focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/40"
                  >
                    {VEHICLE_TYPES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#00594e]">
                    Placa / identificador
                    <input
                      name="plate"
                      value={form.plate}
                      onChange={handleFormChange}
                      placeholder="ABC123"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#334155] focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/40"
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#00594e]">
                    Color
                    <input
                      name="color"
                      value={form.color}
                      onChange={handleFormChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#334155] focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/40"
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#00594e]">
                    Marca
                    <input
                      name="brand"
                      value={form.brand}
                      onChange={handleFormChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#334155] focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/40"
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#00594e]">
                    Modelo
                    <input
                      name="model"
                      value={form.model}
                      onChange={handleFormChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#334155] focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/40"
                    />
                  </label>
                </div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[#00594e]">
                  Foto del vehiculo
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-1 block w-full cursor-pointer rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-[#475569] file:mr-3 file:rounded-md file:border-0 file:bg-[#00594e] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[#004037]"
                  />
                  {form.imagen ? (
                    <div className="mt-3 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <img src={form.imagen} alt="Vista previa del vehiculo" className="h-20 w-20 rounded-lg object-cover" />
                      <div className="flex flex-col gap-2 text-xs text-[#475569]">
                        <p className="font-semibold text-[#0f172a]">Vista previa</p>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="self-start rounded-md border border-slate-200 px-2 py-1 font-semibold text-[#b91c1c] transition hover:bg-[#fee2e2]"
                        >
                          Eliminar imagen
                        </button>
                      </div>
                    </div>
                  ) : form.imagen === null ? (
                    <p className="mt-3 text-xs font-semibold text-[#b91c1c]">La imagen se eliminara al guardar.</p>
                  ) : null}
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[#00594e]">
                  Notas
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#334155] focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/40"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0c5b55] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? 'Guardando...' : editingId ? 'Actualizar vehiculo' : 'Registrar vehiculo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setFeedback('');
                      setViewMode('list', { replace: true });
                    }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        const ownerId = form.owner;
                        const ownerUser = users.find((user) => user._id === ownerId);
                        resetForm();
                        if (ownerId) {
                          setForm((prev) => ({ ...prev, owner: ownerId }));
                          setUserQuery(ownerUser ? formatOwnerName(ownerUser) : '');
                        }
                      }}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-100"
                    >
                      Limpiar formulario
                    </button>
                  )}
                </div>
              </form>
            </section>
          ) : (
            <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-[#475569] shadow-sm">
              No cuentas con permisos para registrar vehiculos.
            </section>
          )
        )}
      </div>
    </section>
  );
};

export default UserVehicles;
