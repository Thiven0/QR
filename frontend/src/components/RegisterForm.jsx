import { useState } from "react";
import Input from "./Input";

const RegisterForm = () => {
  const [cedula, setCedula] = useState("");
  const [rol, setRol] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [rh, setRh] = useState("");
  const [facultad, setFacultad] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cedula || !rol || !nombre || !apellido || !rh || !facultad || !telefono || !correo) {
      alert("Por favor, completa todos los campos");
      return;
    }
  };

  return (
    <div className="w-full max-w-3xl p-10 bg-white rounded-2xl shadow-2xl border-4 border-[#00594e]">
      <h2 className="text-3xl font-bold text-center text-[#00594e] mb-6">Registro</h2>
      
      <form className="grid grid-cols-2 gap-6" onSubmit={handleSubmit}>
        {/* Primera columna */}
        <input type="text" value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Cédula" className="input-field" />
        <input type="text" value={rol} onChange={(e) => setRol(e.target.value)} placeholder="Rol" className="input-field" />
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" className="input-field" />
        <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Apellido" className="input-field" />
        
        {/* Segunda columna */}
        <input type="text" value={rh} onChange={(e) => setRh(e.target.value)} placeholder="RH" className="input-field" />
        <input type="text" value={facultad} onChange={(e) => setFacultad(e.target.value)} placeholder="Facultad" className="input-field" />
        <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" className="input-field" />
        <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="Correo Electrónico" className="input-field" />

        {/* Botones en el centro */}
        <div className="col-span-2 flex justify-center gap-4 mt-6">
          <button type="submit" className="btn-primary">Registrarse</button>
          <a href="/login" className="btn-secondary">Cancelar</a>
        </div>
      </form>

      {/* Estilos adicionales */}
      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 10px;
          border: 2px solid #00594e;
          border-radius: 8px;
          outline: none;
          transition: all 0.3s;
        }
        .input-field:focus {
          background-color: #e6f5ec;
          border-color: #004037;
        }
        .btn-primary {
          padding: 10px 20px;
          font-weight: bold;
          color: white;
          background-color: #00594e;
          border-radius: 8px;
          transition: all 0.3s;
        }
        .btn-primary:hover {
          background-color: #004037;
        }
        .btn-secondary {
          padding: 10px 20px;
          font-weight: bold;
          color: #00594e;
          background-color: #e6f5ec;
          border-radius: 8px;
          transition: all 0.3s;
        }
        .btn-secondary:hover {
          background-color: #d1e9db;
        }
      `}</style>
    </div>
  );
};

export default RegisterForm;
