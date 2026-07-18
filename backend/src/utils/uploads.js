const fs = require("fs");
const path = require("path");

const UPLOAD_PUBLIC_PREFIX = "/uploads";
const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
const UPLOAD_FOLDERS = {
  profile: "profiles",
  qr: "qr",
  document: "documents",
};

const ensureUploadDirectories = () => {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

  Object.values(UPLOAD_FOLDERS).forEach((folder) => {
    fs.mkdirSync(path.join(UPLOAD_ROOT, folder), { recursive: true });
  });
};

const getUploadFolderName = (kind) => UPLOAD_FOLDERS[kind] || null;

const getUploadDiskPath = (kind) => {
  const folder = getUploadFolderName(kind);
  if (!folder) {
    throw new Error(`Tipo de upload no soportado: ${kind}`);
  }
  return path.join(UPLOAD_ROOT, folder);
};

const getUploadPublicPath = (kind, filename) => {
  const folder = getUploadFolderName(kind);
  if (!folder) {
    throw new Error(`Tipo de upload no soportado: ${kind}`);
  }
  return `${UPLOAD_PUBLIC_PREFIX}/${folder}/${filename}`;
};

module.exports = {
  UPLOAD_PUBLIC_PREFIX,
  UPLOAD_ROOT,
  UPLOAD_FOLDERS,
  ensureUploadDirectories,
  getUploadDiskPath,
  getUploadPublicPath,
};
