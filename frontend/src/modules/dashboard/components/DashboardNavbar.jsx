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

const TRACKED_SESSION_ROLES = ['Administrador', 'Celador'];

const DashboardNavbar = () => {
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
  const avatarImage = user?.imagen || (role === 'Usuario' || !role ? escudoColor : defaultProfile);

  const navbarClasses = clsx('fixed top-0 z-40 w-full shadow-xl', 'transition-colors', 'duration-200', theme.shell);
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
    'rounded-full px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] shadow-sm sm:px-4 sm:text-xs sm:tracking-[0.3em]',
    theme.badgeBg,
    theme.badgeText
  );
  const statusChipClasses = clsx(
    'flex items-center gap-2 rounded-full px-3 py-1 text-[0.6rem] font-medium backdrop-blur-sm sm:px-4 sm:text-xs',
    theme.statusBg,
    theme.statusText
  );
  const statusGroupWrapperClasses = clsx(
    'hidden sm:flex sm:flex-1 sm:items-center sm:justify-center lg:flex-[0_0_auto]'
  );
  const statusGroupClasses = clsx(
    'flex flex-col items-center justify-center gap-2 px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.12em] sm:flex-row sm:px-4 sm:text-xs sm:tracking-[0.3em]',
    'bg-transparent',
    role === 'Usuario' || !role ? 'text-[#0f172a]' : 'text-white'
  );
  const quickActionClasses = clsx(
    'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 sm:px-4 sm:py-2 sm:text-sm',
    theme.quickActionBg,
    theme.quickActionText,
    theme.quickActionHover,
    theme.quickActionRing
  );
  const quickActionMobileClasses = clsx(
    'inline-flex items-center justify-center rounded-full p-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 sm:hidden',
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
    if (role === 'Celador') return { label: 'Escanear QR', to: '/dashboard/qr' };
    return null;
  }, [role]);

  const sessionStatus = useMemo(() => {
    if (!user) {
      return { label: 'Sin sesion', tone: 'muted' };
    }

    const normalizedEstado = (user.estado || '').toLowerCase();
    const isActive = normalizedEstado === 'activo';

    if (!TRACKED_SESSION_ROLES.includes(role)) {
      return isActive
        ? { label: 'Sesion activa', tone: 'active' }
        : { label: 'Sesion inactiva', tone: 'idle' };
    }

    return isActive
      ? { label: 'Sesion activa', tone: 'active' }
      : { label: 'Sesion inactiva', tone: 'idle' };
  }, [role, user]);

  const sessionLabel = sessionStatus.label;
  const statusIndicatorClasses = clsx(
    'inline-flex h-2 w-2 rounded-full transition',
    sessionStatus.tone === 'active' && 'bg-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.8)]',
    sessionStatus.tone === 'idle' && 'bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.8)]',
    sessionStatus.tone === 'muted' && 'bg-white/40'
  );

  return (
    <nav className={navbarClasses}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={clsx('absolute -top-24 -right-20 h-56 w-56 rounded-full blur-3xl opacity-70', theme.decorative)} />
        <div className={clsx('absolute -bottom-28 -left-16 h-44 w-44 rounded-full blur-2xl opacity-70', theme.decorative)} />
      </div>
      <div className="relative z-10 px-4 py-3 sm:px-8 sm:py-4">
        <div className="flex flex-nowrap items-center justify-between gap-2 sm:gap-4 lg:gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <NavLink to="/dashboard" className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label="Regresar al inicio del dashboard">
              <img src={logoSrc} className="h-9 w-9 flex-shrink-0 object-contain sm:h-10 sm:w-10" alt="Unitropico Logo" />
              <div className="min-w-0">
                <p className={clsx('truncate text-base font-semibold sm:text-xl', theme.brandText)}>Unitropico</p>
                <p className={clsx('truncate text-[0.55rem] font-semibold uppercase tracking-[0.3em] sm:text-xs', theme.subText)}>
                  {secondaryLabel}
                </p>
              </div>
            </NavLink>
          </div>
          <div className={statusGroupWrapperClasses}>
            <div className={statusGroupClasses}>
              <span className={roleBadgeClasses}>{role || 'Invitado'}</span>
              <div className={statusChipClasses}>
                <span className={statusIndicatorClasses} />
                <span>{sessionLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            {quickAction && (
              <>
                <button
                  type="button"
                  onClick={() => navigate(quickAction.to, { replace: false })}
                  className={quickActionMobileClasses}
                  aria-label={quickAction.label}
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10.75 3a.75.75 0 0 0-1.5 0v6.25H3a.75.75 0 0 0 0 1.5h6.25V17a.75.75 0 0 0 1.5 0v-6.25H17a.75.75 0 0 0 0-1.5h-6.25V3Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(quickAction.to, { replace: false })}
                  className={clsx(quickActionClasses, 'hidden sm:inline-flex')}
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10.75 3a.75.75 0 0 0-1.5 0v6.25H3a.75.75 0 0 0 0 1.5h6.25V17a.75.75 0 0 0 1.5 0v-6.25H17a.75.75 0 0 0 0-1.5h-6.25V3Z" />
                  </svg>
                  {quickAction.label}
                </button>
              </>
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
