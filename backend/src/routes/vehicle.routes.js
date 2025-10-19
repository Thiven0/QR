const express = require("express");
const authMiddleware = require("../middlewares/auth");
const VehicleController = require("../controllers/vehicle.controller");

const router = express.Router();

router.post(
  "/",
  authMiddleware(["Administrador"]),
  VehicleController.createVehicle
);

router.get(
  "/",
  authMiddleware(["Administrador", "Celador"]),
  VehicleController.listVehicles
);

router.get(
  "/:id",
  authMiddleware(["Administrador"]),
  VehicleController.getVehicle
);

router.put(
  "/:id",
  authMiddleware(["Administrador"]),
  VehicleController.updateVehicle
);

router.delete(
  "/:id",
  authMiddleware(["Administrador"]),
  VehicleController.deleteVehicle
);

router.post(
  "/:id/toggle-status",
  authMiddleware(["Administrador", "Celador"]),
  VehicleController.toggleVehicleStatus
);

module.exports = router;
