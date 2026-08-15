const express = require('express');
const authMiddleware = require('../middlewares/auth');
const turnstileController = require('../controllers/turnstile.controller');

const router = express.Router();
const PROTECTED_ROLES = ['Administrador', 'Celador'];

router.get('/status', authMiddleware(PROTECTED_ROLES), turnstileController.getStatus);
router.post('/open', authMiddleware(PROTECTED_ROLES), turnstileController.open);
router.post('/close', authMiddleware(PROTECTED_ROLES), turnstileController.close);

module.exports = router;
