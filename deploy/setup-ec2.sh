#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  AP POLICE Innovation Hub — AWS EC2 Deployment Script
#  Run this ON the EC2 instance after SSH'ing in.
#
#  Usage:
#    chmod +x deploy/setup-ec2.sh
#    ./deploy/setup-ec2.sh
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

APP_DIR="/home/ubuntu/ap-innovate"
REPO_URL="https://github.com/Dineshjnld/ap-innovate.git"

echo "═══════════════════════════════════════════════════════════════"
echo "  AP POLICE Innovation Hub — EC2 Setup"
echo "═══════════════════════════════════════════════════════════════"

# ── 1. System packages ─────────────────────────────────────────────
echo "[1/7] Installing system packages..."
sudo apt-get update -y
sudo apt-get install -y curl git nginx certbot python3-certbot-nginx

# ── 2. Node.js 20 LTS ──────────────────────────────────────────────
echo "[2/7] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node $(node -v), npm $(npm -v)"

# ── 3. PM2 ──────────────────────────────────────────────────────────
echo "[3/7] Installing PM2..."
sudo npm install -g pm2

# ── 4. PostgreSQL 16 ───────────────────────────────────────────────
echo "[4/7] Installing PostgreSQL 16..."
if ! command -v psql &> /dev/null; then
  sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
  sudo apt-get update -y
  sudo apt-get install -y postgresql-16
fi
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
DB_PASS="ApPolice_Innovate_2026!"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${DB_PASS}';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE ap_innovate;" 2>/dev/null || true
echo "PostgreSQL ready."

# ── 5. Ollama (Local AI) ────────────────────────────────────────
# ── 5. Clone / Update repo ─────────────────────────────────────────
echo "[5/7] Setting up application..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git pull origin main
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

npm ci

# ── 6. Create server .env ──────────────────────────────────────
echo "[6/7] Configuring environment..."
JWT_SECRET=$(openssl rand -hex 32)
cat > server/.env <<EOF
PORT=3001
JWT_SECRET=${JWT_SECRET}
DATABASE_URL=postgresql://postgres:${DB_PASS}@localhost:5432/ap_innovate
CORS_ORIGIN=*
NODE_ENV=production
MAX_FILE_SIZE_BYTES=26214400
EOF

# Build frontend (uses .env.production → VITE_API_BASE_URL="")
npm run build

# ── 7. Nginx reverse proxy ─────────────────────────────────────────
echo "[7/7] Configuring Nginx..."
sudo tee /etc/nginx/sites-available/ap-innovate > /dev/null <<'NGINX'
server {
    listen 80;
    server_name _;

    client_max_body_size 25M;

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # API and everything else
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/ap-innovate /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# ── Start the app ──────────────────────────────────────────────────
pm2 delete ap-innovate 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  App URL:  http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo '<your-ec2-ip>')"
echo "  PM2:      pm2 status / pm2 logs ap-innovate"
echo "  DB:       postgresql://localhost:5432/ap_innovate"
echo ""
echo "  Next steps:"
echo "    1. Point your domain to this IP"
echo "    2. Run: sudo certbot --nginx -d yourdomain.com"
echo "    3. Seed data: node server/seed.mjs"
echo "    4. AI model auto-downloads on first comparison (~80MB)"
echo "═══════════════════════════════════════════════════════════════"
