import React from 'react'

const stats = [
  { label: 'Ingresos hoy', value: 128, change: '+12%', descriptor: 'vs dia anterior' },
  { label: 'Usuarios activos', value: 842, change: '+38', descriptor: 'con accesos validados' },
  { label: 'Alertas abiertas', value: 4, change: '-3', descriptor: 'gestionadas esta semana' },
  { label: 'Visitas programadas', value: 19, change: 'Nuevas', descriptor: 'pendientes de confirmar' }
]

const areaTiles = [
  {
    id: 'overview',
    icon: '🏠',
    title: 'Inicio / Dashboard',
    description: 'Resumen operativo general con indicadores clave y graficos del dia.',
    items: ['Vista general con KPIs', 'Graficos principales'],
    action: 'Ver resumen'
  },
  {
    id: 'users',
    icon: '👥',
    title: 'Usuarios',
    description: 'Administra perfiles y monitorea su estado de acceso.',
    items: ['Listado de usuarios por rol', 'Filtros por tipo y estado', 'Detalle de actividad individual'],
    action: 'Gestionar usuarios'
  },
  {
    id: 'analytics',
    icon: '📊',
    title: 'Estadisticas',
    description: 'Analiza el comportamiento de asistencia y tendencias.',
    items: ['Reportes diarios, semanales y mensuales', 'Comparativa por facultad o programa', 'Tendencias de acceso'],
    action: 'Abrir estadisticas'
  },
  {
    id: 'access',
    icon: '🚪',
    title: 'Control de accesos',
    description: 'Seguimiento en tiempo real de entradas y salidas.',
    items: ['Eventos en vivo', 'Log historico detallado', 'Intentos fallidos o denegados'],
    action: 'Ver accesos'
  },
  {
    id: 'faculties',
    icon: '🏫',
    title: 'Facultades / programas',
    description: 'Visualiza la distribucion academica y asistencia.',
    items: ['Resumen por facultad', 'Participacion por carrera', 'Ranking de asistencia'],
    action: 'Explorar programas'
  },
  {
    id: 'alerts',
    icon: '🔔',
    title: 'Alertas y notificaciones',
    description: 'Gestiona eventos inusuales y avisos de seguridad.',
    items: ['Accesos fuera de horario', 'Movimientos inusuales', 'Alertas de seguridad'],
    action: 'Revisar alertas'
  },
  {
    id: 'config',
    icon: '⚙️',
    title: 'Configuracion',
    description: 'Ajusta la operacion segun politicas de seguridad.',
    items: ['Roles y permisos', 'Parametros de horario y puntos', 'Integraciones con otros sistemas'],
    action: 'Abrir configuracion'
  },
  {
    id: 'reports',
    icon: '📥',
    title: 'Exportar / reportes',
    description: 'Descarga informacion consolidada para auditorias.',
    items: ['Reportes PDF y Excel', 'Estadisticas historicas', 'Resumenes de control de acceso'],
    action: 'Generar reportes'
  }
]

const attendanceSummary = [
  { period: 'Diario', value: '86%', note: 'Actualizado 09:45', delta: '+2% vs ayer' },
  { period: 'Semanal', value: '79%', note: 'Semana en curso', delta: '+5% vs semana pasada' },
  { period: 'Mensual', value: '82%', note: 'Mes corriente', delta: '+1.4% vs promedio' }
]

const facultyHighlights = [
  { faculty: 'Ingenieria de Sistemas', distribution: '28%', trend: '+4%', status: 'Alta asistencia' },
  { faculty: 'Administracion', distribution: '19%', trend: '+1%', status: 'Estable' },
  { faculty: 'Arquitectura', distribution: '16%', trend: '-2%', status: 'Revisar turnos' },
  { faculty: 'Medicina Veterinaria', distribution: '14%', trend: '+3%', status: 'En crecimiento' }
]

const accessFeed = [
  { name: 'Maria Gomez', id: 'CC 10293847', time: '08:12', gate: 'Bloque A', status: 'Entrada' },
  { name: 'Luis Perez', id: 'CC 75920184', time: '08:05', gate: 'Bloque C', status: 'Salida' },
  { name: 'Carolina Ortiz', id: 'CC 10023764', time: '07:57', gate: 'Biblioteca', status: 'Entrada tardia' },
  { name: 'Jorge Diaz', id: 'CC 83920173', time: '07:51', gate: 'Laboratorios', status: 'Entrada' }
]

const alertFeed = [
  { title: 'Acceso fuera de horario', context: 'Ingreso 05:42 - Bloque C', severity: 'Alerta critica' },
  { title: 'Movimiento inusual', context: 'Permanencia 90 min en deposito', severity: 'Revisar camaras' },
  { title: 'Intento fallido', context: 'QR invalido - Visitante', severity: 'Denegado automatico' }
]

const configShortcuts = [
  { title: 'Roles y permisos', detail: 'Asigna niveles de acceso por equipo.' },
  { title: 'Horarios y puntos', detail: 'Define ventanas de ingreso y puertas activas.' },
  { title: 'Integraciones', detail: 'Conecta CRMs, control horario y CCTV.' }
]

const reportOptions = [
  { label: 'Reporte PDF', description: 'KPIs diarios, alertas y resumen de accesos.', badge: 'PDF' },
  { label: 'Exportar Excel', description: 'Listado de usuarios y log historico completo.', badge: 'XLSX' },
  { label: 'Estadistica historica', description: 'Comparativas por periodo y programa.', badge: 'CSV' }
]

const userBreakdown = [
  { segment: 'Estudiantes', count: '1,240', status: 'Activos 92%' },
  { segment: 'Docentes', count: '312', status: 'Activos 87%' },
  { segment: 'Administrativos', count: '148', status: 'Activos 95%' },
  { segment: 'Visitantes', count: '64', status: 'Requiere renovar QR' }
]

const Content = () => {
  const updatedAt = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit'
  })

  const handleScroll = (id) => {
    if (typeof window === 'undefined') return
    const section = document.getElementById(id)
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 pb-16 pt-6 transition-all sm:pt-8">
      <div className="mx-auto max-w-7xl space-y-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#00594e]">Panel del celador</p>
            <h1 className="text-3xl font-bold text-[#0f172a]">Centro de control y vigilancia</h1>
            <p className="text-sm text-[#475569]">Actualizado el {updatedAt}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded-md bg-[#00594e] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00594e]">
              Generar reporte PDF
            </button>
            <button className="rounded-md border border-[#00594e]/30 bg-white px-4 py-2 text-sm font-medium text-[#00594e] shadow-sm transition hover:bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B5A160]/60">
              Registrar incidencia
            </button>
          </div>
        </header>

        <section id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <article key={item.label} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#99a1af]">{item.label}</span>
              <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{item.value}</p>
              <p className="mt-2 text-sm text-[#475569]">
                <span className="font-semibold text-[#00594e]">{item.change}</span> {item.descriptor}
              </p>
              <div className="absolute right-6 top-6 h-12 w-12 rounded-full bg-[#00594e]/10" />
            </article>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0f172a]">Mapa de operaciones</h2>
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748b]">Areas clave</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {areaTiles.map((tile) => (
              <article key={tile.title} className="flex h-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">{tile.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0f172a]">{tile.title}</h3>
                    <p className="mt-1 text-sm text-[#475569]">{tile.description}</p>
                  </div>
                </div>
                <ul className="grid gap-2 text-sm text-[#475569]">
                  {tile.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-[#00594e]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => handleScroll(tile.id)}
                  className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[#00594e] transition hover:text-[#004037]"
                >
                  {tile.action}
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" />
                  </svg>
                </button>
              </article>
            ))}
          </div>
        </section>

        <section id="users" className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Usuarios habilitados</h2>
                <p className="text-sm text-[#64748b]">Resumen general de perfiles y estado de acceso</p>
              </div>
              <button className="text-sm font-semibold text-[#00594e] transition hover:text-[#004037]">Ver listado completo</button>
            </header>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Segmento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Cantidad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm text-[#334155]">
                  {userBreakdown.map((row) => (
                    <tr key={row.segment}>
                      <td className="px-6 py-4 font-semibold">{row.segment}</td>
                      <td className="px-6 py-4">{row.count}</td>
                      <td className="px-6 py-4 text-[#00594e]">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-lg font-semibold text-[#0f172a]">Filtros rapidos</h3>
              <p className="mt-1 text-sm text-[#64748b]">Optimiza la vista de usuarios segun tipo o estado.</p>
            </div>
            <ul className="space-y-3 text-sm text-[#475569]">
              <li className="flex items-start gap-3">
                <span className="mt-[5px] inline-flex h-2 w-2 flex-none rounded-full bg-[#00594e]" aria-hidden="true" />
                Filtro por tipo: estudiantes, docentes, administrativos.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-[5px] inline-flex h-2 w-2 flex-none rounded-full bg-[#B5A160]" aria-hidden="true" />
                Filtro por estado: activo, inactivo o acceso pendiente.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-[5px] inline-flex h-2 w-2 flex-none rounded-full bg-slate-400" aria-hidden="true" />
                Consulta el detalle completo de cada usuario y su historial.
              </li>
            </ul>
            <button className="mt-auto inline-flex items-center gap-2 self-start rounded-md border border-[#00594e]/40 px-4 py-2 text-sm font-semibold text-[#00594e] transition hover:bg-[#00594e]/10">
              Configurar filtros
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h6" />
              </svg>
            </button>
          </article>
        </section>

        <section id="analytics" className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Estadisticas de asistencia</h2>
                <p className="text-sm text-[#64748b]">Seguimiento de accesos validados por periodo</p>
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-[#B5A160]">Actualizado</span>
            </header>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {attendanceSummary.map((item) => (
                <div key={item.period} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">{item.period}</p>
                  <p className="mt-3 text-2xl font-semibold text-[#0f172a]">{item.value}</p>
                  <p className="mt-2 text-xs text-[#475569]">{item.note}</p>
                  <p className="mt-1 text-xs font-semibold text-[#00594e]">{item.delta}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-dashed border-[#00594e]/30 bg-[#00594e]/5 p-6">
              <p className="text-sm font-semibold text-[#00594e]">Tendencia de acceso</p>
              <div className="mt-4 h-32 w-full rounded-md bg-gradient-to-r from-[#B5A160]/30 via-[#00594e]/40 to-[#0f172a]/20" />
              <p className="mt-3 text-xs text-[#475569]">Proyeccion generada con datos de los ultimos 30 dias.</p>
            </div>
          </article>

          <article id="faculties" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0f172a]">Facultades y programas</h2>
            <p className="text-sm text-[#64748b]">Distribucion de estudiantes y tendencia de asistencia</p>
            <ul className="mt-6 space-y-4">
              {facultyHighlights.map((item) => (
                <li key={item.faculty} className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold text-[#0f172a]">
                    <span>{item.faculty}</span>
                    <span>{item.distribution}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-[#00594e]" style={{ width: item.distribution }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#475569]">
                    <span>{item.status}</span>
                    <span className="font-semibold text-[#00594e]">{item.trend}</span>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section id="access" className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Control de accesos</h2>
                <p className="text-sm text-[#64748b]">Entradas y salidas en tiempo real</p>
              </div>
              <button className="text-sm font-semibold text-[#00594e] transition hover:text-[#004037]">Ver log completo</button>
            </header>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Persona</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Identificacion</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Hora</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Puesto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm text-[#334155]">
                  {accessFeed.map((item) => (
                    <tr key={item.id + item.time}>
                      <td className="px-6 py-4 font-semibold">{item.name}</td>
                      <td className="px-6 py-4 text-[#64748b]">{item.id}</td>
                      <td className="px-6 py-4">{item.time}</td>
                      <td className="px-6 py-4">{item.gate}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-[#00594e]/10 px-2.5 py-1 text-xs font-semibold text-[#00594e]">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article id="alerts" className="flex h-full flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#0f172a]">Alertas y notificaciones</h2>
              <p className="text-sm text-[#64748b]">Seguimiento de eventos relevantes</p>
            </div>
            <ul className="space-y-4 text-sm text-[#475569]">
              {alertFeed.map((alert) => (
                <li key={alert.title} className="rounded-lg border border-[#00594e]/20 bg-[#00594e]/5 p-4">
                  <p className="text-sm font-semibold text-[#0f172a]">{alert.title}</p>
                  <p className="mt-1 text-xs text-[#475569]">{alert.context}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#00594e]">{alert.severity}</p>
                </li>
              ))}
            </ul>
            <button className="mt-auto inline-flex items-center gap-2 self-start rounded-md border border-[#00594e]/40 px-4 py-2 text-sm font-semibold text-[#00594e] transition hover:bg-[#00594e]/10">
              Configurar notificaciones
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </article>
        </section>

        <section id="config" className="grid gap-6 lg:grid-cols-2">
          <article className="flex h-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#0f172a]">Configuracion operativa</h2>
              <p className="text-sm text-[#64748b]">Ajusta roles, horarios y conexiones del sistema.</p>
            </div>
            <ul className="space-y-4 text-sm text-[#475569]">
              {configShortcuts.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#00594e]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">{item.title}</p>
                    <p className="text-xs text-[#64748b]">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button className="mt-auto inline-flex items-center gap-2 self-start rounded-md border border-[#00594e]/40 px-4 py-2 text-sm font-semibold text-[#00594e] transition hover:bg-[#00594e]/10">
              Abrir configuracion
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.983 4.084a1 1 0 011.034 0l1.286.788 1.472-.215a1 1 0 01.966.474l.77 1.333 1.36.533a1 1 0 01.622.806l.158 1.488 1.128 1.026a1 1 0 01.252 1.024l-.455 1.42.684 1.36a1 1 0 01-.124 1.053l-.96 1.143.092 1.498a1 1 0 01-.63.948l-1.396.52-.772 1.334a1 1 0 01-.964.478l-1.486-.217-1.29.792a1 1 0 01-1.034 0l-1.29-.792-1.486.217a1 1 0 01-.964-.478l-.772-1.334-1.396-.52a1 1 0 01-.63-.948l.092-1.498-.96-1.143a1 1 0 01-.124-1.053l.684-1.36-.455-1.42a1 1 0 01.252-1.024l1.128-1.026.158-1.488a1 1 0 01.622-.806l1.36-.533.77-1.333a1 1 0 01.966-.474l1.472.215 1.286-.788z" />
              </svg>
            </button>
          </article>

          <article id="reports" className="flex h-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#0f172a]">Exportar y reportes</h2>
              <p className="text-sm text-[#64748b]">Descarga datos para auditoria y seguimiento historico.</p>
            </div>
            <ul className="space-y-4 text-sm text-[#475569]">
              {reportOptions.map((item) => (
                <li key={item.label} className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">{item.label}</p>
                    <p className="text-xs text-[#64748b]">{item.description}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-[#00594e]/10 px-3 py-1 text-xs font-semibold text-[#00594e]">{item.badge}</span>
                </li>
              ))}
            </ul>
            <button className="mt-auto inline-flex items-center gap-2 self-start rounded-md bg-[#00594e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2">
              Generar descarga
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
            </button>
          </article>
        </section>
      </div>
    </div>
  )
}

export default Content
