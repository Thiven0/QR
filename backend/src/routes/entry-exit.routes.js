const express = require("express");
const authMiddleware = require("../middlewares/auth");
const RegistroController = require("../controllers/entry-exit.controller");

const router = express.Router();

router.post("/", RegistroController.createRegistro);
router.get("/", RegistroController.getRegistros);
router.get("/:id", RegistroController.getRegistroById);
router.put("/:id", RegistroController.updateRegistro);
router.delete("/:id", RegistroController.deleteRegistro);
router.post("/from-scan", authMiddleware(["Administrador", "Celador"]), RegistroController.createRegistroFromScan);
router.post("/reset-scan", authMiddleware(["Administrador", "Celador"]), RegistroController.resetScanData);

module.exports = router;
