const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { User } = require("../models/user.model");
const VisitorTicket = require("../models/visitor-ticket.model");
const { createToken } = require("../services/token.service");
const { serializeVisitorTicket } = require("../utils/visitorTicket");
const Registro = require("../models/entry-exit.model");
const { Vehicle } = require("../models/vehicle.model");
const { extractDocumentDataFromImage } = require("../services/ocr.service");

const VISITOR_ROLE = "Visitante";
const VISITOR_PERMISSION = "Usuario";
const VISITOR_SESSION_DAYS = Number(process.env.VISITOR_SESSION_DAYS || 1);
const DEFAULT_TICKETS_LIMIT = Number(process.env.VISITOR_TICKETS_PAGE_SIZE || 10);
const MAX_TICKETS_LIMIT = Number(process.env.VISITOR_TICKETS_MAX_SIZE || 100);
const DEFAULT_DATA_TREATMENT_URL =
  process.env.DATA_TREATMENT_URL ||
  "https://drive.google.com/file/d/1JtSP0Fa19TKU0kzNwhDqC6BQIe2c_JK8/view";
const parsePositiveInt = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Math.min(fallback, max);
  }
  return Math.min(Math.floor(parsed), max);
};
const parseTicketsLimit = (value) =>
  parsePositiveInt(value, DEFAULT_TICKETS_LIMIT, MAX_TICKETS_LIMIT);

const cleanObject = (object = {}) => {
  return Object.entries(object).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        acc[key] = trimmed;
      }
      return acc;
    }
    if (Array.isArray(value)) {
      if (value.length) {
        acc[key] = value;
      }
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
};

const sanitizeUser = (userDoc) => {
  const userObject = userDoc.toObject();
  delete userObject.password;
  return userObject;
};

const parseConsentValue = (candidate) => {
  if (candidate === undefined || candidate === null) {
    return { accepted: false };
  }
  if (typeof candidate === "boolean") {
    return { accepted: candidate };
  }
  if (typeof candidate === "string") {
    const normalized = candidate.trim().toLowerCase();
    return {
      accepted: ["1", "true", "si", "sí", "acepto"].includes(normalized),
    };
  }
  if (typeof candidate === "object") {
    return {
      accepted: Boolean(
        candidate.accepted ?? candidate.isAccepted ?? candidate.value ?? candidate.status
      ),
      documentUrl: candidate.documentUrl || candidate.url || candidate.link,
    };
  }
  return { accepted: false };
};

const resolveDataConsent = (body = {}) => {
  const candidates = [
    body.dataConsent,
    body.dataTreatment,
    body.dataTreatmentConsent,
    body.dataTreatmentAccepted,
    body.dataConsentAccepted,
    body.acceptsDataTreatment,
  ];

  for (const candidate of candidates) {
    const parsed = parseConsentValue(candidate);
    if (parsed.accepted) {
      return {
        accepted: true,
        documentUrl: parsed.documentUrl || DEFAULT_DATA_TREATMENT_URL,
      };
    }
  }

  return {
    accepted: false,
    documentUrl: DEFAULT_DATA_TREATMENT_URL,
  };
};

const sanitizeDocumentMetadata = (metadata = {}, defaults = {}) => {
  if (!metadata || typeof metadata !== "object") {
    metadata = {};
  }

  const normalized = {
    cedula: metadata.cedula || metadata.numero || defaults.cedula,
    nombres: metadata.nombres || metadata.nombre || defaults.nombres || defaults.nombre,
    apellidos: metadata.apellidos || metadata.apellido || defaults.apellidos || defaults.apellido,
    fechaNacimiento:
      metadata.fechaNacimiento ||
      metadata.fecha_nacimiento ||
      metadata.birthDate ||
      defaults.fechaNacimiento,
    rawText: metadata.rawText || metadata.raw_text || metadata.texto,
    confidence:
      typeof metadata.confidence === "number" ? metadata.confidence : undefined,
    fieldsDetected: Array.isArray(metadata.fieldsDetected)
      ? metadata.fieldsDetected.map((field) => String(field)).filter(Boolean).slice(0, 10)
      : undefined,
  };

  return cleanObject(normalized);
};

const buildDocumentIdentityPayload = (
  photo,
  metadata,
  defaults = {}
) => {
  if (!photo) return undefined;
  const payload = {
    photo,
    updatedAt: new Date(),
  };
  const sanitizedMetadata = sanitizeDocumentMetadata(metadata, defaults);
  if (Object.keys(sanitizedMetadata).length) {
    payload.extractedData = sanitizedMetadata;
  }
  return payload;
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
  registro.alertStatus = 'resolved';
  registro.alertResolvedAt = now;

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
      documentImage,
    } = req.body || {};
    const metadataPayload =
      req.body?.documentMetadata || req.body?.documentData || req.body?.documentInfo;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Nombre, email y contrasena son obligatorios",
      });
    }

    if (!documentImage || typeof documentImage !== "string") {
      return res.status(400).json({
        status: "error",
        message: "La fotografia de la cedula es obligatoria",
      });
    }

    const resolvedConsent = resolveDataConsent(req.body || {});
    if (!resolvedConsent.accepted) {
      return res.status(400).json({
        status: "error",
        message: "Debes aceptar el tratamiento de datos personales para continuar",
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

    const documentIdentity = buildDocumentIdentityPayload(documentImage, metadataPayload, {
      cedula,
      nombres: nombre,
      apellidos: apellido,
    });

    const dataConsentPayload = {
      accepted: true,
      acceptedAt: new Date(),
      documentUrl: resolvedConsent.documentUrl || DEFAULT_DATA_TREATMENT_URL,
    };

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

    if (documentIdentity) {
      visitorUser.documentIdentity = documentIdentity;
    }
    visitorUser.dataConsent = dataConsentPayload;

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

    const currentEstado = (user.estado || '').toLowerCase();
    if (currentEstado !== 'bloqueado' && currentEstado !== 'inactivo') {
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

const listVisitorTickets = async (req, res) => {
  try {
    const page = parsePositiveInt(req?.query?.page, 1);
    const limit = parseTicketsLimit(req?.query?.limit);
    const skip = (page - 1) * limit;
    const ticketsPromise = VisitorTicket.find()
      .populate(
        "user",
        "nombre apellido email permisoSistema estado rolAcademico created_at"
      )
      .skip(skip)
      .limit(limit);
    const totalPromise = VisitorTicket.countDocuments();

    const [tickets, total] = await Promise.all([ticketsPromise, totalPromise]);

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

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: skip + data.length < total,
    };

    return res.status(200).json({
      status: "success",
      data,
      pagination,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "No fue posible obtener los tickets de visitantes",
      error: error.message,
    });
  }
};

const extractVisitorDocumentData = async (req, res) => {
  try {
    const image = req.body?.image || req.body?.documentImage;

    if (!image) {
      return res.status(400).json({
        status: "error",
        message: "La imagen de la cedula es obligatoria",
      });
    }

    const data = await extractDocumentDataFromImage(image);

    if (!data.cedula && !data.nombres && !data.apellidos) {
      return res.status(422).json({
        status: "error",
        message: "No fue posible extraer los datos del documento. Intenta con una foto mas clara.",
      });
    }

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    const normalizedMessage = (error.message || "").toLowerCase();
    const isClientError =
      normalizedMessage.includes("obligatoria") ||
      normalizedMessage.includes("limite") ||
      normalizedMessage.includes("leer la imagen");

    return res.status(isClientError ? 400 : 500).json({
      status: "error",
      message: isClientError
        ? error.message
        : "No fue posible procesar el documento. Intenta nuevamente.",
      error: error.message,
    });
  }
};

module.exports = {
  registerVisitor,
  expireVisitorSession,
  reactivateVisitorTicket,
  listVisitorTickets,
  extractVisitorDocumentData,
};
