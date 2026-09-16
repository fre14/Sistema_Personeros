#!/usr/bin/env bash
# Comprobacion del estado del sistema. No modifica nada.
set -uo pipefail

verde()    { echo -e "\033[0;32m  OK  \033[0m $1"; }
rojo()     { echo -e "\033[0;31m FALLA\033[0m $1"; }
amarillo() { echo -e "\033[0;33m AVISO\033[0m $1"; }

BASE="${1:-http://localhost}"
fallas=0

echo "=========================================================="
echo " Verificacion del Sistema Electoral"
echo " Destino: $BASE"
echo "=========================================================="
echo

echo "-- Contenedores --"
for s in nginx backend-1 backend-2 backend-3 backend-4 postgres redis pgbouncer; do
  estado=$(docker compose ps --format '{{.Service}} {{.State}}' 2>/dev/null | awk -v s="$s" '$1==s {print $2}')
  if [ "$estado" = "running" ]; then verde "$s"; else rojo "$s (estado: ${estado:-ausente})"; fallas=$((fallas+1)); fi
done
echo

echo "-- Respuesta HTTP --"
if curl -fsS "$BASE/health" >/dev/null 2>&1; then verde "Nginx responde"; else rojo "Nginx no responde"; fallas=$((fallas+1)); fi
if curl -fsS "$BASE/api/health" >/dev/null 2>&1; then verde "API responde"; else rojo "API no responde"; fallas=$((fallas+1)); fi

salud=$(curl -fsS "$BASE/api/health/full" 2>/dev/null || echo '{}')
if echo "$salud" | grep -q '"db":true'; then verde "Base de datos conectada"; else rojo "Base de datos NO conectada"; fallas=$((fallas+1)); fi
if echo "$salud" | grep -q '"redis":true'; then verde "Redis conectado"; else amarillo "Redis no conectado (sistema en modo degradado)"; fi
if echo "$salud" | grep -q '"adapterRedis":true'; then verde "Socket.io sincronizado entre instancias"; else amarillo "Socket.io sin adapter Redis"; fi
echo

echo "-- Balanceo entre backends --"
declare -A vistos
for i in $(seq 1 12); do
  inst=$(curl -s "$BASE/api/health" | grep -o '"instancia":"[^"]*"' | cut -d'"' -f4)
  [ -n "$inst" ] && vistos["$inst"]=1
done
if [ ${#vistos[@]} -ge 1 ]; then
  verde "Backends respondiendo: ${!vistos[*]}"
  amarillo "(con ip_hash una misma IP ve siempre el mismo backend: es lo esperado)"
else
  rojo "Ningun backend respondio"; fallas=$((fallas+1))
fi
echo

echo "-- Base de datos --"
tablas=$(docker compose exec -T postgres psql -U "${DB_USER:-electoral_user}" -d "${DB_NAME:-sistema_electoral}" -tAc \
  "select count(*) from information_schema.tables where table_schema='public'" 2>/dev/null || echo 0)
if [ "${tablas:-0}" -ge 11 ]; then verde "Tablas creadas: $tablas"; else rojo "Faltan tablas (encontradas: ${tablas:-0}, esperadas 11+)"; fallas=$((fallas+1)); fi

indices=$(docker compose exec -T postgres psql -U "${DB_USER:-electoral_user}" -d "${DB_NAME:-sistema_electoral}" -tAc \
  "select count(*) from pg_indexes where schemaname='public' and indexname like 'idx_%'" 2>/dev/null || echo 0)
if [ "${indices:-0}" -ge 15 ]; then verde "Indices de rendimiento: $indices"; else rojo "Faltan indices (encontrados: ${indices:-0}). Ejecute las migraciones."; fallas=$((fallas+1)); fi

mesas=$(docker compose exec -T postgres psql -U "${DB_USER:-electoral_user}" -d "${DB_NAME:-sistema_electoral}" -tAc \
  "select count(*) from mesas_sufragio" 2>/dev/null || echo 0)
echo "       Mesas registradas: ${mesas:-0}"
echo

echo "-- Recursos --"
docker stats --no-stream --format "  {{.Name}}: CPU {{.CPUPerc}}  RAM {{.MemUsage}}" 2>/dev/null | head -12
echo

echo "=========================================================="
if [ "$fallas" -eq 0 ]; then
  echo -e " \033[0;32mTodo correcto. El sistema esta operativo.\033[0m"
else
  echo -e " \033[0;31m$fallas comprobacion(es) fallaron. Revise arriba.\033[0m"
fi
echo "=========================================================="
exit "$fallas"
