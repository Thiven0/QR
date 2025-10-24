const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  cedula: {
    type: String,
    required: true
  },
  rol: {
    type: String,
    required: true
  },
  nombre: {
    type: String,
    required: true
  },
  apellido: {
    type: String,
    required: true
  },
  RH: {
    type: String,
    required: true
  },
  facultad: {
    type: String,
    required: true
  },
  telefono: {
    type: String,
    required: true
  },
  correo: {
    type: String,
    required: true
  },
  estado: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  imagen: {
    type: String,
    required: false,
  },
  imagenQR: {
    type: String,
    required: false,
  }
});

const Usuario = mongoose.model('Usuario', usuarioSchema, 'usuarios');

module.exports = Usuario;
