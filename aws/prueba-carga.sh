#!/bin/bash
# Prepara y deshace una prueba de carga contra AWS sin dejar rastros.
#
#   bash aws/prueba-carga.sh preparar [800]   1) respaldo de la base  2) crea N personeros de prueba
#                                             3) sube los limites por IP (k6 usa una sola IP)
#   (corra k6 desde su PC; el comando exacto se imprime al preparar)
#   bash aws/prueba-carga.sh deshacer         restaura la base EXACTA de antes de la prueba y los limites
#
# No la ejecute con la base real de la jornada ya cargada si no puede
# permitirse restaurar: 'deshacer' devuelve la base al momento del respaldo.
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws jq
MARCA="$HOME/.electoral-prueba-carga-$STACK"

case "${1:-}" in
  preparar)
    N=${2:-800}
    titulo "Respaldo previo"
    SALIDA=$(ejecutar_en_servidor "bash /opt/electoral/app/aws/instancia/respaldo-bd.sh" 1800)
    echo "$SALIDA"
    CLAVE=$(echo "$SALIDA" | awk -F= '/^RESPALDO_S3=/ {print $2}' | tail -n 1)
    [ -n "$CLAVE" ] || morir "No se obtuvo el respaldo; no se continua."
    echo "$CLAVE" > "$MARCA"
    titulo "Creando $N personeros de prueba"
    ejecutar_en_servidor "bash /opt/electoral/app/aws/instancia/generar-datos-prueba.sh $N" 1800
    # k6 corre desde UNA sola IP: con los limites normales por IP casi todo
    # seria 429 y la prueba mediria el limitador, no la capacidad.
    titulo "Subiendo temporalmente los limites por IP"
    BUCKET=$(bucket_artefactos)
    aws s3 cp "s3://$BUCKET/config/$STACK/app.env.extra" - 2>/dev/null > "$MARCA.config" || : > "$MARCA.config"
    bash "$AWS_DIR/ajustar-app.sh" RATE_LIMIT_AUTH=100000 RATE_LIMIT_API=1000000 RATE_LIMIT_WRITE=100000
    URL_CF="https://$(salida CloudFrontDomain)"
    titulo "Listo. Desde su PC (con k6 instalado, carpeta backend/):"
    echo "  k6 run -e BASE_URL=$URL_CF -e PASS_ADMIN='<clave del admin 00000000>' __tests__/load/escenario-800-usuarios.js"
    echo
    echo "  Mientras corre, suba servidores si quiere ver el autoescalado: bash aws/estado.sh"
    echo "  Al terminar:  bash aws/prueba-carga.sh deshacer"
    ;;
  deshacer)
    [ -f "$MARCA" ] || morir "No hay una prueba preparada (falta $MARCA)."
    CLAVE=$(cat "$MARCA")
    aviso "Se restaurara la base al momento previo a la prueba ($CLAVE)."
    read -r -p "Escriba SI para continuar: " R
    [ "$R" = "SI" ] || morir "Cancelado."
    ejecutar_en_servidor "bash /opt/electoral/app/aws/instancia/restaurar-bd.sh '$CLAVE'" 3600
    ok "Base restaurada: sin rastros de la prueba de carga."
    titulo "Devolviendo los limites por IP a sus valores"
    BUCKET=$(bucket_artefactos)
    if [ -s "$MARCA.config" ]; then
      aws s3 cp "$MARCA.config" "s3://$BUCKET/config/$STACK/app.env.extra" --only-show-errors
    else
      aws s3 rm "s3://$BUCKET/config/$STACK/app.env.extra" --only-show-errors 2>/dev/null || true
    fi
    ejecutar_en_todos "bash /opt/electoral/app/aws/instancia/aplicar-config.sh"
    rm -f "$MARCA" "$MARCA.config"
    ok "Limites restaurados."
    aviso "Las fotos subidas por la prueba quedan en el bucket de actas (no afectan los resultados)."
    ;;
  *) morir "Uso: bash aws/prueba-carga.sh preparar [cantidad] | deshacer" ;;
esac
