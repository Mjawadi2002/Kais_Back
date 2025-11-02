const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// create product (client only)
router.post('/', authenticateToken, authorizeRoles('client'), ProductController.createProduct);

// get products (admin or client)
router.get('/', authenticateToken, ProductController.getProducts);

// get product by id
router.get('/:id', authenticateToken, ProductController.getProductById);

// admin assigns a delivery person
router.post('/:id/assign', authenticateToken, authorizeRoles('admin'), ProductController.assignDelivery);

// delivery person (or admin) updates status
router.patch('/:id/status', authenticateToken, authorizeRoles('delivery','admin'), ProductController.updateStatus);

module.exports = router;
