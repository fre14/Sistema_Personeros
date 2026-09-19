import { jest } from '@jest/globals';
import { z } from 'zod';
import { createDbMock, crearReq, crearRes, silenciarConsola } from '../support/knex-mock.js';

// ═══════════════════════════════════════════════════════════════════
// Middlewares.
//
// NOTA IMPORTANTE: el test anterior de validate.middleware REIMPLEMENTABA
// el middleware dentro del propio archivo de test en vez de importarlo.
// Resultado: 11 tests en verde sobre una copia, y 0% de cobertura real
// sobre src/middlewares/validate.middleware.js — incluida la rama
// body/query/params, que nunca se ejecuto. Aqui se importa el modulo real.
// ═══════════════════════════════════════════════════════════════════

const mockDb = createDbMock();
const registrarAuditoria = jest.fn().mockResolvedValue(undefined);
const jwtVerify = jest.fn();

jest.unstable_mockModule('../../src/config/database.js', () => ({ default: mockDb.db }));
jest.unstable_mockModule('../../src/services/auditoria.service.js', () => ({ registrarAuditoria }));
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { verify: jwtVerify, sign: jest.fn() },
  verify: jwtVerify,
  sign: jest.fn(),
}));
jest.unstable_mockModule('../../src/config/auth.js', () => ({
  authConfig: { secret: 'secreto-de-prueba', expiresIn: '15m' },
}));

// Se intercepta multer para capturar las OPCIONES REALES que el modulo le
// pasa (fileFilter, limits). Sin esto el fileFilter nunca se ejecuta en los
// tests y queda sin cubrir justo la regla que impide subir un ejecutable
// disfrazado de acta.
const opcionesMulter = {};
const multerFake = jest.fn((opciones) => {
  Object.assign(opcionesMulter, opciones);
  return { single: jest.fn(() => (req, res, next) => next()) };
});
multerFake.memoryStorage = jest.fn(() => ({ __tipo: 'memoria' }));
jest.unstable_mockModule('multer', () => ({ default: multerFake }));

const { validate } = await import('../../src/middlewares/validate.middleware.js');
const { errorHandler } = await import('../../src/middlewares/errorHandler.js');
const { uploadActa } = await import('../../src/middlewares/upload.middleware.js');
const { auditLog } = await import('../../src/middlewares/audit.middleware.js');
const {
  authenticateToken, requireRole, requireOwnMesa, requireOwnLocal,
} = await import('../../src/middlewares/auth.middleware.js');

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.reset();
});

// ═══════════════════════════════════════════════════════════════════
describe('validate.middleware (modulo real)', () => {
  const esquemaPlano = z.object({
    dni: z.string().length(8, 'El DNI debe tener 8 digitos'),
    edad: z.number().min(18),
  });

  it('llama next() cuando el cuerpo es valido', () => {
    const middleware = validate(esquemaPlano);
    const req = crearReq({ body: { dni: '12345678', edad: 30 } });
    const res = crearRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('REEMPLAZA req.body con el resultado parseado (comportamiento no cubierto antes)', () => {
    const conDefault = z.object({
      nombre: z.string(),
      activo: z.boolean().default(true),
    });
    const middleware = validate(conDefault);
    const req = crearReq({ body: { nombre: 'Ana' } });
    const res = crearRes();

    middleware(req, res, jest.fn());

    // El middleware real hace req.body = parsed: los defaults de Zod quedan
    // disponibles para el controlador. La copia del test anterior no lo hacia.
    expect(req.body).toEqual({ nombre: 'Ana', activo: true });
  });

  it('aplica coercion y saneamiento de Zod sobre req.body', () => {
    const conTransform = z.object({
      dni: z.string().trim(),
      lista: z.coerce.number(),
    });
    const middleware = validate(conTransform);
    const req = crearReq({ body: { dni: '  12345678  ', lista: '4' } });
    const res = crearRes();

    middleware(req, res, jest.fn());

    expect(req.body).toEqual({ dni: '12345678', lista: 4 });
  });

  it('responde 400 con la lista de errores cuando el cuerpo es invalido', () => {
    const middleware = validate(esquemaPlano);
    const req = crearReq({ body: { dni: '123', edad: 10 } });
    const res = crearRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/validaci/i);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('valida esquemas compuestos body/query/params sin sobrescribir req.body', () => {
    const esquemaCompuesto = z.object({
      body: z.object({ motivo: z.string().min(3) }),
      query: z.object({ page: z.string().optional() }),
      params: z.object({ id: z.string() }),
    });
    const middleware = validate(esquemaCompuesto);
    const req = crearReq({
      body: { motivo: 'foto ilegible' },
      query: { page: '2' },
      params: { id: '500' },
    });
    const res = crearRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ motivo: 'foto ilegible' });
  });

  it('rechaza cuando falla la parte params de un esquema compuesto', () => {
    const esquemaCompuesto = z.object({
      body: z.object({}).passthrough(),
      params: z.object({ id: z.string().regex(/^\d+$/, 'id debe ser numerico') }),
    });
    const middleware = validate(esquemaCompuesto);
    const req = crearReq({ body: {}, params: { id: 'abc' } });
    const res = crearRes();

    middleware(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rechaza campos desconocidos si el esquema es estricto', () => {
    const estricto = z.object({ dni: z.string() }).strict();
    const middleware = validate(estricto);
    const req = crearReq({ body: { dni: '12345678', rol: 'admin' } });
    const res = crearRes();

    middleware(req, res, jest.fn());

    // Relevante para seguridad: impide escalar privilegios inyectando campos.
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('errorHandler', () => {
  let consola;
  beforeEach(() => { consola = silenciarConsola(); });
  afterEach(() => { consola.mockRestore(); delete process.env.NODE_ENV; });

  it('usa 500 y mensaje generico por defecto', () => {
    const res = crearRes();

    errorHandler(new Error(''), crearReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body.message).toBe('Error interno del servidor');
    expect(res.body.success).toBe(false);
  });

  it('respeta statusCode y message del error', () => {
    const err = new Error('Recurso no encontrado');
    err.statusCode = 404;
    const res = crearRes();

    errorHandler(err, crearReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body.message).toBe('Recurso no encontrado');
  });

  it('NO expone el objeto de error en produccion', () => {
    process.env.NODE_ENV = 'production';
    const res = crearRes();

    errorHandler(new Error('detalle interno'), crearReq(), res, jest.fn());

    expect(res.body.error).toBeUndefined();
  });

  it('expone el error solo en desarrollo', () => {
    process.env.NODE_ENV = 'development';
    const err = new Error('detalle interno');
    const res = crearRes();

    errorHandler(err, crearReq(), res, jest.fn());

    expect(res.body.error).toBe(err);
  });

  it('registra el stack en consola para diagnostico', () => {
    errorHandler(new Error('x'), crearReq(), crearRes(), jest.fn());

    expect(consola).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('upload.middleware — filtro de archivos', () => {
  it('usa almacenamiento en memoria (el buffer va a S3/Supabase, no a disco)', () => {
    expect(opcionesMulter.storage).toEqual({ __tipo: 'memoria' });
  });

  it('limita el tamano del acta a 10 MB', () => {
    expect(opcionesMulter.limits.fileSize).toBe(10 * 1024 * 1024);
  });

  it('expone el middleware para el campo foto_acta', () => {
    expect(typeof uploadActa).toBe('function');
  });

  it.each(['image/jpeg', 'image/jpg', 'image/png'])(
    'acepta %s', (mimetype) => {
      const cb = jest.fn();

      opcionesMulter.fileFilter({}, { mimetype }, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

  it.each([
    'image/gif',
    'image/svg+xml',      // vector: vector de XSS si se sirve inline
    'application/pdf',
    'text/html',
    'application/x-msdownload',
    'application/octet-stream',
  ])('rechaza %s', (mimetype) => {
    const cb = jest.fn();

    opcionesMulter.fileFilter({}, { mimetype }, cb);

    const [error, aceptado] = cb.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/no soportado/i);
    expect(aceptado).toBe(false);
  });

  it('rechaza un archivo sin mimetype declarado', () => {
    const cb = jest.fn();

    opcionesMulter.fileFilter({}, { mimetype: undefined }, cb);

    expect(cb.mock.calls[0][1]).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('audit.middleware', () => {
  it('no audita si el controlador no definio req.auditData', () => {
    const middleware = auditLog('usuarios');
    const req = crearReq();
    const res = crearRes();
    const next = jest.fn();

    middleware(req, res, next);
    res.json({ success: true });

    expect(registrarAuditoria).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('audita cuando el controlador dejo req.auditData y la respuesta fue 2xx', () => {
    const middleware = auditLog('usuarios');
    const req = crearReq({
      user: { id: 7 },
      auditData: { registroId: 10, accion: 'INSERT', datosNuevos: { id: 10 } },
      headers: { 'user-agent': 'k6/0.49', 'x-latitude': '-13.15', 'x-longitude': '-74.22' },
    });
    const res = crearRes();

    middleware(req, res, jest.fn());
    res.json({ success: true });

    expect(registrarAuditoria).toHaveBeenCalledWith(expect.objectContaining({
      tabla: 'usuarios', registroId: 10, accion: 'INSERT',
      usuarioId: 7, lat: -13.15, lng: -74.22, userAgent: 'k6/0.49',
    }));
  });

  it('prefiere x-forwarded-for como IP (detras del balanceador)', () => {
    const middleware = auditLog('mesas');
    const req = crearReq({
      user: { id: 7 },
      auditData: { registroId: 1, accion: 'UPDATE' },
      headers: { 'x-forwarded-for': '200.60.1.5' },
    });
    const res = crearRes();

    middleware(req, res, jest.fn());
    res.json({ success: true });

    expect(registrarAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '200.60.1.5' }),
    );
  });

  it('cae al socket cuando no hay x-forwarded-for', () => {
    const middleware = auditLog('mesas');
    const req = crearReq({
      user: { id: 7 },
      auditData: { registroId: 1, accion: 'UPDATE' },
      headers: {},
    });
    const res = crearRes();

    middleware(req, res, jest.fn());
    res.json({ success: true });

    expect(registrarAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '190.12.0.1' }),
    );
  });

  it('NO audita respuestas de error', () => {
    const middleware = auditLog('usuarios');
    const req = crearReq({ user: { id: 7 }, auditData: { registroId: 1, accion: 'INSERT' } });
    const res = crearRes();

    middleware(req, res, jest.fn());
    res.status(400).json({ success: false });

    expect(registrarAuditoria).not.toHaveBeenCalled();
  });

  it('usa usuarioId null si la peticion es anonima', () => {
    const middleware = auditLog('usuarios');
    const req = crearReq({ user: undefined, auditData: { registroId: 1, accion: 'INSERT' } });
    const res = crearRes();

    middleware(req, res, jest.fn());
    res.json({ ok: true });

    expect(registrarAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: null }),
    );
  });

  it('un fallo de auditoria no rompe la respuesta al usuario', async () => {
    const consola = silenciarConsola();
    registrarAuditoria.mockRejectedValueOnce(new Error('auditoria caida'));
    const middleware = auditLog('usuarios');
    const req = crearReq({ user: { id: 7 }, auditData: { registroId: 1, accion: 'INSERT' } });
    const res = crearRes();

    middleware(req, res, jest.fn());
    expect(() => res.json({ success: true })).not.toThrow();

    await new Promise((r) => setImmediate(r));
    consola.mockRestore();
  });

  it('devuelve el cuerpo original al cliente (no lo altera)', () => {
    const middleware = auditLog('usuarios');
    const req = crearReq({ user: { id: 7 } });
    const res = crearRes();
    const cuerpo = { success: true, data: { id: 1 } };

    middleware(req, res, jest.fn());
    res.json(cuerpo);

    expect(res.body).toEqual(cuerpo);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('auth.middleware — authenticateToken', () => {
  it('rechaza sin cabecera Authorization', () => {
    const res = crearRes();

    authenticateToken(crearReq({ headers: {} }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rechaza si la cabecera no tiene el formato "Bearer <token>"', () => {
    const res = crearRes();

    authenticateToken(crearReq({ headers: { authorization: 'abc123' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rechaza con 403 si el token es invalido o expiro', () => {
    jwtVerify.mockImplementation(() => { throw new Error('jwt expired'); });
    const res = crearRes();

    authenticateToken(
      crearReq({ headers: { authorization: 'Bearer caducado' } }), res, jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.message).toMatch(/invalid token/i);
  });

  it('adjunta req.user y continua con un token valido', () => {
    jwtVerify.mockReturnValue({ id: 3, dni: '22222222', rol: 'personero' });
    const req = crearReq({ headers: { authorization: 'Bearer valido' } });
    const next = jest.fn();

    authenticateToken(req, crearRes(), next);

    expect(jwtVerify).toHaveBeenCalledWith('valido', 'secreto-de-prueba');
    expect(req.user).toEqual({ id: 3, dni: '22222222', rol: 'personero' });
    expect(next).toHaveBeenCalled();
  });
});

describe('auth.middleware — requireRole', () => {
  it('rechaza peticiones sin usuario autenticado', () => {
    const res = crearRes();

    requireRole('admin')(crearReq({ user: undefined }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rechaza un rol no autorizado', () => {
    const res = crearRes();

    requireRole('admin')(crearReq({ user: { rol: 'personero' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.message).toMatch(/insufficient permissions/i);
  });

  it('acepta el rol exacto', () => {
    const next = jest.fn();

    requireRole('admin')(crearReq({ user: { rol: 'admin' } }), crearRes(), next);

    expect(next).toHaveBeenCalled();
  });

  it('acepta cualquiera de varios roles permitidos', () => {
    const next = jest.fn();

    requireRole('admin', 'coordinador')(
      crearReq({ user: { rol: 'coordinador' } }), crearRes(), next,
    );

    expect(next).toHaveBeenCalled();
  });

  it('un personero no puede usar endpoints de admin', () => {
    const res = crearRes();

    requireRole('admin', 'coordinador')(
      crearReq({ user: { rol: 'personero' } }), res, jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('auth.middleware — requireOwnMesa', () => {
  it('el admin pasa sin consultar la base de datos', async () => {
    const next = jest.fn();

    await requireOwnMesa(
      crearReq({ user: { id: 1, rol: 'admin' }, params: { mesaId: '9' } }),
      crearRes(), next,
    );

    expect(next).toHaveBeenCalled();
    expect(mockDb.db).not.toHaveBeenCalled();
  });

  it('rechaza a un personero no asignado a esa mesa', async () => {
    mockDb.queue('asignacion_personeros', undefined);
    const res = crearRes();

    await requireOwnMesa(
      crearReq({ user: { id: 3, rol: 'personero' }, params: { mesaId: '9' } }),
      res, jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.message).toMatch(/no tienes acceso a esta mesa/i);
  });

  it('deja pasar al personero asignado', async () => {
    mockDb.queue('asignacion_personeros', { id: 77 });
    const next = jest.fn();

    await requireOwnMesa(
      crearReq({ user: { id: 3, rol: 'personero' }, params: { mesaId: '9' } }),
      crearRes(), next,
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('delega el fallo de base de datos al errorHandler', async () => {
    mockDb.queueError('asignacion_personeros', new Error('caida'));
    const next = jest.fn();

    await requireOwnMesa(
      crearReq({ user: { id: 3, rol: 'personero' }, params: { mesaId: '9' } }),
      crearRes(), next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('auth.middleware — requireOwnLocal', () => {
  it('el admin pasa sin consultar la base de datos', async () => {
    const next = jest.fn();

    await requireOwnLocal(
      crearReq({ user: { id: 1, rol: 'admin' }, params: { localId: '4' } }),
      crearRes(), next,
    );

    expect(next).toHaveBeenCalled();
    expect(mockDb.db).not.toHaveBeenCalled();
  });

  it('rechaza a un coordinador no asignado al local', async () => {
    mockDb.queue('asignacion_coordinadores', undefined);
    const res = crearRes();

    await requireOwnLocal(
      crearReq({ user: { id: 2, rol: 'coordinador' }, params: { localId: '4' } }),
      res, jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.message).toMatch(/no tienes acceso a este local/i);
  });

  it('deja pasar al coordinador asignado', async () => {
    mockDb.queue('asignacion_coordinadores', { id: 30 });
    const next = jest.fn();

    await requireOwnLocal(
      crearReq({ user: { id: 2, rol: 'coordinador' }, params: { localId: '4' } }),
      crearRes(), next,
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('delega el fallo de base de datos al errorHandler', async () => {
    mockDb.queueError('asignacion_coordinadores', new Error('caida'));
    const next = jest.fn();

    await requireOwnLocal(
      crearReq({ user: { id: 2, rol: 'coordinador' }, params: { localId: '4' } }),
      crearRes(), next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
