const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { UPLOAD_ROOT } = require("./uploads");

const DEFAULT_CAPTURE_DIR = path.resolve(__dirname, "../../private/face-captures");
const configuredCaptureDir = String(process.env.FACE_CAPTURE_DIR || "").trim();
const FACE_CAPTURE_DIR = configuredCaptureDir
  ? path.isAbsolute(configuredCaptureDir)
    ? path.resolve(configuredCaptureDir)
    : path.resolve(__dirname, "../..", configuredCaptureDir)
  : DEFAULT_CAPTURE_DIR;
const MAX_CAPTURE_BYTES = Number(process.env.FACE_CAPTURE_MAX_BYTES || 5 * 1024 * 1024);

const relativeToPublicUploads = path.relative(UPLOAD_ROOT, FACE_CAPTURE_DIR);
if (!relativeToPublicUploads || (!relativeToPublicUploads.startsWith("..") && !path.isAbsolute(relativeToPublicUploads))) {
  throw new Error("FACE_CAPTURE_DIR debe estar fuera del directorio publico de uploads");
}

const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const hasExpectedSignature = (mimeType, buffer) => {
  if (mimeType === "image/jpeg") return buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
};

const parseImageDataUrl = (value) => {
  const match = String(value || "").trim().match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\r\n]+)$/i);
  if (!match) {
    throw new Error("La captura facial no tiene un formato de imagen valido");
  }

  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length) {
    throw new Error("La captura facial esta vacia");
  }
  if (!hasExpectedSignature(mimeType, buffer)) {
    throw new Error("El contenido de la captura facial no corresponde al formato indicado");
  }
  if (buffer.length > MAX_CAPTURE_BYTES) {
    throw new Error("La captura facial supera el tamano maximo permitido");
  }

  return { mimeType, buffer };
};

const saveFaceCapture = async (dataUrl) => {
  const { mimeType, buffer } = parseImageDataUrl(dataUrl);
  const fileName = `${Date.now()}-${crypto.randomBytes(18).toString("hex")}${MIME_EXTENSIONS[mimeType]}`;

  await fs.promises.mkdir(FACE_CAPTURE_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(FACE_CAPTURE_DIR, fileName), buffer, { flag: "wx" });

  return {
    captureFileName: fileName,
    hasCapture: true,
    captureMimeType: mimeType,
    captureSize: buffer.length,
    captureStoredAt: new Date(),
    captureStorageError: null,
  };
};

const resolveFaceCapturePath = (fileName) => {
  const normalized = path.basename(String(fileName || ""));
  if (!normalized || normalized !== fileName) {
    throw new Error("Nombre de captura facial no valido");
  }

  const resolved = path.resolve(FACE_CAPTURE_DIR, normalized);
  const relative = path.relative(FACE_CAPTURE_DIR, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Ruta de captura facial no valida");
  }
  return resolved;
};

module.exports = {
  FACE_CAPTURE_DIR,
  saveFaceCapture,
  resolveFaceCapturePath,
};
