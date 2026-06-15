const express = require("express");
const authMiddleware = require("../middlewares/auth");
const faceController = require("../controllers/face.controller");

const router = express.Router();

router.post("/enroll", authMiddleware(["Administrador", "Celador"]), faceController.enrollFace);
router.post("/identify", authMiddleware(["Administrador", "Celador"]), faceController.identifyFace);
router.post("/extract", authMiddleware(["Administrador", "Celador"]), faceController.extractFaceEmbedding);

module.exports = router;
