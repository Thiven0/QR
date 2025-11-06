import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import escudoBlanco from '../../../img/escudo_blanco.png';

const externalLinks = [
  {
    href: 'https://www.unitropico.edu.co/',
    label: 'Pagina oficial',
  },
  {
    href: 'https://site4.q10.com/SolicitudesInstitucionales/NuevaSolicitud?aplentId=ab13c2e5-c1d3-4095-a82e-1f999579b282',
    label: 'Solicitudes academicas',
  },
  {
    href: 'https://site4.q10.com/SolicitudesInstitucionales/ConsultarSolicitud?aplentId=ab13c2e5-c1d3-4095-a82e-1f999579b282',
    label: 'Consultar solicitudes',
  },
];

const socialLinks = [
  {
    href: 'https://www.instagram.com/unitropicooficial/',
    label: 'Instagram',
    Icon: FaInstagram,
  },
  {
    href: 'https://www.facebook.com/unitropico.edu.co/',
    label: 'Facebook',
    Icon: FaFacebook,
  },
  {
    href: 'https://www.youtube.com/channel/UCfUDc2juc_RXEXwWiCfN4IA',
    label: 'YouTube',
    Icon: FaYoutube,
  },
];

const PublicNavbar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const toggleMenu = () => {
    setIsMenuOpen((previous) => !previous);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const menuVisibility = isMenuOpen ? 'flex' : 'hidden';
  const mobileMenuDecorators = isMenuOpen ? 'border-t border-slate-200 pt-3' : '';

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:flex-nowrap sm:px-6">
        <div className="flex w-full items-center justify-between sm:w-auto">
          <NavLink to="/" className="flex items-center gap-3" aria-label="Ir al inicio" onClick={closeMenu}>
            <img src={escudoBlanco} className="h-9" alt="Unitropico" />
            <span className="text-xl font-semibold text-[#0f172a]">Unitropico</span>
          </NavLink>
          <button
            type="button"
            onClick={toggleMenu}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-[#0f172a] transition hover:bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#00594e] sm:hidden"
            aria-controls="public-navbar"
            aria-expanded={isMenuOpen}
          >
            <span className="sr-only">Abrir menu</span>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <nav
          id="public-navbar"
          aria-label="Navegacion principal"
          className={`${menuVisibility} ${mobileMenuDecorators} flex w-full flex-col gap-3 text-sm font-medium text-[#475569] sm:flex sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-5 sm:border-0 sm:pt-0`}
        >
          {externalLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-[#00594e]"
              onClick={closeMenu}
            >
              {label}
            </a>
          ))}

          <div className="flex flex-wrap items-center gap-3 text-[#475569]">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Redes</span>
            {socialLinks.map(({ href, label, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${label} Unitropico`}
                className="inline-flex items-center gap-1 transition hover:text-[#00594e]"
                onClick={closeMenu}
              >
                <Icon aria-hidden="true" />
                <span className="text-xs sm:hidden">{label}</span>
              </a>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default PublicNavbar;
