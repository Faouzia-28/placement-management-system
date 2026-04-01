const pool = require('../src/db/pool');
const bcrypt = require('bcrypt');

async function debug() {
  try {
    console.log('🔍 Checking database for users...');
    const users = await pool.query('SELECT user_id, email, password_hash FROM users LIMIT 3');
    console.log('Found users:', users.rows);
    
    if (users.rows.length === 0) {
      console.log('❌ No users found!');
      process.exit(1);
    }
    
    const firstUser = users.rows[0];
    console.log(`\n🧪 Testing bcrypt with user: ${firstUser.email}`);
    console.log('Hash:', firstUser.password_hash);
    
    const isValidPassword = await bcrypt.compare('password123', firstUser.password_hash);
    console.log(`✓ Password verification result: ${isValidPassword}`);
    
    if (!isValidPassword) {
      console.log('❌ Password does not match!');
    } else {
      console.log('✅ Password matches! Authentication should work.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

debug();
