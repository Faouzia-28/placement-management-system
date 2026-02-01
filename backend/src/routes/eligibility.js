const express = require('express');
const router = express.Router();
const eligibilityController = require('../controllers/eligibilityController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Coordinator filters students for a drive
router.post('/:id/filter', authenticateToken, authorizeRoles('COORDINATOR'), eligibilityController.filterStudents);
router.get('/:id/list', authenticateToken, authorizeRoles('COORDINATOR','HEAD'), eligibilityController.listEligible);
router.get('/mine', authenticateToken, authorizeRoles('STUDENT'), eligibilityController.listMyEligible);

// Check if current student is eligible for a specific drive
router.get('/:id/check', authenticateToken, authorizeRoles('STUDENT'), eligibilityController.checkMyEligibility);

module.exports = router;
