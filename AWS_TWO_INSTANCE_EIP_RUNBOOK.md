# AWS Two-Instance Deployment Runbook (Elastic IP)

This runbook deploys the project with separate instances:
- Backend instance: API + worker + scheduler + Redis + HAProxy
- Frontend instance: Nginx serving built React app

Both instances use Elastic IPs so DNS and CI/CD targets remain stable after stop/start cycles.

## 1) Target Architecture

- Backend EC2 (`t3.micro`) with Elastic IP (EIP-BE)
- Frontend EC2 (`t3.micro` or `t2.micro`, depending on account eligibility) with Elastic IP (EIP-FE)
- PostgreSQL as a backend-side container using [docker-compose.backend.yml](docker-compose.backend.yml)
- GitHub Actions pipelines:
  - Backend: existing [.github/workflows/ci-ecr.yml](.github/workflows/ci-ecr.yml)
  - Frontend: new [.github/workflows/deploy-frontend-ec2.yml](.github/workflows/deploy-frontend-ec2.yml)

## 2) Files Added For This Architecture

- Frontend compose: [docker-compose.frontend.yml](docker-compose.frontend.yml)
- Frontend Nginx config: [deploy/nginx.frontend.conf](deploy/nginx.frontend.conf)
- Frontend deploy script: [deploy/deploy-frontend.sh](deploy/deploy-frontend.sh)
- Frontend workflow: [.github/workflows/deploy-frontend-ec2.yml](.github/workflows/deploy-frontend-ec2.yml)
- Backend env template: [backend/.env.production.example](backend/.env.production.example)
- Frontend env template: [frontend/.env.production.example](frontend/.env.production.example)

## 3) Provision AWS Resources

1. Create backend EC2 instance.
2. Create frontend EC2 instance.
3. Allocate two Elastic IPs.
4. Associate EIP-BE to backend instance.
5. Associate EIP-FE to frontend instance.
6. Security groups:
   - Backend SG:
     - 22 from your IP
     - 80 from 0.0.0.0/0
     - 5000 closed publicly (HAProxy exposes API on 80)
   - Frontend SG:
     - 22 from your IP
     - 80 from 0.0.0.0/0
7. Install Docker + Docker Compose plugin on both instances.

## 4) Configure Backend Instance

1. Clone repo on backend instance.
2. Copy [backend/.env.production.example](backend/.env.production.example) to `backend/.env.production`.
3. Set values:
   - `DATABASE_URL`
   - `REDIS_URL=redis://redis:6379`
   - `JWT_SECRET`
   - `CORS_ORIGIN=http://<EIP-FE>`
4. Ensure backend deployment path exists: `~/placement-management-system`.
5. Use backend source build compose:
   - [docker-compose.backend.yml](docker-compose.backend.yml)

## 5) Configure Frontend Instance

1. Clone repo on frontend instance (same path: `~/placement-management-system`).
2. Ensure folder exists: `~/placement-management-system/frontend-deploy/dist`.
3. Frontend workflow will sync built `dist/` and run:
   - [deploy/deploy-frontend.sh](deploy/deploy-frontend.sh)
4. Nginx serves SPA on port 80 using:
   - [deploy/nginx.frontend.conf](deploy/nginx.frontend.conf)

## 6) GitHub Secrets Required

### Shared
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

### Backend workflow
- `ECR_REGISTRY`
- `ECR_BACKEND_REPO`
- `EC2_HOST` (set to backend Elastic IP)
- `EC2_USER`
- `EC2_SSH_KEY`

### Frontend workflow
- `FRONTEND_EC2_HOST` (set to frontend Elastic IP)
- `FRONTEND_EC2_USER`
- `FRONTEND_EC2_SSH_KEY`
- `FRONTEND_API_URL` (set to `http://<backend-elastic-ip>/api`)

## 7) Deployment Order

1. Deploy backend first.
2. Validate backend health:
   - `http://<EIP-BE>/api/...`
3. Deploy frontend workflow.
4. Validate frontend URL:
   - `http://<EIP-FE>`
5. Validate login and full flow from frontend to backend.

## 8) Stop/Start Cost Workflow

After successful deployment, you can stop both instances.

Rules:
- Keep Elastic IPs allocated and attached/disattached as needed.
- Start backend first, wait until containers are healthy.
- Start frontend second.
- Public URLs remain the same because EIPs remain fixed.

## 9) Operations Checklist

- [ ] Both EIPs attached to correct instances
- [ ] Backend workflow passes
- [ ] Frontend workflow passes
- [ ] Backend CORS allows frontend EIP
- [ ] Frontend uses backend EIP API URL
- [ ] Login works
- [ ] Create drive works
- [ ] Delete drive works
- [ ] Stop/start runbook validated once
