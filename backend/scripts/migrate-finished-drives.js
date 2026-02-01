const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/placement'
});

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'sql', 'create_finished_drives_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running migration: create_finished_drives_table.sql');
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
