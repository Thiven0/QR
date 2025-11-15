const express = require("express");
const visitorController = require("../controllers/visitor.controller");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

router.post("/register", visitorController.registerVisitor);
router.post("/ocr", visitorController.extractVisitorDocumentData);
router.post("/expire", authMiddleware(), visitorController.expireVisitorSession);
router.post(
  "/reactivate",
  authMiddleware(['Administrador', 'Celador']),
  visitorController.reactivateVisitorTicket
);
router.get(
  "/tickets",
  authMiddleware(['Administrador', 'Celador']),
  visitorController.listVisitorTickets
);

module.exports = router;
