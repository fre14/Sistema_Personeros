#!/bin/bash
# Reemplaza TODA la base de datos con un respaldo que esta en el bucket de
# artefactos. Acepta: .dump (pg_dump -Fc), .sql o .sql.gz (pg_dump plano,
# como los que genera el contenedor "backup" del docker-compose).
# Uso: restaurar-bd.sh <clave-s3>
set -euo pipefail
# shellcheck disable=SC1091
source /opt/electoral/app/aws/instancia/comun.sh
CLAVE=${1:?Indique la clave S3 del respaldo}
asegurar_psql
exportar_pg

TMP=/tmp/restaurar-$$
mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT
aws s3 cp "s3://$ARTIFACTS_BUCKET/$CLAVE" "$TMP/origen" --region "$REGION" --only-show-errors

# gzip se reconoce por su firma (1f 8b); si esta truncado, gunzip falla y
# set -e corta ANTES de tocar la base.
if [ "$(head -c 2 "$TMP/origen" | od -An -tx1 | tr -d ' \n')" = "1f8b" ]; then
  gunzip -c "$TMP/origen" > "$TMP/respaldo"
else
  mv "$TMP/origen" "$TMP/respaldo"
fi

if [ "$(head -c 5 "$TMP/respaldo")" = "PGDMP" ]; then
  log "Preparando respaldo en formato custom"
  pg_restore --no-owner --no-privileges -f "$TMP/restaurar.sql" "$TMP/respaldo"
else
  log "Preparando respaldo SQL plano"
  # Sin cambios de propietario (en RDS el usuario ya es electoral_user) y sin
  # \restrict/\unrestrict, que un psql anterior a 16.10 no reconoce.
  sed -E '/^ALTER .* OWNER TO /d; /^\\(un)?restrict /d' "$TMP/respaldo" > "$TMP/restaurar.sql"
fi

log "Cerrando conexiones abiertas de los servidores (se reconectan solas)"
# Solo las conexiones de la app (mismo usuario): autovacuum y las sesiones de
# administracion de RDS no se pueden terminar y harian fallar el script.
psql -q -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND usename = current_user;" >/dev/null

# Todo en UNA transaccion: si algo falla, la base queda como estaba.
# (pg_dump nunca emite CREATE SCHEMA public: "not creating schema, since initdb creates it")
log "Restaurando (una sola transaccion)"
# Al final se libera el candado de migraciones por si el respaldo se tomo
# mientras una migracion estaba en curso (si no, migrar esperaria en vano).
psql -q -o /dev/null -v ON_ERROR_STOP=1 --single-transaction \
  -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" \
  -f "$TMP/restaurar.sql" \
  -c "DO \$\$ BEGIN IF to_regclass('public.knex_migrations_lock') IS NOT NULL THEN UPDATE public.knex_migrations_lock SET is_locked = 0; END IF; END \$\$;"

log "Aplicando migraciones que falten en el respaldo"
migrar
log "Resumen de la base restaurada:"
resumen_bd
