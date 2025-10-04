import React, { useState } from "react";
import Input from "../../components/Input";
import { useForm } from "../../hook/useForm";
import { Global } from "../../helpers/Global";

const RegisterGuard = () => {
  const { form, changed } = useForm({});
  const [saved, setSaved] = useState("not_sended");
  const [mensaje, setMessage] = useState("");

  const saveUser = async (e) => {
    e.preventDefault();
    const newUser = form;

    const request = await fetch(Global.url + "guard/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newUser),
    });

    const data = await request.json();
    setMessage(data.message || "No fue posible completar el registro");

    if (data.status === "success") {
      setSaved("saved");
    } else {
      setSaved("error");
    }
  };

  const resetState = () => {
    setSaved("not_sended");
    setMessage("");
  };

  return (
    <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#00594e]">Gestion de guardias</p>
          <h1 className="text-3xl font-bold text-[#0f172a]">Registrar nuevo celador</h1>
          <p className="max-w-3xl text-sm text-[#475569]">
            Completa la informacion basica para agregar un nuevo miembro al equipo de seguridad. Estos datos se utilizaran para generar sus credenciales de acceso y habilitar el escaner QR.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.45fr_0.9fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="space-y-4">
              {saved === "saved" && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  Celador registrado correctamente.
                </div>
              )}
              {saved === "error" && (
                <div className="rounded-lg border border-[#B5A160] bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030]">
                  {mensaje}
                </div>
              )}

              <form className="space-y-6" onSubmit={saveUser} onChange={saved !== "not_sended" ? resetState : undefined}>
                <Input type="text" placeholder="Nombre completo" onChange={changed} name="name" />
                <Input type="email" placeholder="Correo electronico" onChange={changed} name="email" autoComplete="email" />
                <Input type="password" placeholder="Contrasena" onChange={changed} name="password" autoComplete="new-password" />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#00594e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2"
                >
                  Registrar celador
                </button>
              </form>
            </div>
          </article>

          <aside className="flex flex-col gap-6 rounded-2xl border border-[#00594e]/20 bg-white p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold text-[#0f172a]">Recomendaciones</h2>
              <p className="mt-2 text-sm text-[#475569]">
                Antes de completar el registro valida que los datos coincidan con la documentacion presentada por el guardia.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-[#475569]">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#00594e]" />
                Correo institucional activo y verificado.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#B5A160]" />
                Documento de identidad actualizado en archivos.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-slate-400" />
                Definir una contrasena temporal y solicitar cambio al primer ingreso.
              </li>
            </ul>
            <div className="rounded-lg border border-dashed border-[#00594e]/40 bg-[#00594e]/5 px-4 py-4 text-sm text-[#00594e]">
              Recuerda notificar al nuevo celador que las rondas se documentan desde el dashboard principal.
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default RegisterGuard;
