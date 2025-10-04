import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const modules = [
  {
    id: 'users',
    icon: (
      <svg className="h-5 w-5 text-[#00594e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5a3 3 0 1 1 5.657 1.5M20.25 6.75a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0ZM3 21v-.75A4.5 4.5 0 0 1 7.5 15.75h3A4.5 4.5 0 0 1 15 20.25V21m3.75-9a4.5 4.5 0 0 1 4.5 4.5V21" />
      </svg>
    ),
    title: 'Usuarios',
    summary: 'Gestion integral del directorio de usuarios y sus estados de acceso.',
    items: [
      'Listado de usuarios con datos de contacto y rol asignado.',
      'Filtros por tipo: estudiantes, docentes y administrativos.',
      'Control de estado: activos, inactivos y pendientes de validacion.',
      'Ficha detallada con historial de accesos por usuario.'
    ]
  },
  {
    id: 'estadisticas',
    icon: (
      <svg className="h-5 w-5 text-[#00594e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7.5 14.25l3 3L21 6" />
      </svg>
    ),
    title: 'Estadisticas',
    summary: 'Analisis de asistencia y rendimiento del sistema por periodos.',
    items: [
      'Reportes diarios, semanales y mensuales.',
      'Comparativas entre facultades y programas academicos.',
      'Tendencias de acceso con proyecciones basadas en datos historicos.'
    ]
  },
  {
    id: 'accesos',
    icon: (
      <svg className="h-5 w-5 text-[#00594e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 16.5v-9a2.25 2.25 0 0 1 4.5 0V12M6 9l4.5 3L6 15V9Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5h9A2.5 2.5 0 0 1 16 7v10a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 2 17V7A2.5 2.5 0 0 1 4.5 4.5Z" />
      </svg>
    ),
    title: 'Control de accesos',
    summary: 'Monitoreo en tiempo real de entradas y salidas del campus.',
    items: [
      'Feed en vivo de accesos autorizados.',
      'Log historico con filtros por fecha, puerta y estado.',
      'Registro de intentos fallidos o accesos denegados.'
    ]
  },
  {
    id: 'programas',
    icon: (
      <svg className="h-5 w-5 text-[#00594e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l7.5-3 7.5 3m-15-12l7.5-3 7.5 3m-15 0l7.5 3 7.5-3m-15 0v12m15-12v12" />
      </svg>
    ),
    title: 'Programas',
    summary: 'Perspectiva academica para entender la distribucion de usuarios.',
    items: [
      'Tablero por facultad con volumen de estudiantes registrados.',
      'Distribucion de usuarios por carrera o programa.',
      'Ranking de asistencia para detectar programas destacados.'
    ]
  },
  {
    id: 'alertas',
    icon: (
      <svg className="h-5 w-5 text-[#00594e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a1.5 1.5 0 0 0 1.5-1.5H10.5a1.5 1.5 0 0 0 1.5 1.5Zm6.75-3.75c0-3.012-1.885-5.576-4.5-6.224V7.5a2.25 2.25 0 0 0-4.5 0v1.276c-2.615.648-4.5 3.212-4.5 6.224v1.5h13.5v-1.5Z" />
      </svg>
    ),
    title: 'Alertas y notificaciones',
    summary: 'Seguimiento de eventos inusuales y avisos de seguridad.',
    items: [
      'Alertas de accesos fuera de horario permitido.',
      'Identificacion de movimientos inusuales dentro del campus.',
      'Notificaciones de seguridad y tareas prioritarias.'
    ]
  },
  {
    id: 'configuracion',
    icon: (
      <svg className="h-5 w-5 text-[#00594e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3l.688 2.065M14.25 3l-.688 2.065M18.44 5.56l-1.46 1.46M20.25 9.75h-2.066M3.75 9.75h2.066M5.56 5.56l1.46 1.46M12 9.75a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm0 0h0a2.25 2.25 0 1 1 2.25 2.25 2.25 2.25 0 0 1-2.25-2.25Zm-6.19 6.44l1.46-1.46M3.75 14.25h2.066M12 20.25v-2.066M18.44 18.44l-1.46-1.46M20.25 14.25h-2.066M14.25 20.25l-.688-2.065M9.75 20.25l.688-2.065" />
      </svg>
    ),
    title: 'Configuracion',
    summary: 'Herramientas para ajustar la operacion y politicas del sistema.',
    items: [
      'Gestion de roles y permisos por equipo.',
      'Ajuste de horarios, puntos de acceso y zonas restringidas.',
      'Integracion con otros sistemas (CCTV, CRMs, control horario).'
    ]
  }
]

const SectionsGuide = () => {
  const location = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const targetId = location.hash ? location.hash.replace('#', '') : modules[0]?.id
    if (!targetId) return

    const target = document.getElementById(targetId)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location])

  return (
    <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#00594e]">Obciones De Administrador</p>
          <h1 className="text-3xl font-bold text-[#0f172a]">Mapa de secciones y funcionalidades</h1>
          <p className="max-w-3xl text-sm text-[#475569]">
            Consulta la descripcion de cada modulo operativo del dashboard de guardias para comprender su alcance, reportes asociados y acciones recomendadas.
          </p>
        </header>

        <article id="guia-modulos" className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-[#0f172a]">Modulos principales</h2>
            <p className="text-sm text-[#64748b]">
              Cada categoria agrupa procesos y reportes clave del dashboard. Usa los accesos rapidos del sidebar para saltar directamente a su descripcion.
            </p>
          </header>

          <div className="space-y-6">
            {modules.map(({ id, icon, title, summary, items }) => (
              <div key={id} id={id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <header className="flex items-start gap-3">
                  <span className="mt-0.5" aria-hidden="true">{icon}</span>
                  <div>
                    <h3 className="text-base font-semibold text-[#0f172a]">{title}</h3>
                    <p className="mt-1 text-sm text-[#475569]">{summary}</p>
                  </div>
                </header>
                <ul className="mt-4 space-y-2 text-sm text-[#475569]">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-[6px] inline-flex h-1.5 w-1.5 flex-none rounded-full bg-[#00594e]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </article>

        <footer className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[#00594e]/30 bg-[#00594e]/5 p-6 text-sm text-[#00594e]">
          <p className="font-semibold">Consejo</p>
          <p>
            Manten esta guia como referencia rapida para capacitar nuevos miembros del equipo o documentar procedimientos internos.
          </p>
        </footer>
      </div>
    </section>
  )
}

export default SectionsGuide
