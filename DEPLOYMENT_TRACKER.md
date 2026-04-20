# Deployment Tracker

## Current Deployment Mode

- Architecture: Two EC2 instances (frontend and backend separated)
- Public addressing: Elastic IP for each instance
- Frontend serving mode: Nginx container on frontend EC2
- Backend serving mode: backend/worker/scheduler/redis/postgres containers on backend EC2

## Milestones

- [x] Added frontend EC2 deployment workflow
- [x] Added frontend compose and Nginx config
- [x] Added frontend deploy script
- [x] Added production env templates for frontend/backend
- [x] Added two-instance + EIP runbook
- [ ] Configure GitHub secrets
- [x] Provision EC2 + assign Elastic IPs
- [x] Deploy backend workflow successfully
- [x] Deploy frontend workflow successfully
- [x] Validate end-to-end flow
- [ ] Test stop/start with same EIPs

## Final Public Endpoints (fill after provisioning)

- Frontend URL: http://18.142.241.126
- Backend API URL: http://13.228.31.66:5000/api

## Notes

- Keep backend deployment first, frontend deployment second.
- If frontend cannot reach backend, verify `CORS_ORIGIN` and `FRONTEND_API_URL`.
