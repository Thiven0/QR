import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const guardNav = [
  {
    to: '/guard/qr',
    label: 'Escanear QR',
    icon: (
      <svg className="h-5 w-5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 2a1 1 0 0 0-1 1v3a1 1 0 1 1-2 0V3a3 3 0 0 1 3-3h3a1 1 0 0 1 0 2H3Zm6 16H6a3 3 0 0 1-3-3v-3a1 1 0 0 1 2 0v3a1 1 0 0 0 1 1h3a1 1 0 1 1 0 2Zm8-18h-3a1 1 0 1 0 0 2h3a1 1 0 0 1 1 1v3a1 1 0 1 0 2 0V3a3 3 0 0 0-3-3ZM20 14a1 1 0 0 0-2 0v2h-2v-4h-2v4h-2v2h4v2h2v-2h2v-4Zm-9-8H9v2h2V6Z" />
      </svg>
    )
  },
  {
    to: '/user/register',
    label: 'Registrar visitante',
    icon: (
      <svg className="h-5 w-5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
        <path d="M14 2a3.963 3.963 0 0 0-1.4.267 6.439 6.439 0 0 1-1.331 6.638A4 4 0 1 0 14 2Zm1 9h-1.264A6.957 6.957 0 0 1 15 15v2a2.97 2.97 0 0 1-.184 1H19a1 1 0 0 0 1-1v-1a5.006 5.006 0 0 0-5-5ZM6.5 9a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM8 10H5a5.006 5.006 0 0 0-5 5v2a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2a5.006 5.006 0 0 0-5-5Z" />
      </svg>
    )
  }
]

const adminNav = [
  {
    to: '/guard/register',
    label: 'Registrar celador',
    icon: (
      <svg className="h-5 w-5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 18">
        <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z" />
      </svg>
    )
  },
  {
    hash: '#users',
    label: 'Usuarios',
    icon: (
      <svg className="h-5 w-5 text-[#00594e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5a3 3 0 1 1 5.657 1.5M20.25 6.75a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0ZM3 21v-.75A4.5 4.5 0 0 1 7.5 15.75h3A4.5 4.5 0 0 1 15 20.25V21m3.75-9a4.5 4.5 0 0 1 4.5 4.5V21" />
      </svg>
    )
  },
  {
    hash: '#estadisticas',
    label: 'Estadisticas',
    icon: (
      <svg className="h-5 w-5 text-[#00594e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7.5 14.25l3 3L21 6" />
      </svg>
    )
  },
  {
    hash: '#accesos',
    label: 'Control de accesos',
    icon: (
      <svg className="h-5 w-5 text-[#00594e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 16.5v-9a2.25 2.25 0 0 1 4.5 0V12M6 9l4.5 3L6 15V9Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5h9A2.5 2.5 0 0 1 16 7v10a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 2 17V7A2.5 2.5 0 0 1 4.5 4.5Z" />
      </svg>
    )
  },
  {
    hash: '#programas',
    label: 'Programas',
    icon: (
      <svg className="h-5 w-5 text-[#00594e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l7.5-3 7.5 3m-15-12l7.5-3 7.5 3m-15 0l7.5 3 7.5-3m-15 0v12m15-12v12" />
      </svg>
    )
  },
  {
    hash: '#alertas',
    label: 'Alertas y notificaciones',
    icon: (
      <svg className="h-5 w-5 text-[#00594e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a1.5 1.5 0 0 0 1.5-1.5H10.5a1.5 1.5 0 0 0 1.5 1.5Zm6.75-3.75c0-3.012-1.885-5.576-4.5-6.224V7.5a2.25 2.25 0 0 0-4.5 0v1.276c-2.615.648-4.5 3.212-4.5 6.224v1.5h13.5v-1.5Z" />
      </svg>
    )
  },
  {
    hash: '#configuracion',
    label: 'Configuracion',
    icon: (
      <svg className="h-5 w-5 text-[#00594e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3l.688 2.065M14.25 3l-.688 2.065M18.44 5.56l-1.46 1.46M20.25 9.75h-2.066M3.75 9.75h2.066M5.56 5.56l1.46 1.46M12 9.75a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm0 0h0a2.25 2.25 0 1 1 2.25 2.25 2.25 2.25 0 0 1-2.25-2.25Zm-6.19 6.44l1.46-1.46M3.75 14.25h2.066M12 20.25v-2.066M18.44 18.44l-1.46-1.46M20.25 14.25h-2.066M14.25 20.25l-.688-2.065M9.75 20.25l.688-2.065" />
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

const adminLinkClasses = (isActive) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-[#00594e] text-white shadow-sm'
      : 'text-[#334155] hover:bg-[#00594e]/10 hover:text-[#00594e]'
  }`

const SideBarGuard = () => {
  const location = useLocation()

  const isAdminSectionActive = (hash) => {
    if (location.pathname !== '/guard/secciones') return false
    if (!location.hash) return hash === '#users'
    return location.hash === hash
  }

  return (
    <aside className="fixed top-16 left-0 z-40 hidden h-[calc(100vh-4rem)] w-64 overflow-y-auto border-r border-slate-200 bg-white px-3 py-6 shadow-sm sm:block">
      <div className="space-y-8">
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-widest text-[#99a1af]">Opciones De QR</p>
          <nav className="mt-3 flex flex-col gap-1">
            {guardNav.map(({ to, label, icon }) => (
              <NavLink key={label} to={to} className={({ isActive }) => navLinkClasses(isActive)}>
                {icon}
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-widest text-[#99a1af]">Opciones De Administrador</p>
          <nav className="mt-3 flex flex-col gap-1">
            {adminNav.map(({ hash, to, label, icon }) => {
              if (to) {
                return (
                  <NavLink key={to} to={to} className={({ isActive }) => adminLinkClasses(isActive)}>
                    {icon}
                    <span>{label}</span>
                  </NavLink>
                )
              }

              return (
                <NavLink
                  key={hash}
                  to={{ pathname: '/guard/secciones', hash }}
                  className={() => adminLinkClasses(isAdminSectionActive(hash))}
                >
                  {icon}
                  <span>{label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>
    </aside>
  )
}

export default SideBarGuard
