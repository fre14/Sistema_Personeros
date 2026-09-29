#!/bin/bash
# Funciones comunes para los scripts que corren DENTRO de cada servidor EC2.
# Los datos de la infraestructura los deja el user-data en /etc/electoral/infra.env.
set -euo pipefail

# shellcheck disable=SC1091
source /etc/electoral/infra.env

APP=/opt/electoral/app
BACKEND=$APP/backend
NODE_BIN=$(cat /etc/electoral/node_bin 2>/dev/null || command -v node || true)

log() { echo "[$(date '+%F %T')] $*"; }

secreto() {
  aws secretsmanager get-secret-value --region "$REGION" --secret-id "$1" \
    --query SecretString --output text
}

# Ejecuta Node dentro de backend/ con las variables de la aplicacion cargadas.
correr_node() {
  (
    cd "$BACKEND"
    set -a
    # shellcheck disable=SC1091
    . /etc/electoral/app.env
    set +a
    "$NODE_BIN" "$@"
  )
}

knex_cli() {
  correr_node node_modules/knex/bin/cli.js "$@" --knexfile knexfile.js
}

# migrate:latest tolerando que otra instancia tenga el candado de migraciones.
migrar() {
  local salida intento ultimo=""
  for intento in $(seq 1 12); do
    if salida=$(correr_node "$APP/aws/instancia/migrar-con-candado.mjs" 2>&1); then
      echo "$salida"
      return 0
    fi
    echo "$salida"
    if echo "$salida" | grep -qi "already locked"; then
      log "Otra instancia esta migrando la base (intento $intento/12); espero 5 s"
      ultimo=candado
      sleep 5
      continue
    fi
    # Dos servidores que arrancan a la vez sobre una base vacia pueden chocar
    # al crear las tablas de control de knex. Se reintenta: la segunda vez ya existen.
    if echo "$salida" | grep -qiE "already exists|duplicate key"; then
      log "Choque al crear las tablas de control de knex (intento $intento/12); reintento"
      ultimo=choque
      sleep $((RANDOM % 5 + 2))
      continue
    fi
    log "ERROR: fallo la migracion de la base de datos"
    return 1
  done
  if [ "$ultimo" = "choque" ]; then
    log "ERROR: la migracion sigue fallando con 'already exists' (no es un choque pasajero)"
    return 1
  fi
  # Candado de knex tomado tras 60 s. Como las migraciones ya corren dentro de
  # un candado de PostgreSQL, nadie mas puede estar migrando: es un candado
  # huerfano (p. ej. restaurado de un respaldo). Se libera y se reintenta.
  log "AVISO: candado de knex huerfano; se libera y se reintenta"
  knex_cli migrate:unlock
  if correr_node "$APP/aws/instancia/migrar-con-candado.mjs"; then
    return 0
  fi
  log "ERROR: no se pudo migrar la base de datos"
  return 1
}

# Consulta SQL de solo lectura (usa knex; no requiere psql).
sql() {
  correr_node "$APP/aws/instancia/consulta.mjs" "$1"
}

resumen_bd() {
  sql "SELECT
    (SELECT count(*) FROM distritos) AS distritos,
    (SELECT count(*) FROM distritos WHERE tiene_eleccion_distrital) AS distritos_con_eleccion_distrital,
    (SELECT count(*) FROM locales_votacion) AS locales,
    (SELECT count(*) FROM mesas_sufragio) AS mesas,
    (SELECT count(*) FROM candidatos WHERE tipo_eleccion = 'provincial') AS candidatos_provinciales,
    (SELECT count(*) FROM candidatos WHERE tipo_eleccion = 'distrital') AS candidatos_distritales,
    (SELECT count(*) FROM usuarios WHERE rol = 'admin') AS administradores,
    (SELECT count(*) FROM usuarios WHERE rol = 'coordinador') AS coordinadores,
    (SELECT count(*) FROM usuarios WHERE rol = 'personero') AS personeros,
    (SELECT count(*) FROM asignacion_personeros WHERE activo) AS personeros_asignados,
    (SELECT count(*) FROM resultados_mesa) AS actas_registradas"
}

# Cliente de PostgreSQL (pg_dump/psql) bajo demanda: solo hace falta para
# respaldos y restauraciones, asi que no retrasa el arranque de los servidores.
asegurar_psql() {
  if command -v pg_dump >/dev/null 2>&1; then return 0; fi
  log "Instalando cliente de PostgreSQL..."
  dnf install -y -q postgresql16 >/dev/null 2>&1 \
    || dnf install -y -q postgresql17 >/dev/null 2>&1 \
    || { log "ERROR: no se pudo instalar el cliente de PostgreSQL"; return 1; }
}

exportar_pg() {
  export PGHOST="$DB_HOST" PGPORT="$DB_PORT" PGUSER=electoral_user PGDATABASE=sistema_electoral PGSSLMODE=require
  PGPASSWORD=$(grep '^DB_PASSWORD=' /etc/electoral/app.env | cut -d= -f2-)
  export PGPASSWORD
}
