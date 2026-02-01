const express = require('express');
const router = express.Router();
const driveController = require('../controllers/driveController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');
const eligibilityService = require('../services/eligibilityService');

router.get('/', authenticateToken, driveController.listDrives);
router.get('/:id', authenticateToken, driveController.getDrive);
router.post('/', authenticateToken, authorizeRoles('HEAD'), upload.single('pdf'), driveController.createDrive);
router.delete('/:id', authenticateToken, authorizeRoles('HEAD'), driveController.deleteDrive);

// Manual trigger eligibility filtering for a drive
router.post('/:id/trigger-eligibility', authenticateToken, authorizeRoles('HEAD'), async (req, res) => {
	try {
		const driveId = req.params.id;
		const pool = require('../db/pool');
    
		// Get drive details
		const driveResult = await pool.query('SELECT * FROM placement_drives WHERE drive_id = $1', [driveId]);
		if (!driveResult.rows.length) {
			return res.status(404).json({ message: 'Drive not found' });
		}
    
		const drive = driveResult.rows[0];
    
		// Run eligibility filtering
		await eligibilityService.filterAndStoreEligibility({
			drive_id: driveId,
			min_cgpa: drive.min_cgpa,
			min_10th: drive.min_10th,
			min_12th: drive.min_12th,
			max_backlogs: drive.max_backlogs,
			filtered_by: (req.user?.role === 'COORDINATOR') ? req.user.user_id : null
		});
    
		res.json({ message: 'Eligibility filtering triggered successfully' });
	} catch (e) {
		console.error(e);
		res.status(500).json({ message: 'Error triggering eligibility: ' + e.message });
	}
});

// Publish drive (make visible to students/staff)
router.post('/:id/publish', authenticateToken, authorizeRoles('COORDINATOR','HEAD'), driveController.publishDrive);

// Stop registrations and move to attendance phase
router.post('/:id/stop-registrations', authenticateToken, authorizeRoles('COORDINATOR'), driveController.stopRegistrations);

module.exports = router;
