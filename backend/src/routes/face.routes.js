const express = require("express");
const authMiddleware = require("../middlewares/auth");
const faceController = require("../controllers/face.controller");

const router = express.Router();

router.post("/enroll", authMiddleware(["Administrador", "Celador"]), faceController.enrollFace);
router.post("/identify", authMiddleware(["Administrador", "Celador"]), faceController.identifyFace);
router.post("/extract", authMiddleware(["Administrador", "Celador"]), faceController.extractFaceEmbedding);
router.get("/stats", authMiddleware(["Administrador"]), faceController.getFaceStats);
router.get("/logs", authMiddleware(["Administrador", "Celador"]), faceController.getFaceLogs);
router.get("/logs/:id/capture", authMiddleware(["Administrador", "Celador"]), faceController.getFaceLogCapture);

module.exports = router;
