import { useEffect, useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

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
  "Ingenieria Civil",
  "Medicina Veterinaria y Zootecnia",
  "Visitante externo",
  "Otro",
];

const tiposSangre = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const campos = [
  { id: "cedula", label: "Cedula", type: "text" },
  { id: "nombre", label: "Nombre", type: "text" },
  { id: "apellido", label: "Apellido", type: "text" },
  { id: "rh", label: "RH", type: "text" },
  { id: "telefono", label: "Telefono", type: "text" },
  { id: "correo", label: "Correo", type: "email" },
];

const RegisterForm = ({
  onSubmit,
  errors = {},
  onFieldChange = () => {},
  initialValues = {},
  disabledFields = [],
  enablePassword = false,
  submitLabel = "Registrar usuario",
  isSubmitting = false,
  showRoleField = true,
  showQrField = true,
  showBirthDateField = false,
  externalValues = null,
  children = null,
}) => {
  const defaultState = {
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
    imagenQR: "",
    password: "",
    fechaNacimiento: "",
  };

  const [formData, setFormData] = useState({
    ...defaultState,
    ...initialValues,
  });

  const [submitted, setSubmitted] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  useEffect(() => {
    if (!externalValues || typeof externalValues !== "object") return;
    setFormData((prev) => {
      const updates = Object.entries(externalValues).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && prev[key] !== value) {
          acc[key] = value;
        }
        return acc;
      }, {});

      if (!Object.keys(updates).length) {
        return prev;
      }

      return {
        ...prev,
        ...updates,
      };
    });
  }, [externalValues]);

  const isDisabled = (field) => disabledFields.includes(field);

  const handleChange = (e) => {
    const { id, value, type, files } = e.target;

    if (type === "file") {
      onFieldChange(id);
      const file = files?.[0];

      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({
            ...prev,
            [id]: reader.result,
          }));
        };
        reader.readAsDataURL(file);
      }
    } else {
      onFieldChange(id);
      let nextValue = value;

      if (id === "cedula" || id === "telefono") {
        nextValue = nextValue.replace(/\D/g, "");
      }

      setFormData((prev) => ({
        ...prev,
        [id]: nextValue,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    onSubmit(formData);
  };

  const inputBorder = (field) =>
    submitted && errors[field] ? "border-[#b45309]" : "border-slate-200";

  const togglePasswordVisibility = (field) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const camposToRender = enablePassword
    ? [
        ...campos,
        { id: "password", label: "Contraseña", type: "password" },
      ]
    : campos;

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="grid gap-6 sm:grid-cols-2">
        {showRoleField && (
          <div className="sm:col-span-1">
            <label
              htmlFor="rol"
              className="text-sm font-medium text-[#00594e]"
            >
              Rol
            </label>
            <select
              id="rol"
              value={formData.rol}
              onChange={handleChange}
              disabled={isDisabled("rol")}
              className={`mt-2 w-full rounded-lg border ${inputBorder("rol")} bg-white px-3 py-2.5 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70`}
            >
              <option value="">Seleccione un rol</option>
              <option value="Estudiante">Estudiante</option>
              <option value="Profesor">Profesor</option>
              <option value="Egresado">Egresado</option>
              <option value="Visitante">Visitante</option>
              <option value="Usuario">Usuario</option>
            </select>
            {errors.rol && (
              <p className="mt-2 text-xs font-medium text-[#b45309]">{errors.rol}</p>
            )}
          </div>
        )}

        <div className="sm:col-span-1">
          <label
            htmlFor="facultad"
            className="text-sm font-medium text-[#00594e]"
          >
            Facultad
          </label>
          <select
            id="facultad"
            value={formData.facultad}
            onChange={handleChange}
            disabled={isDisabled("facultad")}
            className={`mt-2 w-full rounded-lg border ${inputBorder("facultad")} bg-white px-3 py-2.5 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70`}
          >
            <option value="">Seleccione una facultad</option>
            {carreras.map((carrera) => (
              <option key={carrera} value={carrera}>
                {carrera}
              </option>
            ))}
          </select>
          {errors.facultad && (
            <p className="mt-2 text-xs font-medium text-[#b45309]">{errors.facultad}</p>
          )}
        </div>

        {camposToRender.map((campo) => {
          const isPasswordField = campo.type === "password";
          const isVisible = !!visiblePasswords[campo.id];
          const resolvedType = isPasswordField && isVisible ? "text" : campo.type;

          if (campo.id === "rh") {
            return (
              <div key={campo.id} className="sm:col-span-1">
                <label className="text-sm font-medium text-[#00594e]" htmlFor={campo.id}>
                  {campo.label}
                </label>
                <select
                  id={campo.id}
                  value={formData[campo.id]}
                  onChange={handleChange}
                  disabled={isDisabled(campo.id)}
                  className={`mt-2 w-full rounded-lg border ${inputBorder(campo.id)} bg-white px-3 py-2.5 text-sm text-[#0f172a] shadow-sm focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70`}
                >
                  <option value="">Selecciona el tipo de sangre</option>
                  {tiposSangre.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
                {errors[campo.id] && (
                  <p className="mt-2 text-xs font-medium text-[#b45309]">{errors[campo.id]}</p>
                )}
              </div>
            );
          }

          return (
            <div key={campo.id} className="sm:col-span-1">
              <label className="text-sm font-medium text-[#00594e]" htmlFor={campo.id}>
                {campo.label}
              </label>
              <div className={`mt-2 ${isPasswordField ? "relative" : ""}`}>
                <input
                  id={campo.id}
                  type={resolvedType}
                  value={formData[campo.id]}
                  onChange={handleChange}
                  placeholder={campo.label}
                  disabled={isDisabled(campo.id)}
                  className={`w-full rounded-lg border ${inputBorder(campo.id)} bg-white px-3 py-2.5 text-sm text-[#0f172a] shadow-sm placeholder:text-slate-400 focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70 ${isPasswordField ? "pr-10" : ""}`}
                />
                {isPasswordField && (
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(campo.id)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-[#00594e] focus:outline-none"
                    aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {isVisible ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {errors[campo.id] && (
                <p className="mt-2 text-xs font-medium text-[#b45309]">{errors[campo.id]}</p>
              )}
            </div>
          );
        })}

        {showBirthDateField && (
          <div className="sm:col-span-1">
            <label className="text-sm font-medium text-[#00594e]" htmlFor="fechaNacimiento">
              Fecha de nacimiento
            </label>
            <input
              id="fechaNacimiento"
              type="date"
              value={formData.fechaNacimiento}
              onChange={handleChange}
              className={`mt-2 w-full rounded-lg border ${inputBorder("fechaNacimiento")} bg-white px-3 py-2.5 text-sm text-[#0f172a] shadow-sm placeholder:text-slate-400 focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70`}
              disabled={isDisabled("fechaNacimiento")}
            />
            {errors.fechaNacimiento && (
              <p className="mt-2 text-xs font-medium text-[#b45309]">{errors.fechaNacimiento}</p>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <label className="text-sm font-medium text-[#00594e]" htmlFor="imagen">
            Foto de perfil
          </label>
          <label
            htmlFor="imagen"
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#00594e]/40 bg-[#00594e]/5 px-4 py-3 text-sm font-semibold text-[#00594e] transition hover:bg-[#00594e]/10"
          >
            Seleccionar archivo
          </label>
          <input id="imagen" type="file" accept="image/*" onChange={handleChange} className="hidden" />
          {formData.imagen && (
            <img src={formData.imagen} alt="preview" className="h-20 w-20 rounded-lg object-cover shadow-sm" />
          )}
          {errors.imagen && (
            <p className="text-xs font-medium text-[#b45309]">{errors.imagen}</p>
          )}
        </div>

        {showQrField && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-[#00594e]" htmlFor="imagenQR">
              Imagen del QR
            </label>
            <label
              htmlFor="imagenQR"
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#B5A160]/40 bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030] transition hover:bg-[#B5A160]/20"
            >
              Seleccionar archivo
            </label>
            <input id="imagenQR" type="file" accept="image/*" onChange={handleChange} className="hidden" />
            {formData.imagenQR && (
              <img src={formData.imagenQR} alt="preview" className="h-20 w-20 rounded-lg object-cover shadow-sm" />
            )}
            {errors.imagenQR && (
              <p className="text-xs font-medium text-[#b45309]">{errors.imagenQR}</p>
            )}
          </div>
        )}
      </div>

      {children}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#00594e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitLabel}
      </button>
    </form>
  );
};

export default RegisterForm;
