import { jest } from '@jest/globals';
import { createDbMock, crearReq, crearRes, usuarioAdmin } from '../support/knex-mock.js';

// ═══════════════════════════════════════════════════════════════════
// dashboard.controller.js — 62% previo, 45% de ramas.
//
// Aqui se calculan los porcentajes de avance que se publican. Un error de
// division o un estado mal contado produce una cifra publica incorrecta,
// asi que el foco esta en la ARITMETICA: division por cero, redondeo a dos
// decimales, estados ausentes y el filtrado por distrito/local.
// ═══════════════════════════════════════════════════════════════════

const mockDb = createDbMock();
const cacheWrap = jest.fn((clave, ttl, fn) => fn());

jest.unstable_mockModule('../../src/config/database.js', () => ({ default: mockDb.db }));
jest.unstable_mockModule('../../src/services/cache.service.js', () => ({
  cacheWrap, cacheGet: jest.fn(), cacheSet: jest.fn(), invalidateDashboard: jest.fn(),
}));

const {
  getResumen, getComposicionVoto, getResultadosPorCandidato,
  getResultadosPorDistrito, getResultadosPorLocal,
  getMesasPendientes, getAuditoria,
} = await import('../../src/controllers/dashboard.controller.js');

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.reset();
  cacheWrap.mockImplementation((clave, ttl, fn) => fn());
});

// ═══════════════════════════════════════════════════════════════════
describe('getResumen — vista global', () => {
  /** Las 7 agregaciones del Promise.all, en orden. */
  const encolarGlobal = ({
    totalMesas = { c: '850' },
    estados = [
      { estado: 'pendiente', c: '400' },
      { estado: 'reportada', c: '200' },
      { estado: 'verificada', c: '250' },
    ],
    personeros = { c: '850' },
    asignados = { c: '820' },
    locales = { c: '60' },
    coordinadores = { c: '60' },
    votos = { s: '48000' },
  } = {}) => {
    mockDb.queue('mesas_sufragio', totalMesas, estados);
    mockDb.queue('usuarios', personeros);
    mockDb.queue('asignacion_personeros', asignados);
    mockDb.queue('locales_votacion', locales);
    mockDb.queue('usuarios', coordinadores);
    mockDb.queue('resultados_mesa', votos);
  };

  it('agrega los totales de la jornada', async () => {
    encolarGlobal();
    const res = crearRes();

    await getResumen(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data).toMatchObject({
      total_mesas: 850,
      mesas_pendientes: 400,
      mesas_reportadas: 200,
      mesas_verificadas: 250,
      total_personeros: 850,
      personeros_asignados: 820,
      total_locales: 60,
      total_votos_contados: 48000,
    });
  });

  it('calcula el porcentaje de avance con dos decimales', async () => {
    encolarGlobal();
    const res = crearRes();

    await getResumen(crearReq({ user: usuarioAdmin() }), res);

    // 250/850 = 29.4117... -> 29.41
    expect(res.body.data.porcentaje_avance).toBe(29.41);
    // (250+200)/850 = 52.9411... -> 52.94
    expect(res.body.data.porcentaje_procesado).toBe(52.94);
  });

  it('NO divide por cero cuando aun no hay mesas cargadas', async () => {
    encolarGlobal({ totalMesas: { c: '0' }, estados: [] });
    const res = crearRes();

    await getResumen(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data.porcentaje_avance).toBe(0);
    expect(res.body.data.porcentaje_procesado).toBe(0);
    expect(Number.isNaN(res.body.data.porcentaje_avance)).toBe(false);
  });

  it('nunca reporta personeros sin asignar en negativo', async () => {
    encolarGlobal({ personeros: { c: '100' }, asignados: { c: '120' } });
    const res = crearRes();

    await getResumen(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data.personeros_sin_asignar).toBe(0);
  });

  it('trata como 0 los estados que todavia no aparecen', async () => {
    encolarGlobal({ estados: [{ estado: 'pendiente', c: '850' }] });
    const res = crearRes();

    await getResumen(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data.mesas_verificadas).toBe(0);
    expect(res.body.data.mesas_observadas).toBe(0);
    expect(res.body.data.mesas_reportadas).toBe(0);
  });

  it('devuelve 0 votos si aun no hay actas verificadas (sum null)', async () => {
    encolarGlobal({ votos: { s: null } });
    const res = crearRes();

    await getResumen(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data.total_votos_contados).toBe(0);
  });

  it('incluye marca de tiempo de actualizacion', async () => {
    encolarGlobal();
    const res = crearRes();

    await getResumen(crearReq({ user: usuarioAdmin() }), res);

    expect(() => new Date(res.body.data.actualizado_en)).not.toThrow();
  });

  it('usa la clave de cache global', async () => {
    encolarGlobal();

    await getResumen(crearReq({ user: usuarioAdmin() }), crearRes());

    expect(cacheWrap).toHaveBeenCalledWith('dashboard:resumen', expect.any(Number), expect.any(Function));
  });

  it('sirve el valor cacheado sin ejecutar las 7 agregaciones', async () => {
    cacheWrap.mockResolvedValueOnce({ total_mesas: 999 });
    const res = crearRes();

    await getResumen(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data.total_mesas).toBe(999);
    expect(mockDb.db).not.toHaveBeenCalled();
  });

  it('responde 500 ante fallo de BD', async () => {
    mockDb.queueError('mesas_sufragio', new Error('caida'));
    const res = crearRes();

    await getResumen(crearReq({ user: usuarioAdmin() }), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getResumen — filtrado por distrito o local', () => {
  const encolarFiltrado = ({
    total = { c: '120' },
    estados = [{ estado: 'verificada', c: '60' }, { estado: 'reportada', c: '30' }],
    locales = { c: '8' },
    votos = { s: '7200' },
  } = {}) => {
    mockDb.queue('mesas_sufragio', total, estados, locales);
    mockDb.queue('resultados_mesa', votos);
  };

  it('usa una clave de cache distinta por distrito', async () => {
    encolarFiltrado();

    await getResumen(crearReq({ user: usuarioAdmin(), query: { distrito_id: '3' } }), crearRes());

    expect(cacheWrap).toHaveBeenCalledWith('dashboard:resumen:3:all', expect.any(Number), expect.any(Function));
  });

  it('usa una clave de cache distinta por local', async () => {
    encolarFiltrado();

    await getResumen(crearReq({ user: usuarioAdmin(), query: { local_id: '4' } }), crearRes());

    expect(cacheWrap).toHaveBeenCalledWith('dashboard:resumen:all:4', expect.any(Number), expect.any(Function));
  });

  it('combina ambos filtros en la clave', async () => {
    encolarFiltrado();

    await getResumen(
      crearReq({ user: usuarioAdmin(), query: { distrito_id: '3', local_id: '4' } }), crearRes(),
    );

    expect(cacheWrap).toHaveBeenCalledWith('dashboard:resumen:3:4', expect.any(Number), expect.any(Function));
  });

  it('calcula el avance del ambito filtrado', async () => {
    encolarFiltrado();
    const res = crearRes();

    await getResumen(crearReq({ user: usuarioAdmin(), query: { distrito_id: '3' } }), res);

    expect(res.body.data.total_mesas).toBe(120);
    expect(res.body.data.porcentaje_avance).toBe(50); // 60/120
    expect(res.body.data.porcentaje_procesado).toBe(75); // 90/120
    expect(res.body.data.total_locales).toBe(8);
  });

  it('no divide por cero en un ambito sin mesas', async () => {
    encolarFiltrado({ total: { c: '0' }, estados: [] });
    const res = crearRes();

    await getResumen(crearReq({ user: usuarioAdmin(), query: { local_id: '99' } }), res);

    expect(res.body.data.porcentaje_avance).toBe(0);
  });

  it('tolera que las agregaciones devuelvan undefined', async () => {
    mockDb.queue('mesas_sufragio', undefined, [], undefined);
    mockDb.queue('resultados_mesa', undefined);
    const res = crearRes();

    await getResumen(crearReq({ user: usuarioAdmin(), query: { distrito_id: '3' } }), res);

    expect(res.body.data.total_mesas).toBe(0);
    expect(res.body.data.total_votos_contados).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('getComposicionVoto', () => {
  it('deriva los votos validos restando blancos, nulos e impugnados', async () => {
    mockDb.queue('resultados_mesa', {
      total_emitidos: '1000', votos_blanco: '50', votos_nulo: '30', votos_impugnados: '20',
    });
    const res = crearRes();

    await getComposicionVoto(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data.votos_validos).toBe(900);
    expect(res.body.data.porcentaje_validos).toBe(90);
    expect(res.body.data.porcentaje_blanco).toBe(5);
    expect(res.body.data.porcentaje_nulo).toBe(3);
    expect(res.body.data.porcentaje_impugnados).toBe(2);
  });

  it('nunca reporta votos validos negativos aunque los datos sean inconsistentes', async () => {
    mockDb.queue('resultados_mesa', {
      total_emitidos: '100', votos_blanco: '80', votos_nulo: '40', votos_impugnados: '10',
    });
    const res = crearRes();

    await getComposicionVoto(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data.votos_validos).toBe(0);
  });

  it('devuelve ceros sin dividir por cero cuando no hay emitidos', async () => {
    mockDb.queue('resultados_mesa', {
      total_emitidos: '0', votos_blanco: '0', votos_nulo: '0', votos_impugnados: '0',
    });
    const res = crearRes();

    await getComposicionVoto(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data).toMatchObject({
      porcentaje_validos: 0, porcentaje_blanco: 0, porcentaje_nulo: 0, porcentaje_impugnados: 0,
    });
  });

  it('tolera que la consulta no devuelva fila', async () => {
    mockDb.queue('resultados_mesa', undefined);
    const res = crearRes();

    await getComposicionVoto(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data.total_emitidos).toBe(0);
  });

  it('aplica filtros de distrito y local en la clave de cache', async () => {
    mockDb.queue('resultados_mesa', { total_emitidos: '10' });

    await getComposicionVoto(
      crearReq({ user: usuarioAdmin(), query: { distrito_id: '3', local_id: '4' } }), crearRes(),
    );

    expect(cacheWrap).toHaveBeenCalledWith('dashboard:composicion:3:4', expect.any(Number), expect.any(Function));
  });

  it('responde 500 ante fallo de BD', async () => {
    mockDb.queueError('resultados_mesa', new Error('caida'));
    const res = crearRes();

    await getComposicionVoto(crearReq({ user: usuarioAdmin() }), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('getResultadosPorCandidato', () => {
  it('calcula el porcentaje de cada candidato sobre el total', async () => {
    mockDb.queue('detalle_resultados', [
      { id: 1, nombre_completo: 'Ana', total_votos: '600' },
      { id: 2, nombre_completo: 'Luis', total_votos: '400' },
    ]);
    const res = crearRes();

    await getResultadosPorCandidato(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data[0]).toMatchObject({ total_votos: 600, porcentaje: 60 });
    expect(res.body.data[1]).toMatchObject({ total_votos: 400, porcentaje: 40 });
  });

  it('los porcentajes suman aproximadamente 100', async () => {
    mockDb.queue('detalle_resultados', [
      { id: 1, total_votos: '333' }, { id: 2, total_votos: '333' }, { id: 3, total_votos: '334' },
    ]);
    const res = crearRes();

    await getResultadosPorCandidato(crearReq({ user: usuarioAdmin() }), res);

    const suma = res.body.data.reduce((a, c) => a + c.porcentaje, 0);
    expect(suma).toBeGreaterThan(99.9);
    expect(suma).toBeLessThan(100.1);
  });

  it('devuelve 0% sin dividir por cero cuando nadie tiene votos', async () => {
    mockDb.queue('detalle_resultados', [{ id: 1, total_votos: '0' }]);
    const res = crearRes();

    await getResultadosPorCandidato(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data[0].porcentaje).toBe(0);
  });

  it('devuelve lista vacia si no hay actas verificadas', async () => {
    mockDb.queue('detalle_resultados', []);
    const res = crearRes();

    await getResultadosPorCandidato(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data).toEqual([]);
  });

  it('usa clave de cache por ambito', async () => {
    mockDb.queue('detalle_resultados', []);

    await getResultadosPorCandidato(
      crearReq({ user: usuarioAdmin(), query: { distrito_id: '3' } }), crearRes(),
    );

    expect(cacheWrap).toHaveBeenCalledWith('dashboard:candidatos:3:all', expect.any(Number), expect.any(Function));
  });

  it('responde 500 ante fallo de BD', async () => {
    mockDb.queueError('detalle_resultados', new Error('caida'));
    const res = crearRes();

    await getResultadosPorCandidato(crearReq({ user: usuarioAdmin() }), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('getResultadosPorDistrito', () => {
  it('cruza el conteo de mesas con las verificadas por distrito', async () => {
    mockDb.queue('distritos', [
      { id: 1, nombre: 'Ayacucho', codigo: '0501', total_mesas: '400', total_locales: '30', votos_contados: '24000' },
      { id: 2, nombre: 'Carmen Alto', codigo: '0502', total_mesas: '200', total_locales: '15', votos_contados: '6000' },
    ]);
    mockDb.queue('mesas_sufragio', [
      { distrito_id: 1, c: '200' }, { distrito_id: 2, c: '50' },
    ]);
    const res = crearRes();

    await getResultadosPorDistrito(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data[0]).toMatchObject({
      nombre: 'Ayacucho', total_mesas: 400, mesas_verificadas: 200,
      porcentaje_avance: 50, votos_contados: 24000,
    });
    expect(res.body.data[1].porcentaje_avance).toBe(25);
  });

  it('asigna 0 verificadas a un distrito que aun no reporto', async () => {
    mockDb.queue('distritos', [{ id: 9, nombre: 'Nuevo', total_mesas: '10' }]);
    mockDb.queue('mesas_sufragio', []);
    const res = crearRes();

    await getResultadosPorDistrito(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data[0].mesas_verificadas).toBe(0);
    expect(res.body.data[0].porcentaje_avance).toBe(0);
  });

  it('no divide por cero en un distrito sin mesas', async () => {
    mockDb.queue('distritos', [{ id: 9, nombre: 'Vacio', total_mesas: '0' }]);
    mockDb.queue('mesas_sufragio', []);
    const res = crearRes();

    await getResultadosPorDistrito(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data[0].porcentaje_avance).toBe(0);
  });

  it('responde 500 ante fallo de BD', async () => {
    mockDb.queueError('distritos', new Error('caida'));
    const res = crearRes();

    await getResultadosPorDistrito(crearReq({ user: usuarioAdmin() }), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('getResultadosPorLocal', () => {
  it('desglosa los estados de mesa por local', async () => {
    mockDb.queue('locales_votacion', [
      { id: 4, nombre: 'IE San Juan', total_mesas: '12' },
    ]);
    mockDb.queue('mesas_sufragio', [
      { local_id: 4, estado: 'pendiente', c: '4' },
      { local_id: 4, estado: 'reportada', c: '2' },
      { local_id: 4, estado: 'verificada', c: '6' },
    ]);
    mockDb.queue('resultados_mesa', [{ local_id: 4, votos: '1500' }]);
    const res = crearRes();

    await getResultadosPorLocal(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data[0]).toMatchObject({
      total_mesas: 12, mesas_pendientes: 4, mesas_reportadas: 2,
      mesas_verificadas: 6, votos_contados: 1500, porcentaje_avance: 50,
    });
  });

  it('un local sin mesas reportadas sale en ceros', async () => {
    mockDb.queue('locales_votacion', [{ id: 7, nombre: 'IE Nueva', total_mesas: '5' }]);
    mockDb.queue('mesas_sufragio', []);
    mockDb.queue('resultados_mesa', []);
    const res = crearRes();

    await getResultadosPorLocal(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data[0]).toMatchObject({
      mesas_pendientes: 0, mesas_verificadas: 0, votos_contados: 0, porcentaje_avance: 0,
    });
  });

  it('sigue devolviendo el desglose aunque falle la consulta de votos', async () => {
    mockDb.queue('locales_votacion', [{ id: 4, nombre: 'IE San Juan', total_mesas: '12' }]);
    mockDb.queue('mesas_sufragio', [{ local_id: 4, estado: 'verificada', c: '6' }]);
    mockDb.queueError('resultados_mesa', new Error('vista inexistente'));
    const res = crearRes();

    await getResultadosPorLocal(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.success).toBe(true);
    expect(res.body.data[0].mesas_verificadas).toBe(6);
    expect(res.body.data[0].votos_contados).toBe(0);
  });

  it('filtra por distrito y usa su propia clave de cache', async () => {
    mockDb.queue('locales_votacion', []);
    mockDb.queue('mesas_sufragio', []);
    mockDb.queue('resultados_mesa', []);

    await getResultadosPorLocal(
      crearReq({ user: usuarioAdmin(), query: { distrito_id: '3' } }), crearRes(),
    );

    expect(cacheWrap).toHaveBeenCalledWith('dashboard:locales:3', expect.any(Number), expect.any(Function));
  });

  it('responde 500 ante fallo de BD', async () => {
    mockDb.queueError('locales_votacion', new Error('caida'));
    const res = crearRes();

    await getResultadosPorLocal(crearReq({ user: usuarioAdmin() }), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('getMesasPendientes', () => {
  it('lista las mesas pendientes con datos de contacto del personero', async () => {
    mockDb.queue('mesas_sufragio', [
      { id: 9, numero_mesa: '045821', personero_telefono: '999888777' },
    ]);
    const res = crearRes();

    await getMesasPendientes(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.data[0].personero_telefono).toBe('999888777');
  });

  it('aplica filtros de distrito y local', async () => {
    mockDb.queue('mesas_sufragio', []);
    const res = crearRes();

    await getMesasPendientes(
      crearReq({ user: usuarioAdmin(), query: { distrito_id: '3', local_id: '4' } }), res,
    );

    expect(res.body.success).toBe(true);
  });

  it('cae a un limite de 200 si el valor no es numerico', async () => {
    mockDb.queue('mesas_sufragio', []);
    const res = crearRes();

    await getMesasPendientes(crearReq({ user: usuarioAdmin(), query: { limit: 'abc' } }), res);

    expect(res.body.success).toBe(true);
  });

  it('responde 500 ante fallo de BD', async () => {
    mockDb.queueError('mesas_sufragio', new Error('caida'));
    const res = crearRes();

    await getMesasPendientes(crearReq({ user: usuarioAdmin() }), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('getAuditoria', () => {
  it('devuelve los registros con meta de paginacion', async () => {
    mockDb.queue('auditoria', { total: '1200' }, [{ id: 1, tabla_afectada: 'resultados_mesa' }]);
    const res = crearRes();

    await getAuditoria(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.meta).toEqual({ total: 1200, page: 1, limit: 50 });
  });

  it('topa el limite en 200 aunque se pidan mas (protege la memoria del servidor)', async () => {
    mockDb.queue('auditoria', { total: '50000' }, []);
    const res = crearRes();

    await getAuditoria(crearReq({ user: usuarioAdmin(), query: { limit: '100000' } }), res);

    expect(res.body.meta.limit).toBe(200);
  });

  it('normaliza una pagina menor que 1', async () => {
    mockDb.queue('auditoria', { total: '10' }, []);
    const res = crearRes();

    await getAuditoria(crearReq({ user: usuarioAdmin(), query: { page: '-5' } }), res);

    expect(res.body.meta.page).toBe(1);
  });

  it('filtra por tabla y por usuario', async () => {
    mockDb.queue('auditoria', { total: '3' }, [{ id: 1 }]);
    const res = crearRes();

    await getAuditoria(
      crearReq({ user: usuarioAdmin(), query: { tabla: 'resultados_mesa', usuario_id: '7' } }), res,
    );

    expect(res.body.success).toBe(true);
  });

  it('aplica busqueda libre cuando q trae contenido', async () => {
    mockDb.queue('auditoria', { total: '1' }, [{ id: 1 }]);
    const res = crearRes();

    await getAuditoria(crearReq({ user: usuarioAdmin(), query: { q: '  perez  ' } }), res);

    expect(res.body.success).toBe(true);
  });

  it('ignora una busqueda en blanco', async () => {
    mockDb.queue('auditoria', { total: '5' }, []);
    const res = crearRes();

    await getAuditoria(crearReq({ user: usuarioAdmin(), query: { q: '   ' } }), res);

    expect(res.body.meta.total).toBe(5);
  });

  it('tolera que el conteo no devuelva fila', async () => {
    mockDb.queue('auditoria', undefined, []);
    const res = crearRes();

    await getAuditoria(crearReq({ user: usuarioAdmin() }), res);

    expect(res.body.meta.total).toBe(0);
  });

  it('responde 500 ante fallo de BD', async () => {
    mockDb.queueError('auditoria', new Error('caida'));
    const res = crearRes();

    await getAuditoria(crearReq({ user: usuarioAdmin() }), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
