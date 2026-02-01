# placeOps Backend - Deployment Guide

This guide covers production deployment of the placeOps backend system.

## Deployment Architecture

The placeOps backend consists of three main components that should be deployed:

1. **API Server** (`npm start`): Handles HTTP requests
2. **Background Worker** (`npm run start:worker`): Processes background jobs
3. **Scheduler** (`npm run start:scheduler`): Enqueues periodic tasks

All three components require:
- **PostgreSQL** database
- **Redis** job queue broker

## Deployment Options

### Option 1: Docker Compose (Recommended for Small Deployments)

Use the included `docker-compose.yml` to deploy all services with PostgreSQL and Redis:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

**Advantages**: Self-contained, easy to manage, includes database and Redis
**Disadvantages**: Single-machine deployment, limited scalability

### Option 2: Kubernetes (Recommended for Large Deployments)

Create Kubernetes manifests for production deployment:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: placeops-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: placeops-backend
  template:
    metadata:
      labels:
        app: placeops-backend
    spec:
      containers:
      - name: backend
        image: your-registry.azurecr.io/placeops-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: placeops-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: placeops-secrets
              key: redis-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: placeops-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: placeops-worker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: placeops-worker
  template:
    metadata:
      labels:
        app: placeops-worker
    spec:
      containers:
      - name: worker
        image: your-registry.azurecr.io/placeops-backend:latest
        command: ["npm", "run", "start:worker"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: placeops-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: placeops-secrets
              key: redis-url
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: placeops-scheduler
spec:
  replicas: 1
  selector:
    matchLabels:
      app: placeops-scheduler
  template:
    metadata:
      labels:
        app: placeops-scheduler
    spec:
      containers:
      - name: scheduler
        image: your-registry.azurecr.io/placeops-backend:latest
        command: ["npm", "run", "start:scheduler"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: placeops-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: placeops-secrets
              key: redis-url
```

### Option 3: Cloud VM (AWS EC2, Azure VM, DigitalOcean)

1. **Create a VM** with Node.js 18+ and PostgreSQL/Redis

2. **Clone and setup**:
   ```bash
   git clone <repo> placeops
   cd placeops/backend
   cp .env.example .env
   # Edit .env with production values
   npm install
   ```

3. **Setup PM2 for process management**:
   ```bash
   npm install -g pm2
   
   # Create ecosystem.config.js
   cat > ecosystem.config.js << 'EOF'
   module.exports = {
     apps: [
       {
         name: 'backend',
         script: 'src/app.js',
         env: { NODE_ENV: 'production' }
       },
       {
         name: 'worker',
         script: 'worker.js',
         env: { NODE_ENV: 'production' }
       },
       {
         name: 'scheduler',
         script: 'scheduler.js',
         env: { NODE_ENV: 'production' }
       }
     ]
   };
   EOF
   
   # Start all processes
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

## Pre-Deployment Checklist

- [ ] All environment variables configured in `.env`
- [ ] PostgreSQL database created and migrations run
- [ ] Redis server running and accessible
- [ ] `package.json` dependencies installed
- [ ] SSL/TLS certificates configured (if using HTTPS)
- [ ] Database backups configured
- [ ] Log aggregation setup (ELK, CloudWatch, etc.)
- [ ] Monitoring alerts configured

## Production Environment Variables

```env
# Use strong JWT secret (generate: openssl rand -base64 32)
JWT_SECRET=<generate-strong-random-secret>

# Use production database
DATABASE_URL=postgres://user:password@prod-db.example.com:5432/placeops

# Use managed Redis (e.g., AWS ElastiCache, Azure Cache for Redis)
REDIS_URL=redis://:password@prod-redis.example.com:6379

# Enable production optimizations
NODE_ENV=production

# Configure for production load
PORT=5000
```

## Database Migrations

Run migrations before deploying:

```bash
psql -h prod-db.example.com -U postgres -d placeops < sql/create_tables.sql
psql -h prod-db.example.com -U postgres -d placeops < sql/add_auto_published_flag.sql
psql -h prod-db.example.com -U postgres -d placeops < sql/add_drive_selections.sql
psql -h prod-db.example.com -U postgres -d placeops < sql/add_pdf_column.sql
psql -h prod-db.example.com -U postgres -d placeops < sql/add_status_column.sql
psql -h prod-db.example.com -U postgres -d placeops < sql/materialized_views.sql
```

## Monitoring & Logging

### Application Logs

Configure log aggregation (ELK Stack, CloudWatch, Datadog):

```javascript
// In src/app.js or a dedicated logger module
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Queue Monitoring

Monitor job queue health:

```javascript
// Create a health check endpoint
app.get('/health/queue', async (req, res) => {
  const counts = await jobQueue.getJobCounts();
  const failed = await jobQueue.getFailed();
  
  res.json({
    status: failed.length > 0 ? 'degraded' : 'healthy',
    jobCounts: counts,
    failedCount: failed.length
  });
});
```

### Worker Health

Monitor worker process:

```bash
# In PM2
pm2 monit

# Or setup a health check
pm2 restart ecosystem.config.js --watch
```

## Scaling Considerations

### Horizontal Scaling

To scale the worker:

```yaml
# In docker-compose.yml or Kubernetes
services:
  worker:
    replicas: 5  # Scale to 5 worker instances
```

### Database Connection Pooling

Ensure `db/pool.js` has appropriate pool limits:

```javascript
const pool = new Pool({
  max: 20,  // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Redis Persistence

Configure Redis persistence (RDB or AOF) for production.

## Backup Strategy

### Database Backups

```bash
# Daily database backup
0 2 * * * pg_dump $DATABASE_URL > /backups/placeops_$(date +\%Y\%m\%d).sql

# Restore from backup
psql $DATABASE_URL < /backups/placeops_20240101.sql
```

### File Backups

Backup uploaded files (PDFs, CSVs):

```bash
# Backup uploads directory
0 3 * * * tar -czf /backups/uploads_$(date +\%Y\%m\%d).tar.gz uploads/
```

## Performance Tuning

### Database Optimization

```sql
-- Create indexes on frequently queried columns
CREATE INDEX idx_placement_drives_status ON placement_drives(status);
CREATE INDEX idx_drive_registrations_drive_id ON drive_registrations(drive_id);
CREATE INDEX idx_students_cgpa ON students(cgpa);
```

### Redis Optimization

```conf
# In redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### Node.js Optimization

```bash
# Use --max-old-space-size for large datasets
node --max-old-space-size=4096 src/app.js
```

## Security Checklist

- [ ] Use HTTPS/TLS for all communications
- [ ] Rotate JWT secrets regularly
- [ ] Use strong database passwords
- [ ] Enable database encryption at rest
- [ ] Restrict Redis access (use AUTH, firewall rules)
- [ ] Rate limiting on API endpoints
- [ ] Input validation and sanitization
- [ ] SQL injection prevention (use parameterized queries)
- [ ] CORS configured properly
- [ ] Regular dependency updates
- [ ] Security scanning (npm audit)

## Rollback Procedure

If a deployment fails:

```bash
# 1. Stop current deployment
docker-compose down
# OR
pm2 kill

# 2. Checkout previous version
git checkout <previous-tag>

# 3. Restart previous version
docker-compose up -d
# OR
pm2 start ecosystem.config.js
```

## Troubleshooting Production Issues

### Worker Not Processing Jobs

```bash
# Check if worker is running
ps aux | grep "node worker.js"

# Check Redis connectivity
redis-cli ping

# Check job queue status
node -e "const {jobQueue} = require('./queue'); jobQueue.getJobCounts().then(c => console.log(c))"
```

### Database Connection Errors

```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool status
# Monitor in db/pool.js logs
```

### High Memory Usage

```bash
# Check process memory
ps aux | grep node

# Enable garbage collection logs
NODE_DEBUG=heap node src/app.js
```

## Support & Documentation

- See [README.md](./README.md) for architecture and setup
- See [API_ENDPOINTS.md](../API_ENDPOINTS.md) for API documentation
- Contact: [support@placeops.example.com](mailto:support@placeops.example.com)
