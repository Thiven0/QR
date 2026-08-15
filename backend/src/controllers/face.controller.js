const { User } = require("../models/user.model");
const { FaceRecognitionLog } = require("../models/face-recognition-log.model");
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

const ensureDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getStartOfDay = (value) => {
  const date = ensureDate(value);
  if (!date) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const getEndOfDay = (value) => {
  const date = ensureDate(value);
  if (!date) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};

const formatDateKey = (value) => {
  const date = ensureDate(value);
  if (!date) return null;
  return date.toISOString().slice(0, 10);
};

const buildDateLabel = (value) => {
  const date = ensureDate(value);
  if (!date) return "";
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
  });
};

const createFaceRecognitionLog = async (payload) => {
  try {
    return await FaceRecognitionLog.create(payload);
  } catch (error) {
    logger.warn("No fue posible persistir el intento de reconocimiento facial", {
      error: error.message,
      payloadStatus: payload?.status,
      actorId: payload?.actor,
    });
    return null;
  }
};

const buildScoreBands = (attempts = []) => {
  const bands = [
    { label: "< 0.40", min: -Infinity, max: 0.4, count: 0 },
    { label: "0.40 - 0.49", min: 0.4, max: 0.5, count: 0 },
    { label: "0.50 - 0.59", min: 0.5, max: 0.6, count: 0 },
    { label: "0.60 - 0.69", min: 0.6, max: 0.7, count: 0 },
    { label: ">= 0.70", min: 0.7, max: Infinity, count: 0 },
  ];

  for (const attempt of attempts) {
    if (!Number.isFinite(attempt.score)) continue;
    const band = bands.find((item) => attempt.score >= item.min && attempt.score < item.max);
    if (band) band.count += 1;
  }

  return bands.map(({ label, count }) => ({ label, count }));
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

    const forceReEnroll = req.body?.force === true || req.body?.force === "true";

    if (user.faceRegistered && !forceReEnroll) {
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
        timings: extraction.timings || {},
        actorId: req.user?.id,
    });

    return res.status(200).json({
      status: "success",
      message: forceReEnroll ? "Rostro actualizado correctamente" : "Rostro registrado correctamente",
      data: {
        user: sanitizeUser(updatedUser),
        embeddingDimensions: extraction.embedding_dimensions,
        detectionScore: extraction.detection_score,
        timings: extraction.timings || {},
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
      const faceRecognitionLog = await createFaceRecognitionLog({
        actor: req.user?.id || null,
        matchedUser: null,
        status: "unmatched",
        match: false,
        score: null,
        threshold: FACE_MATCH_THRESHOLD,
        detectionScore: extraction.detection_score ?? null,
        comparedProfiles: 0,
        errorMessage: null,
      });

      logger.warn("Intento de identificacion sin perfiles enrolados", {
        actorId: req.user?.id,
      });
      return res.status(200).json({
        status: "success",
        data: {
          match: false,
          user: null,
          userId: null,
          faceRecognitionLogId: faceRecognitionLog ? String(faceRecognitionLog._id) : null,
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

    const faceRecognitionLog = await createFaceRecognitionLog({
      actor: req.user?.id || null,
      matchedUser: matched ? bestMatch.user._id : null,
      status: matched ? "matched" : "unmatched",
      match: matched,
      score: bestMatch ? Number(bestMatch.score.toFixed(6)) : null,
      threshold: FACE_MATCH_THRESHOLD,
      detectionScore: extraction.detection_score ?? null,
      comparedProfiles: users.length,
      errorMessage: null,
    });

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
        faceRecognitionLogId: faceRecognitionLog ? String(faceRecognitionLog._id) : null,
        score: bestMatch ? Number(bestMatch.score.toFixed(6)) : null,
        threshold: FACE_MATCH_THRESHOLD,
        detectionScore: extraction.detection_score,
        comparedProfiles: users.length,
      },
    });
  } catch (error) {
    if (req.body?.image && String(req.body.image).trim()) {
      await createFaceRecognitionLog({
        actor: req.user?.id || null,
        matchedUser: null,
        status: "error",
        match: false,
        score: null,
        threshold: FACE_MATCH_THRESHOLD,
        detectionScore: null,
        comparedProfiles: 0,
        errorMessage: error.message || "No fue posible identificar el rostro",
      });
    }

    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "No fue posible identificar el rostro",
      details: error.payload,
    });
  }
};

const getFaceStats = async (req, res) => {
  try {
    const startDate = getStartOfDay(req.query?.start);
    const endDate = getEndOfDay(req.query?.end);
    const facultyFilter = String(req.query?.faculty || "").trim().toLowerCase();
    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const attempts = await FaceRecognitionLog.find(query)
      .sort({ createdAt: -1 })
      .populate("matchedUser", "nombre apellido email cedula facultad permisoSistema rolAcademico estado")
      .populate("actor", "nombre apellido email permisoSistema");

    const filteredAttempts = facultyFilter
      ? attempts.filter((attempt) => {
          const faculty = String(attempt?.matchedUser?.facultad || "").trim().toLowerCase();
          return faculty && faculty === facultyFilter;
        })
      : attempts;

    const totalAttempts = filteredAttempts.length;
    const matchedAttempts = filteredAttempts.filter((attempt) => attempt.status === "matched");
    const unmatchedAttempts = filteredAttempts.filter((attempt) => attempt.status === "unmatched");
    const errorAttempts = filteredAttempts.filter((attempt) => attempt.status === "error");
    const scores = matchedAttempts.map((attempt) => Number(attempt.score)).filter(Number.isFinite);
    const detectionScores = filteredAttempts.map((attempt) => Number(attempt.detectionScore)).filter(Number.isFinite);
    const comparedProfiles = filteredAttempts.map((attempt) => Number(attempt.comparedProfiles)).filter(Number.isFinite);

    const rangeDates = [];
    if (startDate && endDate && startDate <= endDate) {
      for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
        rangeDates.push(new Date(cursor));
      }
    }

    const dailyMap = filteredAttempts.reduce((acc, attempt) => {
      const key = formatDateKey(attempt.createdAt);
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = { date: key, label: buildDateLabel(key), total: 0, matched: 0, unmatched: 0, error: 0 };
      }

      acc[key].total += 1;
      if (attempt.status === "matched") acc[key].matched += 1;
      if (attempt.status === "unmatched") acc[key].unmatched += 1;
      if (attempt.status === "error") acc[key].error += 1;
      return acc;
    }, {});

    for (const date of rangeDates) {
      const key = formatDateKey(date);
      if (!dailyMap[key]) {
        dailyMap[key] = { date: key, label: buildDateLabel(date), total: 0, matched: 0, unmatched: 0, error: 0 };
      }
    }

    const dailySeries = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date));

    const topMatchedUsers = Object.values(
      matchedAttempts.reduce((acc, attempt) => {
        const user = attempt.matchedUser;
        if (!user?._id) return acc;
        const key = String(user._id);
        if (!acc[key]) {
          acc[key] = {
            userId: key,
            nombre: [user.nombre, user.apellido].filter(Boolean).join(" ").trim() || user.email || user.cedula || "Usuario sin nombre",
            facultad: user.facultad || "Sin facultad",
            count: 0,
            totalScore: 0,
          };
        }

        acc[key].count += 1;
        acc[key].totalScore += Number(attempt.score) || 0;
        return acc;
      }, {})
    )
      .map((item) => ({
        ...item,
        averageScore: item.count ? Number((item.totalScore / item.count).toFixed(4)) : 0,
      }))
      .sort((a, b) => b.count - a.count || b.averageScore - a.averageScore)
      .slice(0, 5);

    const recentAttempts = filteredAttempts.slice(0, 8).map((attempt) => ({
      id: String(attempt._id),
      createdAt: attempt.createdAt,
      status: attempt.status,
      match: attempt.match,
      score: Number.isFinite(attempt.score) ? Number(attempt.score.toFixed(4)) : null,
      threshold: attempt.threshold,
      detectionScore: Number.isFinite(attempt.detectionScore) ? Number(attempt.detectionScore.toFixed(4)) : null,
      comparedProfiles: attempt.comparedProfiles,
      errorMessage: attempt.errorMessage,
      matchedUser: attempt.matchedUser
        ? {
            id: String(attempt.matchedUser._id),
            nombre: [attempt.matchedUser.nombre, attempt.matchedUser.apellido].filter(Boolean).join(" ").trim(),
            facultad: attempt.matchedUser.facultad || "Sin facultad",
            rolAcademico: attempt.matchedUser.rolAcademico || "Sin rol",
          }
        : null,
      actor: attempt.actor
        ? {
            id: String(attempt.actor._id),
            nombre: [attempt.actor.nombre, attempt.actor.apellido].filter(Boolean).join(" ").trim(),
            permisoSistema: attempt.actor.permisoSistema || "Sin permiso",
          }
        : null,
    }));

    return res.status(200).json({
      status: "success",
      data: {
        summary: {
          totalAttempts,
          matchedAttempts: matchedAttempts.length,
          unmatchedAttempts: unmatchedAttempts.length,
          errorAttempts: errorAttempts.length,
          successRate: totalAttempts ? Number(((matchedAttempts.length / totalAttempts) * 100).toFixed(2)) : 0,
          averageScore: scores.length
            ? Number((scores.reduce((acc, value) => acc + value, 0) / scores.length).toFixed(4))
            : 0,
          averageDetectionScore: detectionScores.length
            ? Number((detectionScores.reduce((acc, value) => acc + value, 0) / detectionScores.length).toFixed(4))
            : 0,
          averageComparedProfiles: comparedProfiles.length
            ? Number((comparedProfiles.reduce((acc, value) => acc + value, 0) / comparedProfiles.length).toFixed(2))
            : 0,
        },
        dailySeries,
        scoreBands: buildScoreBands(filteredAttempts),
        topMatchedUsers,
        recentAttempts,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "No fue posible obtener las estadisticas faciales",
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
        timings: extraction.timings || {},
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
  getFaceStats,
  extractFaceEmbedding,
};
