#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script with sudo."
  exit 1
fi

echo "[1/7] Installing CrowdSec repository..."
curl -s https://packagecloud.io/install/repositories/crowdsec/crowdsec/script.deb.sh | bash

echo "[2/7] Installing CrowdSec engine and bouncers..."
apt-get update -y
apt-get install -y crowdsec crowdsec-firewall-bouncer-iptables crowdsec-nginx-bouncer

echo "[3/7] Installing core CrowdSec collections..."
cscli collections install crowdsecurity/linux || true
cscli collections install crowdsecurity/nginx || true

echo "[4/7] Enabling CrowdSec AppSec collections..."
cscli collections install crowdsecurity/appsec-virtual-patching || true
cscli collections install crowdsecurity/appsec-generic-rules || true

echo "[5/7] Writing AppSec acquisition config..."
mkdir -p /etc/crowdsec/acquis.d
cat > /etc/crowdsec/acquis.d/appsec.yaml <<'EOF'
appsec_configs:
  - crowdsecurity/appsec-default
labels:
  type: appsec
listen_addr: 127.0.0.1:7422
source: appsec
EOF

echo "[6/7] Enabling AppSec in nginx bouncer config..."
if ! grep -q '^APPSEC_URL=' /etc/crowdsec/bouncers/crowdsec-nginx-bouncer.conf 2>/dev/null; then
  echo 'APPSEC_URL=http://127.0.0.1:7422' >> /etc/crowdsec/bouncers/crowdsec-nginx-bouncer.conf
fi

echo "[7/7] Restarting services..."
systemctl enable crowdsec
systemctl restart crowdsec
systemctl restart nginx

echo
echo "CrowdSec + Nginx bouncer installed."
echo "Check status with:"
echo "  sudo cscli metrics"
echo "  sudo cscli collections list"
echo "  sudo systemctl status crowdsec"
