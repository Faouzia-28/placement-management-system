const eligibilityService = require('../services/eligibilityService');
const pool = require('../db/pool');

// Apply coordinator sub-filter to an already-eligible student list
// GET /eligibility/:id/subfilter?cgpa_min=&cgpa_max=&branch=&exclude_backlogs=
async function applySubFilter(req, res) {
  try {
    const drive_id = parseInt(req.params.id);
    const { cgpa_min, cgpa_max, branch, exclude_backlogs } = req.query;

    // Get already-eligible students for this drive
    const q = `
      SELECT 
        u.user_id, u.name, u.email, u.department,
        s.roll_number, s.branch, s.cgpa, s.active_backlogs
      FROM drive_eligibility_results der
      JOIN users u ON der.student_id = u.user_id
      JOIN students s ON s.student_id = u.user_id
      WHERE der.drive_id = $1 AND der.is_eligible = true
      ORDER BY s.cgpa DESC, u.name ASC
    `;
    const { rows: eligible } = await pool.query(q, [drive_id]);

    // Apply coordinator's sub-filters
    let filtered = eligible;

    if (cgpa_min) {
      const min = parseFloat(cgpa_min);
      filtered = filtered.filter(s => s.cgpa >= min);
    }

    if (cgpa_max) {
      const max = parseFloat(cgpa_max);
      filtered = filtered.filter(s => s.cgpa <= max);
    }

    if (branch) {
      filtered = filtered.filter(s => s.branch === branch);
    }

    if (exclude_backlogs) {
      const excludeCount = parseInt(exclude_backlogs);
      filtered = filtered.filter(s => s.active_backlogs < excludeCount);
    }

    res.json({
      total: eligible.length,
      filtered_count: filtered.length,
      students: filtered,
      unique_branches: [...new Set(eligible.map(s => s.branch))]
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error applying sub-filter', error: e.message });
  }
}

module.exports = { applySubFilter };
