const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { User } = require("../models/user.model");
const VisitorTicket = require("../models/visitor-ticket.model");
const { createToken } = require("../services/token.service");
const { serializeVisitorTicket } = require("../utils/visitorTicket");
const Registro = require("../models/entry-exit.model");
const { Vehicle } = require("../models/vehicle.model");

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

const formatTime = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatDuration = (start, end) => {
  if (!(start instanceof Date) || !(end instanceof Date)) {
    return undefined;
  }

  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return "00:00:00";
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
};

const closeActiveRegistroForVisitor = async (userId, motivo = "ticket_expirado") => {
  if (!userId) return null;

  const registro = await Registro.findOne({
    usuario: userId,
    $or: [{ fechaSalida: null }, { fechaSalida: { $exists: false } }],
  }).sort({ fechaEntrada: -1 });

  if (!registro) return null;

  const now = new Date();
  registro.fechaSalida = now;
  registro.horaSalida = formatTime(now);
  registro.duracionSesion = formatDuration(registro.fechaEntrada, now);
  registro.cierreForzado = true;
  registro.cierreMotivo = motivo;

  await registro.save();

  if (registro.vehiculo) {
    await Vehicle.findByIdAndUpdate(registro.vehiculo, { estado: "inactivo" }).catch(() => {});
  }

  return registro;
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
      estado: "inactivo",
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

    await closeActiveRegistroForVisitor(userId, 'ticket_expirado');

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

const listVisitorTickets = async (_req, res) => {
  try {
    const tickets = await VisitorTicket.find().populate(
      "user",
      "nombre apellido email permisoSistema estado rolAcademico created_at"
    );

    const data = tickets.map((ticket) => {
      const serialized = serializeVisitorTicket(ticket);
      return {
        _id: ticket._id,
        user: ticket.user,
        token: ticket.token,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        expiresAt: ticket.expiresAt,
        status: serialized?.status ?? "unknown",
        isExpired: Boolean(serialized?.isExpired),
        remainingMinutes: serialized?.remainingMinutes ?? 0,
        formattedRemaining: serialized?.formattedRemaining ?? "0h 0m",
      };
    });

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "No fue posible obtener los tickets de visitantes",
      error: error.message,
    });
  }
};

module.exports = {
  registerVisitor,
  expireVisitorSession,
  reactivateVisitorTicket,
  listVisitorTickets,
};
