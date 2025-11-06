import { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { NavLink, useLocation } from 'react-router-dom';
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
    'flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition',
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
      icon: (
        <svg
          className="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          aria-hidden="true"
        >
          <rect x="4" y="4" width="5" height="5" rx="1" />
          <rect x="15" y="4" width="5" height="5" rx="1" />
          <rect x="4" y="15" width="5" height="5" rx="1" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 7H13m2 5h3m-6-1v2m0 3v3m-3-7h2m5 4h2v4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 11h2v2h-2z" />
        </svg>
      ),
    },
    {
      to: '/dashboard/users/directory',
      label: 'Directorio',
      permissions: ['Administrador', 'Celador'],
      icon: (
        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5a3 3 0 1 1 5.657 1.5M20.25 6.75a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0ZM3 21v-.75A4.5 4.5 0 0 1 7.5 15.75h3A4.5 4.5 0 0 1 15 20.25V21m3.75-9a4.5 4.5 0 0 1 4.5 4.5V21" />
        </svg>
      ),
    },
    {
      to: '/dashboard/vehicles?view=list',
      label: 'Vehiculos',
      permissions: ['Administrador', 'Celador'],
      icon: (
        <svg
          className="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6.22 8.28a2 2 0 0 1 1.83-1.28h7.9a2 2 0 0 1 1.83 1.28l1.08 2.8c1.58.24 2.84 1.6 2.84 3.24v3.43a1.5 1.5 0 0 1-1.5 1.5h-1.13a2.5 2.5 0 0 1-4.94 0H9.27a2.5 2.5 0 0 1-4.94 0H3.2a1.5 1.5 0 0 1-1.5-1.5v-3.43c0-1.64 1.26-3 2.84-3.24l1.08-2.8ZM7.3 9.25l-.66 1.75h10.72l-.66-1.75a.5.5 0 0 0-.46-.32h-8.48a.5.5 0 0 0-.46.32ZM6.83 17.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm10.34 0a1.25 1.25 0 1 0 .01 2.5 1.25 1.25 0 0 0-.01-2.5Zm-8.17-3.5c0 .28.22.5.5.5h5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5h-5a.5.5 0 0 0-.5.5Z" />
        </svg>
      ),
      isActiveOverride: isVehiclesPath && currentVehicleView !== 'register',
    },
    {
      to: '/dashboard/vehicles?view=register',
      label: 'Registrar vehiculo',
      permissions: ['Administrador'],
      icon: (
        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
      isActiveOverride: isVehiclesPath && currentVehicleView === 'register',
    },
    {
      to: '/dashboard/statistics',
      label: 'Estadisticas',
      permissions: ['Administrador'],
      icon: (
        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7.5 15.75 11 11.25l3 3 4.5-6" />
        </svg>
      ),
    },
    {
      to: '/dashboard/records/history',
      label: 'Historial registros',
      permissions: ['Administrador', 'Celador'],
      icon: (
        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v18h16.5V6.75L15 3H3.75Zm6 5.25h7.5m-7.5 4.5h7.5m-7.5 4.5h7.5M6.75 8.25h.008v.008H6.75V8.25Zm0 4.5h.008v.008H6.75v-.008Zm0 4.5h.008v.008H6.75v-.008Z" />
        </svg>
      ),
    },
    {
      to: '/dashboard/staff/register',
      label: 'Registrar usuario',
      permissions: ['Administrador'],
      icon: (
        <svg className="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 18">
          <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z" />
        </svg>
      ),
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
    'fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 overflow-y-auto px-4 py-6 transition-transform duration-300',
    'sm:top-24 sm:h-[calc(100vh-6rem)] sm:rounded-r-3xl sm:shadow-2xl',
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
