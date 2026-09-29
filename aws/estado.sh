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
echo
echo "  Panel de monitoreo: $(salida DashboardUrl)"
echo "  Logs del backend:   CloudWatch > Log groups > $(salida AppLogGroupName)"
