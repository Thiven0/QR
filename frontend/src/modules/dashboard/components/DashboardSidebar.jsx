import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiLogOut, FiUser, FiX } from 'react-icons/fi';
import { IoIosWarning, IoMdAnalytics } from 'react-icons/io';
import { MdDashboard } from 'react-icons/md';
import { RiQrCodeFill } from 'react-icons/ri';
import { FaAddressBook } from 'react-icons/fa6';
import { GiArchiveRegister } from 'react-icons/gi';
import { TiUserAdd } from 'react-icons/ti';
import useAuth from '../../auth/hooks/useAuth';

const LINK_THEMES = {
  default: {
    active: 'bg-[#00594e] text-white shadow-md',
    inactive: 'text-[#334155] hover:bg-[#00594e]/10 hover:text-[#00594e]',
  },
  Celador: {
    active: 'bg-white/15 text-white shadow-lg',
    inactive: 'text-white/75 hover:bg-white/10 hover:text-white',
  },
  Administrador: {
    active: 'bg-[#f2c66d]/20 text-[#fdf4d6] shadow-lg',
    inactive: 'text-[#fdf4d6]/75 hover:bg-[#f2c66d]/15 hover:text-[#fdf4d6]',
  },
};

const SHELL_THEMES = {
  default: {
    container: 'bg-white/95 backdrop-blur border-slate-200 shadow-xl',
    header: 'text-[#0f172a]',
    subtext: 'text-[#64748b]',
    button: 'text-[#334155] hover:bg-[#e2f3ef]',
    accentDot: 'bg-[#00594e]',
    divider: 'border-slate-200',
    tooltip: 'border-slate-200 bg-white text-[#0f172a]',
  },
  Celador: {
    container: 'bg-[#0a5f53]/95 backdrop-blur border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]',
    header: 'text-white',
    subtext: 'text-white/70',
    button: 'text-white hover:bg-white/15',
    accentDot: 'bg-[#f2c66d]',
    divider: 'border-white/10',
    tooltip: 'border-white/10 bg-[#073c34] text-white',
  },
  Administrador: {
    container: 'bg-[#0a5d52]/95 backdrop-blur border-[#f2c66d]/25 shadow-[0_26px_70px_rgba(7,60,52,0.45)]',
    header: 'text-[#fdf4d6]',
    subtext: 'text-[#f2c66d]/75',
    button: 'text-[#fdf4d6] hover:bg-[#f2c66d]/20',
    accentDot: 'bg-[#f2c66d]',
    divider: 'border-[#f2c66d]/20',
    tooltip: 'border-[#f2c66d]/25 bg-[#073c34] text-[#fdf4d6]',
  },
};

const DashboardSidebar = ({
  isMobileOpen = false,
  isCollapsed = false,
  onMobileClose,
  onCollapseToggle,
}) => {
  const { hasPermission, logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const previousPathRef = useRef(location.pathname);
  const profileMenuRef = useRef(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
  );

  const roleKey = user?.permisoSistema === 'Administrador'
    ? 'Administrador'
    : user?.permisoSistema === 'Celador'
      ? 'Celador'
      : 'default';
  const theme = useMemo(() => SHELL_THEMES[roleKey] ?? SHELL_THEMES.default, [roleKey]);
  const linkPalette = useMemo(() => LINK_THEMES[roleKey] ?? LINK_THEMES.default, [roleKey]);

  const baseItems = [
    {
      to: '/dashboard',
      label: 'Inicio',
      permissions: ['Administrador', 'Celador'],
      end: true,
      icon: MdDashboard,
    },
    {
      to: '/dashboard/qr',
      label: 'Escanear',
      permissions: ['Administrador', 'Celador'],
      icon: RiQrCodeFill,
    },
    {
      to: '/dashboard/users/directory',
      label: 'Directorio',
      permissions: ['Administrador', 'Celador'],
      icon: FaAddressBook,
    },
    {
      to: '/dashboard/alerts',
      label: 'Alertas',
      permissions: ['Administrador', 'Celador'],
      icon: IoIosWarning,
    },
    {
      to: '/dashboard/statistics',
      label: 'Estadisticas',
      permissions: ['Administrador'],
      icon: IoMdAnalytics,
    },
    {
      to: '/dashboard/records/history',
      label: 'Historial registros',
      permissions: ['Administrador', 'Celador'],
      icon: GiArchiveRegister,
    },
    {
      to: '/dashboard/staff/register',
      label: 'Registrar usuario',
      permissions: ['Administrador'],
      icon: TiUserAdd,
    },
  ];

  const visibleItems = baseItems.filter(({ permissions }) => hasPermission(permissions));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event) => setIsDesktop(event.matches);
    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isDesktop || !isMobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDesktop, isMobileOpen]);

  useEffect(() => {
    if (isDesktop || !isMobileOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') onMobileClose?.();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isDesktop, isMobileOpen, onMobileClose]);

  useEffect(() => {
    if (previousPathRef.current === location.pathname) return;
    previousPathRef.current = location.pathname;
    setIsProfileMenuOpen(false);
    if (!isDesktop) onMobileClose?.();
  }, [isDesktop, location.pathname, onMobileClose]);

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined;
    const handleDismiss = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'mousedown' && profileMenuRef.current?.contains(event.target)) return;
      setIsProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleDismiss);
    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleDismiss);
    };
  }, [isProfileMenuOpen]);

  const sidebarClasses = clsx(
    'fixed bottom-0 left-0 top-16 z-30 flex w-[min(18rem,calc(100vw-2rem))] flex-col border-r px-3 py-4 shadow-2xl',
    'overflow-y-auto transition-[width,transform,padding] duration-300 ease-out sm:top-[72px] lg:overflow-visible lg:rounded-none',
    theme.container,
    isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    isCollapsed ? 'lg:w-20 lg:px-2' : 'lg:w-72 lg:px-3'
  );
  const isHiddenForAssistiveTechnology = !isDesktop && !isMobileOpen;
  const buttonClasses = clsx(
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition focus:outline-none focus:ring-2 focus:ring-current/30',
    theme.button
  );

  return (
    <>
      {isMobileOpen && !isDesktop && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
          onClick={onMobileClose}
          aria-label="Cerrar menu principal"
        />
      )}

      <aside
        id="dashboard-sidebar"
        className={sidebarClasses}
        aria-label="Menu principal"
        aria-hidden={isHiddenForAssistiveTechnology}
        {...(isHiddenForAssistiveTechnology ? { inert: '' } : {})}
      >
        <div className={clsx('flex min-h-12 items-center gap-2', isCollapsed ? 'lg:justify-center' : 'justify-between')}>
          <div className={clsx('min-w-0', isCollapsed && 'lg:hidden')}>
            <div className="flex items-center gap-3">
              <span className={clsx('inline-flex h-2 w-2 shrink-0 rounded-full', theme.accentDot)} />
              <span className={clsx('truncate text-xs font-semibold uppercase tracking-[0.28em]', theme.header)}>
                Menu principal
              </span>
            </div>
            <p className={clsx('mt-1 pl-5 text-[0.65rem] font-medium uppercase tracking-[0.2em]', theme.subtext)}>
              Navegacion
            </p>
          </div>

          <button
            type="button"
            onClick={onMobileClose}
            className={clsx(buttonClasses, 'lg:hidden')}
            aria-label="Cerrar menu principal"
          >
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onCollapseToggle}
            className={clsx(buttonClasses, 'hidden lg:inline-flex')}
            aria-label={isCollapsed ? 'Expandir menu lateral' : 'Contraer menu lateral'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <FiChevronRight className="h-5 w-5" aria-hidden="true" />
            ) : (
              <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className={clsx('my-4 border-t', theme.divider)} />

        <nav className="flex min-h-0 flex-1 flex-col gap-1.5" aria-label="Secciones del dashboard">
          {visibleItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => {
                if (!isDesktop) onMobileClose?.();
              }}
              title={isDesktop && isCollapsed ? label : undefined}
              className={({ isActive }) =>
                clsx(
                  'group relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition',
                  'focus:outline-none focus:ring-2 focus:ring-current/30',
                  isCollapsed && 'lg:justify-center lg:px-0',
                  isActive ? linkPalette.active : linkPalette.inactive
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className={clsx('truncate', isCollapsed && 'lg:sr-only')}>{label}</span>
              {isCollapsed && (
                <span
                  aria-hidden="true"
                  className={clsx(
                    'pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold shadow-xl',
                    'lg:group-hover:block lg:group-focus-visible:block',
                    theme.tooltip
                  )}
                >
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div ref={profileMenuRef} className={clsx('relative mt-4 hidden border-t pt-4 lg:block', theme.divider)}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((previous) => !previous)}
            className={clsx(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-current/30',
              theme.button,
              isCollapsed && 'lg:justify-center lg:px-0'
            )}
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
            aria-label="Abrir menu de perfil"
          >
            <span className={clsx('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold', theme.accentDot, roleKey === 'default' ? 'text-white' : 'text-[#073c34]')}>
              {(user?.nombre || user?.permisoSistema || 'U').charAt(0).toUpperCase()}
            </span>
            <div className={clsx('min-w-0', isCollapsed && 'lg:hidden')}>
              <p className={clsx('truncate text-xs font-semibold', theme.header)}>{user?.nombre || 'Usuario'}</p>
              <p className={clsx('truncate text-[0.65rem]', theme.subtext)}>{user?.permisoSistema || 'Sin rol'}</p>
            </div>
          </button>

          {isProfileMenuOpen && (
            <div
              role="menu"
              className={clsx(
                'absolute bottom-[calc(100%+0.5rem)] z-50 w-52 rounded-xl border p-2 shadow-2xl',
                isCollapsed ? 'left-[calc(100%+0.75rem)]' : 'inset-x-0 w-auto',
                theme.tooltip
              )}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => navigate('/dashboard/profile')}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-current/30"
              >
                <FiUser className="h-4 w-4" aria-hidden="true" />
                Ver cuenta
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                <FiLogOut className="h-4 w-4" aria-hidden="true" />
                Cerrar sesion
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
