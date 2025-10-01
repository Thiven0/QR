import React from 'react'

const stats = [
  { label: 'Accesos del día', value: 42, change: '+8%', descriptor: 'vs. ayer' },
  { label: 'Visitantes dentro', value: 18, change: '-3', descriptor: 'salieron hace 15 min' },
  { label: 'Alertas atendidas', value: 6, change: '+2', descriptor: 'últimas 24 h' },
  { label: 'Registros pendientes', value: 3, change: 'Nuevos', descriptor: 'esperando validación' }
]

const recentAccess = [
  { name: 'María Gómez', id: 'CC 10293847', time: '08:12', gate: 'Bloque A', status: 'Entrada' },
  { name: 'Luis Pérez', id: 'CC 75920184', time: '08:05', gate: 'Bloque C', status: 'Salida' },
  { name: 'Carolina Ortiz', id: 'CC 10023764', time: '07:57', gate: 'Biblioteca', status: 'Entrada tardía' },
  { name: 'Jorge Díaz', id: 'CC 83920173', time: '07:51', gate: 'Laboratorios', status: 'Entrada' }
]

const incidents = [
  { title: 'Locker forzado', location: 'Bloque B - 2° piso', time: '07:40', status: 'En seguimiento' },
  { title: 'Visitante sin QR', location: 'Bloque Administrativo', time: '07:05', status: 'Registrado manualmente' },
  { title: 'Equipo olvidado', location: 'Laboratorio 3', time: '06:50', status: 'Devuelto' }
]

const shifts = [
  { guard: 'Sofía Méndez', range: '08:00 - 12:00', gate: 'Biblioteca' },
  { guard: 'Carlos Ruiz', range: '12:00 - 16:00', gate: 'Bloque A' },
  { guard: 'Andrea Silva', range: '16:00 - 20:00', gate: 'Bloque C' }
]

const Content = () => {
  return (
    <div className="pt-4 sm:pt-6 px-4 pb-12 bg-[#f8fafc] min-h-screen transition-all">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-[#00594e] font-semibold">Panel del celador</p>
            <h1 className="text-3xl font-bold text-[#0f172a]">Resumen de seguridad diaria</h1>
            <p className="text-sm text-[#475569]">Actualizado el {new Date().toLocaleDateString('es-CO', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="px-4 py-2 text-sm font-medium text-white bg-[#00594e] rounded-md shadow-sm hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00594e] transition">
              Generar reporte PDF
            </button>
            <button className="px-4 py-2 text-sm font-medium text-[#00594e] bg-white border border-[#00594e]/30 rounded-md shadow-sm hover:bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B5A160]/60 transition">
              Registrar incidencia
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <article key={item.label} className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm border border-slate-200">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#99a1af]">{item.label}</span>
              <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{item.value}</p>
              <p className="mt-2 text-sm text-[#475569]">
                <span className="font-semibold text-[#00594e]">{item.change}</span> {item.descriptor}
              </p>
              <div className="absolute right-6 top-6 h-12 w-12 rounded-full bg-[#00594e]/10" />
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-xl bg-white shadow-sm border border-slate-200">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">Accesos recientes</h2>
                <p className="text-sm text-[#64748b]">Historial de las últimas entradas registradas por QR</p>
              </div>
              <button className="text-sm font-medium text-[#00594e] hover:text-[#004037]">Ver todo</button>
            </header>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Persona</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Identificación</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Hora</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Puesto</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {recentAccess.map((access) => (
                    <tr key={`${access.name}-${access.time}`} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-[#0f172a]">{access.name}</td>
                      <td className="px-6 py-4 text-sm text-[#475569]">{access.id}</td>
                      <td className="px-6 py-4 text-sm text-[#475569]">{access.time}</td>
                      <td className="px-6 py-4 text-sm text-[#475569]">{access.gate}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-[#00594e]/10 text-[#00594e]">
                          {access.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <article className="rounded-xl bg-white shadow-sm border border-slate-200">
              <header className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-[#0f172a]">Alertas y novedades</h2>
                <p className="text-sm text-[#64748b]">Gestiona las incidencias detectadas durante el turno</p>
              </header>
              <ul className="divide-y divide-slate-200">
                {incidents.map((incident) => (
                  <li key={incident.title} className="px-6 py-4">
                    <p className="text-sm font-semibold text-[#0f172a]">{incident.title}</p>
                    <p className="text-xs text-[#64748b] mt-1">{incident.location}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-[#475569]">
                      <span>{incident.time}</span>
                      <span className="text-[#B5A160] font-medium">{incident.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <footer className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-right">
                <button className="text-sm font-medium text-[#00594e] hover:text-[#004037]">Ver historial</button>
              </footer>
            </article>

            <article className="rounded-xl bg-white shadow-sm border border-slate-200">
              <header className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-[#0f172a]">Ronda del día</h2>
                <p className="text-sm text-[#64748b]">Recorrido programado para el equipo de seguridad</p>
              </header>
              <ul className="divide-y divide-slate-200">
                {shifts.map((shift) => (
                  <li key={shift.guard} className="px-6 py-3">
                    <p className="text-sm font-semibold text-[#0f172a]">{shift.guard}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-[#475569]">
                      <span>{shift.range}</span>
                      <span className="inline-flex items-center rounded-full bg-[#B5A160]/15 px-2 py-1 text-[11px] font-medium text-[#B5A160]">{shift.gate}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-xl bg-white shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-[#0f172a]">Acciones rápidas</h2>
            <p className="text-sm text-[#64748b] mt-1">Acceso directo a tareas frecuentes del turno</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button className="flex items-center justify-between rounded-lg border border-[#00594e]/30 px-4 py-3 text-sm font-semibold text-[#00594e] hover:bg-[#00594e]/10 transition">
                Registrar visitante
                <span className="text-lg">+</span>
              </button>
              <button className="flex items-center justify-between rounded-lg border border-[#B5A160]/30 px-4 py-3 text-sm font-semibold text-[#B5A160] hover:bg-[#B5A160]/10 transition">
                Generar QR temporal
                <span className="text-lg">⇱</span>
              </button>
              <button className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-[#334155] hover:bg-slate-100 transition">
                Solicitar apoyo
                <span className="text-lg">⚠</span>
              </button>
              <button className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-[#334155] hover:bg-slate-100 transition">
                Revisar cámaras
                <span className="text-lg">▶</span>
              </button>
            </div>
          </article>

          <article className="rounded-xl bg-white shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-[#0f172a]">Notas del turno</h2>
            <p className="text-sm text-[#64748b] mt-1">Breves recordatorios y tareas abiertas</p>
            <ul className="mt-5 space-y-4">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#B5A160]" />
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">Revisar autorización de proveedores (11:00)</p>
                  <p className="text-xs text-[#64748b]">Pendiente confirmación del área administrativa.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#00594e]" />
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">Actualizar bitácora digital antes del cierre</p>
                  <p className="text-xs text-[#64748b]">Subir fotos de rondas y observaciones de mantenimiento.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#94a3b8]" />
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">Verificar stock de radios portátiles</p>
                  <p className="text-xs text-[#64748b]">Asegurar baterías cargadas para el siguiente turno.</p>
                </div>
              </li>
            </ul>
            <button className="mt-6 w-full rounded-lg border border-[#00594e]/30 px-4 py-2 text-sm font-medium text-[#00594e] hover:bg-[#00594e]/10 transition">
              Agregar nota
            </button>
          </article>
        </section>
      </div>
    </div>
  )
}

export default Content


