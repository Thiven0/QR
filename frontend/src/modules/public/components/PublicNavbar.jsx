import { NavLink } from 'react-router-dom';
import escudoBlanco from '../../../img/escudo_blanco.png';

const PublicNavbar = () => (
  <header className="bg-white border-b border-slate-200">
    <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
      <NavLink to="/" className="flex items-center gap-3">
        <img src={escudoBlanco} className="h-9" alt="Unitrópico" />
        <span className="text-xl font-semibold text-[#0f172a]">Unitrópico</span>
      </NavLink>
      <nav className="hidden items-center gap-6 text-sm font-medium text-[#475569] sm:flex">
        <NavLink to="/" className="transition hover:text-[#00594e]">Inicio</NavLink>
        <a href="#beneficios" className="transition hover:text-[#00594e]">Beneficios</a>
        <a href="#soporte" className="transition hover:text-[#00594e]">Soporte</a>
      </nav>
    </div>
  </header>
);

export default PublicNavbar;
