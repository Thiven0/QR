const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const testCaptureDir = fs.mkdtempSync(path.join(os.tmpdir(), "qr-face-captures-"));
process.env.FACE_CAPTURE_DIR = testCaptureDir;

const { FACE_CAPTURE_DIR, saveFaceCapture, resolveFaceCapturePath } = require("../src/utils/face-captures");

test.after(() => {
  fs.rmSync(testCaptureDir, { recursive: true, force: true });
});

test("guarda una captura privada con nombre aleatorio y metadatos", async () => {
  const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const jpegDataUrl = `data:image/jpeg;base64,${jpegBytes.toString("base64")}`;
  const metadata = await saveFaceCapture(jpegDataUrl);
  const storedPath = resolveFaceCapturePath(metadata.captureFileName);

  assert.equal(FACE_CAPTURE_DIR, testCaptureDir);
  assert.equal(metadata.captureMimeType, "image/jpeg");
  assert.equal(metadata.hasCapture, true);
  assert.equal(metadata.captureSize, jpegBytes.length);
  assert.equal(fs.existsSync(storedPath), true);
  assert.equal(path.dirname(storedPath), testCaptureDir);
});

test("rechaza formatos y rutas que no sean capturas validas", async () => {
  await assert.rejects(() => saveFaceCapture("data:text/plain;base64,SG9sYQ=="), /formato de imagen valido/);
  assert.throws(() => resolveFaceCapturePath("../secret.jpg"), /Nombre de captura facial no valido/);
});
