const express = require('express');
const cors = require('cors');
const config = require('./config');
const path = require('path');

const authRoutes = require('./routes/auth');
const drivesRoutes = require('./routes/drives');
const eligibilityRoutes = require('./routes/eligibility');
const registrationRoutes = require('./routes/registration');
const attendanceRoutes = require('./routes/attendance');
const debugRoutes = require('./routes/debug');
const subFilterRoutes = require('./routes/subfilter');
const domainsRoutes = require('./routes/domains');
const finishedDrivesRoutes = require('./routes/finishedDrives');
const analyticsRoutes = require('./routes/analytics');
const notificationsRoutes = require('./routes/notifications');

const app = express();

// CI/CD Pipeline v1.0 - First automated deployment with ECR integration
const allowedOrigins = (process.env.CORS_ORIGIN || '')
	.split(',')
	.map(origin => origin.trim())
	.filter(Boolean);

app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : undefined));
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/drives', drivesRoutes);
app.use('/api/eligibility', eligibilityRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/_debug', debugRoutes);
app.use('/api/subfilter', subFilterRoutes);
app.use('/api/job-domains', domainsRoutes);
app.use('/api/finished-drives', finishedDrivesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/', (req,res)=> res.json({ ok: true, msg: 'Placement backend' }));

// Centralized error handler for upload and validation failures.
app.use((err, req, res, next) => {
	if (err && err.name === 'MulterError') {
		if (err.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({ message: 'PDF file too large. Max size is 25MB.' });
		}
		return res.status(400).json({ message: err.message || 'File upload failed' });
	}

	if (err && err.message === 'Only PDF files are allowed') {
		return res.status(400).json({ message: err.message });
	}

	if (err) {
		console.error(err);
		return res.status(500).json({ message: 'Server error' });
	}

	next();
});

const port = config.port;
app.listen(port, ()=> console.log('Server running on', port));
