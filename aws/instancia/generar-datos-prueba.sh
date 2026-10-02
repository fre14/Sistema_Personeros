#!/bin/bash
# Crea los usuarios de prueba de la jornada simulada (personeros en mesas sin
# personero, coordinadores por local y administradores de tablero) y deja la
# lista de DNI para k6 en s3://<artefactos>/diagnostico/prueba-carga/.
# La clave comun la deja aws/prueba-carga.sh en s3://<artefactos>/prueba-carga/clave.txt.
# Uso: generar-datos-prueba.sh [cantidad] [admins]  |  --limpiar  |  --contar-reales
set -euo pipefail
# shellcheck disable=SC1091
source /opt/electoral/app/aws/instancia/comun.sh

# Actas subidas por personeros que NO son de prueba (si hay, la jornada real empezo).
if [ "${1:-}" = "--contar-reales" ]; then
  sql "SELECT COUNT(*)::int AS actas_reales FROM resultados_mesa rm
       JOIN usuarios u ON u.id = rm.personero_id WHERE u.apellidos <> 'PRUEBA CARGA'" \
    | sed -n 's/^ *actas_reales: */ACTAS_REALES=/p'
  exit 0
fi

if [ "${1:-}" = "--limpiar" ]; then
  PERMITIR_DATOS_PRUEBA=1 correr_node scripts/generar-datos-prueba.js --limpiar
  exit 0
fi

CLAVE=$(aws s3 cp "s3://$ARTIFACTS_BUCKET/prueba-carga/clave.txt" - --region "$REGION" 2>/dev/null | tr -d '\r\n' || true)
[ ${#CLAVE} -ge 12 ] || { echo "Falta la clave de prueba en s3://$ARTIFACTS_BUCKET/prueba-carga/clave.txt"; exit 1; }

SALIDA=$(mktemp)
trap 'rm -f "$SALIDA"' EXIT
PRUEBA_PASSWORD="$CLAVE" PRUEBA_SALIDA="$SALIDA" PERMITIR_DATOS_PRUEBA=1 \
  correr_node scripts/generar-datos-prueba.js "${1:-10000}" "${2:-5}"
aws s3 cp "$SALIDA" "s3://$ARTIFACTS_BUCKET/diagnostico/prueba-carga/datos-prueba.json" \
  --region "$REGION" --only-show-errors
echo "DATOS_S3=diagnostico/prueba-carga/datos-prueba.json"
