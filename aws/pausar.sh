#!/bin/bash
# Pausa el sistema SIN borrarlo: respalda la base, apaga los servidores y
# detiene la base de datos. Se conservan datos, configuracion, balanceador,
# cache, dominio y certificado: al encender no hay que desplegar nada.
# En pausa se paga ~US$ 2.5/dia (balanceador y Redis) en vez de ~US$ 8.
#
#   bash aws/pausar.sh                     se enciende solo el 4/10 a las 04:30 (seguridad)
#   bash aws/pausar.sh 2026-10-03 08:00    se enciende solo en esa fecha y hora (Lima)
#   bash aws/pausar.sh --sin-encendido     no programa nada; se enciende con reanudar.sh
#
# Para encender antes: bash aws/reanudar.sh (cancela el encendido programado).
# OJO: AWS vuelve a encender por su cuenta una base detenida a los 7 dias.
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws jq

SEGURIDAD="2026-10-04 04:30"   # 90 min antes del pre-escalado de las 06:00 del 4/10
NOMBRE_BASE="$STACK-encender-base"
NOMBRE_SERVIDORES="encender-tras-pausa"

if [ "$(TZ=America/Lima date +%F)" = "2026-10-04" ] && [ "${FORZAR:-}" != "1" ]; then
  morir "Hoy es la jornada electoral: no se pausa el sistema."
fi
if [ -f "$HOME/.electoral-prueba-carga-$STACK" ]; then
  morir "Hay una prueba de carga preparada. Primero: bash aws/prueba-carga.sh deshacer"
fi

# ── Cuando encender ────────────────────────────────────────────────
AHORA=$(date +%s)
case "${1:-}" in
  --sin-encendido) ENCENDER="" ;;
  "")
    ENCENDER=$SEGURIDAD
    if [ "$(date -d "TZ=\"America/Lima\" $ENCENDER" +%s)" -le $((AHORA + 1800)) ]; then ENCENDER=""; fi ;;
  *) ENCENDER="$1 ${2:-08:00}" ;;
esac
if [ -n "$ENCENDER" ]; then
  [[ "$ENCENDER" =~ ^20[0-9]{2}-[01][0-9]-[0-3][0-9]\ [0-2][0-9]:[0-5][0-9]$ ]] \
    || morir "Fecha no valida: '$ENCENDER'. Use: bash aws/pausar.sh AAAA-MM-DD HH:MM  (hora de Lima)"
  EP=$(date -d "TZ=\"America/Lima\" $ENCENDER" +%s) || morir "Fecha no valida: $ENCENDER"
  [ "$EP" -gt $((AHORA + 1800)) ] || morir "La fecha de encendido debe ser al menos 30 minutos en el futuro."
  ROL=$(salida ReanudarRolArn 2>/dev/null || true)
  if [ -z "$ROL" ] || [ "$ROL" = "None" ]; then
    morir "El encendido programado requiere la version nueva: bash aws/desplegar.sh (o use --sin-encendido)."
  fi
fi

echo "Se pausara el sistema '$STACK': nadie podra usarlo hasta que se encienda."
if [ -n "$ENCENDER" ]; then
  echo "Se encendera solo el $ENCENDER (hora de Lima)."
else
  echo "No se programa encendido: tendra que usar bash aws/reanudar.sh"
fi
read -r -p "Escriba SI para pausar: " R
[ "$R" = "SI" ] || morir "Cancelado."

ASG=$(salida AutoScalingGroupName)
DB=$(salida DbInstanceId)
ESTADO_DB=$(aws rds describe-db-instances --db-instance-identifier "$DB" \
  --query 'DBInstances[0].DBInstanceStatus' --output text)

# ── 1. Respaldo ─────────────────────────────────────────────────────
titulo "1/4 Respaldo de la base"
EN_SERVICIO=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "$ASG" \
  --query 'length(AutoScalingGroups[0].Instances[?LifecycleState==`InService`])' --output text)
if [ "$ESTADO_DB" = "available" ] && [ "${EN_SERVICIO:-0}" -gt 0 ]; then
  if ! bash "$AWS_DIR/respaldar.sh"; then
    aviso "El respaldo fallo. RDS guarda ademas sus propias copias automaticas de 7 dias."
    read -r -p "¿Pausar igual? Escriba SI: " R
    [ "$R" = "SI" ] || morir "Cancelado."
  fi
else
  echo "Sin servidores o base encendidos: se omite (RDS conserva sus copias automaticas)."
fi

# ── 2. Servidores ───────────────────────────────────────────────────
titulo "2/4 Servidores"
MIN_PREVIO=$(parametro_pila MinInstances)
[ "$MIN_PREVIO" -gt 0 ] 2>/dev/null || MIN_PREVIO=2
actualizar_parametros "MinInstances=0"
aws autoscaling update-auto-scaling-group --auto-scaling-group-name "$ASG" \
  --min-size 0 --desired-capacity 0
ok "Servidores apagandose"

# ── 3. Base de datos ────────────────────────────────────────────────
titulo "3/4 Base de datos"
if [ "$ESTADO_DB" = "available" ]; then
  aws rds stop-db-instance --db-instance-identifier "$DB" >/dev/null
  ok "Base de datos deteniendose (termina sola en ~10 minutos)"
else
  echo "La base ya estaba en estado: $ESTADO_DB"
fi

# ── 4. Encendido programado ─────────────────────────────────────────
titulo "4/4 Encendido programado"
aws scheduler delete-schedule --name "$NOMBRE_BASE" >/dev/null 2>&1 || true
aws autoscaling delete-scheduled-action --auto-scaling-group-name "$ASG" \
  --scheduled-action-name "$NOMBRE_SERVIDORES" >/dev/null 2>&1 || true
if [ -n "$ENCENDER" ]; then
  # Primero la base; 25 minutos despues los servidores, con la base ya lista.
  OBJETIVO=$(jq -cn --arg rol "$ROL" --arg db "$DB" \
    '{Arn: "arn:aws:scheduler:::aws-sdk:rds:startDBInstance", RoleArn: $rol,
      Input: ({DbInstanceIdentifier: $db} | tojson)}')
  aws scheduler create-schedule --name "$NOMBRE_BASE" \
    --schedule-expression "at($(TZ=America/Lima date -d "@$EP" +%Y-%m-%dT%H:%M:%S))" \
    --schedule-expression-timezone America/Lima \
    --flexible-time-window Mode=OFF --action-after-completion DELETE \
    --description "Enciende la base de $STACK tras aws/pausar.sh" \
    --target "$OBJETIVO" >/dev/null
  aws autoscaling put-scheduled-update-group-action --auto-scaling-group-name "$ASG" \
    --scheduled-action-name "$NOMBRE_SERVIDORES" \
    --start-time "$(date -u -d "@$((EP + 1500))" +%Y-%m-%dT%H:%M:%SZ)" \
    --min-size "$MIN_PREVIO" --desired-capacity "$MIN_PREVIO"
  ok "Encendido programado: base el $ENCENDER y $MIN_PREVIO servidores a las $(TZ=America/Lima date -d "@$((EP + 1500))" +%H:%M) (hora de Lima)."
else
  aviso "Sin encendido programado."
fi

titulo "Sistema en pausa"
cat <<EOF
  Se conservan: datos, respaldo, balanceador, cache, dominio y configuracion.
  Costo en pausa: ~US\$ 2.5 por dia (balanceador y Redis siguen activos).
  Encender antes:  bash aws/reanudar.sh     (unos 10 minutos)
  Ver el estado:   bash aws/estado.sh
EOF
if [ -n "$ENCENDER" ]; then
  echo "  Despues del encendido automatico, ejecute bash aws/reanudar.sh para comprobar que todo quedo bien."
fi
