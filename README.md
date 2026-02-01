# Placement Management Application

Complete role-based placement management system for colleges.

## Project Structure

```
placeOps/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── app.js
│   ├── sql/
│   ├── scripts/
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.cjs
│   └── postcss.config.cjs
├── API_ENDPOINTS.md
└── README.md
```

## Quick Start

### Option 1: Docker Compose (Easiest - All-in-One)

Requires Docker and Docker Compose only:

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, backend, worker, and scheduler. Frontend runs on `http://localhost:5173`, backend API on `http://localhost:5000`.

See [DEPLOYMENT.md](DEPLOYMENT.md#docker-compose-recommended-for-small-deployments) for Docker details.

### Option 2: Local Development (Manual Setup)

#### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- Redis 6+

#### 1. Setup PostgreSQL Database

Create a database named `placement`:

```bash
psql -U postgres -c "CREATE DATABASE placement;"
```

Apply the schema:

```bash
psql -d placement -f backend/sql/create_tables.sql
psql -d placement -f backend/sql/add_auto_published_flag.sql
psql -d placement -f backend/sql/add_drive_selections.sql
psql -d placement -f backend/sql/add_pdf_column.sql
psql -d placement -f backend/sql/add_status_column.sql
psql -d placement -f backend/sql/materialized_views.sql
```

#### 2. Start Redis

```bash
# macOS
brew install redis && brew services start redis

# Linux
sudo apt-get install redis-server && sudo service redis-server start

# Windows: Download from https://github.com/microsoftarchive/redis/releases
```

Verify Redis is running:
```bash
redis-cli ping  # Should output: PONG
```

#### 3. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
```

Update `.env` with your PostgreSQL and Redis connection strings.

Run integration tests:
```bash
npm run test:integration
```

#### 4. Start Backend Services

In separate terminals:

```bash
# Terminal 1: Main server
npm run dev

# Terminal 2: Background worker
npm run start:worker

# Terminal 3: Scheduler (optional)
npm run start:scheduler
```

Backend API runs on `http://localhost:5000`

#### 5. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

#### 6. Seed Sample Data (Optional)

```bash
cd backend
node scripts/seed.js
```

## Default Credentials (if seeded)

All users: password is `password123`

- **HEAD**: head@college.edu
- **COORDINATOR**: coord@college.edu
- **STUDENT**: student1@college.edu
- **STAFF**: staff1@college.edu

## Features

- **Role-Based Access Control**: 4 roles (HEAD, COORDINATOR, STUDENT, STAFF) with distinct permissions
- **JWT Authentication**: Secure token-based auth with bcrypt hashing
- **Light/Dark Theme**: Global theme toggle
- **Responsive UI**: Modern dashboard design with Tailwind CSS
- **Drive Management**: HEAD posts job drives with eligibility criteria
- **Eligibility Filtering**: COORDINATOR filters students by CGPA, 10th %, 12th %, backlogs
- **Student Registration**: Students register for eligible drives only
- **Real-Time Updates**: Student dashboard polls for new drives (3s) and availability (3s)
- **Attendance Tracking**: COORDINATOR marks attendance and publishes results
- **CSV/Excel Exports**: Download registrations and attendance as CSV/Excel
- **Background Jobs**: Asynchronous processing with job queue (BullMQ + Redis)
- **Staff View**: STAFF can view drives and registrations (read-only)
- **Graceful Fallback**: System remains functional even if Redis is unavailable

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Axios, Recharts
- **Backend**: Node.js, Express, PostgreSQL (pg), JWT, Bcrypt
- **Queue**: BullMQ (job queue), Redis (job broker)
- **Database**: PostgreSQL with SQL migrations
- **Scheduler**: node-cron for periodic tasks

## Architecture

### Main Components

- **API Server**: Handles HTTP requests and enqueues background jobs
- **Background Worker**: Processes jobs asynchronously (eligibility filtering, CSV generation, view refresh)
- **Scheduler**: Enqueues periodic maintenance tasks (e.g., materialized view refresh hourly)
- **Database**: PostgreSQL for persistent storage with connection pooling
- **Job Queue**: Redis + BullMQ for reliable asynchronous processing

See [backend/README.md](backend/README.md) for detailed architecture and [DEPLOYMENT.md](DEPLOYMENT.md) for production setup.

## API Documentation

See [API_ENDPOINTS.md](API_ENDPOINTS.md) for complete API reference.

## License

MIT