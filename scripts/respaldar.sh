#!/usr/bin/env bash
# Respaldo manual de la base de datos.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"
mkdir -p backups

ARCHIVO="backups/manual-$(date +%Y%m%d-%H%M%S).sql.gz"

echo "Generando respaldo..."
docker compose exec -T postgres pg_dump \
  -U "${DB_USER:-electoral_user}" \
  "${DB_NAME:-sistema_electoral}" | gzip > "$ARCHIVO"

echo "Respaldo creado: $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))"
echo
echo "Para restaurarlo:"
echo "  gunzip -c $ARCHIVO | docker compose exec -T postgres psql -U ${DB_USER:-electoral_user} ${DB_NAME:-sistema_electoral}"
