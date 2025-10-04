const { Schema, model } = require("mongoose");

const UsuarioSchema = Schema({
    cedula: { type: String, required: false },  // No todos los usuarios la necesitan
    nombre: { type: String, required: true },
    apellido: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // Datos adicionales (solo si aplica, ejemplo profesores/estudiantes)
    RH: { type: String },
    facultad: { type: String },
    telefono: { type: String },
    imagen: { type: String },
    imagenQR: { type: String },

    // Control de acceso al sistema
    rolAcademico: { type: String }, // Profesor, Estudiante, Celador, Administrativo
    permisoSistema: {
        type: String,
        enum: ["Administrador", "Celador", "Usuario"],
        required: true
    },

    estado: { type: String, default: "activo" },
    created_at: { type: Date, default: Date.now }
});

module.exports = model("Users", UsuarioSchema, "users");
