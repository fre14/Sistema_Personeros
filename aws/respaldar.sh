#!/bin/bash
# Respaldo completo de la base de datos a S3, copia en CloudShell y enlace de descarga.
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws jq

SALIDA=$(ejecutar_en_servidor "bash /opt/electoral/app/aws/instancia/respaldo-bd.sh" 1800)
echo "$SALIDA"
CLAVE=$(echo "$SALIDA" | awk -F= '/^RESPALDO_S3=/ {print $2}' | tail -n 1)
[ -n "$CLAVE" ] || morir "No se obtuvo la clave del respaldo."
BUCKET=$(bucket_artefactos)
mkdir -p "$HOME/respaldos"
aws s3 cp "s3://$BUCKET/$CLAVE" "$HOME/respaldos/" --only-show-errors \
  && ok "Copia local: ~/respaldos/$(basename "$CLAVE")  (CloudShell: Actions > Download file)"
# El enlace firmado dura como maximo lo que duran las credenciales de
# CloudShell (alrededor de 1 hora): descarguelo pronto.
echo "Enlace de descarga (valido ~1 hora):"
aws s3 presign "s3://$BUCKET/$CLAVE" --expires-in 3600
