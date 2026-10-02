#!/bin/bash
# Revisa que las actas guardadas cuadren: sin mesas duplicadas, sumas correctas,
# estados coherentes y todas con foto. Util despues de una prueba de carga y la
# noche de la eleccion, antes de publicar resultados. No modifica nada.
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"
requiere aws jq
titulo "Revision de integridad de las actas"
ejecutar_en_servidor "bash /opt/electoral/app/aws/instancia/verificar-integridad.sh" 600
