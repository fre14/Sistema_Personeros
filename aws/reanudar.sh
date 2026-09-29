#!/bin/bash
# Enciende la base de datos y los servidores. Uso: bash aws/reanudar.sh [minimo=2]
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws curl

MIN=${1:-2}
DB=$(salida DbInstanceId)
ESTADO_DB=$(aws rds describe-db-instances --db-instance-identifier "$DB" --query 'DBInstances[0].DBInstanceStatus' --output text)
if [ "$ESTADO_DB" = "stopped" ] || [ "$ESTADO_DB" = "stopping" ]; then
  [ "$ESTADO_DB" = "stopping" ] && { echo "La base se esta deteniendo; espero..."; while [ "$(aws rds describe-db-instances --db-instance-identifier "$DB" --query 'DBInstances[0].DBInstanceStatus' --output text)" != "stopped" ]; do sleep 20; done; }
  aws rds start-db-instance --db-instance-identifier "$DB" >/dev/null
  echo "Encendiendo la base de datos (5-10 minutos)..."
fi
aws rds wait db-instance-available --db-instance-identifier "$DB"
ok "Base de datos disponible"

bash "$AWS_DIR/escalar.sh" "$MIN"
echo "Esperando servidores sanos..."
TG=$(salida ApiTargetGroupArn)
for _ in $(seq 1 60); do
  SANOS=$(aws elbv2 describe-target-health --target-group-arn "$TG" \
    --query 'length(TargetHealthDescriptions[?TargetHealth.State==`healthy`])' --output text)
  [ "$SANOS" -ge "$MIN" ] && break
  sleep 15
done
[ "$SANOS" -ge "$MIN" ] || morir "Solo $SANOS servidores sanos tras 15 minutos. Revise: bash aws/estado.sh"
ok "Sistema en linea: $(salida Url)"
