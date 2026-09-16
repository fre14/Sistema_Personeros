#!/usr/bin/env bash
# ==========================================================================
# Preparacion de un VPS Contabo (Ubuntu 22.04 / 24.04) desde cero.
# Ejecutar como root:  bash scripts/instalar-vps.sh
# ==========================================================================
set -euo pipefail

verde() { echo -e "\033[0;32m$1\033[0m"; }
rojo()  { echo -e "\033[0;31m$1\033[0m"; }

if [ "$(id -u)" -ne 0 ]; then
  rojo "Ejecute este script como root:  sudo bash scripts/instalar-vps.sh"
  exit 1
fi

verde "==> 1/7 Actualizando el sistema"
apt-get update -qq
apt-get upgrade -y -qq

verde "==> 2/7 Instalando utilidades"
apt-get install -y -qq curl git ufw fail2ban htop ca-certificates gnupg unzip

verde "==> 3/7 Instalando Docker"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
else
  verde "    Docker ya estaba instalado"
fi

verde "==> 4/7 Instalando Node.js 20 (para compilar el frontend)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y -qq nodejs
else
  verde "    Node.js ya estaba instalado: $(node --version)"
fi

verde "==> 5/7 Configurando el cortafuegos"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment 'SSH'
ufw allow 80/tcp    comment 'HTTP'
ufw allow 443/tcp   comment 'HTTPS'
ufw --force enable
verde "    Puertos abiertos: 22, 80, 443 (PostgreSQL y Redis quedan cerrados)"

verde "==> 6/7 Ajustando limites del sistema para muchas conexiones"
cat > /etc/sysctl.d/99-electoral.conf <<'SYSCTL'
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300
fs.file-max = 2097152
vm.swappiness = 10
vm.overcommit_memory = 1
SYSCTL
sysctl -p /etc/sysctl.d/99-electoral.conf >/dev/null

cat > /etc/security/limits.d/99-electoral.conf <<'LIMITS'
*  soft  nofile  65535
*  hard  nofile  65535
root soft nofile 65535
root hard nofile 65535
LIMITS

verde "==> 7/7 Activando fail2ban para SSH"
systemctl enable --now fail2ban >/dev/null 2>&1 || true

echo
verde "=========================================================="
verde " Servidor preparado."
verde "=========================================================="
echo "Siguiente paso:"
echo "  1. Copie el proyecto al servidor (git clone o scp)"
echo "  2. cd al directorio del proyecto"
echo "  3. bash scripts/desplegar.sh"
echo
echo "Versiones instaladas:"
echo "  Docker: $(docker --version)"
echo "  Node:   $(node --version)"
