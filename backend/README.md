# placeOps Backend

A Node.js + Express + PostgreSQL backend for managing placement drives, student registrations, and automated eligibility filtering with a robust background job queue system.

## Architecture

### Components

- **Express Server** (`src/app.js`): Main API server handling HTTP requests for drives, registrations, analytics, etc.
- **Job Queue** (`queue.js`): BullMQ-based queue infrastructure for background jobs, connecting to Redis.
- **Worker** (`worker.js`): Background job processor handling:
  - `eligibility-filter`: Filter and store eligible students for a drive
  - `auto-publish`: Auto-publish a drive (run eligibility + store selections)
  - `export-registrations-csv`: Generate CSV exports of registrations
  - `refresh-materialized-views`: Refresh database materialized views
- **Scheduler** (`scheduler.js`): Cron-based scheduler to periodically enqueue jobs (e.g., refresh views hourly)

### Data Flow

1. **Coordinator creates or publishes a drive** → `publishDrive()` controller
2. **Controller enqueues `auto-publish` job** → BullMQ queue
3. **Worker picks up the job** → runs eligibility filtering + stores selections in DB
4. **Fallback**: If Redis unavailable, controller runs eligibility inline (graceful degradation)

## Prerequisites

- **Node.js**: v16 or higher
- **PostgreSQL**: v12 or higher (must be running)
- **Redis**: v6 or higher (required for background job processing)

### Installation Steps

1. **Clone and install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Install Redis** (if not already running):
   - **macOS**: `brew install redis` → `brew services start redis`
   - **Windows**: Download from [Redis Windows](https://github.com/microsoftarchive/redis/releases) or use WSL
   - **Linux**: `sudo apt-get install redis-server` → `sudo service redis-server start`
   
   Verify Redis is running:
   ```bash
   redis-cli ping
   # Expected output: PONG
   ```

3. **Setup PostgreSQL database**:
   - Ensure PostgreSQL is running and accessible
   - Create a database (e.g., `placeops_db`)
   - Run migrations:
     ```bash
     psql -U <user> -d <database> -f sql/create_tables.sql
     psql -U <user> -d <database> -f sql/add_auto_published_flag.sql
     psql -U <user> -d <database> -f sql/add_drive_selections.sql
     psql -U <user> -d <database> -f sql/add_pdf_column.sql
     psql -U <user> -d <database> -f sql/add_status_column.sql
     psql -U <user> -d <database> -f sql/materialized_views.sql
     ```

4. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Update the following variables:
     ```env
     DATABASE_URL=postgres://user:password@localhost:5432/placeops_db
     REDIS_URL=redis://127.0.0.1:6379
     JWT_SECRET=your_jwt_secret_key
     MATERIALIZED_VIEW_REFRESH_INTERVAL=0 * * * *  # Every hour at minute 0
     PORT=5000
     ```

## Running the Application

### Development (Single Process)

Run the server and worker together in development:

```bash
# Terminal 1: Start the main server
npm run dev

# Terminal 2: Start the background worker
npm run start:worker

# Terminal 3: Start the scheduler (optional, for periodic refreshes)
npm run start:scheduler
```

### Production (Separate Processes)

For production, run each component in separate processes or containers:

```bash
# Start the main server
npm start

# In another process, start the worker
npm run start:worker

# In another process, start the scheduler
npm run start:scheduler
```

### Docker Compose (Recommended for Local Testing)

A `docker-compose.yml` file can orchestrate PostgreSQL, Redis, and the backend together:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: placeops
      POSTGRES_PASSWORD: placeops_pass
      POSTGRES_DB: placeops_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: .
    environment:
      DATABASE_URL: postgres://placeops:placeops_pass@postgres:5432/placeops_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev_secret_key
      PORT: 5000
    ports:
      - "5000:5000"
    depends_on:
      - postgres
      - redis
    command: npm run dev

  worker:
    build: .
    environment:
      DATABASE_URL: postgres://placeops:placeops_pass@postgres:5432/placeops_db
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    command: npm run start:worker

  scheduler:
    build: .
    environment:
      DATABASE_URL: postgres://placeops:placeops_pass@postgres:5432/placeops_db
      REDIS_URL: redis://redis:6379
      MATERIALIZED_VIEW_REFRESH_INTERVAL: "0 * * * *"
    depends_on:
      - postgres
      - redis
    command: npm run start:scheduler

volumes:
  postgres_data:
```

To run with Docker Compose:
```bash
docker-compose up -d
```

## API Endpoints

See [API_ENDPOINTS.md](../API_ENDPOINTS.md) for detailed endpoint documentation.

### Key Endpoints

- **Drives**:
  - `POST /drives` - Create a new drive
  - `GET /drives` - List all drives (filtered by role)
  - `POST /drives/:id/publish` - Publish a drive (enqueues `auto-publish` job)
  - `POST /drives/:id/stop-registrations` - Stop registrations for a drive

- **Registrations**:
  - `POST /registrations` - Register for a drive
  - `GET /registrations/my-list` - List user's registrations
  - `GET /registrations/:id/list` - List registrations for a drive (STAFF/COORDINATOR only)

- **Finished Drives**:
  - `GET /finished-drives` - List finished drives with attendance marked
  - `GET /finished-drives/:id/download` - Download attendance Excel (COORDINATOR/HEAD)

## Background Job Processing

### Job Types

| Job Type | Triggered By | Description |
|----------|--------------|-------------|
| `auto-publish` | `publishDrive()` or `createDrive(autoCalc=true)` | Filters eligible students and stores selections |
| `eligibility-filter` | Manual trigger or `auto-publish` | Filters students by CGPA and board marks |
| `export-registrations-csv` | Staff CSV export button | Generates CSV of registrations for a drive |
| `refresh-materialized-views` | Scheduler (hourly) | Refreshes database materialized views |

### Job Lifecycle

1. **Enqueue**: Controller calls `jobQueue.add(jobType, data, options)`
2. **Queue**: Job is stored in Redis with retry settings
3. **Worker Pickup**: Worker polls the queue and processes the job
4. **Result Storage**: Worker writes results (e.g., CSV files) to `uploads/temp/`
5. **Status**: Job status can be polled via BullMQ API (future: add status endpoint)

### Graceful Fallback

If Redis is unavailable when enqueuing a job:
- The controller catches the `jobQueue.add()` error
- Falls back to inline processing (synchronous)
- Preserves data integrity and user experience
- Logs warning for monitoring

## Directory Structure

```
backend/
├── src/
│   ├── app.js                 # Express app setup
│   ├── config/
│   │   └── index.js           # Configuration loader
│   ├── controllers/           # Request handlers
│   ├── services/              # Business logic
│   ├── db/
│   │   └── pool.js            # PostgreSQL connection pool
│   ├── middleware/            # Auth, upload handlers
│   └── routes/                # Route definitions
├── queue.js                   # Job queue setup (BullMQ + Redis)
├── worker.js                  # Background job processor
├── scheduler.js               # Cron job scheduler
├── sql/                       # Database migration files
├── uploads/                   # File storage (PDFs, CSVs, etc.)
├── scripts/                   # Utility scripts (seeds, migrations)
├── package.json               # Dependencies and scripts
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgres://user:password@localhost:5432/placeops_db

# Redis (Job Queue)
REDIS_URL=redis://127.0.0.1:6379

# JWT
JWT_SECRET=your_secret_key_here

# Server
PORT=5000

# Scheduler
MATERIALIZED_VIEW_REFRESH_INTERVAL=0 * * * *  # Cron format (hourly)
```

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Debugging

Set `DEBUG` environment variable to see detailed logs:
```bash
DEBUG=placeops:* npm run dev
```

## Troubleshooting

### Issue: "Connection refused" when starting worker
**Solution**: Ensure Redis is running on the configured `REDIS_URL`.

### Issue: "Job never completes" or "Job stuck in queue"
**Solution**: 
- Verify worker is running: `ps aux | grep "node worker.js"`
- Check worker logs for errors
- Restart Redis and worker

### Issue: Database errors in worker logs
**Solution**: Ensure all SQL migrations have been run and `DATABASE_URL` is correct.

### Issue: Memory leak or high memory usage
**Solution**: Worker may have stale connections. Implement connection pooling with max limits (already configured in `db/pool.js`).

## Monitoring

### Check Job Queue Status

```javascript
// In a Node REPL or custom endpoint:
const { jobQueue } = require('./queue');
const counts = await jobQueue.getJobCounts();
console.log(counts); // { active, completed, delayed, failed, paused, waiting }
```

### View Worker Logs

```bash
# Stream worker logs
tail -f worker.log

# Or in Docker Compose:
docker-compose logs -f worker
```

## License

MIT
