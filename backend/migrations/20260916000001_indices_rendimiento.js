/**
 * Índices de rendimiento.
 *
 * Sin estos índices, cada refresco del dashboard obliga a PostgreSQL a
 * recorrer las tablas completas. Con 787 mesas y ~100 pantallas
 * refrescando en el pico, la base se convierte en el cuello de botella.
 *
 * Se usa CREATE INDEX (bloqueante y rápido en tablas pequeñas) en lugar de
 * CONCURRENTLY porque Knex ejecuta las migraciones dentro de una
 * transacción y CONCURRENTLY no está permitido ahí. Con este volumen de
 * datos la creación tarda milisegundos.
 *
 * @param { import("knex").Knex } knex
 */
export const up = async function (knex) {
  // ── mesas_sufragio: filtros por local y por estado (dashboard) ──
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_mesas_local ON mesas_sufragio(local_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_mesas_estado ON mesas_sufragio(estado)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_mesas_local_estado ON mesas_sufragio(local_id, estado)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_mesas_numero ON mesas_sufragio(numero_mesa)');

  // ── locales_votacion: agrupación por distrito ──
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_locales_distrito ON locales_votacion(distrito_id)');

  // ── resultados_mesa: la tabla más consultada de la jornada ──
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_resultados_mesa_id ON resultados_mesa(mesa_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_resultados_estado ON resultados_mesa(estado)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_resultados_estado_subido ON resultados_mesa(estado, subido_en DESC)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_resultados_personero ON resultados_mesa(personero_id)');
  // Índice parcial: la suma de votos solo mira actas verificadas
  await knex.raw("CREATE INDEX IF NOT EXISTS idx_resultados_verificados ON resultados_mesa(mesa_id) WHERE estado = 'verificado'");

  // ── detalle_resultados: agregación por candidato ──
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_detalle_resultado ON detalle_resultados(resultado_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_detalle_candidato ON detalle_resultados(candidato_id)');

  // ── asignaciones: se consultan en cada login y en cada carga de acta ──
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_asig_pers_usuario ON asignacion_personeros(usuario_id) WHERE activo = true');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_asig_pers_mesa ON asignacion_personeros(mesa_id) WHERE activo = true');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_asig_coord_usuario ON asignacion_coordinadores(usuario_id) WHERE activo = true');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_asig_coord_local ON asignacion_coordinadores(local_id) WHERE activo = true');

  // ── usuarios: login por DNI y listados por rol ──
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_usuarios_dni_activo ON usuarios(dni) WHERE activo = true');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol, activo)');

  // ── auditoría: crece rápido, se pagina por fecha ──
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_auditoria_fecha_desc ON auditoria(fecha DESC)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id, fecha DESC)');

  // ── candidatos: listado de la cédula ──
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_candidatos_activo ON candidatos(numero_lista) WHERE activo = true');

  // Autovacuum más agresivo en las tablas que cambian sin parar durante la
  // jornada, para que el planificador no trabaje con estadísticas viejas.
  await knex.raw(`
    ALTER TABLE resultados_mesa SET (
      autovacuum_vacuum_scale_factor = 0.02,
      autovacuum_analyze_scale_factor = 0.01
    )
  `);
  await knex.raw(`
    ALTER TABLE mesas_sufragio SET (
      autovacuum_vacuum_scale_factor = 0.02,
      autovacuum_analyze_scale_factor = 0.01
    )
  `);

  await knex.raw('ANALYZE');
};

/**
 * @param { import("knex").Knex } knex
 */
export const down = async function (knex) {
  const indices = [
    'idx_mesas_local', 'idx_mesas_estado', 'idx_mesas_local_estado', 'idx_mesas_numero',
    'idx_locales_distrito',
    'idx_resultados_mesa_id', 'idx_resultados_estado', 'idx_resultados_estado_subido',
    'idx_resultados_personero', 'idx_resultados_verificados',
    'idx_detalle_resultado', 'idx_detalle_candidato',
    'idx_asig_pers_usuario', 'idx_asig_pers_mesa',
    'idx_asig_coord_usuario', 'idx_asig_coord_local',
    'idx_usuarios_dni_activo', 'idx_usuarios_rol',
    'idx_auditoria_fecha_desc', 'idx_auditoria_usuario',
    'idx_candidatos_activo',
  ];

  for (const idx of indices) {
    await knex.raw(`DROP INDEX IF EXISTS ${idx}`);
  }
};
