#!/bin/bash
# Actualiza Frontend (S3 + CloudFront) y Backend (EC2) en caliente sin redesplegar toda la infraestructura.
# Uso en AWS CloudShell:
#   cd ~/Sistema_Personeros && git pull origin main && bash aws/actualizar.sh
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws jq

titulo "1/3 Compilando y subiendo Frontend a S3 + CloudFront"
SITE_BUCKET=$(salida SiteBucketName)
DIST_ID=$(salida DistributionId)
URL_CF="https://$(salida CloudFrontDomain)"
[ -n "$SITE_BUCKET" ] && [ "$SITE_BUCKET" != "None" ] || morir "No se encontro el bucket del frontend (SiteBucketName)."

# Instalar y compilar frontend
echo "Compilando frontend..."
(cd "$RAIZ/frontend" && rm -f .env .env.* && npm ci --no-audit --no-fund --loglevel=error && VITE_API_URL=/api VITE_WS_URL='' npm run build)

[ -f "$RAIZ/frontend/dist/index.html" ] || morir "Error: no se generó dist/index.html"

echo "Sincronizando archivos estáticos a s3://$SITE_BUCKET..."
aws s3 sync "$RAIZ/frontend/dist" "s3://$SITE_BUCKET" --exclude index.html \
  --cache-control 'public,max-age=31536000,immutable' --only-show-errors

aws s3 cp "$RAIZ/frontend/dist/index.html" "s3://$SITE_BUCKET/index.html" \
  --cache-control 'no-cache' --content-type 'text/html; charset=utf-8' --only-show-errors

echo "Invalidando caché de CloudFront..."
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths '/*' >/dev/null
ok "Frontend actualizado e invalidado en CloudFront"

titulo "2/3 Actualizando Backend en Servidores EC2"
BUCKET_ART=$(bucket_artefactos)
CLAVE_APP="actualizaciones/$STACK/backend-$(date +%s).tar.gz"
echo "Empaquetando backend para los servidores..."
tar -C "$RAIZ" -czf /tmp/backend-update.tar.gz backend
aws s3 cp /tmp/backend-update.tar.gz "s3://$BUCKET_ART/$CLAVE_APP" --only-show-errors
rm -f /tmp/backend-update.tar.gz

CMD_ACTUALIZAR=$(cat <<INNER_EOF
aws s3 cp "s3://$BUCKET_ART/$CLAVE_APP" /tmp/backend.tar.gz --region "$REGION" --only-show-errors
tar -xzf /tmp/backend.tar.gz -C /opt/electoral/app/
rm -f /tmp/backend.tar.gz
chown -R electoral:electoral /opt/electoral/app/backend
systemctl restart electoral.service
INNER_EOF
)

ejecutar_en_todos "$CMD_ACTUALIZAR"
ok "Backend actualizado y reiniciado en todos los servidores"

titulo "3/3 Verificación del Sistema"
sleep 5
for _ in $(seq 1 15); do
  if curl -fsS -m 10 "$URL_CF/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

SALUD=$(curl -fsS -m 15 "$URL_CF/api/health/full" 2>/dev/null || echo '{}')
echo "Estado del servidor: $SALUD"
ok "¡Sistema actualizado exitosamente en $URL_CF!"
