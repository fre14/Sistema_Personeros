#!/bin/bash
# Revisa la coherencia de las actas guardadas (duplicados, sumas, estados).
# Lo usan aws/prueba-carga.sh y aws/verificar-actas.sh via SSM.
set -euo pipefail
# shellcheck disable=SC1091
source /opt/electoral/app/aws/instancia/comun.sh
correr_node "$APP/aws/instancia/verificar-integridad.mjs"
