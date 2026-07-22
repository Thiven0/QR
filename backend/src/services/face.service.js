const createLogger = require("../utils/logger");
const { performance } = require("perf_hooks");

const logger = createLogger("face-service");
const FACE_SERVICE_URL = (process.env.FACE_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const FACE_SERVICE_TIMEOUT_MS = Number(process.env.FACE_SERVICE_TIMEOUT_MS || 30000);

const buildUrl = (path) => `${FACE_SERVICE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const postJson = async (path, payload) => {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FACE_SERVICE_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawText = await response.text();
    const data = rawText ? JSON.parse(rawText) : {};

    if (!response.ok) {
      const error = new Error(data?.detail || data?.message || "Face service request failed");
      error.statusCode = response.status;
      error.payload = data;
      throw error;
    }

    return {
      ...data,
      timings: {
        ...(data?.timings || {}),
        node_face_service_round_trip_ms: performance.now() - startedAt,
      },
    };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("El servicio facial excedio el tiempo de espera");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    if (!error.statusCode) {
      logger.error("No fue posible comunicarse con el face-service", {
        url: buildUrl(path),
        error: error.message,
      });
      const transportError = new Error("No fue posible comunicarse con el servicio facial");
      transportError.statusCode = 503;
      throw transportError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const extractEmbedding = async (image) => {
  return postJson("/extract-embedding", { image });
};

module.exports = {
  extractEmbedding,
};
