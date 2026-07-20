import { motion, useReducedMotion } from 'framer-motion';
import GuardLoginForm from '../components/GuardLoginForm';

const featureItems = [
  {
    title: 'Reportes diarios',
    description: 'Genera resumenes PDF en un clic desde el tablero.',
  },
  {
    title: 'Escaner QR integrado',
    description: 'Sincroniza en vivo los accesos de visitantes recurrentes.',
  },
  {
    title: 'Reconocimiento facial',
    description: 'Identifica usuarios con precision biometrica y agiliza el control de acceso.',
  },
];

const GuardLogin = () => {
  const shouldReduceMotion = useReducedMotion();
  const initialFade = shouldReduceMotion ? false : { opacity: 0, y: 18 };
  const initialSlide = shouldReduceMotion ? false : { opacity: 0, x: 36 };

  return (
    <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.article
          initial={initialFade}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="flex flex-col gap-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#00594e]">Acceso al panel</p>
            <h1 className="text-3xl font-bold text-[#0f172a]">Bienvenido de nuevo</h1>
            <p className="text-sm text-[#475569]">
              Inicia sesion para gestionar accesos, escaneo QR y reportes desde el tablero central.
            </p>
          </div>
          <GuardLoginForm />
        </motion.article>

        <motion.aside
          initial={initialSlide}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: shouldReduceMotion ? 0 : 0.12, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-2xl border border-[#00594e]/30 bg-gradient-to-br from-[#00594e] to-[#00382b] text-white shadow-md"
        >
          <div className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-[#B5A160]/30" />
          <div className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-white/10" />

          <div className="relative flex h-full flex-col justify-between gap-6 p-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">Dashboard unificado</p>
              <h2 className="text-2xl font-semibold leading-snug">Controla accesos en tiempo real</h2>
              <p className="text-sm text-white/80">
                Visualiza entradas recientes, reporta incidentes y mantiene la bitacora alineada con el equipo administrativo.
              </p>
            </div>

            <motion.div
              initial={shouldReduceMotion ? false : 'hidden'}
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.12, delayChildren: 0.4 } },
              }}
              className="grid gap-3 text-sm"
            >
              {featureItems.map(({ title, description }) => (
                <motion.div
                  key={title}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm"
                >
                  <p className="font-semibold">{title}</p>
                  <p className="text-white/70">{description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
};

export default GuardLogin;
