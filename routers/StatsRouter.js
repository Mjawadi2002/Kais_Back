const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/StatsController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// admin-only stats
router.get('/', authenticateToken, authorizeRoles('admin'), StatsController.getStats);

// client stats
router.get('/client', authenticateToken, authorizeRoles('client'), StatsController.getClientStats);

module.exports = router;
