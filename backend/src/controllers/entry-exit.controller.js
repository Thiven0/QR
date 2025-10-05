const Registro = require("../models/entry-exit.model.js");

// Crear un nuevo registro
exports.createRegistro = async (req, res) => {
  try {
    const nuevoRegistro = new Registro(req.body);
    await nuevoRegistro.save();
    res.status(201).json({ message: "Registro creado con éxito", registro: nuevoRegistro });
  } catch (error) {
    res.status(400).json({ message: "Error al crear registro", error: error.message });
  }
};

// Obtener todos los registros (con datos de usuario y admin)
exports.getRegistros = async (req, res) => {
  try {
    const registros = await Registro.find()
      .populate("usuario", "nombre apellido email")    
      .populate("administrador", "nombre cargo email");  

    res.status(200).json(registros);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener registros", error: error.message });
  }
};

// Obtener un registro por ID
exports.getRegistroById = async (req, res) => {
  try {
    const registro = await Registro.findById(req.params.id)
      .populate("usuario", "nombre apellido email")
      .populate("administrador", "nombre cargo email");

    if (!registro) return res.status(404).json({ message: "Registro no encontrado" });
    res.status(200).json(registro);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener registro", error: error.message });
  }
};

// Actualizar un registro
exports.updateRegistro = async (req, res) => {
  try {
    const registroActualizado = await Registro.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("usuario", "nombre apellido email")
     .populate("administrador", "nombre cargo email");

    if (!registroActualizado) return res.status(404).json({ message: "Registro no encontrado" });
    res.status(200).json({ message: "Registro actualizado", registro: registroActualizado });
  } catch (error) {
    res.status(400).json({ message: "Error al actualizar registro", error: error.message });
  }
};

// Eliminar un registro
exports.deleteRegistro = async (req, res) => {
  try {
    const registroEliminado = await Registro.findByIdAndDelete(req.params.id);
    if (!registroEliminado) return res.status(404).json({ message: "Registro no encontrado" });
    res.status(200).json({ message: "Registro eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar registro", error: error.message });
  }
};
