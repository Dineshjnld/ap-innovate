#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script with sudo."
  exit 1
fi

WAZUH_MANAGER="${WAZUH_MANAGER:-}"
WAZUH_AGENT_NAME="${WAZUH_AGENT_NAME:-$(hostname)}"

if [[ -z "${WAZUH_MANAGER}" ]]; then
  echo "Set WAZUH_MANAGER to the IP or hostname of your Wazuh manager."
  echo "Example: sudo WAZUH_MANAGER=10.0.0.10 ./deploy/security/install-wazuh-agent.sh"
  exit 1
fi

echo "[1/5] Installing prerequisites..."
apt-get update -y
apt-get install -y curl gnupg apt-transport-https

echo "[2/5] Adding Wazuh repository..."
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --dearmor -o /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" > /etc/apt/sources.list.d/wazuh.list

echo "[3/5] Installing Wazuh agent..."
apt-get update -y
WAZUH_MANAGER="${WAZUH_MANAGER}" WAZUH_AGENT_NAME="${WAZUH_AGENT_NAME}" apt-get install -y wazuh-agent

echo "[4/5] Enabling and starting agent..."
systemctl daemon-reload
systemctl enable wazuh-agent
systemctl restart wazuh-agent

echo "[5/5] Done."
echo
echo "Wazuh agent installed and pointed to manager: ${WAZUH_MANAGER}"
echo "Agent name: ${WAZUH_AGENT_NAME}"
echo "Check status with:"
echo "  sudo systemctl status wazuh-agent"
