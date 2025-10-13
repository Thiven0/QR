import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../../auth/hooks/useAuth';
import escudoBlanco from '../../../img/escudo_blanco.png';
import defaultProfile from '../../../img/profileDefault.jpg';

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

  return (
    <nav className="fixed top-0 z-50 w-full bg-white drop-shadow-md border-b border-slate-200">
      <div className="px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-drawer-target="logo-sidebar"
              data-drawer-toggle="logo-sidebar"
              aria-controls="logo-sidebar"
              className="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <span className="sr-only">Abrir menu lateral</span>
              <svg className="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clipRule="evenodd"
                  fillRule="evenodd"
                  d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 1 1 0 1.5h-7.5A.75.75 0 0 1 2 15.25ZM2.75 9.25a.75.75 0 1 0 0 1.5h14.5a.75.75 0 0 0 0-1.5Z"
                />
              </svg>
            </button>
            <NavLink to="/dashboard" className="flex items-center gap-3">
              <img src={escudoBlanco} className="h-8" alt="Unitropico Logo" />
              <span className="text-xl font-semibold text-[#0f172a]">Unitropico | Dashboard</span>
            </NavLink>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-[#0f172a]">{user?.nombre || 'Equipo de seguridad'}</p>
              <p className="text-xs text-[#64748b]">{user?.permisoSistema || 'Sin permisos'}</p>
            </div>
            <div className="relative">
              <button
                ref={avatarButtonRef}
                type="button"
                onClick={handleToggleMenu}
                className="flex items-center justify-center rounded-full border border-[#00594e]/60 transition hover:ring-2 hover:ring-[#00594e]/30 focus:outline-none focus:ring-2 focus:ring-[#00594e]/50"
              >
                <img
                  className="w-9 h-9 rounded-full object-cover"
                  src={user?.imagen || defaultProfile}
                  alt={user?.nombre || 'Perfil'}
                />
              </button>
              {isMenuOpen && (
                <div
                  ref={menuRef}
                  className="absolute right-0 mt-2 w-40 rounded-lg border border-slate-200 bg-white py-2 text-sm shadow-lg"
                >
                  <button
                    type="button"
                    onClick={handleViewAccount}
                    className="block w-full px-4 py-2 text-left text-[#0f172a] transition hover:bg-[#f1f5f9]"
                  >
                    Ver cuenta
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-[#b91c1c] transition hover:bg-[#fef2f2]"
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
