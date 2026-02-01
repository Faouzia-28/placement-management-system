# Quick Reference Guide

## Common Commands

### Starting Services

```bash
# All services (Docker Compose)
docker-compose up -d

# Individual services (Local Development)
npm run dev              # Backend API
npm run start:worker     # Background Worker
npm run start:scheduler  # Scheduler
npm run test:integration # Test Queue Setup
```

### Database

```bash
# Apply migrations
psql -d placement -f backend/sql/create_tables.sql

# Seed test data
cd backend && node scripts/seed.js

# Connect to database
psql postgresql://postgres:password@localhost:5432/placement
```

### Redis

```bash
# Start Redis
redis-server

# Test connection
redis-cli ping

# Monitor commands
redis-cli MONITOR

# Check memory
redis-cli INFO memory

# Clear all data (⚠️ Be careful!)
redis-cli FLUSHALL
```

### Backend Development

```bash
# Watch mode (auto-reload on file changes)
npm run dev

# Test integration
npm run test:integration

# View logs
tail -f logs/app.log
```

### Frontend Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables Quick Setup

### Development (.env)
```env
DATABASE_URL=postgresql://postgres:12345@localhost:5432/placement
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=dev_secret_key_change_later
PORT=5000
NODE_ENV=development
MATERIALIZED_VIEW_REFRESH_INTERVAL=0 * * * *
```

### Docker Compose (Auto-configured)
No manual setup needed — `docker-compose.yml` handles environment.

### Production (Change these!)
```env
DATABASE_URL=postgres://prod_user:strong_password@prod-db.example.com:5432/placeops
REDIS_URL=redis://:password@prod-redis.example.com:6379
JWT_SECRET=$(openssl rand -base64 32)
PORT=5000
NODE_ENV=production
```

## Project Structure at a Glance

```
backend/
├── src/
│   ├── app.js                 # Express app
│   ├── controllers/           # Business logic
│   ├── routes/                # API endpoints
│   ├── services/              # Helpers
│   ├── middleware/            # Auth, upload
│   ├── db/pool.js             # DB connection
│   └── config/index.js        # Config loader
├── queue.js                   # Job queue setup
├── worker.js                  # Background processor
├── scheduler.js               # Cron scheduler
├── package.json               # Dependencies
├── .env.example               # Config template
├── Dockerfile                 # Container image
└── README.md                  # Full docs

frontend/
├── src/
│   ├── App.jsx                # Main app
│   ├── pages/                 # Role-based dashboards
│   ├── services/              # API calls
│   ├── context/               # Auth, Theme
│   └── index.css              # Global styles
├── index.html                 # Entry point
├── package.json               # Dependencies
└── vite.config.js             # Build config
```

## API Endpoints (Common)

### Authentication
```
POST   /auth/register         # Register new user
POST   /auth/login            # Login with email/password
GET    /auth/profile          # Get current user
```

### Drives
```
POST   /drives                # Create drive (HEAD)
GET    /drives                # List drives
GET    /drives/:id            # Get drive details
POST   /drives/:id/publish    # Publish drive (COORDINATOR)
POST   /drives/:id/stop-registrations
```

### Registrations
```
POST   /registrations         # Register for drive
GET    /registrations/my-list # Get user's registrations
GET    /registrations/:id/list # List by drive (STAFF/COORDINATOR)
```

### Finished Drives
```
GET    /finished-drives       # List finished drives
GET    /finished-drives/:id/download # Download attendance Excel
```

## Common Issues & Solutions

| Problem | Quick Fix |
|---------|-----------|
| "Connection refused" (Redis) | `redis-server` in separate terminal |
| "Connection refused" (DB) | Verify `DATABASE_URL` in `.env` |
| Queue jobs not processing | Check worker is running: `ps aux \| grep worker.js` |
| CORS errors | Check backend `cors` middleware config in `src/app.js` |
| 401 Unauthorized | Verify JWT token in Authorization header |
| Port already in use | Change `PORT` in `.env` or kill existing process |
| High memory usage | Restart worker: `npm run start:worker` |

## Development Workflow

1. **Make code changes** in `src/` directory
2. **Dev mode watches** for changes (auto-reload)
3. **Test endpoints** with curl/Postman or frontend UI
4. **Check logs** for errors
5. **Commit changes** when working
6. **Run tests** before pushing

## Debugging Tips

### View All Background Jobs
```javascript
const { jobQueue } = require('./queue');
(async () => {
  const waiting = await jobQueue.getWaiting();
  const active = await jobQueue.getActive();
  const completed = await jobQueue.getCompleted();
  const failed = await jobQueue.getFailed();
  console.log('Waiting:', waiting.length);
  console.log('Active:', active.length);
  console.log('Completed:', completed.length);
  console.log('Failed:', failed.length);
})();
```

### Enable Verbose Logging
```bash
DEBUG=placeops:* npm run dev
```

### Check Database Directly
```bash
psql $DATABASE_URL

-- See all drives
SELECT * FROM placement_drives;

-- See registrations for a drive
SELECT * FROM drive_registrations WHERE drive_id = 1;

-- Check selections
SELECT * FROM drive_coordinator_selections WHERE drive_id = 1;
```

### Monitor Redis Queue
```bash
redis-cli
> KEYS *  # See all keys
> INFO   # Server info
```

## Deployment Checklist

- [ ] All `.env` values configured (no defaults)
- [ ] Database migrations applied
- [ ] Redis running and accessible
- [ ] `npm install` completed
- [ ] `npm run test:integration` passes
- [ ] Backend listening on configured port
- [ ] Worker process running (separate terminal/process)
- [ ] Frontend built: `npm run build`
- [ ] Frontend pointing to correct backend URL
- [ ] SSL/TLS configured (production)
- [ ] Backups scheduled
- [ ] Logs being aggregated
- [ ] Health checks configured

## Performance Tuning

### Database Queries
- Check `EXPLAIN ANALYZE` for slow queries
- Add indexes on frequently filtered columns
- Review `db/pool.js` connection limits

### Redis
- Monitor with `redis-cli --bigkeys`
- Check memory usage: `redis-cli INFO memory`
- Configure `maxmemory` policy

### Node.js
- Use `--max-old-space-size=4096` for large processes
- Monitor with `node --inspect` for profiling
- Check event loop with `0x` tool

## Links & Resources

- **Docs**: See `README.md` (root), `backend/README.md`, `DEPLOYMENT.md`
- **API Details**: See `API_ENDPOINTS.md`
- **Summary**: See `IMPLEMENTATION_SUMMARY.md`
- **Node.js Docs**: https://nodejs.org/api/
- **Express Docs**: https://expressjs.com/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Redis Docs**: https://redis.io/documentation
- **BullMQ Docs**: https://docs.bullmq.io/

---

**Last Updated**: February 2026  
**Version**: 1.0
