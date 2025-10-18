const express = require("express");
const visitorController = require("../controllers/visitor.controller");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

router.post("/register", visitorController.registerVisitor);
router.post("/expire", authMiddleware(), visitorController.expireVisitorSession);
router.post(
  "/reactivate",
  authMiddleware(['Administrador', 'Celador']),
  visitorController.reactivateVisitorTicket
);

module.exports = router;
