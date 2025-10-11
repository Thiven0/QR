import { NavLink } from 'react-router-dom';
import useAuth from '../../auth/hooks/useAuth';

const navItems = [
  {
    to: '/dashboard',
    label: 'Inicio',
    permissions: [],
    icon: (
      <svg className="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M4.5 10.5V21h15V10.5" />
      </svg>
    ),
  },
  {
    to: '/dashboard/qr',
    label: 'Escanear QR',
    permissions: ['Administrador', 'Celador'],
    icon: (
      <svg className="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 2a1 1 0 0 0-1 1v3a1 1 0 1 1-2 0V3a3 3 0 0 1 3-3h3a1 1 0 0 1 0 2H3Zm6 16H6a3 3 0 0 1-3-3v-3a1 1 0 0 1 2 0v3a1 1 0 0 0 1 1h3a1 1 0 1 1 0 2Zm8-18h-3a1 1 0 1 0 0 2h3a1 1 0 0 1 1 1v3a1 1 0 1 0 2 0V3a3 3 0 0 0-3-3ZM20 14a1 1 0 0 0-2 0v2h-2v-4h-2v4h-2v2h4v2h2v-2h2v-4Zm-9-8H9v2h2V6Z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/users/register',
    label: 'Registrar visitante',
    permissions: ['Administrador', 'Celador'],
    icon: (
      <svg className="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
        <path d="M14 2a3.963 3.963 0 0 0-1.4.267 6.439 6.439 0 0 1-1.331 6.638A4 4 0 1 0 14 2Zm1 9h-1.264A6.957 6.957 0 0 1 15 15v2a2.97 2.97 0 0 1-.184 1H19a1 1 0 0 0 1-1v-1a5.006 5.006 0 0 0-5-5ZM6.5 9a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM8 10H5a5.006 5.006 0 0 0-5 5v2a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2a5.006 5.006 0 0 0-5-5Z" />
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
    label: 'Registrar celador',
    permissions: ['Administrador'],
    icon: (
      <svg className="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 18">
        <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z" />
      </svg>
    ),
  },
];

const linkClasses = (isActive) => {
  return (
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ' +
    (isActive ? 'bg-[#00594e] text-white shadow-sm' : 'text-[#334155] hover:bg-[#00594e]/10 hover:text-[#00594e]')
  );
};

const DashboardSidebar = () => {
  const { hasPermission } = useAuth();

  const visibleItems = navItems.filter(({ permissions }) => hasPermission(permissions));

  return (
    <aside className="fixed top-16 left-0 z-40 hidden h-[calc(100vh-4rem)] w-64 overflow-y-auto border-r border-slate-200 bg-white px-3 py-6 shadow-sm sm:block">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-widest text-[#99a1af]">Navegación</p>
          <nav className="mt-3 flex flex-col gap-1">
            {visibleItems.map(({ to, label, icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => linkClasses(isActive)}>
                {icon}
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
