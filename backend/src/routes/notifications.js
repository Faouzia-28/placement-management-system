const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

router.get('/mine', authenticateToken, notificationController.listMine);
router.patch('/:id/read', authenticateToken, notificationController.markRead);
router.post('/read-all', authenticateToken, notificationController.markAllRead);

module.exports = router;