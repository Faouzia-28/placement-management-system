# Implementation Summary: Background Job Queue & Scheduler

## Overview

This document summarizes the implementation of a robust background job processing system for placeOps using Redis + BullMQ + node-cron.

## What Was Implemented

### 1. Job Queue Infrastructure (`backend/queue.js`)

- **BullMQ Queue**: Redis-based job queue for reliable async processing
- **Redis Connection**: Configurable via `REDIS_URL` environment variable
- **Worker Factory**: Export `createWorker()` for spawning background processors

### 2. Background Worker (`backend/worker.js`)

Processes the following job types:

| Job Type | Triggered By | Description |
|----------|--------------|-------------|
| `auto-publish` | `publishDrive()` or `createDrive(autoCalc=true)` | Filters eligible students & stores coordinator selections |
| `eligibility-filter` | Manual trigger or `auto-publish` | Filters students by CGPA, 10th/12th marks, backlogs |
| `export-registrations-csv` | Staff CSV export button | Generates CSV file of registrations for a drive |
| `refresh-materialized-views` | Scheduler (hourly) | Refreshes database materialized views for analytics |

**Key Features**:
- Processes jobs concurrently (configurable concurrency)
- Writes CSV/export files to `backend/uploads/temp/`
- Includes error handling and logging
- Graceful shutdown on SIGTERM/SIGINT

### 3. Scheduler (`backend/scheduler.js`)

- **Cron-based scheduling** using `node-cron`
- **Hourly materialized view refresh** (configurable via `MATERIALIZED_VIEW_REFRESH_INTERVAL`)
- **Graceful shutdown** with signal handlers
- **Standalone process** that can be run independently

### 4. Controller Refactoring

#### `driveController.createDrive()`
- Marks drive as posted immediately when `autoCalc=true`
- **Enqueues** `auto-publish` job for background processing
- **Fallback**: If queue is unavailable, runs eligibility filtering synchronously

#### `driveController.publishDrive()`
- **Enqueues** `auto-publish` job to persist coordinator selections
- **Fallback**: If queue is unavailable, stores selections directly in DB
- Preserves data integrity through graceful degradation

### 5. Configuration & Documentation

**Files Created/Updated**:
- `backend/.env.example` — Enhanced with all config options and descriptions
- `backend/package.json` — Added scripts: `start`, `start:worker`, `start:scheduler`
- `backend/README.md` — Comprehensive guide (architecture, setup, troubleshooting)
- `backend/Dockerfile` — Container image for easy deployment
- `docker-compose.yml` — Full-stack local development (PostgreSQL, Redis, backend, worker, scheduler)
- `DEPLOYMENT.md` — Production deployment guide (Docker, Kubernetes, VM, PM2)
- `backend/test-integration.js` — Integration test script for queue validation
- `backend/quickstart.sh` — Bash script for quick local setup
- `README.md` (root) — Updated with Docker and manual setup options

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
         ┌──────▼──────┐          ┌───────▼────────┐
         │  Frontend   │          │  API Server    │
         │   (React)   │          │  (Express)     │
         └──────┬──────┘          │   Port 5000    │
                │                 │                │
                │        ┌────────┤ ┌─────────┐    │
                │        │        │ │ Auth    │    │
                │        │        │ │ Routes  │    │
                │        │        │ │ (JWT)   │    │
                │        │        │ └─────────┘    │
                │        │        │                │
                │        │        │ ┌─────────┐    │
                │        │        │ │ Drive   │    │
                └────────┼────────┤►│ Ctrl    │────┼──────┐
                         │        │ │ (Queue  │    │      │
                         │        │ │  Enq)   │    │      │
                         │        │ └─────────┘    │      │
                         │        │                │      │
                         │        │ ┌─────────┐    │      │
                         │        │ │ Reg     │    │      │
                         │        │ │ Ctrl    │    │      │
                         │        │ └─────────┘    │      │
                         │        │                │      │
                         │        │ ┌─────────┐    │      │
                         │        │ │ Analytics   │      │
                         │        │ └─────────┘    │      │
                         │        └────────────────┘      │
                         │                                │
                    ┌────▼─────────────────────────────┐  │
                    │      PostgreSQL Database         │  │
                    │  (Persistent Storage, Pool)      │  │
                    │                                  │  │
                    │  ┌────────────────────────────┐  │  │
                    │  │ - Drives                   │  │  │
                    │  │ - Students                 │  │  │
                    │  │ - Registrations            │  │  │
                    │  │ - Selections               │  │  │
                    │  │ - Attendance               │  │  │
                    │  │ - Materialized Views       │  │  │
                    │  └────────────────────────────┘  │  │
                    └────────────────────────────────────┘  │
                                                           │
                    ┌──────────────────────────────────────┤
                    │                                      │
         ┌──────────▼────────────┐         ┌──────────────▼──────┐
         │   Redis (Job Broker)  │         │  Background Worker  │
         │   (In-Memory Store)   │         │  (Node Process)     │
         │                       │         │                     │
         │ ┌───────────────────┐ │         │ ┌─────────────────┐ │
         │ │  Job Queue        │ │         │ │ Job Processors: │ │
         │ │  (BullMQ)         │◄──────────┤ │                 │ │
         │ │                   │ │         │ │ • auto-publish  │ │
         │ │ - Waiting         │ │         │ │ • eligibility   │ │
         │ │ - Active          │ │         │ │ • csv-export    │ │
         │ │ - Completed       │ │         │ │ • refresh-views │ │
         │ │ - Failed          │ │         │ │                 │ │
         │ │ - Delayed         │ │         │ │ (with fallback  │ │
         │ └───────────────────┘ │         │ │  to sync)       │ │
         │                       │         │ └─────────────────┘ │
         └───────────────────────┘         │                     │
                 ▲                         │  ┌───────────────┐  │
                 │                         │  │ File Writes:  │  │
                 │                         │  │ uploads/temp/ │  │
                 └─────────────────────────┤  │ (CSVs, etc)   │  │
                                          │  └───────────────┘  │
                                          └──────────────────────┘
                                                     │
                                         ┌───────────▼──────────┐
                                         │     Scheduler        │
                                         │  (node-cron)         │
                                         │                      │
                                         │ Enqueues periodic:   │
                                         │ • refresh-views (1h) │
                                         └──────────────────────┘
```

## Data Flow Example: Publishing a Drive

```
1. Coordinator clicks "Publish Drive" button
   │
2. Frontend sends POST /drives/:id/publish with selected_students[]
   │
3. Backend Controller (publishDrive):
   ├─ Marks drive as "posted" in DB
   ├─ Clears old selections
   ├─ Attempts to enqueue "auto-publish" job
   │
4. If Queue Available (Redis running):
   ├─ Job added to BullMQ queue
   ├─ Controller returns 200 immediately (non-blocking)
   │
5. Background Worker (separate process):
   ├─ Picks up "auto-publish" job from queue
   ├─ Iterates through selected_students[]
   ├─ Inserts each into drive_coordinator_selections table
   ├─ Writes completion log
   │
6. If Queue Unavailable (Fallback):
   ├─ Controller catches queue.add() error
   ├─ Runs eligibility filtering synchronously
   ├─ Persists selections directly in request handler
   ├─ Slower response but data still saved

Result: Coordinator selections stored in DB
        Student registrations can proceed for selected students
```

## Running the System

### Option 1: Docker Compose (All-in-One, Recommended for Testing)

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (Port 5432)
- Redis (Port 6379)
- Backend API Server (Port 5000)
- Background Worker
- Scheduler

### Option 2: Local Development (Manual)

```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Backend API Server
cd backend && npm run dev

# Terminal 3: Background Worker
cd backend && npm run start:worker

# Terminal 4: Scheduler (Optional)
cd backend && npm run start:scheduler

# Terminal 5: Frontend
cd frontend && npm run dev
```

### Integration Testing

```bash
cd backend
npm run test:integration
```

Expected output:
```
✅ Redis connection successful
✅ Job enqueued with ID: <job-id>
✅ Queue status: { active: 0, completed: 1, delayed: 0, failed: 0, paused: 0, waiting: 0 }
✅ Test job removed
✅ Final queue status: { active: 0, completed: 0, delayed: 0, failed: 0, paused: 0, waiting: 0 }
```

## Graceful Degradation (No Redis Available)

If Redis is not running or unreachable:

1. Controller attempts to enqueue job
2. Catches `jobQueue.add()` error
3. Logs warning: "Failed to enqueue X job, falling back to inline processing"
4. Executes eligibility filtering synchronously in request handler
5. Returns response to client (slower but functional)

**Example Log Output**:
```
Failed to enqueue auto-publish job, falling back to inline processing: connect ECONNREFUSED 127.0.0.1:6379
Running eligibility filtering synchronously...
✓ Eligibility filtering complete: 42 students selected
```

## Environment Configuration

Key environment variables (see `.env.example`):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/placement

# Redis
REDIS_URL=redis://127.0.0.1:6379

# Job Scheduler
MATERIALIZED_VIEW_REFRESH_INTERVAL=0 * * * *  # Cron format (every hour)

# Security
JWT_SECRET=your_secret_key

# Server
PORT=5000
NODE_ENV=production
```

## Future Enhancements

1. **Job Status Endpoint**: Add `/api/jobs/:id/status` to track job progress
2. **Job Retry UI**: Display failed jobs and allow manual retry from admin panel
3. **Queue Metrics Dashboard**: Real-time visualization of job queue health
4. **Async Result Storage**: Store job results in DB for retrieval after job completion
5. **Horizontal Scaling**: Deploy multiple worker instances with load balancing
6. **Job Persistence**: Use persistent job store (e.g., Redis Streams) for durability
7. **Email Notifications**: Enqueue email jobs for drive notifications
8. **PDF Generation**: Background job for generating PDF reports

## Files Changed/Created

### New Files
- `backend/queue.js` — Job queue setup (BullMQ + Redis)
- `backend/worker.js` — Background job processor
- `backend/scheduler.js` — Cron-based scheduler
- `backend/test-integration.js` — Integration test script
- `backend/quickstart.sh` — Quick startup helper
- `backend/Dockerfile` — Container image
- `docker-compose.yml` — Full-stack orchestration
- `DEPLOYMENT.md` — Production deployment guide

### Modified Files
- `backend/package.json` — Added dependencies & scripts
- `backend/.env.example` — Enhanced configuration template
- `backend/src/controllers/driveController.js` — Refactored `createDrive()` & `publishDrive()`
- `backend/src/routes/registration.js` — Allowed STAFF role for registration listing
- `backend/README.md` — Comprehensive architecture & setup guide
- `README.md` (root) — Updated with Docker & setup options

## Testing Checklist

- [ ] Redis is running and accessible
- [ ] `npm install` succeeds in backend/
- [ ] `npm run test:integration` passes
- [ ] `npm run dev` starts API server
- [ ] `npm run start:worker` starts worker (logs "Worker ready")
- [ ] `npm run start:scheduler` starts scheduler (logs "Scheduler ready")
- [ ] Create a drive with `autoCalc=true` → job enqueued
- [ ] Publish a drive → job enqueued
- [ ] Check worker logs → jobs being processed
- [ ] Verify CSV exports are written to `uploads/temp/`
- [ ] Stop Redis → system falls back to sync processing
- [ ] Verify logs show "falling back to inline processing"
- [ ] `docker-compose up -d` starts all services
- [ ] Frontend connects to API on port 5000
- [ ] Student polling works (3s refresh rate)

## Troubleshooting Quick Reference

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| Worker not processing jobs | Check if worker process is running | `ps aux \| grep worker.js` or check PM2 logs |
| "Connection refused" errors | Redis not running or unreachable | Start Redis: `redis-server` or verify `REDIS_URL` |
| Jobs stuck in queue | Worker crashed or not consuming | Restart worker: `npm run start:worker` |
| High request latency | Queue unavailable, falling back to sync | Verify Redis is running and healthy |
| CSV files not created | Worker doesn't have write permissions | Check `uploads/temp/` directory permissions |
| Memory leak | Worker not releasing connections | Monitor with `ps aux`, restart worker if needed |

## Support & Resources

- **Architecture Details**: See `backend/README.md`
- **Deployment Options**: See `DEPLOYMENT.md`
- **API Reference**: See `API_ENDPOINTS.md`
- **Environment Setup**: See `.env.example`

---

**Implementation Date**: February 2026  
**Status**: Ready for testing  
**Next Phase**: Local testing with Redis + worker, then production deployment guidance
