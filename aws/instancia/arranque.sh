#!/bin/bash
# Configura y arranca el backend en un servidor EC2 nuevo. Lo ejecuta el
# user-data de la plantilla en cada arranque (incluidos los del autoescalado).
# Si algo falla, termina con error y el user-data avisa a CloudFormation.
set -euo pipefail

# shellcheck disable=SC1091
source /etc/electoral/infra.env
APP=/opt/electoral/app
BACKEND=$APP/backend
NODE_DIR=/opt/electoral/node
log() { echo "[$(date '+%F %T')] $*"; }

# ── 1. Node.js ────────────────────────────────────────────────────────
if [ -n "${NODE_TARBALL_KEY:-}" ]; then
  log "Instalando Node.js desde el paquete oficial (s3://$ARTIFACTS_BUCKET/$NODE_TARBALL_KEY)"
  aws s3 cp "s3://$ARTIFACTS_BUCKET/$NODE_TARBALL_KEY" /opt/electoral/node.tar.gz --region "$REGION" --only-show-errors
  rm -rf "$NODE_DIR" && mkdir -p "$NODE_DIR"
  tar -xzf /opt/electoral/node.tar.gz -C "$NODE_DIR" --strip-components 1
  NODE_BIN=$NODE_DIR/bin/node
else
  log "Instalando Node.js con dnf"
  dnf install -y -q nodejs22 || dnf install -y -q nodejs20
  NODE_BIN=$(command -v node-22 || command -v node-20 || command -v node)
fi
"$NODE_BIN" -e 'if (+process.versions.node.split(".")[0] < 20) { console.error("Node " + process.version + " es muy antiguo"); process.exit(1); }'
echo "$NODE_BIN" > /etc/electoral/node_bin
log "Node $("$NODE_BIN" -v) listo"

# ── 2. Usuario del servicio y zona horaria ─────────────────────────────
id electoral >/dev/null 2>&1 || useradd --system --home-dir /opt/electoral --shell /sbin/nologin electoral
timedatectl set-timezone America/Lima || true
mkdir -p /var/log/electoral
touch /var/log/electoral/app.log
chown -R electoral:electoral "$APP" /var/log/electoral

# ── 3. Secretos -> archivo de entorno (solo root puede leerlo) ─────────
secreto() {
  aws secretsmanager get-secret-value --region "$REGION" --secret-id "$1" --query SecretString --output text
}
log "Leyendo secretos de Secrets Manager"
DB_PASSWORD=$(secreto "$SECRET_DB_ARN")
REDIS_PASSWORD=$(secreto "$SECRET_REDIS_ARN")
JWT_SECRET=$(secreto "$SECRET_JWT_ARN")
JWT_REFRESH_SECRET=$(secreto "$SECRET_JWT_REFRESH_ARN")

umask 077
cat > /etc/electoral/app.env.base <<EOF
NODE_ENV=production
TZ=America/Lima
PORT=3000
INSTANCE_ID=$INSTANCE_ID
CORS_ORIGIN=$CORS_ORIGIN
TRUST_PROXY_HOPS=2
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=sistema_electoral
DB_USER=electoral_user
DB_PASSWORD=$DB_PASSWORD
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=25
DB_ACQUIRE_TIMEOUT=10000
REDIS_ENABLED=true
REDIS_REQUIRED=true
REDIS_TLS=true
REDIS_HOST=$REDIS_HOST
REDIS_PORT=$REDIS_PORT
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_INIT_TIMEOUT_MS=8000
CACHE_TTL_SECONDS=5
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=$JWT_EXPIRES_IN
JWT_REFRESH_EXPIRES_IN=7d
STORAGE_DRIVER=s3
S3_BUCKET=$ACTAS_BUCKET
AWS_REGION=$REGION
RATE_LIMIT_AUTH=60
RATE_LIMIT_WRITE=60
RATE_LIMIT_API=600
MAX_VOTOS_POR_MESA=300
WS_MAX_SOCKETS_PER_USER=3
EOF
umask 022
# Ajustes en caliente (aws/ajustar-app.sh): se agregan al final y prevalecen.
# shellcheck disable=SC1091
source "$APP/aws/instancia/componer-env.sh"

# ── 4. Migraciones (idempotentes; con candado si arrancan varias a la vez) ──
# shellcheck disable=SC1091
source "$APP/aws/instancia/comun.sh"
log "Aplicando migraciones pendientes"
migrar

# ── 5. Servicio systemd ────────────────────────────────────────────────
cat > /etc/systemd/system/electoral.service <<EOF
[Unit]
Description=Sistema Electoral - backend Node.js
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=electoral
Group=electoral
WorkingDirectory=$BACKEND
EnvironmentFile=/etc/electoral/app.env
ExecStart=$NODE_BIN src/app.js
Restart=always
RestartSec=3
KillSignal=SIGTERM
TimeoutStopSec=20
LimitNOFILE=65535
StandardOutput=append:/var/log/electoral/app.log
StandardError=append:/var/log/electoral/app.log

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now electoral.service

# ── 6. Esperar a que responda con base de datos conectada ──────────────
log "Esperando a que el backend responda..."
listo=0
for _ in $(seq 1 60); do
  if curl -fsS -m 10 http://127.0.0.1:3000/api/health/full >/tmp/salud.json 2>/dev/null; then
    listo=1
    break
  fi
  sleep 2
done
if [ "$listo" != 1 ]; then
  log "ERROR: el backend no respondio en 2 minutos. Ultimas lineas del log:"
  tail -n 60 /var/log/electoral/app.log || true
  exit 1
fi
log "Backend OK: $(cat /tmp/salud.json)"

# ── 7. Envio de logs a CloudWatch (en segundo plano: no retrasa el alta) ──
nohup bash -c "
  dnf install -y -q amazon-cloudwatch-agent && cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<'JSON'
{
  \"agent\": { \"run_as_user\": \"root\" },
  \"logs\": { \"logs_collected\": { \"files\": { \"collect_list\": [
    { \"file_path\": \"/var/log/electoral/app.log\", \"log_group_name\": \"$LOG_GROUP\", \"log_stream_name\": \"{instance_id}/app\" },
    { \"file_path\": \"/var/log/electoral/arranque.log\", \"log_group_name\": \"$LOG_GROUP\", \"log_stream_name\": \"{instance_id}/arranque\" }
  ] } } }
}
JSON
  /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
" > /var/log/electoral/cloudwatch-agent.log 2>&1 &

log "Servidor configurado."
