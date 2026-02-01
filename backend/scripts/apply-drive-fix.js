const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration - using Docker credentials
const pool = new Pool({
  user: process.env.DB_USER || 'placeops',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'placeops_db',
  password: process.env.DB_PASSWORD || 'placeops_pass',
  port: process.env.DB_PORT || 5432,
});

async function applyDriveFix() {
  try {
    console.log('🔧 Applying drive status fix migrations...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-drive-status-migrations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await pool.query(sql);
    
    console.log('✅ Drive status fix migrations applied successfully!');
    
    // Verify the fix by checking some key columns
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'placement_drives' 
      AND column_name IN ('status', 'auto_published', 'published_at', 'published_by', 'attendance_published')
      ORDER BY column_name
    `);
    
    console.log('📋 Verified columns in placement_drives table:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.column_name}`);
    });
    
    // Check if eligibility tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('drive_eligibility_results', 'drive_coordinator_selections')
      ORDER BY table_name
    `);
    
    console.log('📋 Verified eligibility tables:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    console.log('\n🎉 All drive status issues should now be resolved!');
    console.log('\nNext steps:');
    console.log('1. Restart your backend server');
    console.log('2. Test the drive flow: HEAD post → COORDINATOR publish → STUDENT see eligible');
    
  } catch (error) {
    console.error('❌ Error applying drive fix:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

// Run the fix
applyDriveFix();