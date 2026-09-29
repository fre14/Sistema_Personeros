#!/bin/bash
# Cambia el numero de servidores. Uso: bash aws/escalar.sh <minimo> [maximo]
#   bash aws/escalar.sh 6 10   -> al menos 6 encendidos, hasta 10 si hay carga
#   bash aws/escalar.sh 2      -> vuelve a 2 (los sobrantes se apagan solos)
# No reemplaza servidores ni corta el servicio: solo cambia los limites.
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws

MIN=${1:-}
[[ "$MIN" =~ ^[0-9]+$ ]] || morir "Uso: bash aws/escalar.sh <minimo> [maximo]"
MAX=${2:-$(parametro_pila MaxInstances)}
[[ "$MAX" =~ ^[0-9]+$ ]] || morir "Maximo invalido: $MAX"
if [ "$MAX" -lt 2 ] || [ "$MAX" -gt 12 ]; then
  morir "El maximo debe estar entre 2 y 12 (12 x 25 conexiones es el tope de la base db.t4g.medium)."
fi
if [ "$MIN" -ge "$MAX" ]; then
  morir "El minimo ($MIN) debe ser menor que el maximo ($MAX); si no, las actualizaciones de codigo fallan."
fi
if [ "$(parametro_pila DbInstanceClass)" = "db.t4g.small" ] && [ "$MAX" -gt 6 ]; then
  morir "Con db.t4g.small el maximo seguro es 6 servidores (limite de conexiones)."
fi

# Los picos programados del 4 de octubre nunca deben dejar MENOS servidores
# que el minimo pedido, ni mas que el maximo.
PICO=$(parametro_pila PeakInstances)
[ "$PICO" -lt "$MIN" ] && PICO=$MIN
[ "$PICO" -gt "$MAX" ] && PICO=$MAX
[ "$PICO" -lt 1 ] && PICO=1

actualizar_parametros "MinInstances=$MIN" "MaxInstances=$MAX" "PeakInstances=$PICO"
ok "Servidores: minimo $MIN, maximo $MAX (pico programado del 4/10: $PICO)."
[ "$MIN" -gt 0 ] && echo "   Los nuevos tardan ~3 minutos en entrar en servicio."
exit 0
