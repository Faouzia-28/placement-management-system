# AWS Free-Tier Deployment Runbook

This is the single source of truth for deploying this project to AWS.

## 1) Locked Decisions

- Frontend will be hosted on Amazon S3.
- Deployment is container-based.
- No custom domain.
- Keep costs within free-tier friendly services as much as possible.
- Start with a budget-first architecture, then optimize later only if needed.

## 2) Target Architecture (Budget-First)

- Frontend: S3 static website hosting (optional CloudFront default domain later).
- Backend API: Docker container on one EC2 instance.
- Worker: Docker container on same EC2.
- Scheduler: Docker container on same EC2.
- Redis: Docker container on same EC2.
- PostgreSQL: Amazon RDS PostgreSQL free-tier instance.

Why this architecture:
- Stays container-based.
- Avoids baseline cost of ECS + ALB + ElastiCache for now.
- Keeps backend and queue stack closest to current local compose design.

## 3) Current Code Facts (Already Audited)

- Backend env template exists: backend/.env.example
- Backend reads env from:
  - DATABASE_URL
  - REDIS_URL
  - JWT_SECRET
  - PORT
  - NODE_ENV
  - MATERIALIZED_VIEW_REFRESH_INTERVAL
- Frontend uses VITE_API_URL in frontend/src/services/api.js.
- Frontend localhost hardcoded PDF links have been replaced with deploy-safe URL handling.

## 4) Deployment Phases

## Phase A: Pre-Change Hardening (Code + Config)

Goal: remove local-only assumptions before any AWS provisioning.

Tasks:
- [x] Replace hardcoded localhost file links in frontend pages with deploy-safe URL logic.
- [x] Ensure frontend API base comes from VITE_API_URL only for production build.
- [x] Make backend CORS origin configurable by env.
- [x] Create backend/.env.production.example for cloud values.
- [x] Create frontend/.env.production.example for cloud values.
- [x] Add production docker compose file for EC2 deployment.
- [x] Confirm container commands:
  - API process
  - worker process
  - scheduler process

Exit criteria:
- [x] No localhost dependencies remain in production paths.
- [ ] App works locally using production-like env values.

## Phase B: AWS Resource Provisioning

Goal: create minimal cloud resources.

Tasks:
- [ ] Create AWS account billing alarm.
- [ ] Choose one region and keep all resources there.
- [ ] Create RDS PostgreSQL free-tier instance.
- [ ] Create RDS security group allowing 5432 only from EC2 security group.
- [ ] Create EC2 instance (free-tier eligible type where available).
- [ ] Create EC2 security group rules:
  - 22 from your IP only
  - 80 from all
  - 5000 from all only if API is public
- [ ] Install Docker and Docker Compose plugin on EC2.
- [ ] Create S3 bucket for frontend hosting.
- [ ] Enable S3 static website hosting.

Exit criteria:
- [ ] EC2 reachable by SSH.
- [ ] RDS reachable from EC2.
- [ ] S3 website endpoint available.

## Phase C: Backend Deployment (Containers on EC2)

Goal: run API + worker + scheduler + redis containers on EC2.

Tasks:
- [ ] Clone repository on EC2.
- [ ] Create backend/.env.production from template.
- [ ] Set strong JWT secret.
- [ ] Set DATABASE_URL to RDS endpoint.
- [ ] Set REDIS_URL to local redis container URL.
- [ ] Build and start containers with production compose file.
- [ ] Verify API health endpoint from browser/curl.
- [ ] Verify worker starts and listens.
- [ ] Verify scheduler starts and enqueues jobs.

Exit criteria:
- [ ] API responds successfully.
- [ ] Job queue flow works.
- [ ] No crash loops in containers.

## Phase D: Database Migration and Seed

Goal: initialize schema safely in RDS.

Tasks:
- [ ] Run SQL files in correct order against RDS:
  - create_tables.sql
  - add_auto_published_flag.sql
  - add_drive_selections.sql
  - add_pdf_column.sql
  - add_status_column.sql
  - materialized_views.sql
- [ ] Optional: run seed script for initial test users.
- [ ] Validate key tables exist and sample login works.

Exit criteria:
- [ ] All required tables and views created.
- [ ] Login and basic API operations succeed.

## Phase E: Frontend Build and S3 Deploy

Goal: deploy production frontend to S3 and connect to backend API.

Tasks:
- [ ] Set frontend/.env.production with VITE_API_URL pointing to EC2 API URL.
- [ ] Build frontend (vite build).
- [ ] Upload dist content to S3 bucket.
- [ ] Configure S3 bucket policy for public read of static files.
- [ ] Configure index and error document for SPA behavior.
- [ ] Test login and API calls from S3 hosted frontend.

Exit criteria:
- [ ] Frontend loads from S3 endpoint.
- [ ] Auth and dashboard API calls work.
- [ ] PDF and export links open correctly.

## Phase F: Validation and Stability

Goal: verify end-to-end behavior and minimum reliability.

Tasks:
- [ ] Role-based login test (HEAD, COORDINATOR, STUDENT, STAFF).
- [ ] Create drive, publish drive, register student, mark attendance.
- [ ] Validate background processing (auto publish, export, refresh jobs).
- [ ] Restart EC2 docker services and verify recovery.
- [ ] Check CloudWatch or container logs for recurring errors.

Exit criteria:
- [ ] Core user flows pass.
- [ ] Background jobs pass.
- [ ] Deployment can recover from restart.

## 5) Environment Variables Plan

## Backend production env

- DATABASE_URL=postgresql://<user>:<password>@<rds-endpoint>:5432/<db>
- REDIS_URL=redis://redis:6379
- JWT_SECRET=<strong-random-secret>
- PORT=5000
- NODE_ENV=production
- MATERIALIZED_VIEW_REFRESH_INTERVAL=0 * * * *

## Frontend production env

- VITE_API_URL=http://<ec2-public-ip-or-dns>:5000/api

Note:
- If backend is proxied on port 80 later, update VITE_API_URL accordingly.

## 6) Cost Guardrails

- Keep one EC2 instance only.
- Keep one RDS free-tier instance only.
- Do not create NAT Gateway.
- Do not create ALB in this phase.
- Do not use ElastiCache in this phase.
- Set billing alerts before deployment.

## 7) Open Risks to Track

- EC2 free-tier instance may be tight for API + worker + scheduler + redis.
- If memory pressure appears, move scheduler to host cron or reduce worker concurrency.
- S3 website endpoint is HTTP; add CloudFront default domain later for HTTPS.

## 8) Progress Tracker (Update During Execution)

- [ ] Phase A complete (in progress: code/config hardening done, local production-like validation pending)
- [ ] Phase B complete
- [ ] Phase C complete
- [ ] Phase D complete
- [ ] Phase E complete
- [ ] Phase F complete

## 9) Rollback Plan

- Keep previous image tags before upgrading.
- Keep last known-good env file copy.
- If deployment fails:
  - Stop new containers.
  - Start previous containers/images.
  - Restore previous frontend dist to S3.
  - Roll back any failed DB migration only with verified backup.
