#!/bin/bash
# Ejecuta un comando de knex con la configuracion de produccion.
# Ej.: sudo bash ejecutar-knex.sh migrate:status | migrate:unlock | seed:run
set -euo pipefail
# shellcheck disable=SC1091
source /opt/electoral/app/aws/instancia/comun.sh
knex_cli "$@"
