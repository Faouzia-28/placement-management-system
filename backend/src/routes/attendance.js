const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.post('/:id/mark', authenticateToken, authorizeRoles('COORDINATOR'), attendanceController.mark);
router.get('/:id/list', authenticateToken, authorizeRoles('COORDINATOR','HEAD'), attendanceController.list);
router.post('/:id/publish', authenticateToken, authorizeRoles('COORDINATOR'), attendanceController.publish);
router.get('/:id/download-csv', authenticateToken, authorizeRoles('COORDINATOR','HEAD'), attendanceController.downloadCsv);

module.exports = router;
