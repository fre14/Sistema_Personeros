#!/usr/bin/env bash
# ==========================================================================
# Certificado HTTPS gratuito con Let's Encrypt.
# Uso:  bash scripts/activar-ssl.sh elecciones.sudominio.com su@correo.com
# Requisito: el dominio debe apuntar ya a la IP de este servidor.
# ==========================================================================
set -euo pipefail

DOMINIO="${1:?Indique el dominio. Ejemplo: bash scripts/activar-ssl.sh elecciones.midominio.com correo@midominio.com}"
CORREO="${2:?Indique un correo para los avisos de vencimiento}"

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

echo "==> Instalando certbot"
apt-get update -qq && apt-get install -y -qq certbot

echo "==> Deteniendo Nginx para liberar el puerto 80"
docker compose stop nginx

echo "==> Solicitando el certificado para $DOMINIO"
certbot certonly --standalone --non-interactive --agree-tos \
  -m "$CORREO" -d "$DOMINIO"

echo "==> Copiando los certificados"
mkdir -p nginx/ssl
cp "/etc/letsencrypt/live/$DOMINIO/fullchain.pem" nginx/ssl/
cp "/etc/letsencrypt/live/$DOMINIO/privkey.pem"   nginx/ssl/

echo "==> Generando la configuracion HTTPS"
cat > nginx/ssl.conf <<SSL
# Incluir dentro del bloque http {} de nginx.conf o usar como server adicional
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMINIO;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_session_cache shared:SSL:20m;
    ssl_session_timeout 1d;

    add_header Strict-Transport-Security "max-age=31536000" always;

    # El resto de la configuracion es identica al bloque del puerto 80
    include /etc/nginx/sitio_comun.conf;
}

server {
    listen 80;
    server_name $DOMINIO;
    return 301 https://\$host\$request_uri;
}
SSL

echo "==> Programando la renovacion automatica"
( crontab -l 2>/dev/null | grep -v 'certbot renew'; \
  echo "0 3 * * 1 certbot renew --quiet --pre-hook 'cd $RAIZ && docker compose stop nginx' --post-hook 'cd $RAIZ && cp /etc/letsencrypt/live/$DOMINIO/*.pem $RAIZ/nginx/ssl/ && docker compose start nginx'" \
) | crontab -

docker compose start nginx

echo
echo "Certificado instalado para $DOMINIO"
echo "IMPORTANTE: revise docs/GUIA_DESPLIEGUE_CONTABO.md, seccion HTTPS,"
echo "para terminar de activar el bloque 443 en nginx/nginx.conf."
