#!/bin/bash
# Vuelve a leer los ajustes de aws/ajustar-app.sh y reinicia el backend de
# este servidor (unos 3 segundos). Lo ejecuta ajustar-app.sh via SSM, de a un
# servidor por vez.
set -euo pipefail
# shellcheck disable=SC1091
source /opt/electoral/app/aws/instancia/comun.sh
# shellcheck disable=SC1091
source "$APP/aws/instancia/componer-env.sh"
systemctl restart electoral.service
for _ in $(seq 1 30); do
  if curl -fsS -m 5 http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    log "Backend reiniciado y respondiendo en $INSTANCE_ID"
    exit 0
  fi
  sleep 2
done
log "ERROR: el backend no respondio tras el reinicio"
tail -n 40 /var/log/electoral/app.log || true
exit 1
