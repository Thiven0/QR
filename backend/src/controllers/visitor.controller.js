const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { User } = require("../models/user.model");
const VisitorTicket = require("../models/visitor-ticket.model");
const { extractEmbedding } = require("../services/face.service");
const { serializeVisitorTicket } = require("../utils/visitorTicket");
const Registro = require("../models/entry-exit.model");
const { extractDocumentDataFromImage } = require("../services/ocr.service");
const createLogger = require("../utils/logger");

const VISITOR_ROLE = "Visitante";
const VISITOR_PERMISSION = "Usuario";
const DEFAULT_TICKETS_LIMIT = Number(process.env.VISITOR_TICKETS_PAGE_SIZE || 10);
const MAX_TICKETS_LIMIT = Number(process.env.VISITOR_TICKETS_MAX_SIZE || 100);
const logger = createLogger("visitor-controller");
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

const resolveFaceRegistration = async (payload = {}) => {
  const faceDescriptor = Array.isArray(payload.faceDescriptor) ? payload.faceDescriptor : [];
  const normalizedImage = typeof payload.faceImage === "string" ? payload.faceImage.trim() : "";

  if (faceDescriptor.length) {
    return {
      faceDescriptor,
      faceRegistered: true,
      faceDescriptorUpdatedAt: new Date(),
      result: {
        registered: true,
        status: "ready",
        message: "Embedding facial listo para guardar",
      },
    };
  }

  if (!normalizedImage) {
    return {
      result: {
        registered: false,
        status: "skipped",
        message: "No se envio imagen facial para enrolamiento",
      },
    };
  }

  try {
    const extraction = await extractEmbedding(normalizedImage);
    return {
      faceDescriptor: extraction.embedding,
      faceRegistered: true,
      faceDescriptorUpdatedAt: new Date(),
      result: {
        registered: true,
        status: "registered",
        message: "Rostro registrado correctamente durante la creacion de la visita",
        detectionScore: extraction.detection_score,
        embeddingDimensions: extraction.embedding_dimensions,
      },
    };
  } catch (error) {
    logger.warn("No fue posible registrar el rostro durante la creacion de la visita", {
      error: error.message,
      statusCode: error.statusCode,
    });

    return {
      result: {
        registered: false,
        status: "unavailable",
        message: error.message || "No fue posible registrar el rostro en este momento",
      },
      warning: "La visita fue creada sin embedding facial. Puedes actualizar el rostro mas tarde desde el directorio de usuarios.",
    };
  }
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
      faceDescriptor,
      faceImage,
    } = req.body || {};
    const metadataPayload =
      req.body?.documentMetadata || req.body?.documentData || req.body?.documentInfo;

    if (!nombre || !email || !password || !imagen) {
      return res.status(400).json({
        status: "error",
        message: "Nombre, email, contrasena e imagen de perfil son obligatorios",
      });
    }

    if (!documentImage || typeof documentImage !== "string") {
      return res.status(400).json({
        status: "error",
        message: "La fotografia de la cedula es obligatoria",
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

    const warnings = [];
    const faceRegistration = await resolveFaceRegistration({
      faceDescriptor,
      faceImage: faceImage || imagen,
    });

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

    if (faceRegistration.faceDescriptor?.length) {
      visitorUser.faceDescriptor = faceRegistration.faceDescriptor;
      visitorUser.faceRegistered = true;
      visitorUser.faceDescriptorUpdatedAt = faceRegistration.faceDescriptorUpdatedAt;
    }

    if (documentIdentity) {
      visitorUser.documentIdentity = documentIdentity;
    }

    if (faceRegistration.warning) {
      warnings.push(faceRegistration.warning);
    }

    const savedVisitor = await visitorUser.save();

    const ticketPayload = buildTicketPayload(savedVisitor._id);
    const ticket = await VisitorTicket.create(ticketPayload);

    const responseUser = sanitizeUser(savedVisitor);
    const serializedTicket = serializeVisitorTicket(ticket);

    responseUser.visitorTicket = serializedTicket;

    const response = {
      status: "success",
      message: "Visita registrada correctamente",
      user: responseUser,
      ticket: serializedTicket,
      faceRegistration: faceRegistration.result,
    };

    if (warnings.length) {
      response.warnings = warnings;
    }

    return res.status(201).json(response);
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
