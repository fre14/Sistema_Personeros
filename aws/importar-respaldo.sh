#!/bin/bash
# Carga en AWS una base de datos existente (p. ej. la de su servidor actual).
# REEMPLAZA todo el contenido de la base en AWS. Antes hace un respaldo.
#
# Uso: bash aws/importar-respaldo.sh <archivo>
#   Formatos: .sql o .sql.gz (pg_dump plano, como los del contenedor 'backup'
#   del docker-compose en backups/) o .dump (pg_dump -Fc).
#
# Para generar el archivo en su servidor actual (Docker):
#   docker exec electoral-db pg_dump -U electoral_user sistema_electoral | gzip > base.sql.gz
# Luego en CloudShell: Actions > Upload file, y ejecute este script.
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws jq

ARCHIVO=${1:-}
[ -n "$ARCHIVO" ] && [ -f "$ARCHIVO" ] || morir "Uso: bash aws/importar-respaldo.sh <archivo.sql|.sql.gz|.dump>"

aviso "Esto BORRA la base de datos actual en AWS ('$STACK') y la reemplaza por $(basename "$ARCHIVO")."
read -r -p "Escriba REEMPLAZAR para continuar: " R
[ "$R" = "REEMPLAZAR" ] || morir "Cancelado."

if [ "${SIN_RESPALDO:-0}" != 1 ]; then
  titulo "Respaldo previo de seguridad"
  bash "$AWS_DIR/respaldar.sh"
fi

BUCKET=$(bucket_artefactos)
NOMBRE=$(basename "$ARCHIVO")
NOMBRE=${NOMBRE//[^A-Za-z0-9._-]/_}
CLAVE="importaciones/$STACK/$(date +%Y%m%d-%H%M%S)-$NOMBRE"
titulo "Subiendo $(basename "$ARCHIVO")"
aws s3 cp "$ARCHIVO" "s3://$BUCKET/$CLAVE" --only-show-errors
titulo "Restaurando en la base de AWS"
ejecutar_en_servidor "bash /opt/electoral/app/aws/instancia/restaurar-bd.sh '$CLAVE'" 3600
ok "Base importada. Los usuarios ingresan con las claves que tenian en su servidor anterior."
