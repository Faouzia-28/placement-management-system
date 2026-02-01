const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// Get all job domains
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT domain_id, domain_name FROM job_domains ORDER BY domain_name');
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching job domains' });
  }
});

module.exports = router;
