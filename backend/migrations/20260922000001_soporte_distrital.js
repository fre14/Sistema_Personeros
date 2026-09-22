const TABLE_DISTRITOS = 'distritos';
const TABLE_CANDIDATOS = 'candidatos';
const TABLE_RESULTADOS = 'resultados_mesa';
const TABLE_MESAS = 'mesas_sufragio';

export async function up(knex) {
  const hasTieneDistrital = await knex.schema.hasColumn(TABLE_DISTRITOS, 'tiene_eleccion_distrital');
  if (!hasTieneDistrital) {
    await knex.schema.alterTable(TABLE_DISTRITOS, (table) => {
      table.boolean('tiene_eleccion_distrital').defaultTo(false);
    });
  }

  const hasTipoEleccionCand = await knex.schema.hasColumn(TABLE_CANDIDATOS, 'tipo_eleccion');
  const hasDistritoIdCand = await knex.schema.hasColumn(TABLE_CANDIDATOS, 'distrito_id');
  const hasUpdatedAtCand = await knex.schema.hasColumn(TABLE_CANDIDATOS, 'updated_at');

  await knex.schema.alterTable(TABLE_CANDIDATOS, (table) => {
    if (!hasTipoEleccionCand) table.string('tipo_eleccion', 20).defaultTo('provincial').notNullable();
    if (!hasDistritoIdCand) table.integer('distrito_id').unsigned().references('id').inTable(TABLE_DISTRITOS);
    if (!hasUpdatedAtCand) table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  const hasTipoEleccionRes = await knex.schema.hasColumn(TABLE_RESULTADOS, 'tipo_eleccion');
  if (!hasTipoEleccionRes) {
    await knex.schema.alterTable(TABLE_RESULTADOS, (table) => {
      table.string('tipo_eleccion', 20).defaultTo('provincial').notNullable();
    });
  }

  const hasEstadoDistritalMesa = await knex.schema.hasColumn(TABLE_MESAS, 'estado_distrital');
  if (!hasEstadoDistritalMesa) {
    await knex.schema.alterTable(TABLE_MESAS, (table) => {
      table.string('estado_distrital', 20);
    });
  }

  await knex(TABLE_CANDIDATOS)
    .whereNull('tipo_eleccion')
    .update({ tipo_eleccion: 'provincial' });

  await knex(TABLE_RESULTADOS)
    .whereNull('tipo_eleccion')
    .update({ tipo_eleccion: 'provincial' });

  const distritosDistritales = ['SJB', 'AAC', 'CAL', 'JNA', 'TAM'];
  await knex(TABLE_DISTRITOS)
    .whereIn('codigo', distritosDistritales)
    .update({ tiene_eleccion_distrital: true });

  const distritosConDistrital = await knex(TABLE_DISTRITOS)
    .whereIn('codigo', distritosDistritales)
    .select('id');
  const distritoIds = distritosConDistrital.map(d => d.id);

  if (distritoIds.length > 0) {
    const locales = await knex('locales_votacion')
      .whereIn('distrito_id', distritoIds)
      .select('id');
    const localIds = locales.map(l => l.id);

    if (localIds.length > 0) {
      await knex(TABLE_MESAS)
        .whereIn('local_id', localIds)
        .update({ estado_distrital: 'pendiente' });
    }
  }

  await knex.schema.raw(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_candidato_distrital') THEN
        ALTER TABLE ${TABLE_CANDIDATOS} ADD CONSTRAINT chk_candidato_distrital
        CHECK (tipo_eleccion = 'provincial' OR distrito_id IS NOT NULL);
      END IF;
    END $$;
  `);

  await knex.schema.raw(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_estado_distrital') THEN
        ALTER TABLE ${TABLE_MESAS} ADD CONSTRAINT chk_estado_distrital
        CHECK (estado_distrital IS NULL OR estado_distrital IN ('pendiente', 'reportada', 'verificada', 'observada'));
      END IF;
    END $$;
  `);

  await knex.schema.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_resultado_mesa_tipo_activo
    ON ${TABLE_RESULTADOS}(mesa_id, tipo_eleccion)
  `);

  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_candidatos_tipo ON ${TABLE_CANDIDATOS}(tipo_eleccion, activo)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_candidatos_distrito ON ${TABLE_CANDIDATOS}(distrito_id) WHERE distrito_id IS NOT NULL`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_resultados_tipo ON ${TABLE_RESULTADOS}(tipo_eleccion)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_resultados_mesa_tipo ON ${TABLE_RESULTADOS}(mesa_id, tipo_eleccion)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_mesas_estado_distrital ON ${TABLE_MESAS}(estado_distrital) WHERE estado_distrital IS NOT NULL`);
}

export async function down(knex) {
  await knex.schema.raw('DROP INDEX IF EXISTS idx_mesas_estado_distrital');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_resultados_mesa_tipo');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_resultados_tipo');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_candidatos_distrito');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_candidatos_tipo');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_resultado_mesa_tipo_activo');
  await knex.schema.raw(`ALTER TABLE ${TABLE_MESAS} DROP CONSTRAINT IF EXISTS chk_estado_distrital`);
  await knex.schema.raw(`ALTER TABLE ${TABLE_CANDIDATOS} DROP CONSTRAINT IF EXISTS chk_candidato_distrital`);

  await knex.schema.alterTable(TABLE_MESAS, (table) => {
    table.dropColumn('estado_distrital');
  });

  await knex(TABLE_RESULTADOS).where('tipo_eleccion', 'distrital').del();
  await knex.schema.alterTable(TABLE_RESULTADOS, (table) => {
    table.dropColumn('tipo_eleccion');
  });

  await knex(TABLE_CANDIDATOS).where('tipo_eleccion', 'distrital').del();
  await knex.schema.alterTable(TABLE_CANDIDATOS, (table) => {
    table.dropColumn('tipo_eleccion');
    table.dropColumn('distrito_id');
    table.dropColumn('updated_at');
  });

  await knex.schema.alterTable(TABLE_DISTRITOS, (table) => {
    table.dropColumn('tiene_eleccion_distrital');
  });
}
