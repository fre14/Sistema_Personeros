import { jest } from '@jest/globals';
import {
  createDbMock, crearReq, crearRes,
  usuarioAdmin, usuarioCoordinador, silenciarConsola,
} from '../../setup/knex-mock.js';

// ═══════════════════════════════════════════════════════════════════
// coordinador.controller.js — 88% de lineas pero solo 62.5% de funciones
// y 73% de ramas en la suite anterior.
//
// Regla de negocio central: el coordinador supervisa automaticamente a
// TODOS los personeros de las mesas de sus locales. Si el filtro por local
// falla, un coordinador ve (o verifica) actas que no le corresponden.
// ═══════════════════════════════════════════════════════════════════

const mockDb = createDbMock();

jest.unstable_mockModule('../../../src/config/database.js', () => ({ default: mockDb.db }));

const { getMisLocales, getMesasDeLocal, getPersonerosSupervisados } =
  await import('../../../src/controllers/coordinador.controller.js');

let consola;
beforeEach(() => {
  jest.clearAllMocks();
  mockDb.reset();
  consola = silenciarConsola();
});
afterEach(() => consola.mockRestore());

// ═══════════════════════════════════════════════════════════════════
describe('getMisLocales', () => {
  /** Encola: lista de locales + (estados de mesa, conteo de personeros) por local. */
  const encolarLocales = (locales, statsPorLocal) => {
    mockDb.queue('locales_votacion', locales);
    statsPorLocal.forEach(({ estados, personeros }) => {
      mockDb.queue('mesas_sufragio', estados);
      mockDb.queue('asignacion_personeros', personeros);
    });
  };

  it('devuelve los locales del coordinador con sus estadisticas agregadas', async () => {
    encolarLocales(
      [{ id: 4, nombre: 'IE San Juan', direccion: 'Av. Peru 100', distrito: 'Ayacucho', distrito_id: 1 }],
      [{
        estados: [
          { estado: 'pendiente', c: '4' },
          { estado: 'reportada', c: '2' },
          { estado: 'verificada', c: '5' },
          { estado: 'observada', c: '1' },
        ],
        personeros: { c: '11' },
      }],
    );
    const res = crearRes();

    await getMisLocales(crearReq({ user: usuarioCoordinador() }), res);

    expect(res.body.data[0]).toMatchObject({
      id: 4, nombre: 'IE San Juan', distrito: 'Ayacucho',
      stats: {
        total: 12, pendientes: 4, reportadas: 2,
        verificadas: 5, observadas: 1, personeros_asignados: 11,
      },
    });
  });

  it('el total de mesas es la suma de todos los estados', async () => {
    encolarLocales(
      [{ id: 4, nombre: 'IE X' }],
      [{ estados: [{ estado: 'pendiente', c: '10' }, { estado: 'verificada', c: '15' }], personeros: { c: '25' } }],
    );
    const res = crearRes();

    await getMisLocales(crearReq({ user: usuarioCoordinador() }), res);

    expect(res.body.data[0].stats.total).toBe(25);
  });

  it('ignora estados desconocidos en el desglose pero los suma al total', async () => {
    encolarLocales(
      [{ id: 4, nombre: 'IE X' }],
      [{ estados: [{ estado: 'cerrada', c: '3' }], personeros: { c: '0' } }],
    );
    const res = crearRes();

    await getMisLocales(crearReq({ user: usuarioCoordinador() }), res);

    expect(res.body.data[0].stats.total).toBe(3);
    expect(res.body.data[0].stats.pendientes).toBe(0);
    expect(res.body.data[0].stats.verificadas).toBe(0);
  });

  it('un local sin mesas devuelve estadisticas en cero', async () => {
    encolarLocales(
      [{ id: 7, nombre: 'IE Nueva' }],
      [{ estados: [], personeros: undefined }],
    );
    const res = crearRes();

    await getMisLocales(crearReq({ user: usuarioCoordinador() }), res);

    expect(res.body.data[0].stats).toMatchObject({
      total: 0, pendientes: 0, personeros_asignados: 0,
    });
  });

  it('tolera conteos no numericos devolviendo 0', async () => {
    encolarLocales(
      [{ id: 4, nombre: 'IE X' }],
      [{ estados: [{ estado: 'pendiente', c: null }], personeros: { c: 'abc' } }],
    );
    const res = crearRes();

    await getMisLocales(crearReq({ user: usuarioCoordinador() }), res);

    expect(res.body.data[0].stats.pendientes).toBe(0);
    expect(res.body.data[0].stats.personeros_asignados).toBe(0);
  });

  it('el admin ve TODOS los locales sin filtrar por asignacion', async () => {
    encolarLocales(
      [{ id: 4, nombre: 'IE A' }, { id: 5, nombre: 'IE B' }],
      [
        { estados: [{ estado: 'pendiente', c: '1' }], personeros: { c: '1' } },
        { estados: [{ estado: 'verificada', c: '2' }], personeros: { c: '2' } },
      ],
    );
    const res = crearRes();

    await getMisLocales(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data).toHaveLength(2);
    // Sin join contra asignacion_coordinadores: el admin no se filtra.
    expect(mockDb.tablasUsadas()).not.toContain('asignacion_coordinadores');
  });

  it('el coordinador se filtra por sus asignaciones activas', async () => {
    encolarLocales(
      [{ id: 4, nombre: 'IE A' }],
      [{ estados: [], personeros: { c: '0' } }],
    );
    const res = crearRes();

    await getMisLocales(crearReq({ user: usuarioCoordinador(2) }), res);

    expect(mockDb.calls('locales_votacion').wheres).toContainEqual({
      'ac.usuario_id': 2, 'ac.activo': true,
    });
  });

  it('un coordinador sin locales asignados recibe lista vacia', async () => {
    mockDb.queue('locales_votacion', []);
    const res = crearRes();

    await getMisLocales(crearReq({ user: usuarioCoordinador() }), res);

    expect(res.body.data).toEqual([]);
    expect(res.body.success).toBe(true);
  });

  it('calcula estadisticas de varios locales en paralelo sin mezclarlas', async () => {
    encolarLocales(
      [{ id: 4, nombre: 'IE A' }, { id: 5, nombre: 'IE B' }],
      [
        { estados: [{ estado: 'pendiente', c: '10' }], personeros: { c: '10' } },
        { estados: [{ estado: 'verificada', c: '20' }], personeros: { c: '20' } },
      ],
    );
    const res = crearRes();

    await getMisLocales(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data[0].stats).toMatchObject({ pendientes: 10, personeros_asignados: 10 });
    expect(res.body.data[1].stats).toMatchObject({ verificadas: 20, personeros_asignados: 20 });
  });

  it('responde 500 ante fallo de BD', async () => {
    mockDb.queueError('locales_votacion', new Error('caida'));
    const res = crearRes();

    await getMisLocales(crearReq({ user: usuarioCoordinador() }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(consola).toHaveBeenCalled();
  });

  it('responde 500 si falla el conteo de estadisticas de un local', async () => {
    mockDb.queue('locales_votacion', [{ id: 4, nombre: 'IE A' }]);
    mockDb.queueError('mesas_sufragio', new Error('timeout'));
    const res = crearRes();

    await getMisLocales(crearReq({ user: usuarioCoordinador() }), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('getMesasDeLocal', () => {
  it('rechaza a un coordinador que no tiene asignado el local', async () => {
    mockDb.queue('asignacion_coordinadores', undefined);
    const res = crearRes();

    await getMesasDeLocal(
      crearReq({ user: usuarioCoordinador(), params: { localId: '99' } }), res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.message).toMatch(/no tiene asignado este local/i);
  });

  it('el admin entra sin verificacion de asignacion', async () => {
    mockDb.queue('locales_votacion', { id: 4, nombre: 'IE San Juan', distrito: 'Ayacucho' });
    mockDb.queue('mesas_sufragio', [{ id: 9, numero_mesa: '045821' }]);
    const res = crearRes();

    await getMesasDeLocal(
      crearReq({ user: usuarioAdmin(), params: { localId: '4' } }), res,
    );

    expect(res.body.success).toBe(true);
    expect(mockDb.tablasUsadas()).not.toContain('asignacion_coordinadores');
  });

  it('devuelve 404 si el local no existe', async () => {
    mockDb.queue('asignacion_coordinadores', { id: 30 });
    mockDb.queue('locales_votacion', undefined);
    const res = crearRes();

    await getMesasDeLocal(
      crearReq({ user: usuarioCoordinador(), params: { localId: '99' } }), res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('un coordinador asignado obtiene local y mesas con datos del personero', async () => {
    mockDb.queue('asignacion_coordinadores', { id: 30 });
    mockDb.queue('locales_votacion', {
      id: 4, nombre: 'IE San Juan', direccion: 'Av. Peru 100', distrito: 'Ayacucho',
    });
    mockDb.queue('mesas_sufragio', [
      {
        id: 9, numero_mesa: '045821', estado: 'reportada',
        personero_id: 3, personero_nombre: 'Ana Perez', personero_telefono: '999888777',
        resultado_id: 500, resultado_estado: 'pendiente',
      },
    ]);
    const res = crearRes();

    await getMesasDeLocal(
      crearReq({ user: usuarioCoordinador(), params: { localId: '4' } }), res,
    );

    expect(res.body.data.local.nombre).toBe('IE San Juan');
    expect(res.body.data.mesas[0]).toMatchObject({
      numero_mesa: '045821', personero_nombre: 'Ana Perez', resultado_id: 500,
    });
  });

  it('un local sin mesas devuelve la lista vacia sin error', async () => {
    mockDb.queue('asignacion_coordinadores', { id: 30 });
    mockDb.queue('locales_votacion', { id: 4, nombre: 'IE Nueva' });
    mockDb.queue('mesas_sufragio', []);
    const res = crearRes();

    await getMesasDeLocal(
      crearReq({ user: usuarioCoordinador(), params: { localId: '4' } }), res,
    );

    expect(res.body.data.mesas).toEqual([]);
  });

  it('responde 500 ante fallo de BD', async () => {
    mockDb.queueError('asignacion_coordinadores', new Error('caida'));
    const res = crearRes();

    await getMesasDeLocal(
      crearReq({ user: usuarioCoordinador(), params: { localId: '4' } }), res,
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(consola).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('getPersonerosSupervisados', () => {
  it('el coordinador solo ve personeros de sus propios locales', async () => {
    mockDb.queue('asignacion_personeros', [
      { personero_id: 3, dni: '22222222', numero_mesa: '045821', local_id: 4 },
    ]);
    const res = crearRes();

    await getPersonerosSupervisados(crearReq({ user: usuarioCoordinador(2) }), res);

    // El filtro se aplica con una subconsulta whereIn sobre l.id.
    expect(mockDb.calls('asignacion_personeros').wheres).toContain('l.id');
    expect(res.body.data).toHaveLength(1);
  });

  it('el admin NO se filtra por locales asignados', async () => {
    mockDb.queue('asignacion_personeros', [{ personero_id: 3 }, { personero_id: 4 }]);
    const res = crearRes();

    await getPersonerosSupervisados(crearReq({ user: usuarioAdmin() }), res);

    expect(mockDb.calls('asignacion_personeros').wheres).not.toContain('l.id');
    expect(res.body.data).toHaveLength(2);
  });

  it('filtra por un local concreto cuando se pide', async () => {
    mockDb.queue('asignacion_personeros', [{ personero_id: 3 }]);
    const res = crearRes();

    await getPersonerosSupervisados(
      crearReq({ user: usuarioAdmin(), query: { localId: '4' } }), res,
    );

    expect(mockDb.calls('asignacion_personeros').wheres).toContain('l.id');
  });

  it('aplica busqueda libre por dni, nombre, mesa o local', async () => {
    mockDb.queue('asignacion_personeros', [{ personero_id: 3, dni: '22222222' }]);
    const res = crearRes();

    await getPersonerosSupervisados(
      crearReq({ user: usuarioAdmin(), query: { q: 'perez' } }), res,
    );

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('combina filtro de local y busqueda', async () => {
    mockDb.queue('asignacion_personeros', []);
    const res = crearRes();

    await getPersonerosSupervisados(
      crearReq({ user: usuarioCoordinador(), query: { localId: '4', q: '045' } }), res,
    );

    expect(res.body.success).toBe(true);
  });

  it('incluye el estado del acta de cada personero supervisado', async () => {
    mockDb.queue('asignacion_personeros', [{
      personero_id: 3, numero_mesa: '045821',
      resultado_id: 500, estado_resultado: 'observado',
    }]);
    const res = crearRes();

    await getPersonerosSupervisados(crearReq({ user: usuarioCoordinador() }), res);

    expect(res.body.data[0].estado_resultado).toBe('observado');
  });

  it('devuelve lista vacia si no supervisa a nadie', async () => {
    mockDb.queue('asignacion_personeros', []);
    const res = crearRes();

    await getPersonerosSupervisados(crearReq({ user: usuarioCoordinador() }), res);

    expect(res.body.data).toEqual([]);
  });

  it('responde 500 ante fallo de BD', async () => {
    mockDb.queueError('asignacion_personeros', new Error('caida'));
    const res = crearRes();

    await getPersonerosSupervisados(crearReq({ user: usuarioCoordinador() }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(consola).toHaveBeenCalled();
  });
});
