#!/bin/bash
# Respaldo completo de PostgreSQL (formato custom de pg_dump) subido a S3.
# Lo ejecuta aws/respaldar.sh via SSM. Imprime RESPALDO_S3=<clave>.
set -euo pipefail
# shellcheck disable=SC1091
source /opt/electoral/app/aws/instancia/comun.sh
asegurar_psql
exportar_pg

NOMBRE="bd-$(date +%Y%m%d-%H%M%S).dump"
ARCHIVO="/tmp/$NOMBRE"
CLAVE="respaldos/$STACK/$NOMBRE"

log "Generando respaldo con $(pg_dump --version)"
pg_dump -Fc --no-owner --no-privileges -f "$ARCHIVO"
log "Tamano: $(du -h "$ARCHIVO" | cut -f1)"
aws s3 cp "$ARCHIVO" "s3://$ARTIFACTS_BUCKET/$CLAVE" --region "$REGION" --only-show-errors
rm -f "$ARCHIVO"
log "Respaldo subido a s3://$ARTIFACTS_BUCKET/$CLAVE"
echo "RESPALDO_S3=$CLAVE"
