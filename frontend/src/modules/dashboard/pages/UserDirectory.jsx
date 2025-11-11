import { useEffect, useMemo, useRef, useState } from 'react';
import { FiEye, FiEyeOff, FiTruck } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import ProfileCard from '../../../shared/components/ProfileCard';
import UserStatsCharts from '../../../shared/components/UserStatsCharts';
import { apiRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';
import { utils as XLSXUtils, writeFile as writeXLSXFile } from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const convertOklchToSRGB = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^oklch\(([^)]+)\)$/i);
  if (!match) return null;

  let [l, c, h, maybeSlash, maybeAlpha] = match[1].replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  let alpha = 1;
  if (maybeSlash === '/') {
    alpha = parseFloat(maybeAlpha ?? '1');
  } else if (maybeSlash && maybeSlash.startsWith('/')) {
    alpha = parseFloat(maybeSlash.slice(1));
  }

  const parseComponent = (component) => {
    if (!component) return 0;
    if (component.endsWith('%')) {
      return parseFloat(component) / 100;
    }
    return parseFloat(component);
  };

  l = parseComponent(l);
  c = parseFloat(c || '0');
  h = parseFloat(h || '0');
  const hRad = (h * Math.PI) / 180;
  const a = Math.cos(hRad) * c;
  const bAxis = Math.sin(hRad) * c;

  const l_ = l + 0.3963377774 * a + 0.2158037573 * bAxis;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * bAxis;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * bAxis;

  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bChannel = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const encode = (channel) => {
    channel = Math.max(0, Math.min(1, channel));
    return channel <= 0.0031308 ? 12.92 * channel : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
  };

  r = Math.round(encode(r) * 255);
  g = Math.round(encode(g) * 255);
  const b = Math.round(encode(bChannel) * 255);

  if (Number.isFinite(alpha) && alpha >= 0 && alpha < 1) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
};

const convertOklabToSRGB = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^oklab\(([^)]+)\)$/i);
  if (!match) return null;

  let [l, a, b, maybeSlash, maybeAlpha] = match[1].replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  let alpha = 1;
  if (maybeSlash === '/') {
    alpha = parseFloat(maybeAlpha ?? '1');
  } else if (maybeSlash && maybeSlash.startsWith('/')) {
    alpha = parseFloat(maybeSlash.slice(1));
  }

  const parseComponent = (component) => {
    if (!component) return 0;
    if (component.endsWith('%')) {
      return parseFloat(component) / 100;
    }
    return parseFloat(component);
  };

  l = parseComponent(l);
  a = parseFloat(a || '0');
  b = parseFloat(b || '0');

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bChannel = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const encode = (channel) => {
    channel = Math.max(0, Math.min(1, channel));
    return channel <= 0.0031308 ? 12.92 * channel : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
  };

  r = Math.round(encode(r) * 255);
  g = Math.round(encode(g) * 255);
  const bResult = Math.round(encode(bChannel) * 255);

  if (Number.isFinite(alpha) && alpha >= 0 && alpha < 1) {
    return `rgba(${r}, ${g}, ${bResult}, ${alpha})`;
  }
  return `rgb(${r}, ${g}, ${bResult})`;
};

const PERMISOS_SISTEMA = ['Administrador', 'Celador', 'Usuario'];
const ESTADOS = ['activo', 'inactivo', 'bloqueado'];

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

const formatVisitorTicketInfo = (ticket) => {
  if (!ticket) {
    return {
      status: 'none',
      description: 'Sin ticket activo',
      token: null,
      isExpired: true,
    };
  }

  const expiresAt = ticket.expiresAt ? new Date(ticket.expiresAt) : null;
  const isExpired = !!ticket.isExpired;
  const descriptionParts = [];

  if (isExpired) {
    if (expiresAt && Number.isFinite(expiresAt.getTime())) {
      descriptionParts.push(`Expirado el ${expiresAt.toLocaleString()}`);
    } else {
      descriptionParts.push('Ticket expirado');
    }
  } else {
    if (ticket.formattedRemaining) {
      descriptionParts.push(`Expira en ${ticket.formattedRemaining}`);
    }
    if (expiresAt && Number.isFinite(expiresAt.getTime())) {
      descriptionParts.push(`(${expiresAt.toLocaleString()})`);
    }
  }

  const description =
    descriptionParts.length > 0
      ? descriptionParts.join(' ')
      : isExpired
        ? 'Ticket expirado'
        : 'Ticket activo';

  return {
    status: isExpired ? 'expired' : 'active',
    token: ticket.token,
    description,
    isExpired,
  };
};

const UserDirectory = () => {
  const { token, hasPermission } = useAuth();
  const isAdmin = hasPermission(['Administrador']);
  const canAccessVehicles = hasPermission(['Administrador', 'Celador']);
  const canRegisterVehicles = hasPermission(['Administrador']);
  const canManageAccess = hasPermission(['Administrador', 'Celador']);
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [viewUser, setViewUser] = useState(null);

  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState({});
  const [editPasswordVisible, setEditPasswordVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reactivatingId, setReactivatingId] = useState(null);
  const [togglingAccessId, setTogglingAccessId] = useState(null);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [permisoFilter, setPermisoFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [userVehicleCounts, setUserVehicleCounts] = useState({});
  const [loadingVehicleCountFor, setLoadingVehicleCountFor] = useState(null);
  const profileCardRef = useRef(null);
  const colorNormalizerRef = useRef(null);

  const loadUsers = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const response = await apiRequest('/users?includeVisitorTicket=true', { token });
      const data = Array.isArray(response) ? response : response?.data || [];
      setUsers(data);
      setUserVehicleCounts((prev) => {
        if (!prev || Object.keys(prev).length === 0) return prev;
        const next = {};
        data.forEach((user) => {
          if (prev[user._id] !== undefined) {
            next[user._id] = prev[user._id];
          }
        });
        return next;
      });
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

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          user.nombre,
          user.apellido,
          `${user.nombre || ''} ${user.apellido || ''}`,
          user.email,
          user.cedula,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      const matchesPermiso =
        !permisoFilter || (user.permisoSistema || '').toLowerCase() === permisoFilter.toLowerCase();

      const matchesEstado =
        !estadoFilter || (user.estado || '').toLowerCase() === estadoFilter.toLowerCase();

      return matchesSearch && matchesPermiso && matchesEstado;
    });
  }, [users, searchTerm, permisoFilter, estadoFilter]);

  const hasActiveFilters = Boolean(searchTerm.trim() || permisoFilter || estadoFilter);
  const viewUserEstado = (viewUser?.estado || '').toLowerCase();
  const viewUserToggleId = viewUser?._id || viewUser?.id || viewUser?.cedula || null;
  const isViewUserBlocked = viewUserEstado === 'bloqueado';
  const isViewToggling = viewUserToggleId ? togglingAccessId === viewUserToggleId : false;

  const clearFilters = () => {
    setSearchTerm('');
    setPermisoFilter('');
    setEstadoFilter('');
  };

  const handleExportUsers = () => {
    if (!users.length) {
      setFeedback('No hay usuarios para exportar.');
      return;
    }

    const headers = [
      'Cedula',
      'Nombre',
      'Apellido',
      'Correo',
      'Permiso',
      'Estado',
      'Rol academico',
      'Telefono',
      'Facultad',
      'Vehiculos registrados',
    ];

    const rows = users.map((user) => [
      user.cedula || '',
      user.nombre || '',
      user.apellido || '',
      user.email || '',
      user.permisoSistema || '',
      user.estado || '',
      user.rolAcademico || '',
      user.telefono || '',
      user.facultad || '',
      typeof userVehicleCounts[user._id] === 'number' ? userVehicleCounts[user._id] : '',
    ]);

    const worksheet = XLSXUtils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(workbook, worksheet, 'Usuarios');
    writeXLSXFile(workbook, `directorio-usuarios-${Date.now()}.xlsx`);
    setFeedback('Archivo de usuarios exportado correctamente.');
  };

  const fetchVehicleCount = async (userId) => {
    if (!token || !userId) return 0;
    if (loadingVehicleCountFor === userId) return userVehicleCounts[userId] ?? 0;

    setLoadingVehicleCountFor(userId);
    try {
      const response = await apiRequest(`/users/${userId}/vehicles`, { token });
      const data = Array.isArray(response) ? response : response?.data || [];
      setUserVehicleCounts((prev) => ({ ...prev, [userId]: data.length }));
      return data.length;
    } catch (err) {
      setUserVehicleCounts((prev) => ({ ...prev, [userId]: 0 }));
      return 0;
    } finally {
      setLoadingVehicleCountFor(null);
    }
  };

  const handleViewUser = (user) => {
    setViewUser(user);
    if (user?._id && userVehicleCounts[user._id] === undefined) {
      fetchVehicleCount(user._id);
    }
  };

  const getVehicleCount = (userId) => {
    if (!userId) return null;
    return userVehicleCounts[userId] ?? null;
  };

  useEffect(() => {
    if (!canAccessVehicles || !filteredUsers.length) return undefined;

    const missingUserIds = filteredUsers
      .map((user) => user._id)
      .filter((id) => id && userVehicleCounts[id] === undefined);

    if (!missingUserIds.length) return undefined;

    const timers = missingUserIds.map((userId, index) =>
      setTimeout(() => {
        fetchVehicleCount(userId);
      }, index * 120)
    );

    return () => {
      timers.forEach((timerId) => clearTimeout(timerId));
    };
  }, [filteredUsers, canAccessVehicles, userVehicleCounts, fetchVehicleCount]);

  const handleVehicleNavigation = async (user) => {
    if (!user?._id) return;
    let count = userVehicleCounts[user._id];
    if (count === undefined) {
      count = await fetchVehicleCount(user._id);
    }
    openVehiclesPage(user, (count || 0) > 0, 'list');
  };

const openVehiclesPage = (user, hasVehicles, view = 'list') => {
  if (!user?._id) return;
  const params = new URLSearchParams();
  if (view) {
    params.set('view', view);
  }
  if (view === 'list') {
    params.set('owner', user._id);
  }
  const search = params.toString() ? `?${params.toString()}` : '';
  navigate(`/dashboard/vehicles${search}`, {
    state: {
      user,
      hasVehicles,
      from: 'directory',
      intent: view,
    },
  });
};

  const openEditModal = (user) => {
    setEditUserId(user._id);
    setEditForm(mapUserToForm(user));
    setEditErrors({});
    setFeedback('');
    setEditPasswordVisible(false);
  };

  const closeEditModal = () => {
    setEditUserId(null);
    setEditForm(EMPTY_FORM);
    setEditErrors({});
    setSaving(false);
    setEditPasswordVisible(false);
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

      setUserVehicleCounts((prev) => {
        if (!prev || !(deleteTarget._id in prev)) return prev;
        const next = { ...prev };
        delete next[deleteTarget._id];
        return next;
      });

      setFeedback('Usuario eliminado correctamente.');
      setDeleteTarget(null);
    } catch (err) {
      setFeedback(err.message || 'No fue posible eliminar al usuario.');
    } finally {
      setDeleting(false);
    }
  };

  const handleReactivateTicket = async (userId) => {
    if (!userId || reactivatingId) return;

    setReactivatingId(userId);
    setFeedback('');

    try {
      const response = await apiRequest('/visitors/reactivate', {
        method: 'POST',
        token,
        data: { userId },
      });

      const updatedTicket = response.ticket || null;

      setUsers((prev) =>
        prev.map((userItem) =>
          userItem._id === userId ? { ...userItem, visitorTicket: updatedTicket } : userItem
        )
      );

      if (viewUser?._id === userId) {
        setViewUser((prev) => (prev ? { ...prev, visitorTicket: updatedTicket } : prev));
      }

      setFeedback('Ticket temporal reactivado correctamente.');
    } catch (err) {
      setFeedback(err.message || 'No fue posible reactivar el ticket temporal.');
    } finally {
      setReactivatingId(null);
    }
  };

  const handleToggleAccess = async (targetUser) => {
    if (!targetUser?.cedula || !token || togglingAccessId) {
      return;
    }

    const targetId = targetUser._id || targetUser.id || targetUser.cedula;
    setTogglingAccessId(targetId);
    setFeedback('');

    try {
      const response = await apiRequest('/users/toggle-access', {
        method: 'POST',
        token,
        data: { cedula: targetUser.cedula },
      });

      const updatedUser = response?.user || null;
      const message = response?.message || 'Estado del usuario actualizado correctamente.';

      if (updatedUser && updatedUser._id) {
        setUsers((prev) => prev.map((userItem) => (userItem._id === updatedUser._id ? updatedUser : userItem)));

        if (viewUser?._id === updatedUser._id) {
          setViewUser(updatedUser);
        }

        if (editUserId === updatedUser._id) {
          setEditForm(mapUserToForm(updatedUser));
        }
      } else {
        await loadUsers();
      }

      setFeedback(message);
    } catch (error) {
      setFeedback(error?.message || 'No fue posible actualizar el estado del usuario.');
    } finally {
      setTogglingAccessId(null);
    }
  };

  const handleDownloadCard = async () => {
    if (!profileCardRef.current || !viewUser) return;
    setDownloadingCard(true);
    setFeedback('');

    const trackedNodes = [];
    if (!colorNormalizerRef.current && typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      colorNormalizerRef.current = canvas.getContext('2d');
    }
    const normalizeColor = (value) => {
      if (!value || value === 'transparent' || value === 'none') {
        return value;
      }

      const converted = convertOklchToSRGB(value) || convertOklabToSRGB(value);
      if (converted) return converted;

      const ctx = colorNormalizerRef.current;
      if (!ctx) return value;
      try {
        ctx.fillStyle = value;
        return ctx.fillStyle;
      } catch {
        return value;
      }
    };
    const applySnapshotStyles = () => {
      const walker = document.createTreeWalker(profileCardRef.current, NodeFilter.SHOW_ELEMENT, null);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const computed = window.getComputedStyle(node);
        trackedNodes.push({
          node,
          backgroundColor: node.style.backgroundColor,
          color: node.style.color,
          borderColor: node.style.borderColor,
          boxShadow: node.style.boxShadow,
        });
        node.style.backgroundColor = normalizeColor(computed.backgroundColor);
        node.style.color = normalizeColor(computed.color);
        node.style.borderColor = normalizeColor(computed.borderColor);
        node.style.boxShadow = 'none';
      }
    };

    const restoreSnapshotStyles = () => {
      trackedNodes.forEach(({ node, backgroundColor, color, borderColor, boxShadow }) => {
        node.style.backgroundColor = backgroundColor;
        node.style.color = color;
        node.style.borderColor = borderColor;
        node.style.boxShadow = boxShadow;
      });
    };

    try {
      applySnapshotStyles();

      const canvas = await html2canvas(profileCardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      restoreSnapshotStyles();

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(
        imgData,
        'PNG',
        margin,
        margin,
        imgWidth,
        Math.min(imgHeight, pdf.internal.pageSize.getHeight() - margin * 2)
      );
      const filename = `carnet-${viewUser?.cedula || viewUser?.nombre || 'usuario'}.pdf`;
      pdf.save(filename);
      setFeedback('Carnet descargado correctamente.');
    } catch (error) {
      console.error('No se pudo descargar el carnet', error);
      setFeedback('No fue posible descargar el carnet. Intentalo nuevamente.');
    } finally {
      restoreSnapshotStyles();
      setDownloadingCard(false);
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

        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-12">
          <label className="sm:col-span-5">
            <span className="block text-xs font-semibold uppercase tracking-wide text-[#00594e]">Buscar</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nombre, apellido, correo o cedula"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#0f172a] shadow-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/50"
            />
          </label>

          <label className="sm:col-span-3">
            <span className="block text-xs font-semibold uppercase tracking-wide text-[#00594e]">Permiso</span>
            <select
              value={permisoFilter}
              onChange={(event) => setPermisoFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#0f172a] shadow-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/50"
            >
              <option value="">Todos</option>
              {PERMISOS_SISTEMA.map((permiso) => (
                <option key={permiso} value={permiso}>
                  {permiso}
                </option>
              ))}
            </select>
          </label>

          <label className="sm:col-span-3">
            <span className="block text-xs font-semibold uppercase tracking-wide text-[#00594e]">Estado</span>
            <select
              value={estadoFilter}
              onChange={(event) => setEstadoFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#0f172a] shadow-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/50"
            >
              <option value="">Todos</option>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado.charAt(0).toUpperCase() + estado.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end sm:col-span-1">
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#0f172a] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Limpiar
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleExportUsers}
              className="inline-flex items-center gap-2 rounded-lg bg-[#B5A160] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9a8952] focus:outline-none focus:ring-2 focus:ring-[#B5A160] focus:ring-offset-2"
            >
              Exportar Excel
            </button>
          </div>
        )}

        <UserStatsCharts
          className="mt-6"
          users={users}
          loading={loading}
          permisoLabels={PERMISOS_SISTEMA}
          estadoLabels={ESTADOS}
          title="Distribucion del directorio"
          description="Visualiza la composicion de usuarios por permiso y estado en tiempo real."
        />

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
            {filteredUsers.map((user) => {
              const isVisitor = (user.rolAcademico || '').toLowerCase() === 'visitante';
              const visitorTicketInfo = formatVisitorTicketInfo(user.visitorTicket);
              const canReactivateTicket = visitorTicketInfo.status !== 'active';
              const vehicleCount = getVehicleCount(user._id);
              const hasVehicles = typeof vehicleCount === 'number' && vehicleCount > 0;
              const estado = (user.estado || '').toLowerCase() || 'desconocido';
              const isBlocked = estado === 'bloqueado';
              const estadoBadgeClasses =
                estado === 'activo'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : estado === 'bloqueado'
                    ? 'border-[#fecaca] bg-[#fee2e2] text-[#b91c1c]'
                    : 'border-slate-200 bg-slate-100 text-[#475569]';
              const toggleTargetId = user._id || user.id || user.cedula;
              const isToggling = togglingAccessId === toggleTargetId;

              return (
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
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-[#0f172a]">
                        {user.nombre} {user.apellido}
                      </span>
                      {hasVehicles && (
                        <span
                          title={`${vehicleCount} vehículo${vehicleCount === 1 ? '' : 's'} registrados`}
                          className="inline-flex items-center gap-1 rounded-full border border-[#0f766e]/30 bg-[#0f766e]/5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#0f766e]"
                        >
                          <FiTruck className="h-3.5 w-3.5" aria-hidden="true" />
                          {vehicleCount}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-[#475569]">{user.email}</span>
                    <span className="text-xs font-semibold text-[#00594e]">{user.permisoSistema}</span>
                    <span className={`inline-block w-fit rounded-full border px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${estadoBadgeClasses}`}>
                      Estado: {estado}
                    </span>
                  </div>
                </div>

                  {isVisitor && (
                    <div className="mt-3 rounded-lg border border-dashed border-[#0f766e]/40 bg-[#0f766e]/5 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">Ticket temporal</p>
                      <p className="mt-1 text-xs text-[#0f172a]">
                        {visitorTicketInfo.description || 'Sin ticket activo'}
                      </p>
                      {visitorTicketInfo.token && (
                        <p className="mt-1 break-all text-[11px] text-[#0f172a]/70">
                          Token: {visitorTicketInfo.token}
                        </p>
                      )}
                      {canReactivateTicket && (
                        <button
                          type="button"
                          onClick={() => handleReactivateTicket(user._id)}
                          disabled={reactivatingId === user._id}
                          className="mt-2 inline-flex items-center rounded-md border border-[#0f766e]/40 px-3 py-1 text-[11px] font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/10 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {reactivatingId === user._id ? 'Reactivando...' : 'Reactivar ticket'}
                        </button>
                      )}
                    </div>
                  )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleViewUser(user)}
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
                  {canManageAccess && user.cedula && (
                    <button
                      type="button"
                      onClick={() => handleToggleAccess(user)}
                      disabled={isToggling}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isBlocked
                          ? 'border border-[#0f766e]/40 text-[#0f766e] hover:bg-[#0f766e]/10'
                          : 'border border-[#b91c1c]/40 text-[#b91c1c] hover:bg-[#b91c1c]/10'
                      }`}
                    >
                      {isToggling
                        ? 'Actualizando...'
                        : isBlocked
                          ? 'Desbloquear'
                          : 'Bloquear'}
                    </button>
                  )}
                </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && !loading && (
              <p className="text-sm text-[#475569]">
                {hasActiveFilters
                  ? 'No se encontraron usuarios que coincidan con los filtros aplicados.'
                  : 'No hay usuarios registrados actualmente. Utiliza el boton de registro para crear uno nuevo.'}
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
            className="relative w-full max-w-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-[#0f172a]">Detalle del usuario</h3>
                  <p className="text-sm text-[#475569]">Información general, ticket temporal y accesos de vehículos.</p>
                  {viewUser?.estado && (
                    <p className={`text-xs font-semibold ${isViewUserBlocked ? 'text-[#b91c1c]' : 'text-[#0f766e]'}`}>
                      Estado actual: {viewUser.estado}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canManageAccess && viewUser?.cedula && (
                    <button
                      type="button"
                      onClick={() => handleToggleAccess(viewUser)}
                      disabled={isViewToggling}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isViewUserBlocked
                          ? 'bg-[#0f766e]/10 text-[#0f766e] hover:bg-[#0f766e]/20'
                          : 'bg-[#fee2e2] text-[#b91c1c] hover:bg-[#fecaca]'
                      }`}
                    >
                      {isViewToggling ? 'Actualizando...' : isViewUserBlocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewUser(null)}
                    className="rounded-full bg-[#b91c1c] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#991b1b]"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1fr]">
                <div className="space-y-4">
                  <div ref={profileCardRef}>
                    <ProfileCard user={viewUser} variant="expanded" />
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadCard}
                    disabled={downloadingCard}
                    className="w-full rounded-lg border border-[#0f766e]/40 bg-white px-4 py-2 text-xs font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloadingCard ? 'Generando carnet...' : 'Descargar carnet'}
                  </button>
                </div>
                <div className="space-y-4">
                  {(viewUser.rolAcademico || '').toLowerCase() === 'visitante' && (() => {
                    const visitorInfo = formatVisitorTicketInfo(viewUser.visitorTicket);
                    const canReactivateVisitor = visitorInfo.status !== 'active';
                    return (
                      <div className="rounded-2xl border border-dashed border-[#0f766e]/40 bg-[#0f766e]/5 p-4 text-sm text-[#0f172a]">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">Ticket temporal</p>
                        <p className="mt-1 text-xs">{visitorInfo.description || 'Sin ticket activo'}</p>
                        {visitorInfo.token && (
                          <p className="mt-1 break-all text-[11px] text-[#0f172a]/70">Token: {visitorInfo.token}</p>
                        )}
                        {canReactivateVisitor && (
                          <button
                            type="button"
                            onClick={() => handleReactivateTicket(viewUser._id)}
                            disabled={reactivatingId === viewUser._id}
                            className="mt-3 inline-flex items-center rounded-md border border-[#0f766e]/40 px-3 py-1 text-xs font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/10 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {reactivatingId === viewUser._id ? 'Reactivando...' : 'Reactivar ticket'}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                  {canAccessVehicles && viewUser?._id && (() => {
                    const vehicleCount = getVehicleCount(viewUser._id);
                    const hasVehicles = (vehicleCount || 0) > 0;
                    const isLoadingVehicles = loadingVehicleCountFor === viewUser._id;
                    return (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-[#f8fafc] p-4 text-sm text-[#0f172a]">
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#0f172a]">Vehículos</p>
                          <p className="text-xs text-[#475569]">
                            {isLoadingVehicles
                              ? 'Cargando información...'
                              : hasVehicles
                                ? `${vehicleCount} vehículo${vehicleCount === 1 ? '' : 's'} registrados.`
                                : 'Sin vehículos registrados.'}
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {hasVehicles && (
                            <button
                              type="button"
                              onClick={() => handleVehicleNavigation(viewUser)}
                              className="inline-flex items-center rounded-md border border-[#0f766e]/40 px-3 py-1 text-xs font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/10"
                            >
                              Ver vehículos
                            </button>
                          )}
                          {canRegisterVehicles && (
                            <button
                              type="button"
                              onClick={() => openVehiclesPage(viewUser, hasVehicles, 'register')}
                              className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-[#0f172a] transition hover:bg-slate-100"
                            >
                              Registrar vehículo
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
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
                ].map((field) => {
                  const isPasswordField = field.type === 'password';
                  const resolvedType = isPasswordField && editPasswordVisible ? 'text' : field.type;

                  return (
                    <label key={field.name} className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">
                        {field.label}
                      </span>
                      <div className={`mt-2 ${isPasswordField ? 'relative' : ''}`}>
                        <input
                          name={field.name}
                          type={resolvedType}
                          value={editForm[field.name]}
                          onChange={handleEditChange}
                          required={field.required}
                          className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70 ${
                            isPasswordField ? 'pr-10' : ''
                          }`}
                        />
                        {isPasswordField && (
                          <button
                            type="button"
                            onClick={() => setEditPasswordVisible((prev) => !prev)}
                            className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-[#00594e] focus:outline-none"
                            aria-label={editPasswordVisible ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                          >
                            {editPasswordVisible ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                      {editErrors[field.name] && (
                        <span className="text-xs font-medium text-[#b45309]">{editErrors[field.name]}</span>
                      )}
                    </label>
                  );
                })}
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

