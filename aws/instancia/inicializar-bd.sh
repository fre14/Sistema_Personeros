#!/bin/bash
# Prepara la base de datos (lo ejecuta desplegar.sh en UN servidor via SSM).
#  - Aplica migraciones pendientes.
#  - Si la base esta vacia (sin usuarios), carga los datos iniciales: 16
#    distritos, 93 locales, 783 mesas, candidatos y 3 administradores.
#  - Si ya hay datos, NO los toca (salvo FORZAR_SEEDS=1).
set -euo pipefail
# shellcheck disable=SC1091
source /opt/electoral/app/aws/instancia/comun.sh

log "Migraciones"
migrar

USUARIOS=$(sql "SELECT count(*) AS n FROM usuarios" | awk -F': ' '/n:/ {print $2}')
log "Usuarios existentes: ${USUARIOS:-?}"

if [ "${USUARIOS:-0}" = "0" ] || [ "${FORZAR_SEEDS:-0}" = "1" ]; then
  log "Cargando datos iniciales (seeds)"
  # Los 3 administradores reciben la clave generada (Secrets Manager), no las
  # de ejemplo publicadas en el repositorio.
  SEED_SUPERADMIN_PASSWORD=$(secreto "$SECRET_ADMIN_ARN")
  SEED_ADMINS_PASSWORD=$SEED_SUPERADMIN_PASSWORD
  export SEED_SUPERADMIN_PASSWORD SEED_ADMINS_PASSWORD
  knex_cli seed:run
  unset SEED_SUPERADMIN_PASSWORD SEED_ADMINS_PASSWORD
else
  log "La base ya tiene datos: no se ejecutan los seeds."
fi

log "Resumen de la base de datos:"
resumen_bd
