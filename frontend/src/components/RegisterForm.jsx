import { useState } from "react";
<<<<<<< HEAD
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
    if (
      !cedula ||
      !rol ||
      !nombre ||
      !apellido ||
      !rh ||
      !facultad ||
      !telefono ||
      !correo
    ) {
      alert("Por favor, completa todos los campos");
      return;
    }
  };

  return (
    <div className="w-full max-w-3xl p-10 bg-white rounded-2xl shadow-2xl border-4 border-[#00594e]">
      <h2 className="text-3xl font-bold text-center text-[#00594e] mb-6">
        Registro
      </h2>

      <form className="grid grid-cols-2 gap-6" onSubmit={handleSubmit}>
        {/* Primera columna */}
        <input
          type="text"
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
          placeholder="Cédula"
          className="input-field"
        />
        <input
          type="text"
          value={rol}
          onChange={(e) => setRol(e.target.value)}
          placeholder="Rol"
          className="input-field"
        />
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          className="input-field"
        />
        <input
          type="text"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          placeholder="Apellido"
          className="input-field"
        />

        {/* Segunda columna */}
        <input
          type="text"
          value={rh}
          onChange={(e) => setRh(e.target.value)}
          placeholder="RH"
          className="input-field"
        />
        <input
          type="text"
          value={facultad}
          onChange={(e) => setFacultad(e.target.value)}
          placeholder="Facultad"
          className="input-field"
        />
        <input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Teléfono"
          className="input-field"
        />
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="Correo Electrónico"
          className="input-field"
        />

        {/* Botones en el centro */}
        <div className="col-span-2 flex justify-center gap-4 mt-6">
          <a
            className="inline-block rounded-sm bg-indigo-600 px-8 py-3 text-sm font-medium text-white transition hover:scale-110 hover:shadow-xl focus:ring-3 focus:outline-hidden"
            href="#"
            type="submit"
          >
            Prueba
          </a>
          <button type="submit" className="btn-primary">
            Registrarse
          </button>
          <a href="/login" className="btn-secondary">
            Cancelar
          </a>
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
=======

const carreras = [
  "Administracion de Empresas",
  "Contaduria Publica",
  "Derecho",
  "Economia",
  "Finanza y Negocios Internacionales",
  "Arquitectura",
  "Biologia",
  "Ingenieria Agroforestal",
  "Ingenieria Agroindustrial",
  "Ingenieria de Sistemas",
  "Ingenieria en Energias",
  "Ingeneria Civil",
  "Medicina Veterinaria y Zootecnia",
];

const campos = [
  { id: "cedula", label: "Cédula", type: "text", placeholder: "Cédula" },
  { id: "nombre", label: "Nombre", type: "text", placeholder: "Nombre" },
  { id: "apellido", label: "Apellido", type: "text", placeholder: "Apellido" },
  { id: "rh", label: "RH", type: "text", placeholder: "RH" },
  { id: "telefono", label: "Teléfono", type: "text", placeholder: "Teléfono" },
  { id: "correo", label: "Correo", type: "email", placeholder: "Correo" },
];

const RegisterForm = ({ onSubmit, errors = {} }) => {
  const [formData, setFormData] = useState({
    cedula: "",
    rol: "",
    nombre: "",
    apellido: "",
    rh: "",
    facultad: "",
    telefono: "",
    correo: "",
    estado: "Inactivo",
    imagen: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { id, value, type, files } = e.target;
    if (type === "file") {
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({
            ...prev,
            [id]: reader.result, // Esto asegura que cada input actualiza su propio campo
          }));
        };
        reader.readAsDataURL(file);
      }
    } else {
      setFormData({ ...formData, [id]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    onSubmit(formData);
  };

  return (
    <form
      className="max-w-2xl mx-auto bg-white border border-pantone1 rounded-lg p-8 shadow-lg"
      onSubmit={handleSubmit}
    >
      <h2 className="text-2xl font-bold text-center mb-6 text-pantone1">
        Registro de Usuario
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Campo Cédula primero */}
        <div>
          <label
            htmlFor="cedula"
            className={`block font-medium mb-1 text-pantone1 ${
              submitted && errors.cedula
                ? "after:content-['*'] after:ml-1 after:text-red-500"
                : ""
            }`}
          >
            Cédula
          </label>
          <input
            id="cedula"
            type="text"
            placeholder="Cédula"
            value={formData.cedula}
            onChange={handleChange}
            className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pantone2 transition ${
              submitted && errors.cedula ? "border-red-500" : "border-pantone1"
            }`}
          />
          {errors.cedula && (
            <p className="text-red-500 text-xs mt-1">{errors.cedula}</p>
          )}
        </div>

        {/* Select para Rol */}
        <div>
          <label
            htmlFor="rol"
            className={`block font-medium mb-1 text-pantone1 ${
              errors.rol ? "after:content-['*'] after:ml-1 after:text-red-500" : ""
            }`}
          >
            Rol
          </label>
          <select
            id="rol"
            value={formData.rol}
            onChange={handleChange}
            className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pantone2 transition ${
              errors.rol ? "border-red-500" : "border-pantone1"
            }`}
          >
            <option value="">Seleccione un rol</option>
            <option value="Estudiante">Estudiante</option>
            <option value="Profesor">Profesor</option>
            <option value="Egresado">Egresado</option>
          </select>
          {errors.rol && (
            <p className="text-red-500 text-xs mt-1">{errors.rol}</p>
          )}
        </div>

        {/* Luego el resto de campos */}
        {campos
          .filter((campo) => campo.id !== "cedula") // Ya pusimos cédula arriba
          .map((campo) => (
            <div key={campo.id}>
              <label
                htmlFor={campo.id}
                className={`block font-medium mb-1 text-pantone1 ${
                  submitted && errors[campo.id]
                    ? "after:content-['*'] after:ml-1 after:text-red-500"
                    : ""
                }`}
              >
                {campo.label}
              </label>
              <input
                id={campo.id}
                type={campo.type}
                placeholder={campo.placeholder}
                value={formData[campo.id]}
                onChange={handleChange}
                className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pantone2 transition ${
                  submitted && errors[campo.id] ? "border-red-500" : "border-pantone1"
                }`}
              />
              {errors[campo.id] && (
                <p className="text-red-500 text-xs mt-1">{errors[campo.id]}</p>
              )}
            </div>
          ))}
        <div>
          <label
            htmlFor="facultad"
            className={`block font-medium mb-1 text-pantone1 ${
              submitted && errors.facultad
                ? "after:content-['*'] after:ml-1 after:text-red-500"
                : ""
            }`}
          >
            Facultad
          </label>
          <select
            id="facultad"
            value={formData.facultad}
            onChange={handleChange}
            className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pantone2 transition ${
              submitted && errors.facultad ? "border-red-500" : "border-pantone1"
            }`}
          >
            <option value="">Seleccione una facultad</option>
            {carreras.map((carrera) => (
              <option key={carrera} value={carrera}>
                {carrera}
              </option>
            ))}
          </select>
          {submitted && errors.facultad && (
            <p className="text-red-500 text-xs mt-1">{errors.facultad}</p>
          )}
        </div>
        <div className="md:col-span-1">
          <label
            htmlFor="imagen"
            className={`block font-medium mb-1 text-pantone1 ${
              submitted && errors.imagen
                ? "after:content-['*'] after:ml-1 after:text-red-500"
                : ""
            }`}
          >
            Foto de perfil
          </label>
          <input
            id="imagen"
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
          <label
            htmlFor="imagen"
            className="inline-block bg-violet-600 text-white px-4 py-2 rounded-full font-semibold cursor-pointer hover:bg-violet-700 transition"
          >
            Seleccionar archivo
          </label>
          {formData.imagen && (
            <img
              src={formData.imagen}
              alt="preview"
              className="mt-2 h-20 object-contain rounded"
            />
          )}
          {submitted && errors.imagen && (
            <p className="text-red-500 text-xs mt-1">{errors.imagen}</p>
          )}
        </div>
        <div className="md:col-span-1">
          <label
            htmlFor="imagenQR"
            className={`block font-medium mb-1 text-pantone1 ${
              submitted && errors.imagenQR
                ? "after:content-['*'] after:ml-1 after:text-red-500"
                : ""
            }`}
          >
            Foto del QR
          </label>
          <input
            id="imagenQR"
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
          <label
            htmlFor="imagenQR"
            className="inline-block bg-violet-600 text-white px-4 py-2 rounded-full font-semibold cursor-pointer hover:bg-violet-700 transition"
          >
            Seleccionar archivo
          </label>
          {formData.imagenQR && (
            <img
              src={formData.imagenQR}
              alt="preview"
              className="mt-2 h-20 object-contain rounded"
            />
          )}
          {submitted && errors.imagenQR && (
            <p className="text-red-500 text-xs mt-1">{errors.imagenQR}</p>
          )}
        </div>
      </div>
      <button
        type="submit"
        className="w-full mt-8 py-2 bg-pantone2 text-pantone1 font-bold rounded hover:bg-pantone1 hover:text-pantone2 transition"
      >
        Registrarse
      </button>
    </form>
>>>>>>> register_usuarios
  );
};

export default RegisterForm;
<<<<<<< HEAD
=======


>>>>>>> register_usuarios
