import { jest } from '@jest/globals';
import {
  createDbMock, crearReq, crearRes, usuarioAdmin, silenciarConsola,
} from '../support/knex-mock.js';

// ═══════════════════════════════════════════════════════════════════
// asignaciones.controller.js — 285 lineas, 0% de cobertura previa.
// Controla quien puede reportar por cada mesa: si una mesa queda con dos
// personeros activos o un personero con dos mesas, el conteo se corrompe.
// ═══════════════════════════════════════════════════════════════════

const mockDb = createDbMock();
const registrarAuditoria = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../../src/config/database.js', () => ({ default: mockDb.db }));
jest.unstable_mockModule('../../src/services/auditoria.service.js', () => ({ registrarAuditoria }));

const {
  asignarPersonero, reasignarPersonero,
  asignarCoordinador, reasignarCoordinador,
  getAsignacionesPersoneros, getAsignacionesCoordinadores,
  getHistorial, removeAsignacionPersonero, removeAsignacionCoordinador,
} = await import('../../src/controllers/asignaciones.controller.js');

let consola;
beforeEach(() => {
  jest.clearAllMocks();
  mockDb.reset();
  consola = silenciarConsola();
});
afterEach(() => consola.mockRestore());

// ═══════════════════════════════════════════════════════════════════
describe('asignarPersonero', () => {
  const encolarOk = () => {
    mockDb.queue('usuarios', { id: 3, rol: 'personero', activo: true });
    mockDb.queue('mesas_sufragio', { id: 9, numero_mesa: '045821' });
    mockDb.queue('asignacion_personeros', undefined); // el personero no tiene mesa
    mockDb.queue('asignacion_personeros', undefined); // la mesa no tiene personero
    mockDb.queue('asignacion_personeros', [{ id: 77 }]);
    mockDb.queue('historial_asignaciones', 1);
    mockDb.queue('asignacion_personeros', { id: 77, usuario_id: 3, mesa_id: 9, activo: true });
  };

  it('rechaza si el usuario no existe o no es personero', async () => {
    mockDb.queue('usuarios', undefined);
    const req = crearReq({ user: usuarioAdmin(), body: { usuario_id: 3, mesa_id: 9 } });
    const res = crearRes();

    await asignarPersonero(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/no es personero/i);
  });

  it('rechaza si la mesa no existe', async () => {
    mockDb.queue('usuarios', { id: 3, rol: 'personero' });
    mockDb.queue('mesas_sufragio', undefined);
    const req = crearReq({ user: usuarioAdmin(), body: { usuario_id: 3, mesa_id: 9 } });
    const res = crearRes();

    await asignarPersonero(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/mesa inv.lida/i);
  });

  it('impide que un personero tenga dos mesas activas', async () => {
    mockDb.queue('usuarios', { id: 3, rol: 'personero' });
    mockDb.queue('mesas_sufragio', { id: 9 });
    mockDb.queue('asignacion_personeros', { id: 50, mesa_id: 5 });
    const req = crearReq({ user: usuarioAdmin(), body: { usuario_id: 3, mesa_id: 9 } });
    const res = crearRes();

    await asignarPersonero(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/ya tiene una mesa asignada/i);
    expect(mockDb.calls('asignacion_personeros').inserts).toHaveLength(0);
  });

  it('impide que una mesa tenga dos personeros activos', async () => {
    mockDb.queue('usuarios', { id: 3, rol: 'personero' });
    mockDb.queue('mesas_sufragio', { id: 9 });
    mockDb.queue('asignacion_personeros', undefined);
    mockDb.queue('asignacion_personeros', { id: 51, usuario_id: 8 });
    const req = crearReq({ user: usuarioAdmin(), body: { usuario_id: 3, mesa_id: 9 } });
    const res = crearRes();

    await asignarPersonero(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/ya tiene personero/i);
  });

  it('crea la asignacion y deja rastro en el historial', async () => {
    encolarOk();
    const req = crearReq({ user: usuarioAdmin(), body: { usuario_id: 3, mesa_id: 9 } });
    const res = crearRes();

    await asignarPersonero(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockDb.calls('asignacion_personeros').inserts[0]).toEqual({
      usuario_id: 3, mesa_id: 9, activo: true,
    });
    expect(mockDb.calls('historial_asignaciones').inserts[0]).toMatchObject({
      tipo: 'personero', mesa_id: 9, usuario_nuevo_id: 3, cambiado_por: 1,
    });
  });

  it('responde 500 ante fallo de BD', async () => {
    mockDb.queueError('usuarios', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), body: { usuario_id: 3, mesa_id: 9 } });
    const res = crearRes();

    await asignarPersonero(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('reasignarPersonero', () => {
  it('devuelve 404 si la asignacion activa no existe', async () => {
    mockDb.queue('asignacion_personeros', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '77' }, body: { usuario_nuevo_id: 4 } });
    const res = crearRes();

    await reasignarPersonero(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rechaza si el usuario nuevo no es personero activo', async () => {
    mockDb.queue('asignacion_personeros', { id: 77, usuario_id: 3, mesa_id: 9 });
    mockDb.queue('usuarios', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '77' }, body: { usuario_nuevo_id: 4 } });
    const res = crearRes();

    await reasignarPersonero(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/usuario nuevo inv.lido/i);
  });

  it('desactiva la anterior, crea la nueva sobre la misma mesa y registra el motivo', async () => {
    mockDb.queue('asignacion_personeros', { id: 77, usuario_id: 3, mesa_id: 9 });
    mockDb.queue('usuarios', { id: 4, rol: 'personero', activo: true });
    mockDb.queue('asignacion_personeros', 1);          // update activo:false
    mockDb.queue('asignacion_personeros', [{ id: 78 }]); // insert
    mockDb.queue('historial_asignaciones', 1);
    mockDb.queue('asignacion_personeros', { id: 78, usuario_id: 4, mesa_id: 9 });
    const req = crearReq({
      user: usuarioAdmin(), params: { id: '77' },
      body: { usuario_nuevo_id: 4, motivo_cambio: 'El titular no se presento' },
    });
    const res = crearRes();

    await reasignarPersonero(req, res);

    expect(mockDb.calls('asignacion_personeros').updates[0]).toEqual({ activo: false });
    expect(mockDb.calls('asignacion_personeros').inserts[0]).toEqual({
      usuario_id: 4, mesa_id: 9, activo: true,
    });
    expect(mockDb.calls('historial_asignaciones').inserts[0]).toMatchObject({
      usuario_anterior_id: 3, usuario_nuevo_id: 4, motivo_cambio: 'El titular no se presento',
    });
    expect(res.body.success).toBe(true);
  });

  it('usa un motivo por defecto si no se envia', async () => {
    mockDb.queue('asignacion_personeros', { id: 77, usuario_id: 3, mesa_id: 9 });
    mockDb.queue('usuarios', { id: 4, rol: 'personero' });
    mockDb.queue('asignacion_personeros', 1, [{ id: 78 }]);
    mockDb.queue('historial_asignaciones', 1);
    mockDb.queue('asignacion_personeros', { id: 78 });
    const req = crearReq({ user: usuarioAdmin(), params: { id: '77' }, body: { usuario_nuevo_id: 4 } });
    const res = crearRes();

    await reasignarPersonero(req, res);

    expect(mockDb.calls('historial_asignaciones').inserts[0].motivo_cambio).toBe('Reasignación');
  });

  it('responde 500 ante fallo de BD', async () => {
    mockDb.queueError('asignacion_personeros', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '77' }, body: {} });
    const res = crearRes();

    await reasignarPersonero(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('asignarCoordinador', () => {
  it('rechaza si el usuario no es coordinador', async () => {
    mockDb.queue('usuarios', undefined);
    const req = crearReq({ user: usuarioAdmin(), body: { usuario_id: 2, local_id: 4 } });
    const res = crearRes();

    await asignarCoordinador(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/no es coordinador/i);
  });

  it('rechaza si el local no existe', async () => {
    mockDb.queue('usuarios', { id: 2, rol: 'coordinador' });
    mockDb.queue('locales_votacion', undefined);
    const req = crearReq({ user: usuarioAdmin(), body: { usuario_id: 2, local_id: 4 } });
    const res = crearRes();

    await asignarCoordinador(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/local inv.lido/i);
  });

  it('impide duplicar la misma pareja coordinador-local', async () => {
    mockDb.queue('usuarios', { id: 2, rol: 'coordinador' });
    mockDb.queue('locales_votacion', { id: 4 });
    mockDb.queue('asignacion_coordinadores', { id: 30 });
    const req = crearReq({ user: usuarioAdmin(), body: { usuario_id: 2, local_id: 4 } });
    const res = crearRes();

    await asignarCoordinador(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/ya está asignado a este local/i);
  });

  it('permite que un coordinador cubra varios locales (regla distinta a personeros)', async () => {
    mockDb.queue('usuarios', { id: 2, rol: 'coordinador' });
    mockDb.queue('locales_votacion', { id: 5 });
    mockDb.queue('asignacion_coordinadores', undefined, [{ id: 31 }]);
    mockDb.queue('historial_asignaciones', 1);
    mockDb.queue('asignacion_coordinadores', { id: 31, usuario_id: 2, local_id: 5 });
    const req = crearReq({ user: usuarioAdmin(), body: { usuario_id: 2, local_id: 5 } });
    const res = crearRes();

    await asignarCoordinador(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockDb.calls('historial_asignaciones').inserts[0]).toMatchObject({
      tipo: 'coordinador', local_id: 5,
    });
  });

  it('responde 500 ante fallo de BD', async () => {
    mockDb.queueError('usuarios', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), body: {} });
    const res = crearRes();

    await asignarCoordinador(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('reasignarCoordinador', () => {
  it('devuelve 404 si la asignacion no existe', async () => {
    mockDb.queue('asignacion_coordinadores', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '30' }, body: { usuario_nuevo_id: 5 } });
    const res = crearRes();

    await reasignarCoordinador(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rechaza si el usuario nuevo no es coordinador activo', async () => {
    mockDb.queue('asignacion_coordinadores', { id: 30, usuario_id: 2, local_id: 4 });
    mockDb.queue('usuarios', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '30' }, body: { usuario_nuevo_id: 5 } });
    const res = crearRes();

    await reasignarCoordinador(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('traslada la responsabilidad del local al nuevo coordinador', async () => {
    mockDb.queue('asignacion_coordinadores', { id: 30, usuario_id: 2, local_id: 4 });
    mockDb.queue('usuarios', { id: 5, rol: 'coordinador' });
    mockDb.queue('asignacion_coordinadores', 1, [{ id: 31 }]);
    mockDb.queue('historial_asignaciones', 1);
    mockDb.queue('asignacion_coordinadores', { id: 31, usuario_id: 5, local_id: 4 });
    const req = crearReq({
      user: usuarioAdmin(), params: { id: '30' },
      body: { usuario_nuevo_id: 5, motivo_cambio: 'Relevo de turno' },
    });
    const res = crearRes();

    await reasignarCoordinador(req, res);

    expect(mockDb.calls('asignacion_coordinadores').updates[0]).toEqual({ activo: false });
    expect(mockDb.calls('asignacion_coordinadores').inserts[0]).toEqual({
      usuario_id: 5, local_id: 4, activo: true,
    });
    expect(res.body.success).toBe(true);
  });

  it('usa motivo por defecto si no se envia', async () => {
    mockDb.queue('asignacion_coordinadores', { id: 30, usuario_id: 2, local_id: 4 });
    mockDb.queue('usuarios', { id: 5, rol: 'coordinador' });
    mockDb.queue('asignacion_coordinadores', 1, [{ id: 31 }]);
    mockDb.queue('historial_asignaciones', 1);
    mockDb.queue('asignacion_coordinadores', { id: 31 });
    const req = crearReq({ user: usuarioAdmin(), params: { id: '30' }, body: { usuario_nuevo_id: 5 } });
    const res = crearRes();

    await reasignarCoordinador(req, res);

    expect(mockDb.calls('historial_asignaciones').inserts[0].motivo_cambio).toBe('Reasignación');
  });

  it('responde 500 ante fallo de BD', async () => {
    mockDb.queueError('asignacion_coordinadores', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '30' }, body: {} });
    const res = crearRes();

    await reasignarCoordinador(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('consultas de asignaciones', () => {
  it('getAsignacionesPersoneros lista solo las activas', async () => {
    mockDb.queue('asignacion_personeros', [{ id: 77, numero_mesa: '045821' }]);
    const req = crearReq({ user: usuarioAdmin() });
    const res = crearRes();

    await getAsignacionesPersoneros(req, res);

    expect(res.body.data).toHaveLength(1);
  });

  it('getAsignacionesPersoneros aplica filtros de local, distrito y texto', async () => {
    mockDb.queue('asignacion_personeros', []);
    const req = crearReq({
      user: usuarioAdmin(),
      query: { local_id: '4', distrito_id: '1', q: 'perez' },
    });
    const res = crearRes();

    await getAsignacionesPersoneros(req, res);

    expect(res.body.success).toBe(true);
  });

  it('getAsignacionesPersoneros responde 500 ante fallo de BD', async () => {
    mockDb.queueError('asignacion_personeros', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin() });
    const res = crearRes();

    await getAsignacionesPersoneros(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getAsignacionesCoordinadores lista', async () => {
    mockDb.queue('asignacion_coordinadores', [{ id: 30 }]);
    const req = crearReq({ user: usuarioAdmin() });
    const res = crearRes();

    await getAsignacionesCoordinadores(req, res);

    expect(res.body.data).toHaveLength(1);
  });

  it('getAsignacionesCoordinadores aplica filtros', async () => {
    mockDb.queue('asignacion_coordinadores', []);
    const req = crearReq({
      user: usuarioAdmin(),
      query: { local_id: '4', distrito_id: '1', q: 'luis' },
    });
    const res = crearRes();

    await getAsignacionesCoordinadores(req, res);

    expect(res.body.success).toBe(true);
  });

  it('getAsignacionesCoordinadores responde 500 ante fallo de BD', async () => {
    mockDb.queueError('asignacion_coordinadores', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin() });
    const res = crearRes();

    await getAsignacionesCoordinadores(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getHistorial filtra por tipo y rango de fechas', async () => {
    mockDb.queue('historial_asignaciones', [{ id: 1, tipo: 'personero' }]);
    const req = crearReq({
      user: usuarioAdmin(),
      query: { tipo: 'personero', fecha_inicio: '2026-10-01', fecha_fin: '2026-10-05' },
    });
    const res = crearRes();

    await getHistorial(req, res);

    expect(mockDb.calls('historial_asignaciones').wheres).toContainEqual({ tipo: 'personero' });
    expect(res.body.data).toHaveLength(1);
  });

  it('getHistorial sin filtros devuelve todo', async () => {
    mockDb.queue('historial_asignaciones', [{ id: 1 }, { id: 2 }]);
    const req = crearReq({ user: usuarioAdmin() });
    const res = crearRes();

    await getHistorial(req, res);

    expect(res.body.data).toHaveLength(2);
  });

  it('getHistorial responde 500 ante fallo de BD', async () => {
    mockDb.queueError('historial_asignaciones', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin() });
    const res = crearRes();

    await getHistorial(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('eliminacion de asignaciones', () => {
  it('removeAsignacionPersonero devuelve 404 si no existe', async () => {
    mockDb.queue('asignacion_personeros', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '77' } });
    const res = crearRes();

    await removeAsignacionPersonero(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('removeAsignacionPersonero hace baja logica y anota el historial', async () => {
    mockDb.queue('asignacion_personeros', { id: 77, usuario_id: 3, mesa_id: 9 });
    mockDb.queue('asignacion_personeros', 1);
    mockDb.queue('historial_asignaciones', 1);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '77' } });
    const res = crearRes();

    await removeAsignacionPersonero(req, res);

    expect(mockDb.calls('asignacion_personeros').updates[0]).toEqual({ activo: false });
    expect(mockDb.calls('asignacion_personeros').deletes).toBe(0);
    expect(mockDb.calls('historial_asignaciones').inserts[0]).toMatchObject({
      usuario_anterior_id: 3, usuario_nuevo_id: null,
    });
  });

  it('removeAsignacionPersonero responde 500 ante fallo de BD', async () => {
    mockDb.queueError('asignacion_personeros', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '77' } });
    const res = crearRes();

    await removeAsignacionPersonero(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('removeAsignacionCoordinador devuelve 404 si no existe', async () => {
    mockDb.queue('asignacion_coordinadores', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '30' } });
    const res = crearRes();

    await removeAsignacionCoordinador(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('removeAsignacionCoordinador hace baja logica', async () => {
    mockDb.queue('asignacion_coordinadores', { id: 30, usuario_id: 2, local_id: 4 });
    mockDb.queue('asignacion_coordinadores', 1);
    mockDb.queue('historial_asignaciones', 1);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '30' } });
    const res = crearRes();

    await removeAsignacionCoordinador(req, res);

    expect(mockDb.calls('asignacion_coordinadores').updates[0]).toEqual({ activo: false });
    expect(mockDb.calls('historial_asignaciones').inserts[0]).toMatchObject({
      tipo: 'coordinador', local_id: 4,
    });
  });

  it('removeAsignacionCoordinador responde 500 ante fallo de BD', async () => {
    mockDb.queueError('asignacion_coordinadores', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '30' } });
    const res = crearRes();

    await removeAsignacionCoordinador(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Ramas defensivas: el codigo usa `req.user?.id || null` para cambiado_por,
// anticipando una peticion sin usuario. Estos tests fijan que pasa en ese
// caso. (Observacion: dos lineas mas abajo se usa `req.user.id` sin la
// proteccion opcional, asi que el flujo termina en 500 en vez de registrar
// un cambio anonimo. Las rutas exigen token, asi que en la practica no
// ocurre; se deja documentado por si se expone algun endpoint interno.)
// ═══════════════════════════════════════════════════════════════════
describe('peticiones sin usuario autenticado (ramas defensivas)', () => {
  it('asignarPersonero no deja la asignacion a medias', async () => {
    mockDb.queue('usuarios', { id: 3, rol: 'personero' });
    mockDb.queue('mesas_sufragio', { id: 9 });
    mockDb.queue('asignacion_personeros', undefined, undefined, [{ id: 77 }]);
    mockDb.queue('historial_asignaciones', 1);
    mockDb.queue('asignacion_personeros', { id: 77 });
    const req = crearReq({ user: undefined, body: { usuario_id: 3, mesa_id: 9 } });
    const res = crearRes();

    await asignarPersonero(req, res);

    expect(mockDb.calls('historial_asignaciones').inserts[0].cambiado_por).toBeNull();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('asignarCoordinador registra cambiado_por nulo', async () => {
    mockDb.queue('usuarios', { id: 2, rol: 'coordinador' });
    mockDb.queue('locales_votacion', { id: 4 });
    mockDb.queue('asignacion_coordinadores', undefined, [{ id: 31 }]);
    mockDb.queue('historial_asignaciones', 1);
    mockDb.queue('asignacion_coordinadores', { id: 31 });
    const req = crearReq({ user: undefined, body: { usuario_id: 2, local_id: 4 } });
    const res = crearRes();

    await asignarCoordinador(req, res);

    expect(mockDb.calls('historial_asignaciones').inserts[0].cambiado_por).toBeNull();
  });

  it('reasignarPersonero registra cambiado_por nulo', async () => {
    mockDb.queue('asignacion_personeros', { id: 77, usuario_id: 3, mesa_id: 9 });
    mockDb.queue('usuarios', { id: 4, rol: 'personero' });
    mockDb.queue('asignacion_personeros', 1, [{ id: 78 }]);
    mockDb.queue('historial_asignaciones', 1);
    mockDb.queue('asignacion_personeros', { id: 78 });
    const req = crearReq({ user: undefined, params: { id: '77' }, body: { usuario_nuevo_id: 4 } });
    const res = crearRes();

    await reasignarPersonero(req, res);

    expect(mockDb.calls('historial_asignaciones').inserts[0].cambiado_por).toBeNull();
  });

  it('reasignarCoordinador registra cambiado_por nulo', async () => {
    mockDb.queue('asignacion_coordinadores', { id: 30, usuario_id: 2, local_id: 4 });
    mockDb.queue('usuarios', { id: 5, rol: 'coordinador' });
    mockDb.queue('asignacion_coordinadores', 1, [{ id: 31 }]);
    mockDb.queue('historial_asignaciones', 1);
    mockDb.queue('asignacion_coordinadores', { id: 31 });
    const req = crearReq({ user: undefined, params: { id: '30' }, body: { usuario_nuevo_id: 5 } });
    const res = crearRes();

    await reasignarCoordinador(req, res);

    expect(mockDb.calls('historial_asignaciones').inserts[0].cambiado_por).toBeNull();
  });

  it('removeAsignacionPersonero registra cambiado_por nulo', async () => {
    mockDb.queue('asignacion_personeros', { id: 77, usuario_id: 3, mesa_id: 9 }, 1);
    mockDb.queue('historial_asignaciones', 1);
    const req = crearReq({ user: undefined, params: { id: '77' } });
    const res = crearRes();

    await removeAsignacionPersonero(req, res);

    expect(mockDb.calls('historial_asignaciones').inserts[0].cambiado_por).toBeNull();
  });

  it('removeAsignacionCoordinador registra cambiado_por nulo', async () => {
    mockDb.queue('asignacion_coordinadores', { id: 30, usuario_id: 2, local_id: 4 }, 1);
    mockDb.queue('historial_asignaciones', 1);
    const req = crearReq({ user: undefined, params: { id: '30' } });
    const res = crearRes();

    await removeAsignacionCoordinador(req, res);

    expect(mockDb.calls('historial_asignaciones').inserts[0].cambiado_por).toBeNull();
  });
});
