const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/mine', authenticateToken, authorizeRoles('STUDENT'), registrationController.listMyRegistrations);
router.post('/:id/register', authenticateToken, authorizeRoles('STUDENT'), registrationController.register);
router.get('/:id/list', authenticateToken, authorizeRoles('COORDINATOR','HEAD','STAFF'), registrationController.listByDrive);

// Check if current student is registered for a specific drive
router.get('/:id/check', authenticateToken, authorizeRoles('STUDENT'), registrationController.checkMyRegistration);

module.exports = router;
