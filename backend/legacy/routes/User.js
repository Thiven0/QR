const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();

const { registerUser, getAllUsers } = require('../controllers/userController');

// ESTA LÍNEA ES CLAVE:
router.post('/register', upload.none(), registerUser);

router.get('/', getAllUsers);

module.exports = router;