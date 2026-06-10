#!/bin/bash
# OpenClaw Deployment Script for JF-Aliyun
set -e

SERVER="JF-Aliyun"
DEPLOY_DIR="/opt/openclaw"
DOMAIN="openclaw.one-line-ai.top"

echo "=== Deploying OpenClaw to $SERVER ==="

# 1. Sync code to server
echo "[1/6] Syncing code..."
rsync -avz --exclude='node_modules' --exclude='.git' --exclude='bin' \
  --exclude='*.db' --exclude='*.sqlite' --exclude='.DS_Store' \
  -e ssh . "root@${SERVER}:${DEPLOY_DIR}/"

# 2. Build Docker images on server
echo "[2/6] Building Docker images..."
ssh root@${SERVER} << 'EOF'
cd /opt/openclaw

# Backend image
docker build -f deployments/Dockerfile -t openclaw-backend .

# Frontend image
docker build -f frontend/deployments/Dockerfile.frontend -t openclaw-frontend ./frontend
EOF

# 3. Start services
echo "[3/6] Starting services..."
ssh root@${SERVER} << EOF
cd /opt/openclaw
docker compose -f deployments/docker-compose.prod.yaml up -d --force-recreate
sleep 5
docker compose -f deployments/docker-compose.prod.yaml ps
EOF

# 4. Setup nginx config
echo "[4/6] Configuring nginx..."
ssh root@${SERVER} << EOF
cp ${DEPLOY_DIR}/deployments/nginx-openclaw.conf /etc/nginx/sites-available/openclaw
ln -sf /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/openclaw

# Create htpasswd if not exists
if [ ! -f /etc/nginx/.htpasswd ]; then
  apt-get install -y apache2-utils 2>/dev/null || true
  htpasswd -cb /etc/nginx/.htpasswd admin openclaw2026
fi

# Test nginx with temp config (no SSL yet)
nginx -t 2>/dev/null && systemctl reload nginx || true
EOF

# 5. Setup SSL with certbot
echo "[5/6] Setting up SSL..."
ssh root@${SERVER} << EOF
# Create temp nginx config without SSL for certbot challenge
cat > /etc/nginx/sites-available/openclaw-temp << 'TMPNGINX'
server {
    listen 80;
    server_name ${DOMAIN};
    location / {
        root /var/www/openclaw/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
TMPNGINX

ln -sf /etc/nginx/sites-available/openclaw-temp /etc/nginx/sites-enabled/openclaw
nginx -t && systemctl reload nginx

# Get SSL cert (skip if already exists)
if [ ! -d /etc/letsencrypt/live/${DOMAIN} ]; then
  certbot certonly --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@one-line-ai.top
fi

# Switch to full SSL config
ln -sf /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/openclaw
nginx -t && systemctl reload nginx
EOF

# 6. Verify
echo "[6/6] Verifying deployment..."
ssh root@${SERVER} << EOF
echo "Backend health:"
curl -s http://127.0.0.1:8000/api/v1/system/health
echo ""
echo "Docker services:"
docker compose -f ${DEPLOY_DIR}/deployments/docker-compose.prod.yaml ps
echo ""
echo "SSL cert expiry:"
echo | openssl s_client -connect ${DOMAIN}:443 -servername ${DOMAIN} 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "SSL not yet configured"
EOF

echo ""
echo "=== Deployment complete! ==="
echo "URL: https://${DOMAIN}"
echo "Basic Auth: admin / openclaw2026"
echo "App Login: admin / admin123"
