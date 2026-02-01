-- PostgreSQL schema for Placement Management
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- users
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('STUDENT','STAFF','COORDINATOR','HEAD')),
  department TEXT
);

-- students
CREATE TABLE IF NOT EXISTS students (
  student_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  roll_number TEXT,
  batch_year INTEGER,
  branch TEXT,
  tenth_percent NUMERIC(5,2),
  twelfth_percent NUMERIC(5,2),
  cgpa NUMERIC(4,2),
  active_backlogs INTEGER DEFAULT 0
);

-- staffs
CREATE TABLE IF NOT EXISTS staffs (
  staff_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  designation TEXT,
  expertise TEXT
);

-- placement_coordinators
CREATE TABLE IF NOT EXISTS placement_coordinators (
  coordinator_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  assigned_batch TEXT,
  contact_number TEXT
);

-- placement_head
CREATE TABLE IF NOT EXISTS placement_head (
  head_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  contact_number TEXT,
  office_room TEXT
);

-- job_domains
CREATE TABLE IF NOT EXISTS job_domains (
  domain_id SERIAL PRIMARY KEY,
  domain_name TEXT NOT NULL UNIQUE
);

-- placement_drives
CREATE TABLE IF NOT EXISTS placement_drives (
  drive_id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  domain_id INTEGER REFERENCES job_domains(domain_id) ON DELETE SET NULL,
  job_description TEXT,
  interview_date TIMESTAMP,
  min_cgpa NUMERIC(4,2),
  min_10th NUMERIC(5,2),
  min_12th NUMERIC(5,2),
  max_backlogs INTEGER,
  posted_by INTEGER REFERENCES placement_head(head_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- drive_eligibility_results
CREATE TABLE IF NOT EXISTS drive_eligibility_results (
  id SERIAL PRIMARY KEY,
  drive_id INTEGER REFERENCES placement_drives(drive_id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  is_eligible BOOLEAN DEFAULT false,
  filtered_by INTEGER REFERENCES placement_coordinators(coordinator_id) ON DELETE SET NULL,
  filtered_at TIMESTAMP
);

-- drive_registrations
CREATE TABLE IF NOT EXISTS drive_registrations (
  registration_id SERIAL PRIMARY KEY,
  drive_id INTEGER REFERENCES placement_drives(drive_id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT now(),
  UNIQUE (drive_id, student_id)
);

-- attendance
CREATE TABLE IF NOT EXISTS attendance (
  attendance_id SERIAL PRIMARY KEY,
  drive_id INTEGER REFERENCES placement_drives(drive_id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('PRESENT','ABSENT')),
  UNIQUE (drive_id, student_id)
);

-- Sample domain
INSERT INTO job_domains(domain_name) VALUES ('Software'), ('Data Science'), ('Core') ON CONFLICT DO NOTHING;
