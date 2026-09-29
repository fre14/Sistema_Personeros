#!/bin/bash
# Apaga los servidores y detiene la base de datos (p. ej. entre la prueba de
# carga y el dia de la eleccion). La URL y los datos se conservan.
# Mientras esta pausado se sigue pagando: balanceador, Redis y CloudFront (~2-3 USD/dia).
# OJO: AWS vuelve a encender una base detenida a los 7 dias.
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws

read -r -p "¿Pausar el sistema '$STACK'? Nadie podra usarlo hasta reanudar. Escriba SI: " R
[ "$R" = "SI" ] || morir "Cancelado."

actualizar_parametros "MinInstances=0"
aws autoscaling update-auto-scaling-group --auto-scaling-group-name "$(salida AutoScalingGroupName)" \
  --min-size 0 --desired-capacity 0
ok "Servidores apagandose"

DB=$(salida DbInstanceId)
if [ "$(aws rds describe-db-instances --db-instance-identifier "$DB" --query 'DBInstances[0].DBInstanceStatus' --output text)" = "available" ]; then
  aws rds stop-db-instance --db-instance-identifier "$DB" >/dev/null
  ok "Base de datos deteniendose (se reanuda con: bash aws/reanudar.sh)"
fi
