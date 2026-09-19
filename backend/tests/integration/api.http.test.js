import { jest } from '@jest/globals';
import { createDbMock } from '../support/knex-mock.js';

// ═══════════════════════════════════════════════════════════════════
// Integracion HTTP sobre la app Express REAL.
//
// A diferencia de la suite de integracion anterior, esta NO necesita una
// base de datos levantada: se simula unicamente la capa de persistencia y
// se ejerce todo lo demas de verdad — helmet, CORS, rate limiting, parseo
// del cuerpo, cadena authenticateToken -> requireRole -> validate ->
// controlador -> errorHandler.
//
// Esto es lo que cubre los 10 archivos de src/routes/ (antes 0%) y, sobre
// todo, verifica las CADENAS DE AUTORIZACION: que un personero no pueda
// llamar a un endpoint de admin no se puede comprobar con tests unitarios
// del controlador, porque el guardia vive en la ruta.
// ═══════════════════════════════════════════════════════════════════

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secreto-de-integracion';
process.env.JWT_REFRESH_SECRET = 'refresco-de-integracion';
process.env.CORS_ORIGIN = 'https://elecciones.pe';
process.env.RATE_LIMIT_AUTH = '15';
process.env.RATE_LIMIT_API = '300';

const mockDb = createDbMock();

const compare = jest.fn();
const hash = jest.fn().mockResolvedValue('$2a$12$hash');

jest.unstable_mockModule('../../src/config/database.js', () => ({ default: mockDb.db }));
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  initRedis: jest.fn().mockResolvedValue(null),
  closeRedis: jest.fn().mockResolvedValue(undefined),
  isRedisReady: jest.fn(() => false),
  getRedis: jest.fn(() => null),
}));
jest.unstable_mockModule('../../src/services/websocket.service.js', () => ({
  setupWebSocket: jest.fn().mockResolvedValue({}),
  getWsStats: jest.fn().mockResolvedValue({ conectados: 0, adapterRedis: false }),
  notifyCoordinator: jest.fn(),
  notifyAdmin: jest.fn(),
  notifyPersonero: jest.fn(),
  getIo: jest.fn(),
}));
jest.unstable_mockModule('../../src/services/storage.service.js', () => ({
  uploadActaImage: jest.fn().mockResolvedValue('actas/045821/foto.jpg'),
  getActaUrl: jest.fn().mockResolvedValue('https://cdn/firmada.jpg'),
  deleteActaImage: jest.fn(),
}));
jest.unstable_mockModule('../../src/services/cache.service.js', () => ({
  cacheWrap: jest.fn((k, ttl, fn) => fn()),
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  invalidateDashboard: jest.fn().mockResolvedValue(undefined),
}));
jest.unstable_mockModule('bcryptjs', () => ({ default: { compare, hash }, compare, hash }));

const request = (await import('supertest')).default;
const jwt = (await import('jsonwebtoken')).default;
const { app } = await import('../../src/app.js');

// ── Tokens reales firmados con el mismo secreto que usa la app ──
const token = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
const TOKEN_ADMIN = token({ id: 1, dni: '00000000', rol: 'admin' });
const TOKEN_COORD = token({ id: 2, dni: '11111111', rol: 'coordinador' });
const TOKEN_PERSONERO = token({ id: 3, dni: '22222222', rol: 'personero' });
const auth = (t) => ['Authorization', `Bearer ${t}`];

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.reset();
});

// ═══════════════════════════════════════════════════════════════════
describe('Infraestructura de la app', () => {
  it('GET /api/health responde sin tocar la base de datos', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.instancia).toBeDefined();
  });

  it('GET /api/health/full responde 200 cuando la base responde', async () => {
    const res = await request(app).get('/api/health/full');

    expect(res.status).toBe(200);
    expect(res.body.db).toBe(true);
    expect(res.body.websocket).toEqual({ conectados: 0, adapterRedis: false });
  });

  it('GET /api/health/full responde 503 si la base no responde', async () => {
    mockDb.db.raw.mockImplementationOnce(() => Promise.reject(new Error('sin conexion')));

    const res = await request(app).get('/api/health/full');

    expect(res.status).toBe(503);
    expect(res.body.db).toBe(false);
    expect(res.body.dbError).toBe('sin conexion');
  });

  it('devuelve 404 JSON para un endpoint inexistente', async () => {
    const res = await request(app).get('/api/no-existe');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Endpoint no encontrado' });
  });

  it('aplica cabeceras de seguridad de helmet', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
  });

  it('permite el origen configurado en CORS', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://elecciones.pe');

    expect(res.headers['access-control-allow-origin']).toBe('https://elecciones.pe');
  });

  it('expone cabeceras estandar de rate limit', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['ratelimit-limit']).toBeDefined();
  });

  it('acepta un cuerpo JSON grande (actas en base64 de hasta 12mb)', async () => {
    mockDb.queue('usuarios', undefined);
    const relleno = 'x'.repeat(200 * 1024);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ dni: '12345678', password: 'clave123', extra: relleno });

    expect(res.status).not.toBe(413);
  });

  it('rechaza JSON malformado sin caerse', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{roto');

    expect([400, 500]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('POST /api/auth/login', () => {
  it('rechaza credenciales de un usuario inexistente', async () => {
    mockDb.queue('usuarios', undefined);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ dni: '99999999', password: 'clave123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/inv/i);
  });

  it('rechaza contrasena incorrecta', async () => {
    mockDb.queue('usuarios', { id: 1, dni: '00000000', rol: 'admin', password_hash: '$2a$12$h' });
    compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ dni: '00000000', password: 'incorrecta' });

    expect(res.status).toBe(401);
  });

  it('devuelve accessToken y refreshToken con credenciales validas', async () => {
    mockDb.queue('usuarios', {
      id: 1, dni: '00000000', nombres: 'Admin', apellidos: 'Sistema',
      rol: 'admin', password_hash: '$2a$12$h',
    });
    compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ dni: '00000000', password: 'clave123' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('NUNCA devuelve el hash de la contrasena', async () => {
    mockDb.queue('usuarios', {
      id: 1, dni: '00000000', rol: 'admin', password_hash: '$2a$12$secreto',
    });
    compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ dni: '00000000', password: 'clave123' });

    expect(JSON.stringify(res.body)).not.toContain('password_hash');
    expect(JSON.stringify(res.body)).not.toContain('$2a$12$secreto');
  });

  it('un personero puede entrar con su numero de mesa como contrasena', async () => {
    mockDb.queue('usuarios', {
      id: 3, dni: '22222222', rol: 'personero', password_hash: '$2a$12$h',
    });
    compare.mockResolvedValue(false);
    mockDb.queue('asignacion_personeros', { numero_mesa: '045821' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ dni: '22222222', password: '045821' });

    expect(res.status).toBe(200);
  });

  it('rechaza si el numero de mesa enviado no es el suyo', async () => {
    mockDb.queue('usuarios', { id: 3, dni: '22222222', rol: 'personero', password_hash: '$2a$12$h' });
    compare.mockResolvedValue(false);
    mockDb.queue('asignacion_personeros', { numero_mesa: '045821' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ dni: '22222222', password: '999999' });

    expect(res.status).toBe(401);
  });

  it('un coordinador NO puede entrar con un numero de mesa', async () => {
    mockDb.queue('usuarios', { id: 2, dni: '11111111', rol: 'coordinador', password_hash: '$2a$12$h' });
    compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ dni: '11111111', password: '045821' });

    expect(res.status).toBe(401);
  });

  it('responde 500 controlado si la base de datos falla', async () => {
    mockDb.queueError('usuarios', new Error('sin conexion'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ dni: '00000000', password: 'clave123' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/refresh', () => {
  it('exige el token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});

    expect(res.status).toBe(401);
  });

  it('rechaza un refresh token invalido', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ token: 'basura' });

    expect(res.status).toBe(401);
  });

  it('emite un nuevo accessToken con un refresh valido', async () => {
    const refresh = jwt.sign(
      { id: 1, dni: '00000000', rol: 'admin' },
      process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' },
    );

    const res = await request(app).post('/api/auth/refresh').send({ token: refresh });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('no acepta un access token en lugar del refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ token: TOKEN_ADMIN });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/profile', () => {
  it('exige autenticacion', async () => {
    const res = await request(app).get('/api/auth/profile');

    expect(res.status).toBe(401);
  });

  it('devuelve el perfil sin el hash', async () => {
    mockDb.queue('usuarios', { id: 1, dni: '00000000', password_hash: '$2a$12$secreto' });

    const res = await request(app).get('/api/auth/profile').set(...auth(TOKEN_ADMIN));

    expect(res.status).toBe(200);
    expect(res.body.data.password_hash).toBeUndefined();
  });

  it('404 si el usuario del token ya no existe', async () => {
    mockDb.queue('usuarios', undefined);

    const res = await request(app).get('/api/auth/profile').set(...auth(TOKEN_ADMIN));

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('Autenticacion y autorizacion en las rutas', () => {
  it.each([
    ['GET', '/api/usuarios'],
    ['GET', '/api/mesas'],
    ['GET', '/api/locales'],
    ['GET', '/api/distritos'],
    ['GET', '/api/candidatos'],
    ['GET', '/api/asignaciones/personeros'],
    ['GET', '/api/resultados/mi-mesa'],
    ['GET', '/api/dashboard/resumen'],
  ])('%s %s exige token', async (metodo, ruta) => {
    const res = await request(app)[metodo.toLowerCase()](ruta);

    expect(res.status).toBe(401);
  });

  it('rechaza un token firmado con otro secreto (token falsificado)', async () => {
    const falso = jwt.sign({ id: 1, rol: 'admin' }, 'secreto-del-atacante');

    const res = await request(app).get('/api/usuarios').set(...auth(falso));

    expect(res.status).toBe(403);
  });

  it('rechaza un token expirado', async () => {
    const expirado = jwt.sign({ id: 1, rol: 'admin' }, process.env.JWT_SECRET, { expiresIn: '-1h' });

    const res = await request(app).get('/api/usuarios').set(...auth(expirado));

    expect(res.status).toBe(403);
  });

  it('un token con rol manipulado en el payload pero mal firmado no sirve', async () => {
    const [cabecera, cuerpo] = TOKEN_PERSONERO.split('.');
    const manipulado = `${cabecera}.${Buffer.from(
      JSON.stringify({ id: 3, rol: 'admin' }),
    ).toString('base64url')}.firmaInvalida`;

    const res = await request(app).get('/api/usuarios').set(...auth(manipulado));

    expect(res.status).toBe(403);
  });

  describe('separacion de privilegios por rol', () => {
    it.each([
      ['personero', TOKEN_PERSONERO],
      ['coordinador', TOKEN_COORD],
    ])('un %s NO puede listar usuarios', async (_rol, t) => {
      const res = await request(app).get('/api/usuarios').set(...auth(t));

      expect(res.status).toBe(403);
    });

    it('un personero NO puede crear mesas', async () => {
      const res = await request(app)
        .post('/api/mesas').set(...auth(TOKEN_PERSONERO))
        .send({ numero_mesa: '045821', local_id: 4 });

      expect(res.status).toBe(403);
    });

    it('un personero NO puede asignar personeros', async () => {
      const res = await request(app)
        .post('/api/asignaciones/personeros').set(...auth(TOKEN_PERSONERO))
        .send({ usuario_id: 3, mesa_id: 9 });

      expect(res.status).toBe(403);
    });

    it('un personero NO puede verificar su propia acta', async () => {
      const res = await request(app)
        .put('/api/resultados/500/verificar').set(...auth(TOKEN_PERSONERO));

      expect(res.status).toBe(403);
    });

    it('un coordinador NO puede subir un acta (solo el personero de la mesa)', async () => {
      const res = await request(app)
        .post('/api/resultados').set(...auth(TOKEN_COORD))
        .field('mesa_id', '9');

      expect(res.status).toBe(403);
    });

    it('un admin NO puede usar /mi-mesa (es exclusivo de personeros)', async () => {
      const res = await request(app).get('/api/resultados/mi-mesa').set(...auth(TOKEN_ADMIN));

      expect(res.status).toBe(403);
    });

    it('un coordinador SI puede verificar actas', async () => {
      mockDb.queue('resultados_mesa', { id: 500, estado: 'pendiente', mesa_id: 9 });
      mockDb.queue('mesas_sufragio', { id: 9, local_id: 4, numero_mesa: '045821' });
      mockDb.queue('asignacion_coordinadores', { id: 30 });
      mockDb.queue('resultados_mesa', 1);
      mockDb.queue('mesas_sufragio', 1);

      const res = await request(app)
        .put('/api/resultados/500/verificar').set(...auth(TOKEN_COORD));

      expect(res.status).toBe(200);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('Rutas CRUD sobre HTTP', () => {
  it('GET /api/distritos devuelve la lista', async () => {
    mockDb.queue('distritos', [{ id: 1, nombre: 'Ayacucho' }]);

    const res = await request(app).get('/api/distritos').set(...auth(TOKEN_ADMIN));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /api/distritos/:id devuelve 404 si no existe', async () => {
    mockDb.queue('distritos', undefined);

    const res = await request(app).get('/api/distritos/99').set(...auth(TOKEN_ADMIN));

    expect(res.status).toBe(404);
  });

  it('GET /api/locales lista con el nombre del distrito', async () => {
    mockDb.queue('locales_votacion', [{ id: 4, distrito_nombre: 'Ayacucho' }]);

    const res = await request(app).get('/api/locales').set(...auth(TOKEN_ADMIN));

    expect(res.status).toBe(200);
  });

  it('GET /api/mesas devuelve meta de paginacion', async () => {
    mockDb.queue('mesas_sufragio', { total: '850' }, [{ id: 1 }]);

    const res = await request(app).get('/api/mesas?page=1&limit=50').set(...auth(TOKEN_ADMIN));

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(850);
  });

  it('GET /api/candidatos es accesible por un personero (los necesita para el acta)', async () => {
    mockDb.queue('candidatos', [{ id: 1, nombre_completo: 'Ana' }]);

    const res = await request(app).get('/api/candidatos').set(...auth(TOKEN_PERSONERO));

    expect(res.status).toBe(200);
  });

  it('GET /api/usuarios lo lista un admin', async () => {
    mockDb.queue('usuarios', { total: '3' }, [{ id: 1 }, { id: 2 }, { id: 3 }]);

    const res = await request(app).get('/api/usuarios').set(...auth(TOKEN_ADMIN));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
  });

  it('POST /api/usuarios valida el cuerpo antes de tocar la base', async () => {
    const res = await request(app)
      .post('/api/usuarios').set(...auth(TOKEN_ADMIN))
      .send({ dni: '123' }); // DNI corto, faltan campos

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/validaci/i);
    expect(mockDb.calls('usuarios').inserts).toHaveLength(0);
  });

  it('GET /api/asignaciones/historial lo consulta un admin', async () => {
    mockDb.queue('historial_asignaciones', [{ id: 1, tipo: 'personero' }]);

    const res = await request(app)
      .get('/api/asignaciones/historial').set(...auth(TOKEN_ADMIN));

    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('Flujo completo del acta sobre HTTP', () => {
  it('un personero consulta su mesa', async () => {
    mockDb.queue('asignacion_personeros', { id: 77, mesa_id: 9 });
    mockDb.queue('mesas_sufragio', { id: 9, local_id: 4, numero_mesa: '045821' });
    mockDb.queue('resultados_mesa', undefined);
    mockDb.queue('candidatos', [{ id: 1 }]);

    const res = await request(app).get('/api/resultados/mi-mesa').set(...auth(TOKEN_PERSONERO));

    expect(res.status).toBe(200);
    expect(res.body.data.mesa.numero_mesa).toBe('045821');
  });

  it('un personero sube el acta con foto (multipart)', async () => {
    mockDb.queue('asignacion_personeros', { id: 77, mesa_id: 9, activo: true });
    mockDb.queue('mesas_sufragio', { id: 9, numero_mesa: '045821', local_id: 4, estado: 'pendiente', total_electores_habiles: 300 });
    mockDb.queue('candidatos', [1, 2]);
    mockDb.queue('resultados_mesa', undefined);
    mockDb.queue('resultados_mesa', [{ id: 500 }]);
    mockDb.queue('detalle_resultados', 2);
    mockDb.queue('mesas_sufragio', 1);

    const res = await request(app)
      .post('/api/resultados').set(...auth(TOKEN_PERSONERO))
      .field('mesa_id', '9')
      .field('votos', JSON.stringify([
        { candidato_id: 1, votos: 50 }, { candidato_id: 2, votos: 30 },
      ]))
      .field('votos_blanco', '5')
      .field('votos_nulo', '3')
      .field('votos_impugnados', '2')
      .attach('foto_acta', Buffer.from('imagen-jpeg'), {
        filename: 'acta.jpg', contentType: 'image/jpeg',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.total_votos_emitidos).toBe(90);
  });

  it('rechaza un acta con un archivo que no es imagen', async () => {
    const res = await request(app)
      .post('/api/resultados').set(...auth(TOKEN_PERSONERO))
      .field('mesa_id', '9')
      .attach('foto_acta', Buffer.from('MZ ejecutable'), {
        filename: 'virus.exe', contentType: 'application/x-msdownload',
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(mockDb.calls('resultados_mesa').inserts).toHaveLength(0);
  });

  it('PUT /:id/observar valida que venga el motivo', async () => {
    const res = await request(app)
      .put('/api/resultados/500/observar').set(...auth(TOKEN_COORD))
      .send({});

    expect(res.status).toBe(400);
  });

  it('PUT /:id/observar marca el acta como observada', async () => {
    mockDb.queue('resultados_mesa', { id: 500, estado: 'pendiente', mesa_id: 9, personero_id: 3 });
    mockDb.queue('mesas_sufragio', { id: 9, local_id: 4, numero_mesa: '045821' });
    mockDb.queue('asignacion_coordinadores', { id: 30 });
    mockDb.queue('resultados_mesa', 1);
    mockDb.queue('mesas_sufragio', 1);

    const res = await request(app)
      .put('/api/resultados/500/observar').set(...auth(TOKEN_COORD))
      .send({ observaciones_coordinador: 'Los numeros no son legibles' });

    expect(res.status).toBe(200);
  });

  it('GET /api/resultados/local/:localId lo consulta un coordinador asignado', async () => {
    mockDb.queue('asignacion_coordinadores', { id: 30 });
    mockDb.queue('mesas_sufragio', [{ mesa_id: 1 }]);

    const res = await request(app)
      .get('/api/resultados/local/4').set(...auth(TOKEN_COORD));

    expect(res.status).toBe(200);
  });

  it('GET /api/resultados/local/:localId rechaza a un coordinador ajeno', async () => {
    mockDb.queue('asignacion_coordinadores', undefined);

    const res = await request(app)
      .get('/api/resultados/local/99').set(...auth(TOKEN_COORD));

    expect(res.status).toBe(403);
  });

  it('POST /api/resultados/confirmar-mesa registra la presencia', async () => {
    mockDb.queue('asignacion_personeros', { id: 77, mesa_id: 9 });
    mockDb.queue('mesas_sufragio', { id: 9, local_id: 4 });
    mockDb.queue('auditoria', 1);

    const res = await request(app)
      .post('/api/resultados/confirmar-mesa').set(...auth(TOKEN_PERSONERO))
      .send({ latitud: -13.1587, longitud: -74.2236 });

    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('Rate limiting', () => {
  it('bloquea el exceso de intentos de login con 429', async () => {
    mockDb.queue('usuarios', ...Array(40).fill(undefined));
    const limite = Number(process.env.RATE_LIMIT_AUTH);

    let bloqueado = null;
    for (let i = 0; i < limite + 6; i += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '203.0.113.77') // IP fija para acumular en el mismo cubo
        .send({ dni: '00000000', password: 'clave123' });
      if (res.status === 429) { bloqueado = res; break; }
    }

    expect(bloqueado).not.toBeNull();
    expect(bloqueado.body.message).toMatch(/demasiados intentos/i);
  }, 30000);
});
