# API Endpoints

Base: `/api`

## Auth
- POST `/auth/login` — body: `{ email, password }` -> returns `{ token, user }`

## Drives
- GET `/drives` — list all drives (auth required)
- GET `/drives/:id` — drive details (auth required)
- POST `/drives` — create drive (role: HEAD)

## Eligibility
- POST `/eligibility/:id/filter` — apply eligibility filter for drive (role: COORDINATOR), body: `{ min_cgpa, min_10th, min_12th, max_backlogs }`
- GET `/eligibility/:id/list` — list eligible students for drive (role: COORDINATOR,HEAD)
- GET `/eligibility/mine` — list drives eligible for current student (role: STUDENT)

## Registrations
- POST `/registrations/:id/register` — student register for drive (role: STUDENT)
- GET `/registrations/:id/list` — list registrations for drive (role: COORDINATOR,HEAD)

## Attendance
- POST `/attendance/:id/mark` — mark attendance (role: COORDINATOR), body `{ student_id, status }`
- GET `/attendance/:id/list` — list attendance for drive (role: COORDINATOR,HEAD)
