const express = require("express");
const authMiddleware = require("../middlewares/auth");
const RegistroController = require("../controllers/entry-exit.controller");

const router = express.Router();
const PROTECTED_ROLES = ["Administrador", "Celador"];

router.get("/alerts", authMiddleware(PROTECTED_ROLES), RegistroController.listAlertas);
router.patch(
  "/:id/alert",
  authMiddleware(PROTECTED_ROLES),
  RegistroController.updateAlertStatus
);

router.post("/", authMiddleware(PROTECTED_ROLES), RegistroController.createRegistro);
router.get("/", authMiddleware(PROTECTED_ROLES), RegistroController.getRegistros);
router.get("/:id", authMiddleware(PROTECTED_ROLES), RegistroController.getRegistroById);
router.put("/:id", authMiddleware(PROTECTED_ROLES), RegistroController.updateRegistro);
router.delete("/:id", authMiddleware(PROTECTED_ROLES), RegistroController.deleteRegistro);

router.post(
  "/from-scan",
  authMiddleware(PROTECTED_ROLES),
  RegistroController.createRegistroFromScan
);
router.post(
  "/reset-scan",
  authMiddleware(PROTECTED_ROLES),
  RegistroController.resetScanData
);

module.exports = router;
