#!/bin/bash
# Muestra el estado del sistema en AWS: servidores, base de datos, Redis y salud de la API.
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws jq curl

EST=$(estado_pila)
[ "$EST" != "NO_EXISTE" ] || morir "La pila '$STACK' no existe en $REGION."
titulo "Pila $STACK ($REGION): $EST"
URL=$(salida Url)
echo "  URL: $URL"

titulo "Servidores (autoescalado)"
aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "$(salida AutoScalingGroupName)" \
  --query 'AutoScalingGroups[0].[MinSize,DesiredCapacity,MaxSize]' --output text \
  | awk '{print "  minimo " $1 " · deseados " $2 " · maximo " $3}'
aws elbv2 describe-target-health --target-group-arn "$(salida ApiTargetGroupArn)" \
  --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State,TargetHealth.Reason]' --output text \
  | sed 's/None//; s/^/  /'

titulo "PostgreSQL (RDS)"
aws rds describe-db-instances --db-instance-identifier "$(salida DbInstanceId)" \
  --query 'DBInstances[0].[DBInstanceStatus,DBInstanceClass,MultiAZ,EngineVersion]' --output text \
  | awk '{print "  estado: " $1 " · " $2 " · Multi-AZ: " $3 " · version " $4}'

titulo "Redis (ElastiCache)"
aws elasticache describe-replication-groups --replication-group-id "$(salida RedisGroupId)" \
  --query 'ReplicationGroups[0].[Status,CacheNodeType,MultiAZ]' --output text \
  | awk '{print "  estado: " $1 " · " $2 " · Multi-AZ: " $3}'

titulo "Salud de la aplicacion"
if SALUD=$(curl -fsS -m 20 "$URL/api/health/full"); then
  echo "$SALUD" | jq '{instancia, db, redis, websocket, pool}'
else
  aviso "La API no responde (¿pila pausada?)."
fi
if PROG=$(aws scheduler get-schedule --name "$STACK-encender-base" \
    --query ScheduleExpression --output text 2>/dev/null); then
  echo
  aviso "SISTEMA EN PAUSA con encendido programado: $PROG (hora de Lima). Encender antes: bash aws/reanudar.sh"
elif [ "$(parametro_pila MinInstances)" = "0" ]; then
  echo
  aviso "SISTEMA EN PAUSA (sin encendido programado). Para encender: bash aws/reanudar.sh"
fi
if [ -f "$HOME/.electoral-prueba-carga-$STACK" ]; then
  echo
  aviso "HAY UNA PRUEBA DE CARGA PREPARADA: existen usuarios de prueba y limites por IP altos."
  aviso "Cuando termine de probar:  bash aws/prueba-carga.sh deshacer"
fi
echo
echo "  Panel de monitoreo: $(salida DashboardUrl)"
echo "  Logs del backend:   CloudWatch > Log groups > $(salida AppLogGroupName)"
