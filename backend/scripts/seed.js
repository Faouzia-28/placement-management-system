const pool = require('../src/db/pool');
const bcrypt = require('bcrypt');

async function seed(){
  const client = await pool.connect();
  try{
    await client.query('BEGIN');
    
    // Clear existing data (in reverse order of FK dependencies)
    await client.query('DELETE FROM attendance');
    await client.query('DELETE FROM drive_registrations');
    await client.query('DELETE FROM drive_eligibility_results');
    await client.query('DELETE FROM placement_drives');
    await client.query('DELETE FROM job_domains');
    await client.query('DELETE FROM staffs');
    await client.query('DELETE FROM students');
    await client.query('DELETE FROM placement_coordinators');
    await client.query('DELETE FROM placement_head');
    await client.query('DELETE FROM users');
    
    const pwd = await bcrypt.hash('password123', 10);
    // create head
    const u1 = await client.query('INSERT INTO users (name,email,password_hash,role,department) VALUES ($1,$2,$3,$4,$5) RETURNING user_id', ['Head User','head@college.edu',pwd,'HEAD','Placement']);
    const head_id = u1.rows[0].user_id;
    await client.query('INSERT INTO placement_head (head_id, contact_number, office_room) VALUES ($1,$2,$3)', [head_id,'+911234567890','A-101']);

    // coordinator
    const u2 = await client.query('INSERT INTO users (name,email,password_hash,role,department) VALUES ($1,$2,$3,$4,$5) RETURNING user_id', ['Coord User','coord@college.edu',pwd,'COORDINATOR','Placement']);
    const coord_id = u2.rows[0].user_id;
    await client.query('INSERT INTO placement_coordinators (coordinator_id, assigned_batch, contact_number) VALUES ($1,$2,$3)', [coord_id,'2024','+911112223334']);

    // students
    const u3 = await client.query('INSERT INTO users (name,email,password_hash,role,department) VALUES ($1,$2,$3,$4,$5) RETURNING user_id', ['Student One','student1@college.edu',pwd,'STUDENT','CSE']);
    const student_id = u3.rows[0].user_id;
    await client.query('INSERT INTO students (student_id, roll_number, batch_year, branch, tenth_percent, twelfth_percent, cgpa, active_backlogs) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [student_id,'CSE001',2024,'CSE',90.0,92.0,9.2,0]);

    // Add 9 more students: mix of good, average, and poor performers
    // CGPA range: 4-10, 10th/12th range: 50-99
    const studentData = [
      // Good performers (CGPA 8.5+, high marks)
      ['Student Two','student2@college.edu','CSE002',2024,'CSE',88.0,90.0,8.8,0],
      ['Student Three','student3@college.edu','ECE001',2024,'ECE',95.0,96.0,9.5,0],
      ['Student Four','student4@college.edu','ME001',2024,'ME',89.0,91.0,8.9,0],
      ['Student Five','student5@college.edu','CE001',2024,'CE',92.0,94.0,9.1,0],
      // Average performers (CGPA 6.5-8, medium marks)
      ['Student Six','student6@college.edu','CSE003',2024,'CSE',75.0,78.0,7.5,1],
      ['Student Seven','student7@college.edu','ECE002',2024,'ECE',72.0,74.0,7.2,1],
      ['Student Eight','student8@college.edu','ME002',2024,'ME',68.0,70.0,6.8,2],
      // Poor performers (CGPA 4-6.5, lower marks)
      ['Student Nine','student9@college.edu','ECE003',2024,'ECE',60.0,62.0,5.5,3],
      ['Student Ten','student10@college.edu','CE002',2024,'CE',52.0,54.0,4.9,4]
    ];

    for(const data of studentData){
      const user = await client.query('INSERT INTO users (name,email,password_hash,role,department) VALUES ($1,$2,$3,$4,$5) RETURNING user_id', [data[0],data[1],pwd,'STUDENT',data[3]]);
      const sid = user.rows[0].user_id;
      await client.query('INSERT INTO students (student_id, roll_number, batch_year, branch, tenth_percent, twelfth_percent, cgpa, active_backlogs) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [sid,data[2],data[3],data[4],data[5],data[6],data[7],data[8]]);
    }

    // Insert job domains
    const domains = [
      'Information Technology',
      'Software Development',
      'Data Science',
      'Cloud Computing',
      'Cybersecurity',
      'Machine Learning',
      'DevOps',
      'Web Development'
    ];

    for(const domain of domains){
      await client.query('INSERT INTO job_domains (domain_name) VALUES ($1)', [domain]);
    }

    // staff
    const u4 = await client.query('INSERT INTO users (name,email,password_hash,role,department) VALUES ($1,$2,$3,$4,$5) RETURNING user_id', ['Staff One','staff1@college.edu',pwd,'STAFF','CSE']);
    await client.query('INSERT INTO staffs (staff_id, designation, expertise) VALUES ($1,$2,$3)', [u4.rows[0].user_id,'Lecturer','Algorithms']);

    await client.query('COMMIT');
    console.log('Seed complete. All users have password: password123');
  }catch(e){
    await client.query('ROLLBACK');
    console.error(e);
  }finally{ client.release(); process.exit(0);} 
}

seed();
