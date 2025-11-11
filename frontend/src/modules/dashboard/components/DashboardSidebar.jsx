import { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { NavLink, useLocation } from 'react-router-dom';
import { FiFolder } from 'react-icons/fi';
import { IoMdAddCircle, IoIosWarning, IoMdAnalytics } from 'react-icons/io';
import { RiQrCodeFill } from 'react-icons/ri';
import { FaAddressBook } from 'react-icons/fa6';
import { AiFillCar } from 'react-icons/ai';
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
    container: 'bg-white/95 backdrop-blur border border-slate-200 shadow-xl',
    header: 'text-[#0f172a]',
    subtext: 'text-[#64748b]',
    closeButton: 'text-[#334155] hover:bg-[#e2f3ef]',
    toggleButton: 'text-[#334155] hover:bg-[#e2f3ef]',
    accentDot: 'bg-[#00594e]',
    handleButton: 'bg-white text-[#0f172a] border border-slate-200 hover:bg-[#e2f3ef]',
  },
  Celador: {
    container: 'bg-[#0a5f53]/95 backdrop-blur border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]',
    header: 'text-white',
    subtext: 'text-white/70',
    closeButton: 'text-white hover:bg-white/15',
    toggleButton: 'text-white hover:bg-white/15',
    accentDot: 'bg-[#f2c66d]',
    handleButton: 'bg-[#00594e] text-white border border-white/20 hover:bg-[#0a7567]',
  },
  Administrador: {
    container: 'bg-[#0a5d52]/95 backdrop-blur border border-[#f2c66d]/25 shadow-[0_26px_70px_rgba(7,60,52,0.55)]',
    header: 'text-[#fdf4d6]',
    subtext: 'text-[#f2c66d]/75',
    closeButton: 'text-[#fdf4d6] hover:bg-[#f2c66d]/20',
    toggleButton: 'text-[#fdf4d6] hover:bg-[#f2c66d]/20',
    accentDot: 'bg-[#f2c66d]',
    handleButton: 'bg-[#0b8a78] text-[#fdf4d6] border border-[#f2c66d]/40 hover:bg-[#0d9a85]',
  },
};

const buildLinkClasses = (isActive, palette) =>
  clsx(
    'flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] whitespace-nowrap transition sm:gap-3 sm:px-4 sm:py-2.5 sm:text-sm sm:tracking-[0.12em]',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-[#00594e]/20',
    isActive ? palette.active : palette.inactive
  );

const DashboardSidebar = ({ isOpen = false, onClose, onToggle }) => {
  const { hasPermission, user } = useAuth();
  const location = useLocation();

  const isVehiclesPath = location.pathname === '/dashboard/vehicles';
  const viewParams = new URLSearchParams(location.search);
  const currentVehicleView = isVehiclesPath && viewParams.get('view') === 'register' ? 'register' : 'list';

  const baseItems = [
    {
      to: '/dashboard/qr',
      label: 'Escanear QR',
      permissions: ['Administrador', 'Celador'],
      icon: <RiQrCodeFill className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden="true" />,
    },
    {
      to: '/dashboard/users/directory',
      label: 'Directorio',
      permissions: ['Administrador', 'Celador'],
      icon: <FaAddressBook className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden="true" />,
    },
    {
      to: '/dashboard/vehicles?view=list',
      label: 'Vehiculos',
      permissions: ['Administrador', 'Celador'],
      icon: <AiFillCar className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden="true" />,
      isActiveOverride: isVehiclesPath && currentVehicleView !== 'register',
    },
    {
      to: '/dashboard/alerts',
      label: 'Alertas',
      permissions: ['Administrador', 'Celador'],
      icon: <IoIosWarning className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden="true" />,
    },
    {
      to: '/dashboard/vehicles?view=register',
      label: 'Registrar vehiculo',
      permissions: ['Administrador'],
      icon: <IoMdAddCircle className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden="true" />,
      isActiveOverride: isVehiclesPath && currentVehicleView === 'register',
    },
    {
      to: '/dashboard/statistics',
      label: 'Estadisticas',
      permissions: ['Administrador'],
      icon: <IoMdAnalytics className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden="true" />,
    },
    {
      to: '/dashboard/records/history',
      label: 'Historial registros',
      permissions: ['Administrador', 'Celador'],
      icon: <GiArchiveRegister className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden="true" />,
    },
    {
      to: '/dashboard/staff/register',
      label: 'Registrar usuario',
      permissions: ['Administrador'],
      icon: <TiUserAdd className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden="true" />,
    },
  ];

  const visibleItems = baseItems.filter(({ permissions }) => hasPermission(permissions));

  const roleKey = user?.permisoSistema === 'Administrador' ? 'Administrador' : user?.permisoSistema === 'Celador' ? 'Celador' : 'default';
  const theme = useMemo(() => SHELL_THEMES[roleKey] ?? SHELL_THEMES.default, [roleKey]);
  const linkPalette = useMemo(() => LINK_THEMES[roleKey] ?? LINK_THEMES.default, [roleKey]);

  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const isDesktop = window.matchMedia('(min-width: 640px)').matches;
    if (isDesktop || !isOpen) {
      document.body.style.overflow = '';
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname;
      if (typeof window === 'undefined' || window.matchMedia('(max-width: 639px)').matches) {
        onClose?.();
      }
    }
  }, [location.pathname, onClose]);

  const sidebarClasses = clsx(
    'fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-72 overflow-y-auto px-4 py-6 transition-transform duration-300',
    'sm:top-24 sm:h-[calc(100vh-6rem)] sm:w-80 sm:rounded-r-3xl sm:shadow-2xl',
    theme.container,
    isOpen ? 'translate-x-0 pointer-events-auto sm:translate-x-0 sm:pointer-events-auto' : '-translate-x-full pointer-events-none sm:-translate-x-[calc(100%+1.5rem)] sm:pointer-events-none'
  );

  const closeButtonClasses = clsx('rounded-xl p-2 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent', theme.closeButton);
  const toggleButtonClasses = clsx(
    'hidden sm:inline-flex rounded-xl p-2 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent',
    theme.toggleButton
  );
  const headerTextClasses = clsx('text-xs font-semibold uppercase tracking-[0.35em]', theme.header);
  const headerDescriptionClasses = clsx('text-[0.65rem] font-medium uppercase tracking-[0.25em]', theme.subtext);
  const handleButtonClasses = clsx(
    'fixed top-28 left-3 z-20 hidden sm:flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent',
    theme.handleButton
  );

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches) return;
    onClose?.();
  };

  const handleOverlayClick = () => {
    onClose?.();
  };

  const handleToggleClick = () => {
    onToggle?.();
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-slate-900/35 backdrop-blur-[1px] sm:hidden"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}
      <aside id="dashboard-sidebar" className={sidebarClasses} aria-hidden={!isOpen}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className={clsx('inline-flex h-2 w-2 rounded-full', theme.accentDot)} />
              <span className={headerTextClasses}>Menu principal</span>
            </div>
            <p className={clsx('mt-2', headerDescriptionClasses)}>Accesos rapidos</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleOverlayClick} className={clsx(closeButtonClasses, 'sm:hidden')} aria-label="Cerrar menu">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleToggleClick}
              className={toggleButtonClasses}
              aria-label={isOpen ? 'Contraer panel lateral' : 'Expandir panel lateral'}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                {isOpen ? (
                  <path d="M12.293 5.293a1 1 0 0 1 1.414 1.414L11.414 9l2.293 2.293a1 1 0 0 1-1.414 1.414l-3-3a1 1 0 0 1 0-1.414l3-3Z" />
                ) : (
                  <path d="M7.707 5.293a1 1 0 0 0-1.414 1.414L8.586 9l-2.293 2.293a1 1 0 1 0 1.414 1.414l3-3a1 1 0 0 0 0-1.414l-3-3Z" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {visibleItems.map(({ to, label, icon, isActiveOverride }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => buildLinkClasses(isActiveOverride ?? isActive, linkPalette)}
              onClick={handleNavClick}
            >
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </aside>
      {!isOpen && (
        <button type="button" onClick={handleToggleClick} className={handleButtonClasses} aria-label="Expandir panel lateral">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M7.707 5.293a1 1 0 0 0-1.414 1.414L8.586 9l-2.293 2.293a1 1 0 1 0 1.414 1.414l3-3a1 1 0 0 0 0-1.414l-3-3Z" />
          </svg>
          Panel
        </button>
      )}
    </>
  );
};

export default DashboardSidebar;
