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

    // No actualizar la recarga de pantalla
    let userToLogin = form;
    console.log(userToLogin);


    const request = await fetch(Global.url + "guard/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userToLogin),
    });
    const data = await request.json();
    console.log(data);

    if (data.status === "success") {
      setSaved("login");
      console.log("Usuario logueado correctamente", data.user);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }else
    {
      setSaved("error");
      setMensaje(data.message);
      console.log("Error al iniciar sesión", data.message);
    }
  
    
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-2xl border-4 border-[#00594e]">
      <h2 className="text-2xl font-bold text-center text-[#00594e]">
        Iniciar sesión
      </h2>
      {saved == "saved" ? <strong className="bg-[#B5A160] text-white rounded-4xl px-2">Usuario registrado correctamente</strong>:''}
      {saved == "error" ? <strong className="bg-[#B5A160] text-white rounded-4xl px-2">{mensaje}</strong>:''}
      <form className="space-y-4" onSubmit={loginUser}>
        <Input
          type="email"
          name="email"
          onChange={changed}
          placeholder="Correo Electrónico"
        />
        <Input
          type="password"
          name="password"
          onChange={changed}
          placeholder="Contraseña"
        />
        <button
          type="submit"
          className="w-full p-3 font-bold text-white bg-[#00594e] rounded-lg hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] shadow-lg"
        >
          Iniciar sesión
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
