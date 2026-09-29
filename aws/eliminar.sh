#!/bin/bash
# ══════════════════════════════════════════════════════════════════════
#  Baja del sistema al terminar la eleccion.
#
#    bash aws/eliminar.sh          Borra toda la infraestructura (deja de
#                                  cobrarse) y CONSERVA: fotos de actas en S3,
#                                  instantanea final de la base y respaldos.
#                                  Costo de lo conservado: centavos al mes.
#    bash aws/eliminar.sh --todo   Ademas borra actas, instantaneas y respaldos.
#                                  Costo final: 0. Irreversible.
#
#  ANTES: descargue las actas desde el panel de administrador (Descargas),
#  o con AWS CLI en su PC:  aws s3 sync s3://<bucket-actas> ./actas
# ══════════════════════════════════════════════════════════════════════
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws jq

TODO=0
[ "${1:-}" = "--todo" ] && TODO=1
BUCKET=$(bucket_artefactos)
EST=$(estado_pila)

vaciar_bucket_versionado() {
  local b=$1 lote
  aws s3api head-bucket --bucket "$b" 2>/dev/null || return 0
  echo "  Vaciando s3://$b (todas las versiones)..."
  while true; do
    lote=$(aws s3api list-object-versions --bucket "$b" --max-items 1000 --output json \
      | jq -c '{Objects: ([.Versions[]?, .DeleteMarkers[]?] | map({Key, VersionId})), Quiet: true}')
    [ "$(echo "$lote" | jq '.Objects | length')" -gt 0 ] || break
    aws s3api delete-objects --bucket "$b" --delete "$lote" >/dev/null
  done
  aws s3api delete-bucket --bucket "$b"
  ok "Bucket $b eliminado"
}

if [ "$EST" != "NO_EXISTE" ]; then
  ACTAS=$(salida ActasBucketName)
  DB=$(salida DbInstanceId)
  SITE=$(salida SiteBucketName)
  echo "Se eliminara la pila '$STACK' en $REGION: servidores, balanceador, CloudFront, base de datos y Redis."
  echo "La direccion $(salida Url) dejara de funcionar."
  read -r -p "Escriba el nombre de la pila ($STACK) para confirmar: " R
  [ "$R" = "$STACK" ] || morir "Cancelado."

  if [ "${SIN_RESPALDO:-0}" != 1 ] && [ -n "$(instancia_activa)" ]; then
    titulo "Respaldo final de la base de datos"
    bash "$AWS_DIR/respaldar.sh" || aviso "No se pudo hacer el respaldo (queda la instantanea final de RDS)."
  fi

  titulo "Eliminando infraestructura (10-20 minutos)"
  aws s3 rm "s3://$SITE" --recursive --only-show-errors || true
  aws cloudformation delete-stack --stack-name "$STACK"
  aws cloudformation wait stack-delete-complete --stack-name "$STACK" \
    || { diagnosticar_pila; morir "La eliminacion no termino. Revise la consola de CloudFormation."; }
  ok "Infraestructura eliminada: ya no hay servidores, base ni balanceador facturando."
else
  aviso "La pila '$STACK' ya no existe."
  DB=""
  # Bucket de actas retenido de un borrado anterior (nombre generado por CloudFormation).
  PREFIJO=$(echo "$STACK" | tr '[:upper:]' '[:lower:]')-actasbucket-
  ACTAS=$(aws s3api list-buckets --query "Buckets[?starts_with(Name, '$PREFIJO')].Name" --output text | awk '{print $1}')
  [ "$ACTAS" = "None" ] && ACTAS=""
fi

SNAPS=$(aws rds describe-db-snapshots --snapshot-type manual \
  --query "DBSnapshots[?TagList[?Key=='aws:cloudformation:stack-name' && Value=='$STACK']].DBSnapshotIdentifier" \
  --output text 2>/dev/null || true)
[ -n "$DB" ] && SNAPS="$SNAPS $(aws rds describe-db-snapshots --db-instance-identifier "$DB" --snapshot-type manual \
  --query 'DBSnapshots[].DBSnapshotIdentifier' --output text 2>/dev/null || true)"
SNAPS=$(echo "$SNAPS" | tr ' \t' '\n\n' | grep -v '^$' | sort -u || true)

if [ "$TODO" = 1 ]; then
  aviso "Se borraran DEFINITIVAMENTE: fotos de actas, instantaneas de la base y respaldos."
  read -r -p "Escriba BORRAR TODO para confirmar: " R
  [ "$R" = "BORRAR TODO" ] || morir "Cancelado. La infraestructura ya esta eliminada; lo conservado sigue en su cuenta."
  [ -n "$ACTAS" ] && vaciar_bucket_versionado "$ACTAS"
  for s in $SNAPS; do
    aws rds delete-db-snapshot --db-snapshot-identifier "$s" >/dev/null && ok "Instantanea $s eliminada"
  done
  vaciar_bucket_versionado "$BUCKET"
  ok "Todo eliminado. Revise en unos dias AWS Billing > Cost Explorer para confirmar 0 USD."
else
  titulo "Conservado en su cuenta"
  [ -n "$ACTAS" ] && echo "  Fotos de actas:   s3://$ACTAS"
  for s in $SNAPS; do echo "  Instantanea BD:   $s"; done
  echo "  Respaldos:        s3://$BUCKET/respaldos/$STACK/"
  echo
  echo "  Cuando ya no los necesite:  bash aws/eliminar.sh --todo"
fi
