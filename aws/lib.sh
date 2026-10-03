#!/bin/bash
# Funciones compartidas por los scripts de aws/ que se ejecutan desde
# AWS CloudShell (o cualquier equipo con AWS CLI v2 configurado).
set -euo pipefail

AWS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
RAIZ=$(cd "$AWS_DIR/.." && pwd)

# Configuracion: valores por defecto <- aws/config.env (si existe) <- variables de entorno.
if [ -f "$AWS_DIR/config.env" ]; then
  # shellcheck disable=SC1091
  set -a; source "$AWS_DIR/config.env"; set +a
fi
STACK=${STACK:-electoral}
REGION=${REGION:-${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}}
export AWS_REGION=$REGION AWS_DEFAULT_REGION=$REGION
export AWS_PAGER=""

if [ -t 1 ]; then
  C_OK=$'\e[32m'; C_AV=$'\e[33m'; C_ER=$'\e[31m'; C_TI=$'\e[1;36m'; C_0=$'\e[0m'
else
  C_OK=''; C_AV=''; C_ER=''; C_TI=''; C_0=''
fi
titulo() { echo; echo "${C_TI}━━ $* ━━${C_0}"; }
ok()     { echo "${C_OK}✔${C_0} $*"; }
aviso()  { echo "${C_AV}⚠${C_0} $*"; }
error()  { echo "${C_ER}✘ $*${C_0}" >&2; }
morir()  { error "$*"; exit 1; }

requiere() {
  local faltan=()
  if ! command -v jq >/dev/null 2>&1 && printf '%s\n' "$@" | grep -qx jq; then
    (sudo dnf install -y -q jq 2>/dev/null || sudo yum install -y -q jq 2>/dev/null || true)
  fi
  for c in "$@"; do command -v "$c" >/dev/null 2>&1 || faltan+=("$c"); done
  [ ${#faltan[@]} -eq 0 ] || morir "Faltan comandos: ${faltan[*]}"
}

cuenta_aws() {
  aws sts get-caller-identity --query Account --output text 2>/dev/null \
    || morir "AWS CLI sin credenciales. Ejecute este script en AWS CloudShell o configure 'aws configure'."
}

bucket_artefactos() { echo "electoral-artefactos-$(cuenta_aws)-$REGION"; }

estado_pila() {
  aws cloudformation describe-stacks --stack-name "$STACK" \
    --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NO_EXISTE"
}

salida() {
  aws cloudformation describe-stacks --stack-name "$STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

parametro_pila() {
  aws cloudformation describe-stacks --stack-name "$STACK" \
    --query "Stacks[0].Parameters[?ParameterKey=='$1'].ParameterValue" --output text
}

# Muestra por que fallo la pila y los logs de arranque de los servidores.
diagnosticar_pila() {
  error "La pila $STACK no se completo. Eventos con error (mas recientes primero):"
  aws cloudformation describe-stack-events --stack-name "$STACK" \
    --query "StackEvents[?contains(ResourceStatus,'FAILED')].[Timestamp,LogicalResourceId,ResourceStatusReason]" \
    --output text 2>/dev/null | head -n 15 || true
  local bucket clave
  bucket=$(bucket_artefactos)
  clave=$(aws s3api list-objects-v2 --bucket "$bucket" --prefix "diagnostico/$STACK/" \
    --query 'sort_by(Contents,&LastModified)[-1].Key' --output text 2>/dev/null || true)
  if [ -n "$clave" ] && [ "$clave" != "None" ]; then
    echo
    error "Log de arranque del ultimo servidor que fallo (s3://$bucket/$clave):"
    aws s3 cp "s3://$bucket/$clave" - 2>/dev/null | tail -n 60 || true
  fi
}

instancia_activa() {
  local asg
  asg=$(salida AutoScalingGroupName)
  aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "$asg" \
    --query 'AutoScalingGroups[0].Instances[?LifecycleState==`InService` && HealthStatus==`Healthy`].InstanceId' \
    --output text | tr '\t' '\n' | head -n 1
}

# Ejecuta un comando en un servidor via SSM Run Command y muestra su salida.
# Uso: ejecutar_en_servidor "<comando>" [timeout_segundos]
ejecutar_en_servidor() {
  local cmd=$1 timeout=${2:-900} id intento estado cid
  id=$(instancia_activa)
  [ -n "$id" ] && [ "$id" != "None" ] || morir "No hay servidores en servicio (¿pila pausada? use aws/reanudar.sh)."
  for intento in $(seq 1 30); do
    estado=$(aws ssm describe-instance-information --filters "Key=InstanceIds,Values=$id" \
      --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null || true)
    [ "$estado" = "Online" ] && break
    [ "$intento" = 1 ] && echo "Esperando a que el agente SSM de $id este en linea..."
    sleep 10
  done
  local coment
  coment=$(echo "${cmd:0:70}" | tr '\r\n' '  ')
  cid=$(aws ssm send-command --instance-ids "$id" --document-name AWS-RunShellScript \
    --comment "electoral: $coment" --timeout-seconds "$timeout" \
    --parameters "$(jq -cn --arg c "$cmd" '{commands:[$c], executionTimeout:["'"$timeout"'"]}')" \
    --query Command.CommandId --output text)
  echo "Ejecutando en $id (comando $cid)..."
  while true; do
    sleep 5
    estado=$(aws ssm get-command-invocation --command-id "$cid" --instance-id "$id" \
      --query Status --output text 2>/dev/null || echo Pending)
    case "$estado" in
      Pending|InProgress|Delayed) continue ;;
      *) break ;;
    esac
  done
  aws ssm get-command-invocation --command-id "$cid" --instance-id "$id" \
    --query StandardOutputContent --output text
  local err
  err=$(aws ssm get-command-invocation --command-id "$cid" --instance-id "$id" \
    --query StandardErrorContent --output text)
  [ -n "$err" ] && [ "$err" != "None" ] && echo "$err" >&2
  [ "$estado" = "Success" ] || morir "El comando termino con estado $estado"
}

# Ejecuta un comando en TODOS los servidores en servicio, de a uno por vez
# (si uno falla, no sigue con los demas). Uso: ejecutar_en_todos "<comando>"
ejecutar_en_todos() {
  local cmd=$1 asg ids cid estado id
  asg=$(salida AutoScalingGroupName)
  ids=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "$asg" \
    --query 'AutoScalingGroups[0].Instances[?LifecycleState==`InService`].InstanceId' --output text)
  local coment
  coment=$(echo "${cmd:0:70}" | tr '\r\n' '  ')
  cid=$(aws ssm send-command --instance-ids $ids --document-name AWS-RunShellScript \
    --comment "electoral: $coment" --max-concurrency 1 --max-errors 0 \
    --parameters "$(jq -cn --arg c "$cmd" '{commands:[$c]}')" \
    --query Command.CommandId --output text)
  echo "Aplicando en $(echo "$ids" | wc -w) servidores, de a uno (comando $cid)..."
  while true; do
    sleep 5
    estado=$(aws ssm list-commands --command-id "$cid" --query 'Commands[0].Status' --output text)
    case "$estado" in Pending|InProgress) continue ;; *) break ;; esac
  done
  for id in $ids; do
    aws ssm get-command-invocation --command-id "$cid" --instance-id "$id" \
      --query '[InstanceId,Status,StandardOutputContent]' --output text 2>/dev/null | tail -n 3 || true
  done
  [ "$estado" = "Success" ] || morir "El comando termino con estado $estado"
}

# Cambia parametros de la pila sin tocar el resto (misma plantilla, mismos valores).
actualizar_parametros() {
  local claves args=() k encontrado par
  claves=$(aws cloudformation describe-stacks --stack-name "$STACK" \
    --query 'Stacks[0].Parameters[].ParameterKey' --output text)
  for k in $claves; do
    encontrado=""
    for par in "$@"; do
      if [ "${par%%=*}" = "$k" ]; then encontrado="${par#*=}"; fi
    done
    if [ -n "$encontrado" ]; then
      args+=("ParameterKey=$k,ParameterValue=$encontrado")
    else
      args+=("ParameterKey=$k,UsePreviousValue=true")
    fi
  done
  local salida
  if ! salida=$(aws cloudformation update-stack --stack-name "$STACK" --use-previous-template \
      --capabilities CAPABILITY_IAM --parameters "${args[@]}" 2>&1); then
    if echo "$salida" | grep -q "No updates are to be performed"; then
      echo "Sin cambios: la pila ya tenia esos valores."
      return 0
    fi
    echo "$salida" >&2
    morir "No se pudo actualizar la pila."
  fi
  echo "Actualizando la pila (1-3 minutos)..."
  aws cloudformation wait stack-update-complete --stack-name "$STACK" \
    || { diagnosticar_pila; morir "No se pudo actualizar la pila."; }
}
