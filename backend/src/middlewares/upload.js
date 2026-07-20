const crypto = require("crypto");
const path = require("path");
const multer = require("multer");
const {
  ensureUploadDirectories,
  getUploadDiskPath,
  getUploadPublicPath,
  UPLOAD_FOLDERS,
} = require("../utils/uploads");

const MAX_UPLOAD_SIZE_BYTES = Number(process.env.UPLOAD_MAX_SIZE_BYTES || 5 * 1024 * 1024);
const ALLOWED_MIME_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

ensureUploadDirectories();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      cb(null, getUploadDiskPath(req.uploadKind));
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const extension = ALLOWED_MIME_TYPES[file.mimetype] || path.extname(file.originalname || "") || ".bin";
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    cb(null, `${req.uploadKind}-${uniqueSuffix}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
      return;
    }
    cb(null, true);
  },
});

const createUploadMiddleware = (kind, fieldName = "file") => {
  if (!Object.prototype.hasOwnProperty.call(UPLOAD_FOLDERS, kind)) {
    throw new Error(`Tipo de upload no soportado: ${kind}`);
  }

  const singleUpload = upload.single(fieldName);

  return (req, res, next) => {
    req.uploadKind = kind;

    singleUpload(req, res, (error) => {
      if (error) {
        const isFileTooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
        const message = isFileTooLarge
          ? `El archivo supera el limite de ${Math.floor(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))}MB`
          : "Solo se permiten imagenes JPG, PNG o WEBP";

        return res.status(400).json({
          status: "error",
          message,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "Debes adjuntar un archivo de imagen",
        });
      }

      req.file.publicPath = getUploadPublicPath(kind, req.file.filename);
      return next();
    });
  };
};

module.exports = {
  createUploadMiddleware,
};
