import React from 'react'
import { NavLink } from 'react-router-dom'

const navItems = [
  {
    to: '/guard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 22 21">
        <path d="M16.975 11H10V4.025a1 1 0 0 0-1.066-.998 8.5 8.5 0 1 0 9.039 9.039.999.999 0 0 0-1-1.066h.002Z" />
        <path d="M12.5 0c-.157 0-.311.01-.565.027A1 1 0 0 0 11 1.02V10h8.975a1 1 0 0 0 1-.935c.013-.188.028-.374.028-.565A8.51 8.51 0 0 0 12.5 0Z" />
      </svg>
    )
  },
  {
    to: '/guard/register',
    label: 'Registrar celador',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 18">
        <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z" />
      </svg>
    )
  },
  {
    to: '/guard/qr',
    label: 'Escanear QR',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 2a1 1 0 0 0-1 1v3a1 1 0 1 1-2 0V3a3 3 0 0 1 3-3h3a1 1 0 0 1 0 2H3Zm6 16H6a3 3 0 0 1-3-3v-3a1 1 0 0 1 2 0v3a1 1 0 0 0 1 1h3a1 1 0 1 1 0 2Zm8-18h-3a1 1 0 1 0 0 2h3a1 1 0 0 1 1 1v3a1 1 0 1 0 2 0V3a3 3 0 0 0-3-3ZM20 14a1 1 0 0 0-2 0v2h-2v-4h-2v4h-2v2h4v2h2v-2h2v-4Zm-9-8H9v2h2V6Z" />
      </svg>
    )
  },
  {
    to: '/user/register',
    label: 'Registrar visitante',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
        <path d="M14 2a3.963 3.963 0 0 0-1.4.267 6.439 6.439 0 0 1-1.331 6.638A4 4 0 1 0 14 2Zm1 9h-1.264A6.957 6.957 0 0 1 15 15v2a2.97 2.97 0 0 1-.184 1H19a1 1 0 0 0 1-1v-1a5.006 5.006 0 0 0-5-5ZM6.5 9a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM8 10H5a5.006 5.006 0 0 0-5 5v2a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2a5.006 5.006 0 0 0-5-5Z" />
      </svg>
    )
  }
]

const navLinkClasses = (isActive) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-[#00594e] text-white shadow-sm'
      : 'text-[#334155] hover:bg-[#00594e]/10 hover:text-[#00594e]'
  }`

const SideBarGuard = () => {
  return (
    <aside className="fixed top-16 left-0 z-40 hidden h-[calc(100vh-4rem)] w-64 overflow-y-auto border-r border-slate-200 bg-white px-3 py-6 shadow-sm sm:block">
      <div className="space-y-8">
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-widest text-[#99a1af]">Principal</p>
          <nav className="mt-3 flex flex-col gap-1">
            {navItems.map(({ to, label, icon }) => (
              <NavLink key={label} to={to} className={({ isActive }) => navLinkClasses(isActive)}>
                {icon}
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="rounded-lg border border-[#00594e]/20 bg-[#00594e]/5 p-4">
          <p className="text-sm font-semibold text-[#00594e]">Bitácora del turno</p>
          <p className="mt-2 text-xs text-[#475569]">
            Mantén actualizados los registros de visitas y reportes al finalizar cada ronda.
          </p>
          <NavLink
            to="/guard"
            className={({ isActive }) =>
              `mt-3 inline-flex items-center gap-2 rounded-md border border-[#00594e] px-3 py-2 text-xs font-semibold transition ${
                isActive
                  ? 'bg-[#00594e] text-white'
                  : 'text-[#00594e] hover:bg-[#00594e]/10'
              }`
            }
          >
            Revisar dashboard
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" />
            </svg>
          </NavLink>
        </div>
      </div>
    </aside>
  )
}

export default SideBarGuard
