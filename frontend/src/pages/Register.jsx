import { useState } from "react";
import RegisterForm from "../components/RegisterForm";
import AuthLayoutR from "../components/layout/AuthLayoutR";

// Validaciones de formato opcionales (puedes quitarlas si quieres dejar todo al backend)
const validate = (formData) => {
  const newErrors = {};

  // Ejemplo: solo formato, no campos obligatorios
  if (formData.cedula && !/^\d+$/.test(formData.cedula)) newErrors.cedula = "Solo números.";
  if (formData.nombre && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.nombre)) newErrors.nombre = "Solo letras.";
  if (formData.apellido && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.apellido)) newErrors.apellido = "Solo letras.";
  if (formData.telefono && !/^\d+$/.test(formData.telefono)) newErrors.telefono = "Solo números.";
  if (formData.correo && !/\S+@\S+\.\S+/.test(formData.correo)) newErrors.correo = "Correo no válido.";
  if (formData.rh && !/^(A|B|AB|O)[+-]$/.test(formData.rh)) newErrors.rh = "Ej: A+, O-";

  return newErrors;
};

const Register = () => {
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  const handleSubmit = async (formData) => {
    // Solo validaciones de formato, no de campos obligatorios
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSuccess("");
      return;
    }
    try {
      const response = await fetch("http://localhost:3000/api/User/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, RH: formData.rh }),
      });
      const data = await response.json();
      if (response.ok && data.status === "success") {
        setSuccess("Usuario registrado con éxito.");
        setErrors({});
      } else {
        // Si hay errores por campo, pásalos directamente
        setErrors(data.errors || { general: data.message || "Error al registrar usuario." });
        setSuccess("");
      }
    } catch {
      setErrors({ general: "Error de conexión con el servidor." });
      setSuccess("");
    }
  };

  return (
    <AuthLayoutR>
      <RegisterForm onSubmit={handleSubmit} errors={errors} />
      {success && <p className="text-green-600 text-center mt-4">{success}</p>}
      {errors.general && <p className="text-red-600 text-center mt-4">{errors.general}</p>}
    </AuthLayoutR>
  );
};

export default Register;
