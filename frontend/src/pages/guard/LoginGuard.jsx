import LoginForm from "../../components/LoginFormGuard";

const Login = () => {
  return (
    <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="flex flex-col gap-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#00594e]">Acceso de guardia</p>
            <h1 className="text-3xl font-bold text-[#0f172a]">Bienvenido de nuevo</h1>
            <p className="text-sm text-[#475569]">
              Inicia sesion para gestionar las rondas, accesos y reportes del turno desde un solo panel.
            </p>
          </div>
          <LoginForm />
        </article>

        <aside className="relative overflow-hidden rounded-2xl border border-[#00594e]/30 bg-gradient-to-br from-[#00594e] to-[#00382b] text-white shadow-md">
          <div className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-[#B5A160]/30" />
          <div className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-white/10" />

          <div className="relative flex h-full flex-col justify-between gap-6 p-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">Dashboard guard</p>
              <h2 className="text-2xl font-semibold leading-snug">Mantente al tanto de las entradas en tiempo real</h2>
              <p className="text-sm text-white/80">
                Visualiza accesos recientes, reporta incidentes y actualiza la bitacora sin salir del panel principal.
              </p>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="font-semibold">Reportes diarios</p>
                <p className="text-white/70">Genera PDF con un clic desde el tablero central.</p>
              </div>
              <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="font-semibold">Escaner QR integrado</p>
                <p className="text-white/70">Sincroniza en vivo los accesos de visitantes recurrentes.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default Login;
