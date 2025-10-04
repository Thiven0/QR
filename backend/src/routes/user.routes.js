const express = require("express");
const authMiddleware = require("../middlewares/auth");
const userController = require("../controllers/user.controller");

const router = express.Router();

router.post("/", authMiddleware(["Administrador", "Celador"]), userController.createUser);
router.get("/", authMiddleware(["Administrador", "Celador"]), userController.listUsers);
router.post("/toggle-access", authMiddleware(["Administrador", "Celador"]), userController.toggleAccessByCedula);

module.exports = router;
