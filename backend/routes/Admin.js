const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/guardController")


router.get("/prueba",AdminController.prueba);
// router.post("/register",AdminController.register);
// router.post("/login",AdminController.login);
// router.post("/qr",AdminController.qr);


module.exports = router