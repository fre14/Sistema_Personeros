#!/bin/bash
set -euo pipefail
# shellcheck disable=SC1091
source "$(dirname "$0")/lib.sh"

titulo "Desbloquear desasignaciones en Base de Datos"

# Script JS empaquetado en base64 para evitar choques con saltos de linea y comillas en AWS SSM
JS='import db from "/opt/electoral/app/backend/src/config/database.js";
try {
  await db.raw("ALTER TABLE historial_asignaciones ALTER COLUMN usuario_nuevo_id DROP NOT NULL;");
  await db.raw("ALTER TABLE asignacion_coordinadores DROP CONSTRAINT IF EXISTS asignacion_coordinadores_usuario_id_local_id_unique;");
  await db.raw("CREATE UNIQUE INDEX IF NOT EXISTS asignacion_coordinadores_activa_unique ON asignacion_coordinadores (usuario_id, local_id) WHERE activo = true;");
  await db.raw("ALTER TABLE asignacion_personeros DROP CONSTRAINT IF EXISTS asignacion_personeros_mesa_id_unique;");
  await db.raw("CREATE UNIQUE INDEX IF NOT EXISTS asignacion_personeros_activa_unique ON asignacion_personeros (mesa_id) WHERE activo = true;");
  console.log("✔ BASE DE DATOS ACTUALIZADA CON EXITO: Ahora se permite desasignar y reasignar.");
} catch (e) {
  console.error("ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await db.destroy();
}'

B64=$(printf "%s" "$JS" | base64 | tr -d '\r\n')

ejecutar_en_servidor "echo '$B64' | base64 -d > /tmp/desbloquear.mjs && source /opt/electoral/app/aws/instancia/comun.sh && correr_node /tmp/desbloquear.mjs" 60

ok "Listo. Ya puedes recargar el navegador y desasignar."
