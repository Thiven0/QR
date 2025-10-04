import { useState } from "react";
import Input from "./Input";
import { Global } from "../helpers/Global";
import { useForm } from "../hook/useForm";

const LoginForm = () => {
  const { form, changed } = useForm();
  const [saved, setSaved] = useState("not_sended");
  const [mensaje, setMensaje] = useState("");

  const loginUser = async (e) => {
    e.preventDefault();

    const userToLogin = form;

    const request = await fetch(Global.url + "guard/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userToLogin),
    });

    const data = await request.json();

    if (data.status === "success") {
      setSaved("login");
      setMensaje("");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    } else {
      setSaved("error");
      setMensaje(data.message || "No fue posible iniciar sesion");
    }
  };

  return (
    <div className="space-y-6">
      {saved === "login" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Sesion iniciada correctamente.
        </div>
      )}
      {saved === "error" && (
        <div className="rounded-lg border border-[#B5A160] bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030]">
          {mensaje}
        </div>
      )}

      <form className="space-y-5" onSubmit={loginUser}>
        <Input
          type="email"
          name="email"
          onChange={changed}
          placeholder="Correo electronico"
          autoComplete="email"
        />
        <Input
          type="password"
          name="password"
          onChange={changed}
          placeholder="Contrasena"
          autoComplete="current-password"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-[#00594e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2"
        >
          Iniciar sesion
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
