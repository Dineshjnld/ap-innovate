# Monitoring Stack

This folder contains an open-source monitoring stack for the production VM:

- Grafana OSS
- Prometheus
- Node Exporter
- Postgres Exporter

## Files

- `docker-compose.monitoring.yml`: starts the monitoring containers
- `.env.monitoring.example`: environment variables you must copy and edit on the VM
- `prometheus/prometheus.yml`: Prometheus scrape configuration
- `grafana/provisioning/datasources/prometheus.yml`: auto-registers Prometheus in Grafana

## First-time VM setup

Install Docker and the Compose plugin if they are not already installed:

```bash
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

## Start monitoring

```bash
cd ~/ap-innovate/deploy/monitoring
cp .env.monitoring.example .env.monitoring
nano .env.monitoring
docker compose -f docker-compose.monitoring.yml up -d
docker compose -f docker-compose.monitoring.yml ps
```

## URLs

- Grafana: `http://YOUR_VM_IP:3000`
- Prometheus: `http://YOUR_VM_IP:9090`

## Grafana login

Use the credentials from `.env.monitoring`.

## Recommended dashboards

Import these community dashboards in Grafana after login:

- Node Exporter Full: `1860`
- PostgreSQL Database: `9628`

## Notes

- `postgres-exporter` connects to the host PostgreSQL service through `host.docker.internal`.
- If PostgreSQL credentials change, update `.env.monitoring` and restart the stack.
- This monitoring stack is separate from the main app deployment, so it can be restarted independently.
