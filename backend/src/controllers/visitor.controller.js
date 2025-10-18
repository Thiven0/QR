const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { User } = require("../models/user.model");
const VisitorTicket = require("../models/visitor-ticket.model");
const { createToken } = require("../services/token.service");
const { serializeVisitorTicket } = require("../utils/visitorTicket");

const VISITOR_ROLE = "Visitante";
const VISITOR_PERMISSION = "Usuario";
const VISITOR_SESSION_DAYS = Number(process.env.VISITOR_SESSION_DAYS || 1);

const sanitizeUser = (userDoc) => {
  const userObject = userDoc.toObject();
  delete userObject.password;
  return userObject;
};

const buildTicketPayload = (userId) => {
  const ttlMinutes = VisitorTicket.getTicketTtlMinutes();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  return {
    user: userId,
    token: crypto.randomBytes(8).toString("hex"),
    expiresAt,
  };
};

const createVisitorSessionToken = (user) => {
  return createToken({
    userId: user._id,
    nombre: user.nombre,
    apellido: user.apellido,
    email: user.email,
    permisoSistema: user.permisoSistema,
    expiresInDays: Math.max(VISITOR_SESSION_DAYS, 1),
  });
};

const registerVisitor = async (req, res) => {
  try {
    const {
      cedula,
      nombre,
      apellido,
      email,
      password,
      RH,
      facultad,
      telefono,
      imagen,
      imagenQR,
    } = req.body || {};

    if (!nombre || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Nombre, email y contrasena son obligatorios",
      });
    }

    const normalizedEmail = String(email).toLowerCase();

    const duplicateUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        ...(cedula ? [{ cedula }] : []),
      ],
    });

    if (duplicateUser) {
      return res.status(409).json({
        status: "error",
        message: "Ya existe un usuario registrado con estos datos",
      });
    }

    const visitorUser = new User({
      cedula,
      nombre,
      apellido,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      RH,
      facultad,
      telefono,
      imagen,
      imagenQR,
      rolAcademico: VISITOR_ROLE,
      permisoSistema: VISITOR_PERMISSION,
      estado: "activo",
    });

    const savedVisitor = await visitorUser.save();

    const ticketPayload = buildTicketPayload(savedVisitor._id);
    const ticket = await VisitorTicket.create(ticketPayload);

    const responseUser = sanitizeUser(savedVisitor);
    const serializedTicket = serializeVisitorTicket(ticket);
    const sessionToken = createVisitorSessionToken(savedVisitor);

    responseUser.visitorTicket = serializedTicket;

    res.set('Authorization', `Bearer ${sessionToken}`);
    res.set('Access-Control-Expose-Headers', 'Authorization');

    return res.status(201).json({
      status: "success",
      message: "Visita registrada correctamente",
      user: responseUser,
      ticket: serializedTicket,
      token: sessionToken,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "No fue posible registrar la visita",
      error: error.message,
    });
  }
};

const expireVisitorSession = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Sesion no valida",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Usuario no encontrado",
      });
    }

    if ((user.rolAcademico || '').toLowerCase() !== 'visitante') {
      return res.status(403).json({
        status: "error",
        message: "Solo los visitantes pueden expirar tickets temporales",
      });
    }

    const latestTicket = await VisitorTicket.findOne({ user: userId }).sort({ expiresAt: -1 });

    if (latestTicket) {
      latestTicket.expiresAt = new Date(Date.now() - 1000);
      await latestTicket.save();
    }

    if (user.estado !== 'inactivo') {
      user.estado = 'inactivo';
      await user.save();
    }

    return res.status(200).json({
      status: "success",
      message: "Ticket expirado y usuario marcado como inactivo",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "No fue posible expirar el ticket temporal",
      error: error.message,
    });
  }
};

const reactivateVisitorTicket = async (req, res) => {
  try {
    const { userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "El identificador del usuario es obligatorio",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Usuario no encontrado",
      });
    }

    if ((user.rolAcademico || '').toLowerCase() !== 'visitante') {
      return res.status(400).json({
        status: "error",
        message: "Solo los visitantes pueden tener tickets temporales",
      });
    }

    let ticket = await VisitorTicket.findOne({ user: userId }).sort({ expiresAt: -1 });

    if (ticket) {
      const isExpired = ticket.expiresAt && ticket.expiresAt.getTime() <= Date.now();

      if (!isExpired) {
        return res.status(400).json({
          status: "error",
          message: "El ticket aun se encuentra vigente",
        });
      }

      const ttlMinutes = VisitorTicket.getTicketTtlMinutes();
      ticket.token = crypto.randomBytes(8).toString("hex");
      ticket.expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      await ticket.save();
    } else {
      const payload = buildTicketPayload(userId);
      ticket = await VisitorTicket.create(payload);
    }

    if (user.estado !== 'activo') {
      user.estado = 'activo';
      await user.save();
    }

    const serializedTicket = serializeVisitorTicket(ticket);

    return res.status(200).json({
      status: "success",
      message: "Ticket temporal reactivado correctamente",
      ticket: serializedTicket,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "No fue posible reactivar el ticket temporal",
      error: error.message,
    });
  }
};

module.exports = {
  registerVisitor,
  expireVisitorSession,
  reactivateVisitorTicket,
};
