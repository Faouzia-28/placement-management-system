const { Pool } = require('pg');

// Database configuration - using Docker credentials
const pool = new Pool({
  user: process.env.DB_USER || 'placeops',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'placeops_db',
  password: process.env.DB_PASSWORD || 'placeops_pass',
  port: process.env.DB_PORT || 5432,
});

async function checkDriveStatus() {
  try {
    console.log('🔍 Checking current drive status and database schema...\n');
    
    // Check placement_drives table columns
    console.log('📋 Placement Drives Table Columns:');
    const columns = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'placement_drives' 
      ORDER BY ordinal_position
    `);
    
    columns.rows.forEach(row => {
      console.log(`   ${row.column_name} (${row.data_type}) - Default: ${row.column_default || 'NULL'} - Nullable: ${row.is_nullable}`);
    });
    
    // Check current drives and their status
    console.log('\n📊 Current Drives Status:');
    const drives = await pool.query(`
      SELECT drive_id, company_name, job_title, status, auto_published, published_at, attendance_published
      FROM placement_drives 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (drives.rows.length === 0) {
      console.log('   No drives found in database');
    } else {
      drives.rows.forEach(drive => {
        console.log(`   Drive ${drive.drive_id}: ${drive.company_name} - ${drive.job_title}`);
        console.log(`     Status: ${drive.status || 'NULL'}`);
        console.log(`     Auto Published: ${drive.auto_published || 'NULL'}`);
        console.log(`     Published At: ${drive.published_at || 'NULL'}`);
        console.log(`     Attendance Published: ${drive.attendance_published || 'NULL'}`);
        console.log('');
      });
    }
    
    // Check eligibility tables
    console.log('📋 Eligibility Tables:');
    const eligibilityTable = await pool.query(`
      SELECT COUNT(*) as count FROM drive_eligibility_results
    `).catch(() => ({ rows: [{ count: 'TABLE NOT EXISTS' }] }));
    
    const selectionsTable = await pool.query(`
      SELECT COUNT(*) as count FROM drive_coordinator_selections
    `).catch(() => ({ rows: [{ count: 'TABLE NOT EXISTS' }] }));
    
    console.log(`   drive_eligibility_results: ${eligibilityTable.rows[0].count} records`);
    console.log(`   drive_coordinator_selections: ${selectionsTable.rows[0].count} records`);
    
    // Check for missing columns that might cause issues
    console.log('\n🔍 Checking for potential issues:');
    const requiredColumns = ['status', 'auto_published', 'published_at', 'published_by', 'attendance_published'];
    const existingColumns = columns.rows.map(row => row.column_name);
    
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('   ❌ Missing required columns:');
      missingColumns.forEach(col => console.log(`      - ${col}`));
      console.log('\n   💡 Run the fix script: node backend/scripts/apply-drive-fix.js');
    } else {
      console.log('   ✅ All required columns are present');
    }
    
  } catch (error) {
    console.error('❌ Error checking drive status:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the check
checkDriveStatus();