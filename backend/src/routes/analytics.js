const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

router.get('/summary', analyticsController.summary);
router.get('/drives-over-time', analyticsController.drivesOverTime);
router.get('/registrations-by-drive', analyticsController.registrationsByDrive);
router.get('/attendance-trend', analyticsController.attendanceTrend);

module.exports = router;
