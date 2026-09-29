#!/bin/bash
# Crea N personeros de prueba (DNI 10000001..., clave = DNI) asignados a mesas
# libres, para la prueba de carga. Uso: generar-datos-prueba.sh [cantidad]
set -euo pipefail
# shellcheck disable=SC1091
source /opt/electoral/app/aws/instancia/comun.sh
PERMITIR_DATOS_PRUEBA=1 correr_node scripts/generar-datos-prueba.js "${1:-800}"
