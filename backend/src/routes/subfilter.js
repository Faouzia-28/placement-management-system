const express = require('express');
const router = express.Router();
const subFilterController = require('../controllers/subFilterController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /subfilter/:id/apply?cgpa_min=&cgpa_max=&branch=&exclude_backlogs=
router.get('/:id/apply', authenticateToken, authorizeRoles('COORDINATOR'), subFilterController.applySubFilter);

module.exports = router;
