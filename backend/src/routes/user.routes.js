const express = require("express");
const authMiddleware = require("../middlewares/auth");
const userController = require("../controllers/user.controller");
const vehicleController = require("../controllers/vehicle.controller");

const router = express.Router();

router.post("/", authMiddleware(["Administrador", "Celador"]), userController.createUser);
router.get("/", authMiddleware(["Administrador", "Celador"]), userController.listUsers);
router.get("/summary", authMiddleware(["Administrador", "Celador"]), userController.getUsersSummary);
router.put("/:id", authMiddleware(["Administrador"]), userController.updateUser);
router.delete("/:id", authMiddleware(["Administrador"]), userController.deleteUser);
router.post("/toggle-access", authMiddleware(["Administrador", "Celador"]), userController.toggleAccessByCedula);
router.post("/parse-scan", authMiddleware(["Administrador", "Celador"]), userController.parseScannedData);
router.post("/parse-qr", authMiddleware(["Administrador", "Celador"]), userController.parseQrData);
router.post("/validate-scan", authMiddleware(["Administrador", "Celador"]), userController.validateScannedUser);
router.get("/:userId/vehicles", authMiddleware(["Administrador", "Celador"]), vehicleController.listVehiclesByUser);

module.exports = router;
