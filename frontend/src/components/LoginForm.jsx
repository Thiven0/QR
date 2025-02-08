import { useState } from "react";
import Input from "./Input";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Por favor, completa todos los campos");
      return;
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-2xl border-4 border-[#00594e]">
      <h2 className="text-2xl font-bold text-center text-[#00594e]">Iniciar sesión</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo Electrónico" />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" />
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
