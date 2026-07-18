const express = require("express");
const { createUploadMiddleware } = require("../middlewares/upload");

const router = express.Router();

const respondWithFile = (req, res) => {
  return res.status(201).json({
    status: "success",
    path: req.file.publicPath,
    file: {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename,
    },
  });
};

router.post("/profile", createUploadMiddleware("profile"), respondWithFile);
router.post("/qr", createUploadMiddleware("qr"), respondWithFile);
router.post("/document", createUploadMiddleware("document"), respondWithFile);

module.exports = router;
