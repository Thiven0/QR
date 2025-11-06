import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../../auth/hooks/useAuth';
import escudoBlanco from '../../../img/escudo_blanco.png';
import defaultProfile from '../../../img/profileDefault.jpg';
import escudoColor from '../../../img/escudo.png';

const ROLE_THEMES = {
  default: {
    shell: 'bg-gradient-to-r from-white via-white/95 to-[#f1f5f9] backdrop-blur border-b border-slate-200 text-[#0f172a]',
    brandText: 'text-[#0f172a]',
    subText: 'text-[#64748b]',
    accentText: 'text-[#00594e]',
    badgeBg: 'bg-[#e2f3ef]',
    badgeText: 'text-[#00594e]',
    statusBg: 'bg-white/70',
    statusBorder: 'border-[#d1e6df]',
    statusText: 'text-[#475569]',
    menuButton: 'text-[#0f172a] hover:bg-[#e2f3ef] focus:ring-2 focus:ring-[#9ad7c8]',
    quickActionBg: 'bg-[#00594e]',
    quickActionText: 'text-white',
    quickActionHover: 'hover:bg-[#004037]',
    quickActionRing: 'focus:ring-[#94d0c1]/60 focus:ring-offset-[#f1f5f9]',
    avatarBg: 'bg-white/10',
    avatarBorder: 'border-[#0f172a]/15',
    avatarHover: 'hover:ring-2 hover:ring-[#0f172a]/20',
    avatarFocus: 'focus:ring-2 focus:ring-[#0f172a]/25',
    dropdownBg: 'bg-white/95 backdrop-blur',
    dropdownBorder: 'border-[#e2e8f0]',
    dropdownText: 'text-[#0f172a]',
    dropdownAccent: 'text-[#b91c1c]',
    dropdownHover: 'hover:bg-[#f1f5f9]',
    decorative: 'bg-gradient-to-br from-[#8EE1CE]/30 via-transparent to-transparent',
  },
  Celador: {
    shell: 'bg-gradient-to-r from-[#0a8b78] via-[#006d62] to-[#00594e] border-b border-[#00463f] text-white',
    brandText: 'text-white',
    subText: 'text-white/75',
    accentText: 'text-[#f2c66d]',
    badgeBg: 'bg-white/12',
    badgeText: 'text-white',
    statusBg: 'bg-white/12',
    statusBorder: 'border-white/15',
    statusText: 'text-white/80',
    menuButton: 'text-white hover:bg-white/10 focus:ring-2 focus:ring-white/30',
    quickActionBg: 'bg-[#f2c66d]',
    quickActionText: 'text-[#00594e]',
    quickActionHover: 'hover:bg-[#ddb056]',
    quickActionRing: 'focus:ring-white/30 focus:ring-offset-[#00594e]/40',
    avatarBg: 'bg-white/15',
    avatarBorder: 'border-white/60',
    avatarHover: 'hover:ring-2 hover:ring-white/40',
    avatarFocus: 'focus:ring-2 focus:ring-white/40',
    dropdownBg: 'bg-[#073c34]/95 backdrop-blur',
    dropdownBorder: 'border-[#f2c66d]/25',
    dropdownText: 'text-[#fdf4d6]',
    dropdownAccent: 'text-[#f2c66d]',
    dropdownHover: 'hover:bg-[#f2c66d]/20',
    decorative: 'bg-gradient-to-br from-[#f2c66d]/20 via-transparent to-transparent',
  },
  Administrador: {
    shell: 'bg-gradient-to-r from-[#0b8a78] via-[#006d62] to-[#004f45] border-b border-[#125f53] text-white',
    brandText: 'text-white',
    subText: 'text-[#f8ecc7]',
    accentText: 'text-[#f2c66d]',
    badgeBg: 'bg-[#f2c66d]/25',
    badgeText: 'text-[#fdf4d6]',
    statusBg: 'bg-[#f2c66d]/15',
    statusBorder: 'border-[#f2c66d]/30',
    statusText: 'text-[#fdf4d6]',
    menuButton: 'text-white hover:bg-white/10 focus:ring-2 focus:ring-[#f2c66d]/40',
    quickActionBg: 'bg-white/10',
    quickActionText: 'text-[#fdf4d6]',
    quickActionHover: 'hover:bg-[#f2c66d]/25',
    quickActionRing: 'focus:ring-[#f2c66d]/40 focus:ring-offset-[#00594e]/40',
    avatarBg: 'bg-[#f2c66d]/20',
    avatarBorder: 'border-[#f2c66d]/50',
    avatarHover: 'hover:ring-2 hover:ring-[#f2c66d]/45',
    avatarFocus: 'focus:ring-2 focus:ring-[#f2c66d]/45',
    dropdownBg: 'bg-[#073c34]/95 backdrop-blur',
    dropdownBorder: 'border-[#f2c66d]/25',
    dropdownText: 'text-[#fdf4d6]',
    dropdownAccent: 'text-[#f2c66d]',
    dropdownHover: 'hover:bg-[#f2c66d]/20',
    decorative: 'bg-gradient-to-br from-[#f2c66d]/35 via-transparent to-transparent',
  },
};

const DashboardNavbar = ({ onToggleSidebar = () => {}, isSidebarOpen = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const avatarButtonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isMenuOpen) return;
      const clickedAvatar = avatarButtonRef.current?.contains(event.target);
      const clickedMenu = menuRef.current?.contains(event.target);
      if (!clickedAvatar && !clickedMenu) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  const handleToggleMenu = () => {
    setIsMenuOpen((previous) => !previous);
  };

  const handleViewAccount = () => {
    setIsMenuOpen(false);
    navigate('/dashboard/profile');
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
  };

  const role = user?.permisoSistema;
  const theme = useMemo(() => ROLE_THEMES[role] ?? ROLE_THEMES.default, [role]);

  const logoSrc = role === 'Usuario' || !role ? escudoColor : escudoBlanco;
  const avatarImage = role === 'Usuario' || !role ? escudoColor : user?.imagen || defaultProfile;

  const navbarClasses = clsx('fixed top-0 z-40 w-full shadow-xl', 'transition-colors', 'duration-200', theme.shell);
  const menuButtonClasses = clsx(
    'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/0 sm:hidden transition focus:outline-none',
    theme.menuButton
  );
  const avatarButtonClasses = clsx(
    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border backdrop-blur-sm transition focus:outline-none',
    theme.avatarBg,
    theme.avatarBorder,
    theme.avatarHover,
    theme.avatarFocus
  );
  const nameClasses = clsx('truncate text-sm font-semibold sm:text-base', theme.brandText);
  const subTextClasses = clsx('truncate text-xs sm:text-sm', theme.subText);
  const roleBadgeClasses = clsx(
    'rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] shadow-sm',
    theme.badgeBg,
    theme.badgeText
  );
  const statusChipClasses = clsx(
    'flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-medium backdrop-blur-sm',
    theme.statusBg,
    theme.statusBorder,
    theme.statusText
  );
  const quickActionClasses = clsx(
    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2',
    theme.quickActionBg,
    theme.quickActionText,
    theme.quickActionHover,
    theme.quickActionRing
  );
  const dropdownClasses = clsx(
    'absolute right-0 mt-3 w-48 rounded-2xl border py-2 text-sm shadow-2xl focus:outline-none z-50',
    theme.dropdownBorder,
    theme.dropdownBg
  );

  const secondaryLabel = useMemo(() => {
    if (role === 'Administrador') return 'Administracion central';
    if (role === 'Celador') return 'Control de accesos';
    return 'Portal de visitantes';
  }, [role]);

  const quickAction = useMemo(() => {
    if (role === 'Administrador') return { label: 'Ver estadisticas', to: '/dashboard/statistics' };
    if (role === 'Celador') return { label: 'Escanear QR', to: '/dashboard/qr' };
    if (user) return { label: 'Mi perfil', to: '/dashboard/profile' };
    return null;
  }, [role, user]);

  const sessionLabel = user ? 'Sesion activa' : 'Sin sesion';
  const statusIndicatorClasses = user ? 'bg-current' : 'bg-current opacity-40';

  return (
    <nav className={navbarClasses}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={clsx('absolute -top-24 -right-20 h-56 w-56 rounded-full blur-3xl opacity-70', theme.decorative)} />
        <div className={clsx('absolute -bottom-28 -left-16 h-44 w-44 rounded-full blur-2xl opacity-70', theme.decorative)} />
      </div>
      <div className="relative z-10 px-4 py-4 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex items-center justify-between gap-3 lg:flex-1 lg:justify-start">
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-controls="dashboard-sidebar"
              aria-expanded={isSidebarOpen}
              className={menuButtonClasses}
              aria-label="Abrir menu lateral"
            >
              <svg className="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clipRule="evenodd"
                  fillRule="evenodd"
                  d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 1 1 0 1.5h-7.5A.75.75 0 0 1 2 15.25ZM2.75 9.25a.75.75 0 1 0 0 1.5h14.5a.75.75 0 0 0 0-1.5Z"
                />
              </svg>
            </button>
            <NavLink to="/dashboard" className="flex min-w-0 items-center gap-3" aria-label="Regresar al inicio del dashboard">
              <img src={logoSrc} className="h-10 w-10 flex-shrink-0 object-contain" alt="Unitropico Logo" />
              <div className="min-w-0">
                <p className={clsx('truncate text-lg font-semibold sm:text-xl', theme.brandText)}>Unitropico</p>
                <p className={clsx('truncate text-[0.65rem] font-semibold uppercase tracking-[0.35em] sm:text-xs', theme.subText)}>
                  {secondaryLabel}
                </p>
              </div>
            </NavLink>
          </div>

          <div className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-sm lg:flex-[0_0_auto]">
            <span className={roleBadgeClasses}>{role || 'Invitado'}</span>
            <div className={statusChipClasses}>
              <span className={clsx('inline-flex h-2 w-2 rounded-full', statusIndicatorClasses)} />
              <span>{sessionLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 lg:flex-1">
            {quickAction && (
              <button
                type="button"
                onClick={() => navigate(quickAction.to, { replace: false })}
                className={quickActionClasses}
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10.75 3a.75.75 0 0 0-1.5 0v6.25H3a.75.75 0 0 0 0 1.5h6.25V17a.75.75 0 0 0 1.5 0v-6.25H17a.75.75 0 0 0 0-1.5h-6.25V3Z" />
                </svg>
                {quickAction.label}
              </button>
            )}
            <div className="min-w-0 text-right">
              <p className={nameClasses}>{user?.nombre || 'Equipo de seguridad'}</p>
              <p className={subTextClasses}>{role || 'Sin permisos'}</p>
            </div>
            <div className="relative z-20 flex-shrink-0">
              <button
                ref={avatarButtonRef}
                type="button"
                onClick={handleToggleMenu}
                className={avatarButtonClasses}
              >
                <img
                  className="h-9 w-9 rounded-full object-cover"
                  src={avatarImage}
                  alt={user?.nombre || 'Perfil'}
                />
              </button>
              {isMenuOpen && (
                <div
                  ref={menuRef}
                  className={dropdownClasses}
                >
                  <button
                    type="button"
                    onClick={handleViewAccount}
                    className={clsx('mx-2 block w-[calc(100%-1rem)] rounded-xl px-4 py-2 text-left transition', theme.dropdownHover, theme.dropdownText)}
                  >
                    Ver cuenta
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={clsx('mx-2 mt-1 block w-[calc(100%-1rem)] rounded-xl px-4 py-2 text-left transition', theme.dropdownHover, theme.dropdownAccent)}
                  >
                    Cerrar sesion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;
