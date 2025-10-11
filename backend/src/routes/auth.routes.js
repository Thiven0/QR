const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router.post('/login', authController.login);
router.post('/token', authController.issueToken);
router.get('/profile', authMiddleware(), authController.profile);

module.exports = router;
