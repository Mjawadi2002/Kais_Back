const express = require('express');
const router = express.Router();
const DeliveryController = require('../controllers/DeliveryController');
const { 
  authMiddleware, 
  requireAdmin, 
  requireAdminOrDelivery,
  requireAdminOrClient 
} = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all deliveries with filtering (admin only for full access)
router.get('/', requireAdmin, DeliveryController.getAllDeliveries);

// Get delivery statistics (admin only)
router.get('/stats', requireAdmin, DeliveryController.getDeliveryStats);

// Get deliveries for specific user (accessible by the user themselves or admin)
router.get('/user/:userId/:role', DeliveryController.getUserDeliveries);

// Get delivery by ID (any authenticated user)
router.get('/:id', DeliveryController.getDeliveryById);

// Create new delivery (admin and client can create)
router.post('/', requireAdminOrClient, DeliveryController.createDelivery);

// Update delivery (admin and delivery person can update)
router.put('/:id', requireAdminOrDelivery, DeliveryController.updateDelivery);

// Delete delivery (admin only)
router.delete('/:id', requireAdmin, DeliveryController.deleteDelivery);

module.exports = router;