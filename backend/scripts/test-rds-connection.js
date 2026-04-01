const pg = require('pg');

const connectionString = 'postgresql://faouzia:Placement123%21@placeops-postgres.cfa62u8io0ux.ap-southeast-1.rds.amazonaws.com:5432/placement?sslmode=no-verify';

const pool = new pg.Pool({ connectionString });

async function test() {
  try {
    console.log('🔍 Testing RDS connection...');
    console.log('Connection string:', connectionString);
    
    const result = await pool.query('SELECT version()');
    console.log('✓ Database connected');
    console.log('Database version:', result.rows[0].version);
    
    console.log('\n🔍 Checking users table...');
    const users = await pool.query('SELECT user_id, email, role, name FROM users LIMIT 5');
    console.log('✓ Found', users.rows.length, 'users:');
    users.rows.forEach(u => {
      console.log(`  - ${u.email} (${u.role})`);
    });
    
    console.log('\n✅ Database connection successful!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

test();
