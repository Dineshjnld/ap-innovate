# Security Stack

This folder contains a practical open-source security baseline for the production deployment.

## Goals

- Strong security coverage without adding noticeable user-facing latency
- Inline protection only where it is cheap and fast
- Heavier analysis moved off the request path into CI or dedicated security infrastructure

## Layers

### 1. Inline low-latency protection on the app VM

- `CrowdSec` security engine
- `crowdsec-firewall-bouncer-iptables`
- `crowdsec-nginx-bouncer`
- CrowdSec AppSec collections for lightweight WAF-style protection on Nginx

Use:

```bash
chmod +x deploy/security/install-crowdsec-nginx.sh
sudo ./deploy/security/install-crowdsec-nginx.sh
```

This script is intended for a single Ubuntu VM running Nginx in front of the app.

### 2. Host security and suspicious activity monitoring

- `Wazuh agent` on the app VM
- Wazuh manager/dashboard should run on a separate security VM for production

Use:

```bash
sudo WAZUH_MANAGER=10.0.0.10 ./deploy/security/install-wazuh-agent.sh
```

Optional:

- `WAZUH_AGENT_NAME=ap-innovate-prod`

### 3. CI / build-time security checks

GitHub Actions included in this repo:

- `.github/workflows/security-trivy.yml`
- `.github/workflows/security-dependency-check.yml`
- `.github/workflows/security-zap-baseline.yml`

What they do:

- `Trivy`: filesystem, secrets, misconfig, and built image scan
- `OWASP Dependency-Check`: dependency CVE scan with HTML/JSON report artifacts
- `OWASP ZAP Baseline`: DAST scan against a public deployment URL

## Recommended production architecture

For a government deployment, the safest layout is:

- App VM: app + nginx + CrowdSec + Wazuh agent + Prometheus/Grafana agents/exporters
- Security VM: Wazuh manager/indexer/dashboard
- CI: Trivy + Dependency-Check + ZAP baseline

## After installation

### CrowdSec validation

```bash
sudo cscli metrics
sudo cscli collections list
sudo systemctl status crowdsec
sudo systemctl status nginx
```

### Wazuh agent validation

```bash
sudo systemctl status wazuh-agent
sudo cat /var/ossec/etc/ossec.conf | grep -A3 '<server>'
```

## Notes

- Do not run heavy active scans continuously against production during peak hours.
- Keep Wazuh manager/indexer off the app VM.
- Review and tune CrowdSec AppSec and ZAP findings before turning every alert into a hard block.
