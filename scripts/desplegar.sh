#!/usr/bin/env bash
# ==========================================================================
# Despliegue / actualizacion del sistema completo.
# Ejecutar desde la raiz del proyecto:  bash scripts/desplegar.sh
# ==========================================================================
set -euo pipefail

verde()    { echo -e "\033[0;32m$1\033[0m"; }
amarillo() { echo -e "\033[0;33m$1\033[0m"; }
rojo()     { echo -e "\033[0;31m$1\033[0m"; }

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

# ── Comprobaciones previas ──
if [ ! -f .env ]; then
  rojo "Falta el archivo .env en la raiz."
  echo "Ejecute:  cp .env.example .env  y edite las contrasenas."
  exit 1
fi

if [ ! -f backend/.env ]; then
  rojo "Falta backend/.env"
  echo "Ejecute:  cp backend/.env.example backend/.env  y edite los valores."
  exit 1
fi

if grep -q "CAMBIAR" backend/.env .env 2>/dev/null; then
  rojo "Hay valores sin cambiar (dicen CAMBIAR) en los archivos .env"
  echo "Genere secretos seguros con:  openssl rand -base64 48"
  exit 1
fi

verde "==> 1/6 Compilando el frontend"
cd frontend
if [ ! -f .env ]; then cp .env.example .env; fi
npm ci --silent
npm run build
cd "$RAIZ"
verde "    Frontend compilado en frontend/dist"

verde "==> 2/6 Construyendo las imagenes de los backends"
docker compose build --quiet

verde "==> 3/6 Levantando base de datos y cache"
docker compose up -d postgres redis
amarillo "    Esperando a que PostgreSQL acepte conexiones..."
for i in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -q 2>/dev/null; then break; fi
  sleep 2
done
docker compose up -d pgbouncer
sleep 3

verde "==> 4/6 Aplicando migraciones y datos iniciales"
docker compose run --rm backend-1 npm run migrate
if [ "${SEMBRAR_DATOS:-si}" = "si" ]; then
  docker compose run --rm backend-1 npm run seed || amarillo "    (los datos iniciales ya existian)"
fi

verde "==> 5/6 Levantando backends y Nginx"
docker compose up -d
amarillo "    Esperando a que los servicios respondan..."
sleep 12

verde "==> 6/6 Verificando el estado"
docker compose ps
echo
if curl -fsS http://localhost/api/health >/dev/null 2>&1; then
  verde "=========================================================="
  verde " Sistema desplegado y respondiendo."
  verde "=========================================================="
  curl -s http://localhost/api/health/full | head -c 600
  echo
else
  rojo "El sistema no responde en http://localhost/api/health"
  echo "Revise los registros con:  docker compose logs --tail=80 backend-1"
  exit 1
fi

echo
echo "Comandos utiles:"
echo "  docker compose logs -f backend-1     ver registros de un backend"
echo "  docker compose ps                    estado de los servicios"
echo "  bash scripts/verificar.sh            comprobacion completa"
echo "  bash scripts/respaldar.sh            respaldo manual de la base"
