const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.get('/me', AuthController.me);

module.exports = router;
