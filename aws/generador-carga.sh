#!/bin/bash
# Corre DENTRO del servidor temporal que genera la carga (no en CloudShell).
# Lo lanza aws/prueba-carga.sh: descarga k6, ejecuta el escenario contra el
# sistema, sube el avance y el resultado a S3 y apaga el servidor, que se
# elimina solo al apagarse. Variables: BUCKET, PREFIJO, REGION, TOPE_MIN.
set -uo pipefail
K6_VERSION=v1.6.1
TRABAJO=${TRABAJO:-/opt/carga}
mkdir -p "$TRABAJO" && cd "$TRABAJO" || exit 1
exec > >(tee -a "$TRABAJO/generador.log") 2>&1

# Pase lo que pase, el servidor se apaga (y se elimina) al llegar al tope.
shutdown -h "+${TOPE_MIN:-90}" >/dev/null 2>&1 || true

s3() { aws s3 cp --region "$REGION" --only-show-errors "$@"; }
subir() { s3 "$1" "s3://$BUCKET/$PREFIJO/$2" || true; }
estado() { echo "$*" > estado.txt; subir estado.txt estado.txt; echo "[$(date '+%T')] $*"; }
TERMINADO=0
terminar() {
  TERMINADO=1
  estado "$1"; subir generador.log generador.log; sync; shutdown -h now; exit 0
}
# Si algo inesperado corta el script, CloudShell debe enterarse igual.
# shellcheck disable=SC2317
al_salir() { local rc=$?; [ "$TERMINADO" = 1 ] || terminar "error: el generador se detuvo (codigo $rc)"; }
trap al_salir EXIT

estado "preparando"
for f in escenario-jornada-completa.js acta-muestra.jpg datos-prueba.json config.env; do
  s3 "s3://$BUCKET/$PREFIJO/$f" "$f" || terminar "error: no se pudo descargar $f"
done

# k6 oficial desde GitHub, verificado con la suma publicada en la misma version.
BASE_K6="https://github.com/grafana/k6/releases/download/$K6_VERSION"
PAQUETE="k6-$K6_VERSION-linux-amd64.tar.gz"
descargado=0
for intento in 1 2 3; do
  if curl -fsSL --retry 3 -o "$PAQUETE" "$BASE_K6/$PAQUETE" \
     && curl -fsSL --retry 3 -o sumas.txt "$BASE_K6/k6-$K6_VERSION-checksums.txt" \
     && grep " $PAQUETE\$" sumas.txt | sha256sum -c - >/dev/null; then
    descargado=1; break
  fi
  sleep $((intento * 10))
done
[ "$descargado" = 1 ] || terminar "error: no se pudo descargar o verificar k6 $K6_VERSION desde GitHub"
K6="$TRABAJO/k6-$K6_VERSION-linux-amd64/k6"
tar -xzf "$PAQUETE" || terminar "error: no se pudo descomprimir k6"
[ -x "$K6" ] || terminar "error: k6 no quedo instalado"

# Cientos de conexiones abiertas a la vez: el limite por defecto (1024) no alcanza.
ulimit -n 250000
sysctl -qw net.ipv4.ip_local_port_range="10240 65000" || true

set -a
# shellcheck disable=SC1091
. ./config.env
set +a

estado "corriendo $PERFIL"
touch k6.log
rm -f parar-avance
( while [ ! -f parar-avance ]; do sleep 15; subir k6.log progreso.log; done ) &
AVANCE=$!

# La duracion maxima la fija el propio escenario; timeout es solo un seguro.
timeout "$(( ${TOPE_MIN:-90} - 5 ))m" "$K6" run --quiet --no-color \
  -e BASE_URL="$BASE_URL" -e PERFIL="$PERFIL" -e PASS_PRUEBA="$PASS_PRUEBA" \
  -e DATOS=./datos-prueba.json -e FOTO=./acta-muestra.jpg \
  escenario-jornada-completa.js >> k6.log 2>&1
CODIGO=$?
# Se espera a que termine la ultima subida del avance para no pisar el log final.
touch parar-avance
wait "$AVANCE" 2>/dev/null || true

echo "CODIGO_K6=$CODIGO" >> k6.log
subir k6.log progreso.log
[ -f resultado-jornada.txt ] && subir resultado-jornada.txt resultado-jornada.txt
[ -f resultado-jornada.json ] && { gzip -f resultado-jornada.json; subir resultado-jornada.json.gz resultado-jornada.json.gz; }
terminar "fin $CODIGO"
