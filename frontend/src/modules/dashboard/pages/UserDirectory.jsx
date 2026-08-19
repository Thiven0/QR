import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { FaRegAddressCard } from 'react-icons/fa';
import { LuTicketCheck, LuTicketX } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import ProfileCard from '../../../shared/components/ProfileCard';
import UserStatsCharts from '../../../shared/components/UserStatsCharts';
import { apiRequest, resolveAssetUrl, uploadImageSource } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';
import FaceCapture from '../components/FaceCapture';
import { utils as XLSXUtils, writeFile as writeXLSXFile } from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { toast } from 'sonner';

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
  'Visitante externo',
  'Otro',
];

const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const ROLES_ACADEMICOS = [
  'Estudiante',
  'Profesor',
  'Egresado',
  'Visitante',
  'Usuario',
  'Funcionario',
  'Contratista',
  'Otro',
];

const DEFAULT_USERS_PAGE_SIZE = 10;

const resolveUserImage = (user) => {
  if (!user) return '';
  if (user.imagenThumbnail) return resolveAssetUrl(user.imagenThumbnail);
  if (user.imagen) return resolveAssetUrl(user.imagen);
  const fallbackName = encodeURIComponent(user.nombre || 'Usuario');
  return `https://ui-avatars.com/api/?background=00594e&color=fff&name=${fallbackName}`;
};

const formatShortDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

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
  faceRegistered: false,
  faceDescriptorUpdatedAt: '',
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

const getFormValue = (user, keys, fallback = '') => {
  for (const key of keys) {
    if (hasOwn(user, key)) {
      return user[key] ?? '';
    }
  }
  return fallback;
};

const mapUserToForm = (user, fallback = EMPTY_FORM) => ({
  cedula: getFormValue(user, ['cedula'], fallback.cedula),
  nombre: getFormValue(user, ['nombre'], fallback.nombre),
  apellido: getFormValue(user, ['apellido'], fallback.apellido),
  email: getFormValue(user, ['email'], fallback.email),
  password: '',
  RH: getFormValue(user, ['RH', 'rh'], fallback.RH),
  facultad: getFormValue(user, ['facultad'], fallback.facultad),
  telefono: getFormValue(user, ['telefono'], fallback.telefono),
  imagen: getFormValue(user, ['imagen'], fallback.imagen),
  imagenQR: getFormValue(user, ['imagenQR'], fallback.imagenQR),
  rolAcademico: getFormValue(user, ['rolAcademico', 'rol'], fallback.rolAcademico),
  permisoSistema: getFormValue(user, ['permisoSistema'], fallback.permisoSistema),
  estado: getFormValue(user, ['estado'], fallback.estado),
  faceRegistered: hasOwn(user, 'faceRegistered') ? user.faceRegistered === true : fallback.faceRegistered,
  faceDescriptorUpdatedAt: getFormValue(user, ['faceDescriptorUpdatedAt'], fallback.faceDescriptorUpdatedAt),
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
  const canManageAccess = hasPermission(['Administrador', 'Celador']);

  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: DEFAULT_USERS_PAGE_SIZE,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);

  const [viewUser, setViewUser] = useState(null);
  const [showFaceCaptureModal, setShowFaceCaptureModal] = useState(false);
  const [faceFeedback, setFaceFeedback] = useState(null);

  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState({});
  const [editPasswordVisible, setEditPasswordVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regeneratingQr, setRegeneratingQr] = useState(false);
  const [showEditFaceCaptureModal, setShowEditFaceCaptureModal] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reactivatingId, setReactivatingId] = useState(null);
  const [togglingAccessId, setTogglingAccessId] = useState(null);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [permisoFilter, setPermisoFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const profileCardRef = useRef(null);
  const colorNormalizerRef = useRef(null);
  const loadUsersRequestIdRef = useRef(0);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadUsers = useCallback(async (page = 1) => {
    if (!token) return;

    const requestId = loadUsersRequestIdRef.current + 1;
    loadUsersRequestIdRef.current = requestId;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', DEFAULT_USERS_PAGE_SIZE);
      if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
      if (permisoFilter) params.set('permiso', permisoFilter);
      if (estadoFilter) params.set('estado', estadoFilter);
      params.set('includeVisitorTicket', 'true');

      const response = await apiRequest(`/users?${params.toString()}`, { token });
      const data = Array.isArray(response) ? response : response?.data || [];
      if (requestId !== loadUsersRequestIdRef.current) return;

      const pagination = response?.pagination || {};
      const limit = pagination.limit || DEFAULT_USERS_PAGE_SIZE;
      const total = pagination.total ?? data.length;
      const totalPages = pagination.totalPages || Math.max(1, Math.ceil(total / limit));
      const currentPage = pagination.page || page;

      setUsers(data);
      setUsersPagination({
        page: currentPage,
        totalPages,
        total,
        limit,
        hasMore: pagination.hasMore ?? currentPage < totalPages,
      });

    } catch (err) {
      if (requestId !== loadUsersRequestIdRef.current) return;
      const message = err.message || 'No fue posible obtener los usuarios';
      toast.error(message, { id: 'users-load-error' });
      setUsersPagination((prev) => ({ ...prev, hasMore: false }));
    } finally {
      if (requestId === loadUsersRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [debouncedSearchTerm, estadoFilter, permisoFilter, token]);

  useEffect(() => {
    loadUsers(1);
  }, [token, loadUsers]);

  useEffect(() => {
    if (!faceFeedback?.message) return undefined;

    const timeoutId = window.setTimeout(() => {
      setFaceFeedback(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [faceFeedback]);

  const paginationPages = useMemo(() => {
    const visiblePageCount = 5;
    let firstPage = Math.max(1, usersPagination.page - Math.floor(visiblePageCount / 2));
    const lastPage = Math.min(usersPagination.totalPages, firstPage + visiblePageCount - 1);
    firstPage = Math.max(1, lastPage - visiblePageCount + 1);
    return Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);
  }, [usersPagination.page, usersPagination.totalPages]);

  const hasActiveFilters = Boolean(searchTerm.trim() || permisoFilter || estadoFilter);
  const pageStart = usersPagination.total
    ? (usersPagination.page - 1) * usersPagination.limit + 1
    : 0;
  const pageEnd = Math.min(usersPagination.page * usersPagination.limit, usersPagination.total);
  const viewUserEstado = (viewUser?.estado || '').toLowerCase();
  const viewUserToggleId = viewUser?._id || viewUser?.id || viewUser?.cedula || null;
  const isViewUserBlocked = viewUserEstado === 'bloqueado';
  const isViewToggling = viewUserToggleId ? togglingAccessId === viewUserToggleId : false;
  const viewDocumentData = viewUser?.documentIdentity?.extractedData || {};
  const viewDocumentPhoto = resolveAssetUrl(viewUser?.documentIdentity?.photo || '');
  const viewDocumentBirthDate = viewDocumentData.fechaNacimiento
    ? formatShortDate(viewDocumentData.fechaNacimiento) || viewDocumentData.fechaNacimiento
    : null;
  const viewDocumentConsentAt = viewUser?.dataConsent?.acceptedAt
    ? formatShortDate(viewUser.dataConsent.acceptedAt)
    : null;
  const hasViewDocumentInfo =
    Boolean(viewDocumentPhoto) ||
    Boolean(viewDocumentData.cedula) ||
    Boolean(viewDocumentData.nombres) ||
    Boolean(viewDocumentData.apellidos) ||
    Boolean(viewDocumentBirthDate) ||
    Boolean(viewDocumentConsentAt);
  const isViewVisitor = (viewUser?.rolAcademico || '').toLowerCase() === 'visitante';
  const hasViewSecondaryContent = isViewVisitor || hasViewDocumentInfo;

  const updateUserCollections = useCallback((updatedUser) => {
    if (!updatedUser?._id) return;

    setUsers((prev) => prev.map((user) => (user._id === updatedUser._id ? { ...user, ...updatedUser } : user)));
    setViewUser((prev) => (prev && prev._id === updatedUser._id ? { ...prev, ...updatedUser } : prev));

    if (editUserId === updatedUser._id) {
      setEditForm((prev) => mapUserToForm(updatedUser, prev));
    }
  }, [editUserId]);

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setPermisoFilter('');
    setEstadoFilter('');
  };

  const handleUserPageChange = (page) => {
    if (loading || page < 1 || page > usersPagination.totalPages || page === usersPagination.page) return;
    loadUsers(page);
  };

  const openImagePreview = (src, alt = 'Imagen seleccionada') => {
    if (!src) return;
    setImagePreview({ src: resolveAssetUrl(src), alt });
  };

  const closeImagePreview = () => setImagePreview(null);

  const handleDownloadPreview = () => {
    if (!imagePreview?.src) return;

    const anchor = document.createElement('a');
    anchor.href = imagePreview.src;
    const safeName = viewUser?.cedula || viewUser?.nombre || 'documento';
    const isSvg = imagePreview.src.includes('image/svg+xml');
    anchor.download = `${safeName}-documento.${isSvg ? 'svg' : 'png'}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleExportUsers = () => {
    if (!users.length) {
      const message = 'No hay usuarios para exportar.';
      toast.error(message, { id: 'users-export-unavailable' });
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
    ]);

    const worksheet = XLSXUtils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(workbook, worksheet, 'Usuarios');
    writeXLSXFile(workbook, `directorio-usuarios-${Date.now()}.xlsx`);
    const message = `Pagina ${usersPagination.page} exportada correctamente.`;
    toast.success(message);
  };

  const handleViewUser = (user) => {
    setFaceFeedback(null);
    setShowFaceCaptureModal(false);
    setViewUser(user);
    if (user?._id && (!user.imagenQR || !user.documentIdentity?.photo)) {
      fetchUserDetail(user._id);
    }
  };

  const fetchUserDetail = useCallback(
    async (userId) => {
      if (!token || !userId) return null;
      try {
        const response = await apiRequest(`/users/${userId}/detail`, { token });
        const detail = response?.user || response;
        if (detail && detail._id) {
          updateUserCollections(detail);
        }
        return detail;
      } catch (err) {
        const message = err.message || 'No fue posible obtener el detalle del usuario';
        toast.error(message, { id: `user-detail-error-${userId}` });
        return null;
      }
    },
    [token, updateUserCollections]
  );


  const openEditModal = (user) => {
    setEditUserId(user._id);
    setEditForm(mapUserToForm(user));
    setEditErrors({});
    setEditPasswordVisible(false);
    setRegeneratingQr(false);
    setShowEditFaceCaptureModal(false);

    if (user?._id && !user.imagenQR) {
      fetchUserDetail(user._id).then((detail) => {
        if (detail?._id === user._id) {
          setEditForm((prev) => mapUserToForm(detail, prev));
        }
      });
    }
  };

  const closeEditModal = () => {
    setEditUserId(null);
    setEditForm(EMPTY_FORM);
    setEditErrors({});
    setSaving(false);
    setEditPasswordVisible(false);
    setRegeneratingQr(false);
    setShowEditFaceCaptureModal(false);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === 'cedula' || name === 'telefono') {
      nextValue = value.replace(/\D/g, '');
    }

    setEditForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    setEditErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
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
      setEditErrors((prev) => {
        if (!prev[name]) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } catch {
      setEditErrors((prev) => ({
        ...prev,
        [name]: 'No fue posible procesar la imagen seleccionada.',
      }));
    }
  };

  const removeImageField = (field) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: '',
    }));
    setEditErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const buildQrRawText = (data) => {
    const fullName = [data.nombre, data.apellido].filter(Boolean).join(' ').trim();
    const lines = [fullName, data.cedula, data.facultad, data.RH, data.telefono];
    return lines.filter(Boolean).join('\n\n');
  };

  const regenerateQrImage = async () => {
    if (!editForm.nombre.trim() || !editForm.cedula.trim()) {
      setEditErrors((prev) => ({
        ...prev,
        imagenQR: 'Completa el nombre y la cedula antes de regenerar el QR.',
      }));
      return;
    }

    try {
      setRegeneratingQr(true);
      setEditErrors((prev) => {
        if (!prev.imagenQR) return prev;
        const next = { ...prev };
        delete next.imagenQR;
        return next;
      });
      const rawText = buildQrRawText(editForm);
      const qrDataUrl = await QRCode.toDataURL(rawText, {
        width: 512,
        errorCorrectionLevel: 'M',
        margin: 1,
      });
      setEditForm((prev) => ({
        ...prev,
        imagenQR: qrDataUrl,
      }));
      const message = 'QR regenerado correctamente.';
      toast.success(message);
    } catch {
      const message = 'No fue posible regenerar el QR. Intenta nuevamente.';
      setEditErrors((prev) => ({
        ...prev,
        imagenQR: message,
      }));
      toast.error(message);
    } finally {
      setRegeneratingQr(false);
    }
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

  const buildUpdatePayload = async () => {
    const uploadedProfileImage = await uploadImageSource('profile', editForm.imagen, {
      token,
      fileName: `${editForm.cedula || editForm.nombre || 'usuario'}-perfil.jpg`,
    });
    const uploadedQrImage = await uploadImageSource('qr', editForm.imagenQR, {
      token,
      fileName: `${editForm.cedula || editForm.nombre || 'usuario'}-qr.png`,
    });

    const payload = {
      cedula: editForm.cedula.trim(),
      nombre: editForm.nombre.trim(),
      apellido: editForm.apellido.trim(),
      email: editForm.email.trim().toLowerCase(),
      RH: editForm.RH.trim().toUpperCase(),
      facultad: editForm.facultad.trim(),
      telefono: editForm.telefono.trim(),
      imagen: uploadedProfileImage,
      imagenQR: uploadedQrImage,
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

    try {
      const payload = await buildUpdatePayload();
      const response = await apiRequest(`/users/${editUserId}`, {
        method: 'PUT',
        token,
        data: payload,
      });

      const updatedUser = response.user || response.data || null;
      if (updatedUser) {
        updateUserCollections(updatedUser);
      }
      await loadUsers(usersPagination.page);

      const message = 'Usuario actualizado correctamente.';
      toast.success(message);
      closeEditModal();
    } catch (err) {
      const apiErrors = err.details?.errors;
      if (apiErrors && typeof apiErrors === 'object') {
        setEditErrors((prev) => ({ ...prev, ...apiErrors }));
      } else {
        const message = err.message || 'No fue posible actualizar el usuario.';
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      await apiRequest(`/users/${deleteTarget._id}`, {
        method: 'DELETE',
        token,
      });
      const nextPage = users.length === 1 && usersPagination.page > 1
        ? usersPagination.page - 1
        : usersPagination.page;

      if (viewUser?._id === deleteTarget._id) {
        setViewUser(null);
      }

      await loadUsers(nextPage);
      const message = 'Usuario eliminado correctamente.';
      toast.success(message);
      setDeleteTarget(null);
    } catch (err) {
      const message = err.message || 'No fue posible eliminar al usuario.';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleFaceEnrollSuccess = (data) => {
    const updatedUser = data?.user || null;
    if (updatedUser?._id) {
      updateUserCollections(updatedUser);
    }

    setFaceFeedback({
      type: 'success',
      message: 'Rostro registrado correctamente para este usuario.',
    });
    setShowFaceCaptureModal(false);
  };

  const handleEditFaceEnrollSuccess = (data) => {
    const updatedUser = data?.user || null;
    if (updatedUser?._id) {
      updateUserCollections(updatedUser);
    }

    setFaceFeedback({
      type: 'success',
      message: 'Rostro actualizado correctamente para este usuario.',
    });
    setShowEditFaceCaptureModal(false);
  };

  const handleFaceEnrollError = (faceError) => {
    const message = faceError?.details?.message || faceError?.message || 'No fue posible registrar el rostro.';
    setFaceFeedback({
      type: 'error',
      message,
    });
  };

  const handleEditFaceEnrollError = (faceError) => {
    const message = faceError?.details?.message || faceError?.message || 'No fue posible actualizar el rostro.';
    setFaceFeedback({
      type: 'error',
      message,
    });
  };

  const handleReactivateTicket = async (userId) => {
    if (!userId || reactivatingId) return;

    setReactivatingId(userId);

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

      const message = 'Ticket temporal reactivado correctamente.';
      toast.success(message);
    } catch (err) {
      const message = err.message || 'No fue posible reactivar el ticket temporal.';
      toast.error(message);
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

    try {
      const response = await apiRequest('/users/toggle-access', {
        method: 'POST',
        token,
        data: { cedula: targetUser.cedula },
      });

      const updatedUser = response?.user || null;
      const message = response?.message || 'Estado del usuario actualizado correctamente.';

      if (updatedUser && updatedUser._id) {
        updateUserCollections(updatedUser);

        if (viewUser?._id === updatedUser._id) {
          setViewUser(updatedUser);
        }

        if (editUserId === updatedUser._id) {
          setEditForm(mapUserToForm(updatedUser));
        }
      }
      const nextPage = users.length === 1 && usersPagination.page > 1
        ? usersPagination.page - 1
        : usersPagination.page;
      await loadUsers(nextPage);

      toast.success(message);
    } catch (error) {
      const message = error?.message || 'No fue posible actualizar el estado del usuario.';
      toast.error(message);
    } finally {
      setTogglingAccessId(null);
    }
  };

  const handleDownloadCard = async () => {
    if (!profileCardRef.current || !viewUser) return;
    setDownloadingCard(true);

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
      const message = 'Carnet descargado correctamente.';
      toast.success(message);
    } catch {
      const message = 'No fue posible descargar el carnet. Intentalo nuevamente.';
      toast.error(message);
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {isAdmin && (
              <Link
                to="/dashboard/staff/register"
                className="inline-flex items-center gap-2 rounded-lg bg-[#00594e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2"
              >
                Registrar usuario
              </Link>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={handleExportUsers}
                className="inline-flex items-center gap-2 rounded-lg border border-[#B5A160]/50 bg-white px-4 py-2 text-sm font-semibold text-[#8c7030] shadow-sm transition hover:bg-[#B5A160]/10 focus:outline-none focus:ring-2 focus:ring-[#B5A160] focus:ring-offset-2"
              >
                Exportar pagina
              </button>
            )}
          </div>
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


        <UserStatsCharts
          className="mt-6"
          users={users}
          loading={loading}
          permisoLabels={PERMISOS_SISTEMA}
          estadoLabels={ESTADOS}
          totalUsers={usersPagination.total}
          title="Distribucion de la pagina"
          description="Visualiza la composicion por permiso y estado de los usuarios visibles."
        />

        {loading ? (
          <p className="text-sm font-medium text-[#00594e]">Cargando usuarios...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {users.map((user) => {
              const isVisitor = (user.rolAcademico || '').toLowerCase() === 'visitante';
              const visitorTicketInfo = formatVisitorTicketInfo(user.visitorTicket);
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
              const documentPhoto = user.documentIdentity?.photo;
              const documentData = user.documentIdentity?.extractedData || {};
              const birthDate = documentData.fechaNacimiento
                ? formatShortDate(documentData.fechaNacimiento) || documentData.fechaNacimiento
                : null;
              const consentAcceptedAt = user.dataConsent?.acceptedAt
                ? formatShortDate(user.dataConsent.acceptedAt)
                : null;
              const hasDocumentCapture =
                Boolean(documentPhoto) ||
                Boolean(documentData.cedula) ||
                Boolean(documentData.nombres) ||
                Boolean(documentData.apellidos) ||
                Boolean(birthDate) ||
                Boolean(consentAcceptedAt);
              const iconBadges = [];

              if (isVisitor) {
                const isTicketActive = visitorTicketInfo.status === 'active';
                const TicketIcon = isTicketActive ? LuTicketCheck : LuTicketX;
                const ticketTitle = isTicketActive ? 'Ticket activo' : 'Ticket expirado';
                iconBadges.push(
                  <div
                    key={`${user._id}-ticket`}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 p-2"
                    title={ticketTitle}
                  >
                    <TicketIcon
                      className={`h-5 w-5 ${isTicketActive ? 'text-[#0f766e]' : 'text-[#b91c1c]'}`}
                    />
                  </div>
                );
              }

              if (hasDocumentCapture) {
                iconBadges.push(
                  <div
                    key={`${user._id}-document`}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 p-2"
                    title="Documento capturado"
                  >
                    <FaRegAddressCard className="h-5 w-5 text-[#0f172a]" />
                  </div>
                );
              }

              return (
                <div
                  key={user._id}
                  className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0f766e] hover:shadow-md"
                >
                <div className="flex items-center gap-4">
                  <img
                    src={resolveUserImage(user)}
                    alt={user.nombre || 'Usuario'}
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-14 rounded-full border border-slate-200 object-cover"
                  />
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-[#0f172a]">
                        {user.nombre} {user.apellido}
                      </span>
                      {iconBadges.length > 0 && (
                        <div className="ml-auto flex flex-wrap items-center gap-1">
                          {iconBadges}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-[#475569]">{user.email}</span>
                    <span className="text-xs font-semibold text-[#00594e]">{user.permisoSistema}</span>
                    <span className={`inline-block w-fit rounded-full border px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${estadoBadgeClasses}`}>
                      Estado: {estado}
                    </span>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
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

            {users.length === 0 && !loading && (
              <p className="text-sm text-[#475569]">
                {hasActiveFilters
                  ? 'No se encontraron usuarios que coincidan con los filtros aplicados.'
                  : 'No hay usuarios registrados actualmente. Utiliza el boton de registro para crear uno nuevo.'}
              </p>
            )}
          </div>
        )}

        <nav
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Paginacion del directorio de usuarios"
        >
          <span className="text-xs font-semibold text-[#64748b]">
            Mostrando {pageStart}-{pageEnd} de {usersPagination.total.toLocaleString('es-CO')} usuarios
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleUserPageChange(usersPagination.page - 1)}
              disabled={loading || usersPagination.page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#0f172a] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            {paginationPages.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => handleUserPageChange(page)}
                disabled={loading}
                aria-current={page === usersPagination.page ? 'page' : undefined}
                aria-label={`Ir a la pagina ${page}`}
                className={`h-9 min-w-9 rounded-lg px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  page === usersPagination.page
                    ? 'bg-[#00594e] text-white shadow-sm'
                    : 'border border-slate-200 text-[#0f172a] hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleUserPageChange(usersPagination.page + 1)}
              disabled={loading || usersPagination.page >= usersPagination.totalPages}
              className="rounded-lg bg-[#00594e] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#004037] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </nav>
      </div>

      {viewUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setViewUser(null)}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-[#0f172a]">Detalle del usuario</h3>
                  <p className="text-sm text-[#475569]">Informacion general del usuario y ticket temporal.</p>
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
                  {canManageAccess && (
                    <button
                      type="button"
                      onClick={() => {
                        if (viewUser?.faceRegistered) {
                          setFaceFeedback({
                            type: 'error',
                            message: 'Este usuario ya tiene un rostro registrado.',
                          });
                          return;
                        }
                        setFaceFeedback(null);
                        setShowFaceCaptureModal(true);
                      }}
                      disabled={Boolean(viewUser?.faceRegistered)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        viewUser?.faceRegistered
                          ? 'bg-slate-100 text-[#475569]'
                          : 'bg-[#B5A160]/20 text-[#8c7030] hover:bg-[#B5A160]/30'
                      }`}
                    >
                      {viewUser?.faceRegistered ? 'Rostro ya registrado' : 'Registrar rostro'}
                    </button>
                  )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowFaceCaptureModal(false);
                        setFaceFeedback(null);
                        setViewUser(null);
                      }}
                      className="rounded-full bg-[#b91c1c] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#991b1b]"
                    >
                      Cerrar
                  </button>
                </div>
              </div>
              {faceFeedback?.message && (
                <div
                  className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${
                    faceFeedback.type === 'error'
                      ? 'border-[#fecaca] bg-[#fee2e2] text-[#b91c1c]'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {faceFeedback.message}
                </div>
              )}
              <div
                className={clsx(
                  'mt-4 gap-6',
                  hasViewSecondaryContent ? 'grid lg:grid-cols-[1.25fr_0.85fr]' : 'flex justify-center'
                )}
              >
                <div className={clsx('space-y-4', !hasViewSecondaryContent && 'w-full max-w-lg')}>
                  <div ref={profileCardRef}>
                    <ProfileCard
                      user={viewUser}
                      variant="expanded"
                      onImageClick={(src, alt) => openImagePreview(src || viewUser?.imagen, alt)}
                      onQrClick={(src, alt) => openImagePreview(src, alt)}
                    />
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
                {hasViewSecondaryContent && (
                  <div className="space-y-4">
                    {isViewVisitor && (() => {
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
                    {hasViewDocumentInfo && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-[#0f172a]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">Documento capturado</p>
                      {viewDocumentPhoto ? (
                        <img
                          src={viewDocumentPhoto}
                          alt={viewUser?.nombre ? `Documento de ${viewUser.nombre}` : 'Documento capturado'}
                          loading="lazy"
                          decoding="async"
                          className="mt-3 h-44 w-full rounded-xl border border-slate-200 object-cover shadow-sm cursor-zoom-in"
                          onClick={() =>
                            openImagePreview(
                              viewDocumentPhoto,
                              viewUser?.nombre ? `Documento de ${viewUser.nombre}` : 'Documento capturado'
                            )
                          }
                        />
                      ) : (
                        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-[#475569]">
                          Sin fotografia registrada
                        </div>
                      )}
                      <dl className="mt-4 space-y-2 text-xs text-[#475569]">
                        <div className="flex justify-between gap-3">
                          <dt className="font-semibold uppercase tracking-wide text-[#0f766e]">Cedula</dt>
                          <dd className="text-right text-[#0f172a]">{viewDocumentData.cedula || 'No registrada'}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="font-semibold uppercase tracking-wide text-[#0f766e]">Nombres</dt>
                          <dd className="text-right text-[#0f172a]">{viewDocumentData.nombres || 'No registrado'}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="font-semibold uppercase tracking-wide text-[#0f766e]">Apellidos</dt>
                          <dd className="text-right text-[#0f172a]">{viewDocumentData.apellidos || 'No registrado'}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="font-semibold uppercase tracking-wide text-[#0f766e]">Nacimiento</dt>
                          <dd className="text-right text-[#0f172a]">{viewDocumentBirthDate || 'No registrado'}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="font-semibold uppercase tracking-wide text-[#0f766e]">Consentimiento</dt>
                          <dd className="text-right text-[#0f172a]">
                            {viewDocumentConsentAt || 'Sin registro'}
                          </dd>
                        </div>
                      </dl>
                      </div>
                    )}
                  </div>
                )}
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

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Facultad</span>
                  <select
                    name="facultad"
                    value={editForm.facultad}
                    onChange={handleEditChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70"
                  >
                    <option value="">Seleccione una facultad</option>
                    {FACULTADES.map((facultad) => (
                      <option key={facultad} value={facultad}>
                        {facultad}
                      </option>
                    ))}
                  </select>
                  {editErrors.facultad && (
                    <span className="text-xs font-medium text-[#b45309]">{editErrors.facultad}</span>
                  )}
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">RH</span>
                  <select
                    name="RH"
                    value={editForm.RH}
                    onChange={handleEditChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70"
                  >
                    <option value="">Selecciona el tipo de sangre</option>
                    {TIPOS_SANGRE.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                  {editErrors.RH && (
                    <span className="text-xs font-medium text-[#b45309]">{editErrors.RH}</span>
                  )}
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#00594e]">Rol academico</span>
                  <select
                    name="rolAcademico"
                    value={editForm.rolAcademico}
                    onChange={handleEditChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70"
                  >
                    <option value="">Selecciona un rol</option>
                    {ROLES_ACADEMICOS.map((rol) => (
                      <option key={rol} value={rol}>
                        {rol}
                      </option>
                    ))}
                  </select>
                  {editErrors.rolAcademico && (
                    <span className="text-xs font-medium text-[#b45309]">{editErrors.rolAcademico}</span>
                  )}
                </label>
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
                        <img src={resolveAssetUrl(editForm.imagen)} alt="Preview perfil" className="h-12 w-12 rounded-lg object-cover shadow-sm" />
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
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="edit-imagenQR"
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#B5A160]/40 bg-[#B5A160]/10 px-4 py-2 text-xs font-semibold text-[#8c7030] transition hover:bg-[#B5A160]/20"
                    >
                      Seleccionar archivo
                    </label>
                    <button
                      type="button"
                      onClick={regenerateQrImage}
                      disabled={regeneratingQr}
                      className="inline-flex items-center justify-center rounded-lg border border-[#00594e] px-4 py-2 text-xs font-semibold text-[#00594e] shadow-sm transition hover:bg-[#00594e]/10 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {regeneratingQr ? 'Regenerando...' : 'Regenerar QR'}
                    </button>
                    {editForm.imagenQR && (
                      <>
                        <img src={resolveAssetUrl(editForm.imagenQR)} alt="Preview QR" className="h-12 w-12 rounded-lg object-cover shadow-sm" />
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
                  {editErrors.imagenQR && (
                    <span className="text-xs font-medium text-[#b45309]">{editErrors.imagenQR}</span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0f766e]">Rostro del usuario</p>
                    <h3 className="mt-2 text-base font-semibold text-[#0f172a]">Actualizacion de embedding facial</h3>
                    <p className="mt-1 text-sm text-[#475569]">
                      Captura una nueva foto del rostro para forzar el re-enrolamiento y reemplazar el embedding actual.
                    </p>
                    {editForm.faceDescriptorUpdatedAt && (
                      <p className="mt-2 text-xs text-[#64748b]">
                        Ultima actualizacion facial:{' '}
                        {new Date(editForm.faceDescriptorUpdatedAt).toLocaleString('es-CO')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-3 sm:items-end">
                    <span
                      className={clsx(
                        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                        editForm.faceRegistered
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-[#475569]'
                      )}
                    >
                      {editForm.faceRegistered ? 'Rostro registrado' : 'Sin rostro registrado'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowEditFaceCaptureModal(true)}
                      disabled={!editUserId}
                      className="inline-flex items-center justify-center rounded-lg border border-[#0f766e]/30 bg-white px-4 py-2 text-sm font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {editForm.faceRegistered ? 'Actualizar rostro' : 'Capturar rostro'}
                    </button>
                  </div>
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

      {showFaceCaptureModal && viewUser && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 px-4"
          onClick={() => setShowFaceCaptureModal(false)}
        >
          <div className="w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#B5A160]">Registro facial</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0f172a]">Captura el rostro del usuario</h3>
                  <p className="mt-2 text-sm text-[#475569]">
                    Asegurate de que solo aparezca un rostro dentro del marco antes de capturar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFaceCaptureModal(false)}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[#0f172a] transition hover:bg-slate-200"
                >
                  Cerrar
                </button>
              </div>

              <FaceCapture
                mode="enroll"
                userId={viewUser._id}
                enableAutoBlink={false}
                onResult={handleFaceEnrollSuccess}
                onError={handleFaceEnrollError}
                onCancel={() => setShowFaceCaptureModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showEditFaceCaptureModal && editUserId && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 px-4"
          onClick={() => setShowEditFaceCaptureModal(false)}
        >
          <div className="w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#B5A160]">Re-enrolamiento facial</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0f172a]">Actualiza el rostro del usuario</h3>
                  <p className="mt-2 text-sm text-[#475569]">
                    Esta captura reemplazara el embedding facial actual del usuario para futuras validaciones.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditFaceCaptureModal(false)}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[#0f172a] transition hover:bg-slate-200"
                >
                  Cerrar
                </button>
              </div>

              <FaceCapture
                mode="enroll"
                userId={editUserId}
                enableAutoBlink={false}
                enrollOptions={{ force: true }}
                onResult={handleEditFaceEnrollSuccess}
                onError={handleEditFaceEnrollError}
                onCancel={() => setShowEditFaceCaptureModal(false)}
              />
            </div>
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

      {imagePreview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4"
          onClick={closeImagePreview}
        >
          <div
            className="relative w-full max-w-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeImagePreview}
              className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white transition hover:bg-black/80"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleDownloadPreview}
              className="absolute right-3 top-12 rounded-full bg-[#0f766e] px-3 py-1 text-xs font-semibold text-white shadow transition hover:bg-[#0d5d56]"
            >
              Descargar
            </button>
            <img
              src={imagePreview.src}
              alt={imagePreview.alt || 'Imagen seleccionada'}
              className="max-h-[85vh] w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default UserDirectory;

