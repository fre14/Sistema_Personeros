#!/bin/bash
# Enciende la base de datos y los servidores tras una pausa (o comprueba que
# el encendido automatico de aws/pausar.sh quedo bien). Cancela el encendido
# programado si todavia no ocurrio. Uso: bash aws/reanudar.sh [minimo=2]
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws curl

MIN=${1:-2}
[[ "$MIN" =~ ^[1-9][0-9]*$ ]] || morir "Uso: bash aws/reanudar.sh [minimo de servidores, 1 o mas]"
ASG=$(salida AutoScalingGroupName)
DB=$(salida DbInstanceId)

# Encendido programado: ya no hace falta.
aws scheduler delete-schedule --name "$STACK-encender-base" >/dev/null 2>&1 \
  && ok "Encendido programado cancelado (se enciende ahora)." || true
aws autoscaling delete-scheduled-action --auto-scaling-group-name "$ASG" \
  --scheduled-action-name encender-tras-pausa >/dev/null 2>&1 || true

estado_db() {
  aws rds describe-db-instances --db-instance-identifier "$DB" --query 'DBInstances[0].DBInstanceStatus' --output text
}
ESTADO_DB=$(estado_db)
if [ "$ESTADO_DB" = "stopping" ]; then
  echo "La base se esta deteniendo; espero para volver a encenderla..."
  while [ "$(estado_db)" = "stopping" ]; do sleep 20; done
  ESTADO_DB=$(estado_db)
fi
if [ "$ESTADO_DB" = "stopped" ]; then
  aws rds start-db-instance --db-instance-identifier "$DB" >/dev/null
  echo "Encendiendo la base de datos (5-10 minutos)..."
fi
aws rds wait db-instance-available --db-instance-identifier "$DB"
ok "Base de datos disponible"

# El minimo de la pila (0 mientras esta en pausa) vuelve a su valor.
bash "$AWS_DIR/escalar.sh" "$MIN"
ACTUAL=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "$ASG" \
  --query 'AutoScalingGroups[0].MinSize' --output text)
if [ "$ACTUAL" -lt "$MIN" ]; then
  aws autoscaling update-auto-scaling-group --auto-scaling-group-name "$ASG" --min-size "$MIN"
fi

echo "Esperando servidores sanos..."
TG=$(salida ApiTargetGroupArn)
SANOS=0
for _ in $(seq 1 60); do
  SANOS=$(aws elbv2 describe-target-health --target-group-arn "$TG" \
    --query 'length(TargetHealthDescriptions[?TargetHealth.State==`healthy`])' --output text)
  [ "$SANOS" -ge "$MIN" ] && break
  sleep 15
done
[ "$SANOS" -ge "$MIN" ] || morir "Solo $SANOS servidores sanos tras 15 minutos. Revise: bash aws/estado.sh"
ok "Sistema en linea: $(salida Url)"
