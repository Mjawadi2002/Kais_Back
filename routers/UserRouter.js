const UserController = require('../controllers/UserController');
const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const router = express.Router();

// Only admin users can create new users (clients/delivery persons/admin)
router.post('/users', authenticateToken, authorizeRoles('admin'), UserController.createUser);

// admin: list clients

// admin: list clients
router.get('/clients', authenticateToken, authorizeRoles('admin'), UserController.listClients);
// support frontend path /api/v1/users/clients
router.get('/users/clients', authenticateToken, authorizeRoles('admin'), UserController.listClients);

// admin: list delivery persons
router.get('/delivery-persons', authenticateToken, authorizeRoles('admin'), UserController.listDeliveryPersons);
// support frontend path /api/v1/users/delivery-persons
router.get('/users/delivery-persons', authenticateToken, authorizeRoles('admin'), UserController.listDeliveryPersons);

// admin: list all users, optional ?role=client|delivery|admin
router.get('/users', authenticateToken, authorizeRoles('admin'), UserController.listAllUsers);

// admin: get, update, delete user by id
router.get('/users/:id', authenticateToken, authorizeRoles('admin'), UserController.getUserById);
router.put('/users/:id', authenticateToken, authorizeRoles('admin'), UserController.updateUser);
router.delete('/users/:id', authenticateToken, authorizeRoles('admin'), UserController.deleteUser);

module.exports = router;
    