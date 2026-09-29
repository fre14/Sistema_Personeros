#!/bin/bash
# Cambia variables del backend en TODOS los servidores sin redesplegar.
# Se guardan en S3, las toman tambien los servidores nuevos del autoescalado
# y cada servidor se reinicia de a uno (unos 3 segundos cada uno).
#
#   bash aws/ajustar-app.sh RATE_LIMIT_AUTH=150       # mas logins por IP y minuto
#   bash aws/ajustar-app.sh --ver                     # ver ajustes actuales
#   bash aws/ajustar-app.sh --quitar RATE_LIMIT_AUTH  # volver al valor por defecto
#   bash aws/ajustar-app.sh --reset                   # quitar todos los ajustes
#
# Valores por defecto (aws/instancia/arranque.sh): RATE_LIMIT_AUTH=60,
# RATE_LIMIT_API=600, RATE_LIMIT_WRITE=60 (por IP, por servidor, por minuto).
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws jq

BUCKET=$(bucket_artefactos)
CLAVE="config/$STACK/app.env.extra"
ACTUAL=$(aws s3 cp "s3://$BUCKET/$CLAVE" - 2>/dev/null || true)

case "${1:-}" in
  --ver)
    if [ -n "$ACTUAL" ]; then echo "$ACTUAL"; else echo "(sin ajustes: valores por defecto)"; fi
    exit 0 ;;
  --reset)
    NUEVO="" ;;
  --quitar)
    VAR=${2:?Indique la variable a quitar}
    NUEVO=$(echo "$ACTUAL" | grep -v "^$VAR=" || true) ;;
  "" )
    morir "Uso: bash aws/ajustar-app.sh VAR=valor [VAR=valor...] | --ver | --quitar VAR | --reset" ;;
  *)
    NUEVO=$ACTUAL
    for par in "$@"; do
      [[ "$par" =~ ^[A-Z][A-Z0-9_]*=[A-Za-z0-9_.,:/@%+=-]*$ ]] \
        || morir "Formato invalido: '$par' (use VAR=valor; valor solo con letras, numeros y . , : / @ % + = - _)"
      case "${par%%=*}" in
        DB_*|REDIS_HOST|REDIS_PORT|REDIS_PASSWORD|JWT_SECRET|JWT_REFRESH_SECRET|S3_BUCKET|AWS_REGION|PORT|NODE_ENV)
          morir "${par%%=*} lo administra la infraestructura; no se cambia por aqui." ;;
      esac
      NUEVO=$(echo "$NUEVO" | grep -v "^${par%%=*}=" || true)
      NUEVO=$(printf '%s\n%s' "$NUEVO" "$par" | grep -v '^$')
    done ;;
esac

if [ -n "$NUEVO" ]; then
  echo "$NUEVO" | aws s3 cp - "s3://$BUCKET/$CLAVE" --only-show-errors
  titulo "Ajustes vigentes"
  echo "$NUEVO"
else
  aws s3 rm "s3://$BUCKET/$CLAVE" --only-show-errors 2>/dev/null || true
  titulo "Sin ajustes: valores por defecto"
fi
ejecutar_en_todos "bash /opt/electoral/app/aws/instancia/aplicar-config.sh"
ok "Aplicado en todos los servidores."
