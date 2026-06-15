const { User } = require("../models/user.model");
const { extractEmbedding } = require("../services/face.service");
const createLogger = require("../utils/logger");

const logger = createLogger("face-controller");
const FACE_MATCH_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD || 0.5);

const sanitizeUser = (userDoc) => {
  if (!userDoc) {
    return null;
  }

  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;
  delete user.faceDescriptor;
  return user;
};

const cosineSimilarity = (vectorA = [], vectorB = []) => {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB) || vectorA.length === 0 || vectorA.length !== vectorB.length) {
    return -1;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < vectorA.length; index += 1) {
    const valueA = Number(vectorA[index]) || 0;
    const valueB = Number(vectorB[index]) || 0;
    dotProduct += valueA * valueB;
    magnitudeA += valueA * valueA;
    magnitudeB += valueB * valueB;
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return -1;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
};

const enrollFace = async (req, res) => {
  try {
    const { userId, image } = req.body || {};

    if (!userId || !String(userId).trim() || !image || !String(image).trim()) {
      return res.status(400).json({
        status: "error",
        message: "userId e image son obligatorios",
      });
    }

    const user = await User.findById(userId).select("nombre apellido email estado faceRegistered");
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Usuario no encontrado",
      });
    }

    if (user.faceRegistered) {
      return res.status(409).json({
        status: "error",
        message: "El usuario ya tiene un rostro registrado",
      });
    }

    const extraction = await extractEmbedding(String(image).trim());
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          faceDescriptor: extraction.embedding,
          faceRegistered: true,
          faceDescriptorUpdatedAt: new Date(),
        },
      },
      {
        new: true,
      }
    ).select("nombre apellido email cedula facultad telefono imagen permisoSistema rolAcademico estado faceRegistered faceDescriptorUpdatedAt");

    logger.info("Rostro enrolado", {
        userId: String(user._id),
        embeddingDimensions: extraction.embedding_dimensions,
        detectionScore: extraction.detection_score,
        actorId: req.user?.id,
    });

    return res.status(200).json({
      status: "success",
      message: "Rostro registrado correctamente",
      data: {
        user: sanitizeUser(updatedUser),
        embeddingDimensions: extraction.embedding_dimensions,
        detectionScore: extraction.detection_score,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "No fue posible registrar el rostro",
      details: error.payload,
    });
  }
};

const identifyFace = async (req, res) => {
  try {
    const { image } = req.body || {};
    if (!image || !String(image).trim()) {
      return res.status(400).json({
        status: "error",
        message: "image es obligatoria",
      });
    }

    const extraction = await extractEmbedding(String(image).trim());
    const users = await User.find({ faceRegistered: true, faceDescriptor: { $exists: true, $ne: [] } })
      .select("+faceDescriptor nombre apellido email cedula facultad telefono imagen permisoSistema rolAcademico estado faceRegistered faceDescriptorUpdatedAt");

    if (!users.length) {
      logger.warn("Intento de identificacion sin perfiles enrolados", {
        actorId: req.user?.id,
      });
      return res.status(200).json({
        status: "success",
        data: {
          match: false,
          user: null,
          userId: null,
          score: null,
          threshold: FACE_MATCH_THRESHOLD,
          detectionScore: extraction.detection_score,
          comparedProfiles: 0,
        },
      });
    }

    let bestMatch = null;
    for (const candidate of users) {
      const score = cosineSimilarity(extraction.embedding, candidate.faceDescriptor || []);
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          user: candidate,
          score,
        };
      }
    }

    const matched = Boolean(bestMatch && bestMatch.score >= FACE_MATCH_THRESHOLD);

    logger.info("Resultado de identificacion facial", {
      actorId: req.user?.id,
      matched,
      matchedUserId: matched ? String(bestMatch.user._id) : null,
      score: bestMatch?.score ?? null,
      threshold: FACE_MATCH_THRESHOLD,
      comparedProfiles: users.length,
      detectionScore: extraction.detection_score,
    });

    return res.status(200).json({
      status: "success",
      data: {
        match: matched,
        user: matched ? sanitizeUser(bestMatch.user) : null,
        userId: matched ? String(bestMatch.user._id) : null,
        score: bestMatch ? Number(bestMatch.score.toFixed(6)) : null,
        threshold: FACE_MATCH_THRESHOLD,
        detectionScore: extraction.detection_score,
        comparedProfiles: users.length,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "No fue posible identificar el rostro",
      details: error.payload,
    });
  }
};

const extractFaceEmbedding = async (req, res) => {
  try {
    const { image } = req.body || {};
    if (!image || !String(image).trim()) {
      return res.status(400).json({
        status: "error",
        message: "image es obligatoria",
      });
    }

    const extraction = await extractEmbedding(String(image).trim());

    return res.status(200).json({
      status: "success",
      data: {
        embedding: extraction.embedding,
        embeddingDimensions: extraction.embedding_dimensions,
        detectionScore: extraction.detection_score,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "No fue posible extraer el embedding facial",
      details: error.payload,
    });
  }
};

module.exports = {
  enrollFace,
  identifyFace,
  extractFaceEmbedding,
};
