#!/bin/bash
cat > /tmp/login.json << 'EOF'
{"email":"head@college.edu","password":"password123"}
EOF

echo "Testing login..."
curl -s -X POST http://127.0.0.1/api/auth/login \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/login.json

echo ""
echo "[Backend logs from last 15 lines]"
docker logs placement-management-system-backend-1 --tail 15
