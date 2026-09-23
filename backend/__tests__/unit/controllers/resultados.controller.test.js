import { jest } from '@jest/globals';
import {
  createDbMock, crearReq, crearRes,
  usuarioAdmin, usuarioCoordinador, usuarioPersonero, silenciarConsola,
} from '../../setup/knex-mock.js';

// ═══════════════════════════════════════════════════════════════════
// resultados.controller.js — el nucleo del sistema: carga, correccion,
// verificacion y observacion de actas. Antes: 0% de cobertura sobre
// 549 lineas, siendo el codigo que decide si un acta entra al conteo.
// ═══════════════════════════════════════════════════════════════════

const mockDb = createDbMock();

const registrarAuditoria = jest.fn().mockResolvedValue(undefined);
const notifyCoordinator = jest.fn();
const notifyAdmin = jest.fn();
const notifyPersonero = jest.fn();
const uploadActaImage = jest.fn();
const getActaUrl = jest.fn();
const invalidateDashboard = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../../../src/config/database.js', () => ({ default: mockDb.db }));
jest.unstable_mockModule('../../../src/services/auditoria.service.js', () => ({ registrarAuditoria }));
jest.unstable_mockModule('../../../src/services/websocket.service.js', () => ({
  notifyCoordinator, notifyAdmin, notifyPersonero,
  getIo: jest.fn(), setupWebSocket: jest.fn(),
}));
jest.unstable_mockModule('../../../src/services/storage.service.js', () => ({
  uploadActaImage, getActaUrl, deleteActaImage: jest.fn(),
}));
jest.unstable_mockModule('../../../src/services/cache.service.js', () => ({
  invalidateDashboard, cacheGet: jest.fn(), cacheSet: jest.fn(), cacheWrap: jest.fn(),
}));

const {
  subirResultado, corregirResultado, verificarResultado, observarResultado,
  getResultadosPorLocal, getResultadoDetalle, getMiMesa, confirmarMesa,
  eliminarResultado,
} = await import('../../../src/controllers/resultados.controller.js');

// ── Datos de referencia ────────────────────────────────────────────
const MESA_PENDIENTE = {
  id: 9, numero_mesa: '045821', local_id: 4,
  estado: 'pendiente', total_electores_habiles: 300,
};
const VOTOS_OK = [
  { candidato_id: 1, votos: 50 },
  { candidato_id: 2, votos: 30 },
];
const BODY_OK = {
  mesa_id: 9,
  votos: VOTOS_OK,
  votos_blanco: 5,
  votos_nulo: 3,
  votos_impugnados: 2,
  total_cedulas_votacion: 120,
  observaciones_personero: 'sin novedad',
};
const ARCHIVO = { buffer: Buffer.from('jpeg'), mimetype: 'image/jpeg', size: 2048 };

/** Encola las 4 consultas previas del camino feliz de subirResultado. */
const encolarValidacionesOk = ({
  asignacion = { id: 77, usuario_id: 3, mesa_id: 9, activo: true },
  mesa = MESA_PENDIENTE,
  candidatos = [1, 2],
  anterior = undefined,
} = {}) => {
  mockDb.queue('asignacion_personeros', asignacion);
  mockDb.queue('mesas_sufragio', mesa);
  mockDb.queue('candidatos', candidatos);
  mockDb.queue('resultados_mesa', anterior);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.reset();
  uploadActaImage.mockResolvedValue('actas/045821/foto.jpg');
  getActaUrl.mockResolvedValue('https://cdn/firmada.jpg');
  delete process.env.MAX_VOTOS_POR_MESA;
});

// ═══════════════════════════════════════════════════════════════════
describe('subirResultado — validacion de entrada', () => {
  it('rechaza si no se indica la mesa', async () => {
    const req = crearReq({ user: usuarioPersonero(), body: { ...BODY_OK, mesa_id: undefined } });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/indicar la mesa/i);
  });

  it('rechaza mesa_id no numerico (previene inyeccion por parametro)', async () => {
    const req = crearReq({ user: usuarioPersonero(), body: { ...BODY_OK, mesa_id: "9 OR 1=1" } });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('acepta votos como cadena JSON (multipart/form-data envia strings)', async () => {
    encolarValidacionesOk();
    mockDb.queue('resultados_mesa', [{ id: 500 }]);
    mockDb.queue('detalle_resultados', 2);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({
      user: usuarioPersonero(),
      body: { ...BODY_OK, votos: JSON.stringify(VOTOS_OK) },
      file: ARCHIVO,
    });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rechaza votos con JSON malformado', async () => {
    const req = crearReq({ user: usuarioPersonero(), body: { ...BODY_OK, votos: '{no es json' } });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/formato valido/i);
  });

  it.each([
    ['array vacio', []],
    ['no es array', { candidato_id: 1 }],
    ['null', null],
  ])('rechaza votos invalidos: %s', async (_caso, votos) => {
    const req = crearReq({ user: usuarioPersonero(), body: { ...BODY_OK, votos } });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/al menos un candidato/i);
  });

  it('rechaza un voto sin candidato_id', async () => {
    const req = crearReq({
      user: usuarioPersonero(),
      body: { ...BODY_OK, votos: [{ votos: 10 }] },
    });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/indicar el candidato/i);
  });

  it('rechaza votos negativos', async () => {
    const req = crearReq({
      user: usuarioPersonero(),
      body: { ...BODY_OK, votos: [{ candidato_id: 1, votos: -5 }] },
    });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/no pueden ser negativos/i);
  });

  it('rechaza votos no numericos (NaN se normaliza a -1 y cae en negativos)', async () => {
    const req = crearReq({
      user: usuarioPersonero(),
      body: { ...BODY_OK, votos: [{ candidato_id: 1, votos: 'muchos' }] },
    });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('subirResultado — control de acceso y estado de la mesa', () => {
  it('rechaza si el personero no esta asignado a la mesa', async () => {
    mockDb.queue('asignacion_personeros', undefined);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.message).toMatch(/no esta asignado/i);
  });

  it('no sube la foto al storage si la validacion previa falla (evita huerfanas)', async () => {
    mockDb.queue('asignacion_personeros', undefined);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(uploadActaImage).not.toHaveBeenCalled();
  });

  it('devuelve 404 si la mesa no existe', async () => {
    mockDb.queue('asignacion_personeros', { id: 77 });
    mockDb.queue('mesas_sufragio', undefined);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it.each(['reportada', 'verificada', 'cerrada'])(
    'rechaza mesa ya procesada (estado: %s)', async (estado) => {
      mockDb.queue('asignacion_personeros', { id: 77 });
      mockDb.queue('mesas_sufragio', { ...MESA_PENDIENTE, estado });
      const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
      const res = crearRes();

      await subirResultado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toMatch(/ya fue procesada/i);
    });

  it('permite subir sobre una mesa observada (flujo de correccion)', async () => {
    encolarValidacionesOk({
      mesa: { ...MESA_PENDIENTE, estado: 'observada' },
      anterior: { id: 500, estado: 'observado', version: 1, foto_acta_url: 'previa.jpg' },
    });
    mockDb.queue('resultados_mesa', 1);
    mockDb.queue('detalle_resultados', 1, 2);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('subirResultado — integridad aritmetica del acta', () => {
  it('rechaza si el total supera el limite por mesa', async () => {
    process.env.MAX_VOTOS_POR_MESA = '50';
    mockDb.queue('asignacion_personeros', { id: 77 });
    mockDb.queue('mesas_sufragio', MESA_PENDIENTE);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/supera el maximo/i);
  });

  it('rechaza si el total supera los electores habiles de la mesa', async () => {
    mockDb.queue('asignacion_personeros', { id: 77 });
    mockDb.queue('mesas_sufragio', { ...MESA_PENDIENTE, total_electores_habiles: 60 });
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/electores habiles/i);
  });

  it('rechaza si el total supera las cedulas de votacion declaradas', async () => {
    mockDb.queue('asignacion_personeros', { id: 77 });
    mockDb.queue('mesas_sufragio', MESA_PENDIENTE);
    const req = crearReq({
      user: usuarioPersonero(),
      body: { ...BODY_OK, total_cedulas_votacion: 40 },
      file: ARCHIVO,
    });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/cedulas de votacion/i);
  });

  it('acepta cuando total == electores habiles (limite inclusivo)', async () => {
    encolarValidacionesOk({
      mesa: { ...MESA_PENDIENTE, total_electores_habiles: 90 },
    });
    mockDb.queue('resultados_mesa', [{ id: 501 }]);
    mockDb.queue('detalle_resultados', 2);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res); // 50+30+5+3+2 = 90

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('ignora el tope de cedulas cuando se declara 0 (campo opcional)', async () => {
    encolarValidacionesOk();
    mockDb.queue('resultados_mesa', [{ id: 502 }]);
    mockDb.queue('detalle_resultados', 2);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({
      user: usuarioPersonero(),
      body: { ...BODY_OK, total_cedulas_votacion: 0 },
      file: ARCHIVO,
    });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rechaza si algun candidato no existe en el sistema', async () => {
    mockDb.queue('asignacion_personeros', { id: 77 });
    mockDb.queue('mesas_sufragio', MESA_PENDIENTE);
    mockDb.queue('candidatos', [1]); // faltó el 2
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/candidatos no existen/i);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('subirResultado — inmutabilidad del acta transmitida', () => {
  it.each(['pendiente', 'verificado'])(
    'bloquea reemplazar un acta en estado %s', async (estado) => {
      mockDb.queue('asignacion_personeros', { id: 77 });
      mockDb.queue('mesas_sufragio', MESA_PENDIENTE);
      mockDb.queue('candidatos', [1, 2]);
      mockDb.queue('resultados_mesa', { id: 500, estado, version: 1 });
      const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
      const res = crearRes();

      await subirResultado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toMatch(/ya fue transmitida/i);
    });

  it('exige foto cuando no hay acta previa', async () => {
    encolarValidacionesOk();
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK }); // sin file
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/adjuntar la foto/i);
  });

  it('reutiliza la foto anterior si se corrige sin adjuntar una nueva', async () => {
    encolarValidacionesOk({
      anterior: { id: 500, estado: 'observado', version: 2, foto_acta_url: 'actas/previa.jpg' },
    });
    mockDb.queue('resultados_mesa', 1);
    mockDb.queue('detalle_resultados', 1, 2);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(uploadActaImage).not.toHaveBeenCalled();
    expect(mockDb.calls('resultados_mesa').updates[0].foto_acta_url).toBe('actas/previa.jpg');
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('subirResultado — persistencia correcta (regresion de bugs conocidos)', () => {
  it('guarda los votos reales por candidato, no NaN (bug historico)', async () => {
    encolarValidacionesOk();
    mockDb.queue('resultados_mesa', [{ id: 510 }]);
    mockDb.queue('detalle_resultados', 2);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    const detalles = mockDb.calls('detalle_resultados').inserts[0];
    expect(detalles).toEqual([
      { resultado_id: 510, candidato_id: 1, votos: 50 },
      { resultado_id: 510, candidato_id: 2, votos: 30 },
    ]);
    expect(detalles.every((d) => Number.isFinite(d.votos))).toBe(true);
  });

  it('calcula total_votos_emitidos como suma de candidatos + blanco + nulo + impugnados', async () => {
    encolarValidacionesOk();
    mockDb.queue('resultados_mesa', [{ id: 511 }]);
    mockDb.queue('detalle_resultados', 2);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(mockDb.calls('resultados_mesa').inserts[0].total_votos_emitidos).toBe(90);
  });

  it('arranca en version 1 cuando no hay acta previa', async () => {
    encolarValidacionesOk();
    mockDb.queue('resultados_mesa', [{ id: 512 }]);
    mockDb.queue('detalle_resultados', 2);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(mockDb.calls('resultados_mesa').inserts[0].version).toBe(1);
  });

  it('incrementa la version al corregir un acta observada', async () => {
    encolarValidacionesOk({
      anterior: { id: 500, estado: 'observado', version: 3, foto_acta_url: 'p.jpg' },
    });
    mockDb.queue('resultados_mesa', 1);
    mockDb.queue('detalle_resultados', 1, 2);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(mockDb.calls('resultados_mesa').updates[0].version).toBe(4);
  });

  it('borra los detalles anteriores antes de reinsertar (no duplica votos)', async () => {
    encolarValidacionesOk({
      anterior: { id: 500, estado: 'observado', version: 1, foto_acta_url: 'p.jpg' },
    });
    mockDb.queue('resultados_mesa', 1);
    mockDb.queue('detalle_resultados', 1, 2);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(mockDb.calls('detalle_resultados').deletes).toBe(1);
  });

  it('marca la mesa como reportada', async () => {
    encolarValidacionesOk();
    mockDb.queue('resultados_mesa', [{ id: 513 }]);
    mockDb.queue('detalle_resultados', 2);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(mockDb.calls('mesas_sufragio').updates[0].estado).toBe('reportada');
  });

  it('registra auditoria, invalida cache y notifica a coordinador y admin', async () => {
    encolarValidacionesOk();
    mockDb.queue('resultados_mesa', [{ id: 514 }]);
    mockDb.queue('detalle_resultados', 2);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(registrarAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ tabla: 'resultados_mesa', accion: 'INSERT', usuarioId: 3 }),
    );
    expect(invalidateDashboard).toHaveBeenCalled();
    expect(notifyCoordinator).toHaveBeenCalledWith(4, 'resultado:nuevo', expect.any(Object));
    expect(notifyAdmin).toHaveBeenCalledWith('resultado:nuevo', expect.any(Object));
  });

  it('audita como UPDATE cuando corrige un acta observada', async () => {
    encolarValidacionesOk({
      anterior: { id: 500, estado: 'observado', version: 1, foto_acta_url: 'p.jpg' },
    });
    mockDb.queue('resultados_mesa', 1);
    mockDb.queue('detalle_resultados', 1, 2);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(registrarAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'UPDATE' }),
    );
  });

  it('responde 500 y no filtra el stack ante un fallo de base de datos', async () => {
    const consola = silenciarConsola();
    mockDb.queueError('asignacion_personeros', new Error('conexion perdida'));
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body.success).toBe(false);
    expect(consola).toHaveBeenCalled();
    consola.mockRestore();
  });

  it('responde una sola vez si la transaccion falla (no "headers already sent")', async () => {
    const consola = silenciarConsola();
    encolarValidacionesOk();
    mockDb.queueError('resultados_mesa', new Error('deadlock'));
    const req = crearReq({ user: usuarioPersonero(), body: BODY_OK, file: ARCHIVO });
    const res = crearRes();

    await subirResultado(req, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    consola.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('corregirResultado', () => {
  it('devuelve 404 si el resultado no existe', async () => {
    mockDb.queue('resultados_mesa', undefined);
    const req = crearReq({ user: usuarioPersonero(), params: { id: '500' } });
    const res = crearRes();

    await corregirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('solo permite corregir actas observadas', async () => {
    mockDb.queue('resultados_mesa', { id: 500, estado: 'verificado' });
    const req = crearReq({ user: usuarioPersonero(), params: { id: '500' } });
    const res = crearRes();

    await corregirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/observadas/i);
  });

  it('rechaza si el personero no esta asignado a esa mesa', async () => {
    mockDb.queue('resultados_mesa', { id: 500, estado: 'observado', mesa_id: 9 });
    mockDb.queue('asignacion_personeros', undefined);
    const req = crearReq({ user: usuarioPersonero(), params: { id: '500' } });
    const res = crearRes();

    await corregirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('delega en subirResultado inyectando el mesa_id del acta', async () => {
    mockDb.queue('resultados_mesa', { id: 500, estado: 'observado', mesa_id: 9 });
    mockDb.queue('asignacion_personeros', { id: 77 });
    // consultas de subirResultado
    encolarValidacionesOk({
      mesa: { ...MESA_PENDIENTE, estado: 'observada' },
      anterior: { id: 500, estado: 'observado', version: 1, foto_acta_url: 'p.jpg' },
    });
    mockDb.queue('resultados_mesa', 1);
    mockDb.queue('detalle_resultados', 1, 2);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({
      user: usuarioPersonero(),
      params: { id: '500' },
      body: { votos: VOTOS_OK, votos_blanco: 5, votos_nulo: 3, votos_impugnados: 2 },
      file: ARCHIVO,
    });
    const res = crearRes();

    await corregirResultado(req, res);

    expect(req.body.mesa_id).toBe(9);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('responde 500 ante fallo de base de datos', async () => {
    const consola = silenciarConsola();
    mockDb.queueError('resultados_mesa', new Error('timeout'));
    const req = crearReq({ user: usuarioPersonero(), params: { id: '500' } });
    const res = crearRes();

    await corregirResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    consola.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('verificarResultado', () => {
  const encolarVerificacionOk = (rol = 'admin') => {
    mockDb.queue('resultados_mesa', { id: 500, estado: 'pendiente', mesa_id: 9, personero_id: 3 });
    mockDb.queue('mesas_sufragio', MESA_PENDIENTE);
    if (rol !== 'admin') mockDb.queue('asignacion_coordinadores', { id: 30 });
    mockDb.queue('resultados_mesa', 1);
    mockDb.queue('mesas_sufragio', 1);
  };

  it('devuelve 404 si el resultado no existe', async () => {
    mockDb.queue('resultados_mesa', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '500' } });
    const res = crearRes();

    await verificarResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('impide verificar dos veces la misma acta', async () => {
    mockDb.queue('resultados_mesa', { id: 500, estado: 'verificado' });
    const req = crearReq({ user: usuarioAdmin(), params: { id: '500' } });
    const res = crearRes();

    await verificarResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/ya fue verificada/i);
  });

  it('devuelve 404 si la mesa asociada no existe', async () => {
    mockDb.queue('resultados_mesa', { id: 500, estado: 'pendiente', mesa_id: 9 });
    mockDb.queue('mesas_sufragio', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '500' } });
    const res = crearRes();

    await verificarResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rechaza a un coordinador sin asignacion sobre el local', async () => {
    mockDb.queue('resultados_mesa', { id: 500, estado: 'pendiente', mesa_id: 9 });
    mockDb.queue('mesas_sufragio', MESA_PENDIENTE);
    mockDb.queue('asignacion_coordinadores', undefined);
    const req = crearReq({ user: usuarioCoordinador(), params: { id: '500' } });
    const res = crearRes();

    await verificarResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('el admin verifica sin necesitar asignacion al local', async () => {
    encolarVerificacionOk('admin');
    const req = crearReq({ user: usuarioAdmin(), params: { id: '500' } });
    const res = crearRes();

    await verificarResultado(req, res);

    expect(res.body.success).toBe(true);
    expect(mockDb.calls('resultados_mesa').updates[0].estado).toBe('verificado');
    expect(mockDb.calls('mesas_sufragio').updates[0].estado).toBe('verificada');
  });

  it('un coordinador asignado puede verificar', async () => {
    encolarVerificacionOk('coordinador');
    const req = crearReq({ user: usuarioCoordinador(), params: { id: '500' } });
    const res = crearRes();

    await verificarResultado(req, res);

    expect(res.body.success).toBe(true);
  });

  it('notifica a admin, coordinador y personero', async () => {
    encolarVerificacionOk('admin');
    const req = crearReq({ user: usuarioAdmin(), params: { id: '500' } });
    const res = crearRes();

    await verificarResultado(req, res);

    expect(notifyAdmin).toHaveBeenCalledWith('resultado:verificado', expect.any(Object));
    expect(notifyCoordinator).toHaveBeenCalledWith(4, 'resultado:verificado', expect.any(Object));
    expect(notifyPersonero).toHaveBeenCalledWith(3, 'resultado:verificado', expect.any(Object));
    expect(invalidateDashboard).toHaveBeenCalled();
  });

  it('no notifica al personero si el acta no tiene personero_id', async () => {
    mockDb.queue('resultados_mesa', { id: 500, estado: 'pendiente', mesa_id: 9, personero_id: null });
    mockDb.queue('mesas_sufragio', MESA_PENDIENTE);
    mockDb.queue('resultados_mesa', 1);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '500' } });
    const res = crearRes();

    await verificarResultado(req, res);

    expect(notifyPersonero).not.toHaveBeenCalled();
  });

  it('responde 500 ante fallo de base de datos', async () => {
    const consola = silenciarConsola();
    mockDb.queueError('resultados_mesa', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '500' } });
    const res = crearRes();

    await verificarResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    consola.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('observarResultado', () => {
  it.each([
    ['sin motivo', {}],
    ['motivo vacio', { observaciones_coordinador: '   ' }],
  ])('exige motivo de observacion: %s', async (_caso, body) => {
    const req = crearReq({ user: usuarioAdmin(), params: { id: '500' }, body });
    const res = crearRes();

    await observarResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/motivo/i);
  });

  it('acepta el alias "observacion" del cuerpo', async () => {
    mockDb.queue('resultados_mesa', { id: 500, estado: 'pendiente', mesa_id: 9, personero_id: 3 });
    mockDb.queue('mesas_sufragio', MESA_PENDIENTE);
    mockDb.queue('resultados_mesa', 1);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({
      user: usuarioAdmin(), params: { id: '500' },
      body: { observacion: 'La foto esta borrosa' },
    });
    const res = crearRes();

    await observarResultado(req, res);

    expect(res.body.success).toBe(true);
    expect(mockDb.calls('resultados_mesa').updates[0].observaciones_coordinador)
      .toBe('La foto esta borrosa');
  });

  it('devuelve 404 si el resultado no existe', async () => {
    mockDb.queue('resultados_mesa', undefined);
    const req = crearReq({
      user: usuarioAdmin(), params: { id: '500' },
      body: { observaciones_coordinador: 'motivo' },
    });
    const res = crearRes();

    await observarResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('no re-observa un acta ya observada', async () => {
    mockDb.queue('resultados_mesa', { id: 500, estado: 'observado' });
    const req = crearReq({
      user: usuarioAdmin(), params: { id: '500' },
      body: { observaciones_coordinador: 'motivo' },
    });
    const res = crearRes();

    await observarResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/ya se encuentra en estado observado/i);
  });

  it('devuelve 404 si la mesa no existe', async () => {
    mockDb.queue('resultados_mesa', { id: 500, estado: 'pendiente', mesa_id: 9 });
    mockDb.queue('mesas_sufragio', undefined);
    const req = crearReq({
      user: usuarioAdmin(), params: { id: '500' },
      body: { observaciones_coordinador: 'motivo' },
    });
    const res = crearRes();

    await observarResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rechaza a un coordinador sin permiso sobre el local', async () => {
    mockDb.queue('resultados_mesa', { id: 500, estado: 'pendiente', mesa_id: 9 });
    mockDb.queue('mesas_sufragio', MESA_PENDIENTE);
    mockDb.queue('asignacion_coordinadores', undefined);
    const req = crearReq({
      user: usuarioCoordinador(), params: { id: '500' },
      body: { observaciones_coordinador: 'motivo' },
    });
    const res = crearRes();

    await observarResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('marca acta y mesa como observadas y notifica al personero', async () => {
    mockDb.queue('resultados_mesa', { id: 500, estado: 'pendiente', mesa_id: 9, personero_id: 3 });
    mockDb.queue('mesas_sufragio', MESA_PENDIENTE);
    mockDb.queue('resultados_mesa', 1);
    mockDb.queue('mesas_sufragio', 1);
    const req = crearReq({
      user: usuarioAdmin(), params: { id: '500' },
      body: { observaciones_coordinador: '  numeros ilegibles  ' },
    });
    const res = crearRes();

    await observarResultado(req, res);

    expect(mockDb.calls('resultados_mesa').updates[0]).toMatchObject({
      estado: 'observado',
      observaciones_coordinador: 'numeros ilegibles', // trim aplicado
    });
    expect(mockDb.calls('mesas_sufragio').updates[0].estado).toBe('observada');
    expect(notifyPersonero).toHaveBeenCalledWith(3, 'resultado:observado', expect.any(Object));
  });

  it('responde 500 ante fallo de base de datos', async () => {
    const consola = silenciarConsola();
    mockDb.queueError('resultados_mesa', new Error('caida'));
    const req = crearReq({
      user: usuarioAdmin(), params: { id: '500' },
      body: { observaciones_coordinador: 'motivo' },
    });
    const res = crearRes();

    await observarResultado(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    consola.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('getResultadosPorLocal', () => {
  it('el admin consulta cualquier local sin verificacion de asignacion', async () => {
    mockDb.queue('mesas_sufragio', [{ mesa_id: 1, numero_mesa: '045821' }]);
    const req = crearReq({ user: usuarioAdmin(), params: { localId: '4' } });
    const res = crearRes();

    await getResultadosPorLocal(req, res);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('rechaza a un coordinador sin asignacion al local', async () => {
    mockDb.queue('asignacion_coordinadores', undefined);
    const req = crearReq({ user: usuarioCoordinador(), params: { localId: '4' } });
    const res = crearRes();

    await getResultadosPorLocal(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('un coordinador asignado obtiene las mesas del local', async () => {
    mockDb.queue('asignacion_coordinadores', { id: 30 });
    mockDb.queue('mesas_sufragio', [{ mesa_id: 1 }, { mesa_id: 2 }]);
    const req = crearReq({ user: usuarioCoordinador(), params: { localId: '4' } });
    const res = crearRes();

    await getResultadosPorLocal(req, res);

    expect(res.body.data).toHaveLength(2);
  });

  it('responde 500 ante fallo de base de datos', async () => {
    const consola = silenciarConsola();
    mockDb.queueError('mesas_sufragio', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { localId: '4' } });
    const res = crearRes();

    await getResultadosPorLocal(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    consola.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('getResultadoDetalle', () => {
  const ACTA = {
    id: 500, mesa_id: 9, local_id: 4, numero_mesa: '045821',
    foto_acta_url: 'actas/foto.jpg',
  };

  it('devuelve 404 si el acta no existe', async () => {
    mockDb.queue('resultados_mesa', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '500' } });
    const res = crearRes();

    await getResultadoDetalle(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('un personero no puede ver el acta de otra mesa', async () => {
    mockDb.queue('resultados_mesa', ACTA);
    mockDb.queue('asignacion_personeros', undefined);
    const req = crearReq({ user: usuarioPersonero(), params: { id: '500' } });
    const res = crearRes();

    await getResultadoDetalle(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('un personero ve su propia acta', async () => {
    mockDb.queue('resultados_mesa', { ...ACTA });
    mockDb.queue('asignacion_personeros', { id: 77 });
    mockDb.queue('detalle_resultados', [{ candidato_id: 1, votos: 50 }]);
    const req = crearReq({ user: usuarioPersonero(), params: { id: '500' } });
    const res = crearRes();

    await getResultadoDetalle(req, res);

    expect(res.body.success).toBe(true);
    expect(res.body.data.detalles).toHaveLength(1);
    expect(res.body.data.votos_candidatos).toEqual(res.body.data.detalles);
  });

  it('un coordinador sin asignacion al local es rechazado', async () => {
    mockDb.queue('resultados_mesa', ACTA);
    mockDb.queue('asignacion_coordinadores', undefined);
    const req = crearReq({ user: usuarioCoordinador(), params: { id: '500' } });
    const res = crearRes();

    await getResultadoDetalle(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('genera URL firmada de la foto cuando existe', async () => {
    mockDb.queue('resultados_mesa', { ...ACTA });
    mockDb.queue('detalle_resultados', []);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '500' } });
    const res = crearRes();

    await getResultadoDetalle(req, res);

    expect(getActaUrl).toHaveBeenCalledWith('actas/foto.jpg');
    expect(res.body.data.foto_acta_url_presigned).toBe('https://cdn/firmada.jpg');
  });

  it('no intenta firmar URL si el acta no tiene foto', async () => {
    mockDb.queue('resultados_mesa', { ...ACTA, foto_acta_url: null });
    mockDb.queue('detalle_resultados', []);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '500' } });
    const res = crearRes();

    await getResultadoDetalle(req, res);

    expect(getActaUrl).not.toHaveBeenCalled();
  });

  it('responde 500 ante fallo de base de datos', async () => {
    const consola = silenciarConsola();
    mockDb.queueError('resultados_mesa', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '500' } });
    const res = crearRes();

    await getResultadoDetalle(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    consola.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('getMiMesa', () => {
  it('devuelve 404 si el personero no tiene mesa asignada', async () => {
    mockDb.queue('asignacion_personeros', undefined);
    const req = crearReq({ user: usuarioPersonero() });
    const res = crearRes();

    await getMiMesa(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body.message).toMatch(/no tiene una mesa asignada/i);
  });

  it('devuelve mesa, local y candidatos cuando aun no cargo acta', async () => {
    mockDb.queue('asignacion_personeros', { id: 77, mesa_id: 9 });
    mockDb.queue('mesas_sufragio', {
      ...MESA_PENDIENTE, local_nombre: 'IE San Juan',
      local_direccion: 'Av. Peru 100', distrito_nombre: 'Ayacucho',
    });
    mockDb.queue('resultados_mesa', undefined);
    mockDb.queue('candidatos', [{ id: 1, nombre_completo: 'Ana' }]);
    const req = crearReq({ user: usuarioPersonero() });
    const res = crearRes();

    await getMiMesa(req, res);

    expect(res.body.data.resultado).toBeNull();
    expect(res.body.data.local).toMatchObject({ nombre: 'IE San Juan', distrito: 'Ayacucho' });
    expect(res.body.data.candidatos).toHaveLength(1);
  });

  it('incluye el acta con detalles y foto firmada si ya cargo', async () => {
    mockDb.queue('asignacion_personeros', { id: 77, mesa_id: 9 });
    mockDb.queue('mesas_sufragio', { ...MESA_PENDIENTE });
    mockDb.queue('resultados_mesa', { id: 500, foto_acta_url: 'actas/f.jpg' });
    mockDb.queue('detalle_resultados', [{ candidato_id: 1, votos: 50 }]);
    mockDb.queue('candidatos', []);
    const req = crearReq({ user: usuarioPersonero() });
    const res = crearRes();

    await getMiMesa(req, res);

    expect(res.body.data.resultado.detalles).toHaveLength(1);
    expect(getActaUrl).toHaveBeenCalledWith('actas/f.jpg');
  });

  it('responde 500 ante fallo de base de datos', async () => {
    const consola = silenciarConsola();
    mockDb.queueError('asignacion_personeros', new Error('caida'));
    const req = crearReq({ user: usuarioPersonero() });
    const res = crearRes();

    await getMiMesa(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    consola.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('confirmarMesa', () => {
  it('devuelve 404 si no tiene mesa asignada', async () => {
    mockDb.queue('asignacion_personeros', undefined);
    const req = crearReq({ user: usuarioPersonero() });
    const res = crearRes();

    await confirmarMesa(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('registra la confirmacion con geolocalizacion y notifica al coordinador', async () => {
    mockDb.queue('asignacion_personeros', { id: 77, mesa_id: 9 });
    mockDb.queue('mesas_sufragio', MESA_PENDIENTE);
    const req = crearReq({
      user: usuarioPersonero(),
      body: { latitud: '-13.1587', longitud: '-74.2236' },
    });
    const res = crearRes();

    await confirmarMesa(req, res);

    expect(registrarAuditoria).toHaveBeenCalledWith(expect.objectContaining({
      tabla: 'asignacion_personeros', lat: -13.1587, lng: -74.2236,
    }));
    expect(notifyCoordinator).toHaveBeenCalledWith(4, 'personero:presente', expect.any(Object));
    expect(res.body.success).toBe(true);
  });

  it('acepta confirmacion sin coordenadas', async () => {
    mockDb.queue('asignacion_personeros', { id: 77, mesa_id: 9 });
    mockDb.queue('mesas_sufragio', MESA_PENDIENTE);
    const req = crearReq({ user: usuarioPersonero(), body: {} });
    const res = crearRes();

    await confirmarMesa(req, res);

    expect(registrarAuditoria).toHaveBeenCalledWith(expect.objectContaining({ lat: null, lng: null }));
  });

  it('no notifica si la mesa asignada ya no existe', async () => {
    mockDb.queue('asignacion_personeros', { id: 77, mesa_id: 9 });
    mockDb.queue('mesas_sufragio', undefined);
    const req = crearReq({ user: usuarioPersonero(), body: {} });
    const res = crearRes();

    await confirmarMesa(req, res);

    expect(notifyCoordinator).not.toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });

  it('responde 500 ante fallo de base de datos', async () => {
    const consola = silenciarConsola();
    mockDb.queueError('asignacion_personeros', new Error('caida'));
    const req = crearReq({ user: usuarioPersonero(), body: {} });
    const res = crearRes();

    await confirmarMesa(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    consola.mockRestore();
  });

  describe('eliminarResultado', () => {
    it('responde 404 si el resultado no existe', async () => {
      mockDb.queue('resultados_mesa', undefined);
      const req = crearReq({ user: usuarioAdmin(), params: { id: '99' } });
      const res = crearRes();

      await eliminarResultado(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body.message).toContain('no encontrada');
    });

    it('responde 404 si la mesa asociada no existe', async () => {
      mockDb.queue('resultados_mesa', { id: 10, mesa_id: 99, tipo_eleccion: 'provincial' });
      mockDb.queue('mesas_sufragio', undefined);
      const req = crearReq({ user: usuarioAdmin(), params: { id: '10' } });
      const res = crearRes();

      await eliminarResultado(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body.message).toContain('Mesa asociada no encontrada');
    });

    it('elimina resultado provincial, detalle y restablece mesa a pendiente cuando no hay mas actas', async () => {
      const resMock = {
        id: 10,
        mesa_id: 9,
        tipo_eleccion: 'provincial',
        estado: 'verificado',
        foto_acta_url: 'actas/045821/foto.jpg',
        personero_id: 5,
      };
      mockDb.queue('resultados_mesa', resMock);
      mockDb.queue('mesas_sufragio', MESA_PENDIENTE);
      mockDb.queue('detalle_resultados', 1); // delete
      mockDb.queue('resultados_mesa', 1); // delete
      mockDb.queue('resultados_mesa', undefined); // otro resultado
      mockDb.queue('mesas_sufragio', 1); // update

      const req = crearReq({ user: usuarioAdmin(), params: { id: '10' } });
      const res = crearRes();

      await eliminarResultado(req, res);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('eliminada correctamente');
      expect(registrarAuditoria).toHaveBeenCalledWith(expect.objectContaining({
        tabla: 'resultados_mesa', accion: 'DELETE', registroId: 10,
      }));
      expect(invalidateDashboard).toHaveBeenCalled();
      expect(notifyAdmin).toHaveBeenCalledWith('resultado:eliminado', expect.objectContaining({ resultado_id: 10 }));
      expect(notifyCoordinator).toHaveBeenCalledWith(4, 'resultado:eliminado', expect.any(Object));
      expect(notifyPersonero).toHaveBeenCalledWith(5, 'resultado:eliminado', expect.any(Object));
    });

    it('restaura estado previo si existe otro resultado para la misma mesa y tipo de eleccion', async () => {
      const resMock = {
        id: 11,
        mesa_id: 9,
        tipo_eleccion: 'distrital',
        estado: 'observado',
        foto_acta_url: null,
      };
      mockDb.queue('resultados_mesa', resMock);
      mockDb.queue('mesas_sufragio', { id: 9, local_id: 4, numero_mesa: '045821' });
      mockDb.queue('detalle_resultados', 1);
      mockDb.queue('resultados_mesa', 1);
      mockDb.queue('resultados_mesa', { id: 8, estado: 'verificado' }); // otro resultado previo
      mockDb.queue('mesas_sufragio', 1);

      const req = crearReq({ user: usuarioAdmin(), params: { id: '11' } });
      const res = crearRes();

      await eliminarResultado(req, res);

      expect(res.body.success).toBe(true);
    });

    it('responde 500 ante error inesperado', async () => {
      const consola = silenciarConsola();
      mockDb.queueError('resultados_mesa', new Error('caida_fatal'));
      const req = crearReq({ user: usuarioAdmin(), params: { id: '10' } });
      const res = crearRes();

      await eliminarResultado(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      consola.mockRestore();
    });
  });
});
