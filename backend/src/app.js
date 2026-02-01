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

const app = express();
app.use(cors());
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

app.get('/', (req,res)=> res.json({ ok: true, msg: 'Placement backend' }));

const port = config.port;
app.listen(port, ()=> console.log('Server running on', port));
