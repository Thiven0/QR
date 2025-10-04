import React from "react";
import QrScanner from "react-qr-scanner";

const QRGuard = () => {
  const handleScan = (data) => {
    if (data) {
      console.log("Codigo QR escaneado:", data);
    }
  };

  const handleError = (err) => {
    console.error(err);
  };

  return (
    <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.45fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#00594e]">Control de accesos</p>
            <h1 className="text-3xl font-bold text-[#0f172a]">Escanear codigo QR</h1>
            <p className="text-sm text-[#475569]">
              Usa la camara para registrar entradas y salidas en tiempo real. Los resultados se sincronizan automaticamente con el dashboard principal.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border-2 border-dashed border-[#00594e]/40 bg-[#f1f5f9] p-6">
            <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-900/5">
              <QrScanner
                delay={300}
                onError={handleError}
                onScan={handleScan}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-6 rounded-2xl border border-[#00594e]/20 bg-white p-8 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-[#0f172a]">Buenas practicas</h2>
            <p className="mt-2 text-sm text-[#475569]">
              Mantiene el dispositivo estable y verifica que el codigo se encuentre dentro del marco para un registro inmediato.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-[#475569]">
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#00594e]" />
              Confirma visualmente la identidad antes de autorizar el acceso.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#B5A160]" />
              Registra observaciones en la bitacora cuando detectes una alerta.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-slate-400" />
              Ajusta la iluminacion del entorno para mejorar la lectura del codigo.
            </li>
          </ul>
          <div className="rounded-lg border border-dashed border-[#00594e]/40 bg-[#00594e]/5 px-4 py-4 text-sm text-[#00594e]">
            Puedes alternar entre camara frontal y trasera usando los controles del navegador.
          </div>
        </aside>
      </div>
    </section>
  );
};

export default QRGuard;
