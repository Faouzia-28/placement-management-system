const pool = require('../src/db/pool');
const bcrypt = require('bcrypt');

async function manualSeed() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Insert head user
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, department) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, email',
      ['Head User', 'head@college.edu', hashedPassword, 'HEAD', 'Placement']
    );
    
    console.log('✓ User created:', result.rows[0]);
    
    // Verify it was inserted
    const verify = await pool.query('SELECT email, role FROM users WHERE email = $1', ['head@college.edu']);
    console.log('✓ Verified user exists:', verify.rows);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

manualSeed();
