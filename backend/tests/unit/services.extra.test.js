import { jest } from '@jest/globals';
import { createDbMock, silenciarConsola } from '../support/knex-mock.js';

// ═══════════════════════════════════════════════════════════════════
// Servicios que estaban sin cubrir o cubiertos a medias:
//
//  - cache.service.js        0%  -> el cache del dashboard es lo que evita
//                                   que 100 pantallas tumben PostgreSQL.
//  - storage.service.js      solo la rama Supabase. El driver por DEFECTO
//                            es 'local' y no tenia ni un test.
//  - auditoria.service.js    solo la firma con objeto; la firma POSICIONAL
//                            es la que usan 5 controladores.
//  - websocket.service.js    15% -> notificaciones y estadisticas.
// ═══════════════════════════════════════════════════════════════════

const mockDb = createDbMock();

// ── Redis simulado ────────────────────────────────────────────────
const redisFake = {
  get: jest.fn(),
  setEx: jest.fn(),
  scan: jest.fn(),
  del: jest.fn(),
  duplicate: jest.fn(),
};
let redisDisponible = true;
const getRedis = jest.fn(() => (redisDisponible ? redisFake : null));

// ── Supabase simulado ─────────────────────────────────────────────
const supaUpload = jest.fn();
const supaSignedUrl = jest.fn();
const supaRemove = jest.fn();
const supabaseFake = {
  storage: {
    from: jest.fn(() => ({
      upload: supaUpload,
      createSignedUrl: supaSignedUrl,
      remove: supaRemove,
    })),
  },
};

// storageConfig es mutable en los tests para ejercer ambos drivers.
// El binding `supabase` NO puede ser dinamico: los mocks ESM de Jest
// materializan el namespace una sola vez, asi que se exporta siempre el
// doble y es storageConfig.driver quien decide la rama.
const storageConfig = { driver: 'local', localPath: '/tmp/actas-test', publicUrl: '/actas' };

// ── fs/promises simulado ──────────────────────────────────────────
const fsMkdir = jest.fn().mockResolvedValue(undefined);
const fsWriteFile = jest.fn().mockResolvedValue(undefined);
const fsUnlink = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../../src/config/database.js', () => ({ default: mockDb.db }));
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  getRedis, initRedis: jest.fn(), isRedisReady: jest.fn(), closeRedis: jest.fn(),
}));
jest.unstable_mockModule('../../src/config/storage.js', () => ({
  supabase: supabaseFake,
  bucketName: 'actas-electorales',
  storageConfig,
}));
jest.unstable_mockModule('fs/promises', () => ({
  default: { mkdir: fsMkdir, writeFile: fsWriteFile, unlink: fsUnlink },
  mkdir: fsMkdir, writeFile: fsWriteFile, unlink: fsUnlink,
}));
jest.unstable_mockModule('uuid', () => ({ v4: jest.fn(() => 'aaaa-bbbb-cccc') }));
jest.unstable_mockModule('socket.io', () => ({ Server: jest.fn() }));
jest.unstable_mockModule('@socket.io/redis-adapter', () => ({ createAdapter: jest.fn() }));
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { verify: jest.fn(), sign: jest.fn() },
  verify: jest.fn(), sign: jest.fn(),
}));
jest.unstable_mockModule('../../src/config/auth.js', () => ({ authConfig: { secret: 's' } }));

const { cacheGet, cacheSet, cacheWrap, invalidateDashboard } =
  await import('../../src/services/cache.service.js');
const { uploadActaImage, getActaUrl, deleteActaImage } =
  await import('../../src/services/storage.service.js');
const { registrarAuditoria } = await import('../../src/services/auditoria.service.js');
const { notifyCoordinator, notifyAdmin, notifyPersonero, getIo, getWsStats } =
  await import('../../src/services/websocket.service.js');

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.reset();
  redisDisponible = true;
  storageConfig.driver = 'local';
  storageConfig.localPath = '/tmp/actas-test';
  storageConfig.publicUrl = '/actas';
});

// ═══════════════════════════════════════════════════════════════════
describe('cache.service', () => {
  describe('cacheGet', () => {
    it('devuelve null si Redis no esta disponible (modo degradado)', async () => {
      redisDisponible = false;

      await expect(cacheGet('dashboard:resumen')).resolves.toBeNull();
      expect(redisFake.get).not.toHaveBeenCalled();
    });

    it('devuelve null si la clave no existe', async () => {
      redisFake.get.mockResolvedValue(null);

      await expect(cacheGet('dashboard:resumen')).resolves.toBeNull();
    });

    it('deserializa el valor cacheado y aplica el prefijo', async () => {
      redisFake.get.mockResolvedValue(JSON.stringify({ mesas: 850 }));

      const valor = await cacheGet('dashboard:resumen');

      expect(redisFake.get).toHaveBeenCalledWith('cache:dashboard:resumen');
      expect(valor).toEqual({ mesas: 850 });
    });

    it('devuelve null (sin lanzar) si el JSON almacenado esta corrupto', async () => {
      redisFake.get.mockResolvedValue('{corrupto');

      await expect(cacheGet('k')).resolves.toBeNull();
    });

    it('devuelve null (sin lanzar) si Redis falla en plena jornada', async () => {
      redisFake.get.mockRejectedValue(new Error('READONLY'));

      await expect(cacheGet('k')).resolves.toBeNull();
    });
  });

  describe('cacheSet', () => {
    it('no hace nada si Redis no esta disponible', async () => {
      redisDisponible = false;

      await cacheSet('k', { a: 1 });

      expect(redisFake.setEx).not.toHaveBeenCalled();
    });

    it('serializa y aplica el TTL por defecto de 5s', async () => {
      await cacheSet('dashboard:resumen', { mesas: 850 });

      expect(redisFake.setEx).toHaveBeenCalledWith(
        'cache:dashboard:resumen', 5, JSON.stringify({ mesas: 850 }),
      );
    });

    it('respeta un TTL explicito', async () => {
      await cacheSet('k', 'v', 60);

      expect(redisFake.setEx).toHaveBeenCalledWith('cache:k', 60, '"v"');
    });

    it('un fallo de escritura no propaga error al controlador', async () => {
      redisFake.setEx.mockRejectedValue(new Error('OOM'));

      await expect(cacheSet('k', 'v')).resolves.toBeUndefined();
    });
  });

  describe('cacheWrap', () => {
    it('devuelve el valor cacheado sin ejecutar la consulta (evita golpear PostgreSQL)', async () => {
      redisFake.get.mockResolvedValue(JSON.stringify({ total: 42 }));
      const consulta = jest.fn();

      const valor = await cacheWrap('dashboard:x', 5, consulta);

      expect(consulta).not.toHaveBeenCalled();
      expect(valor).toEqual({ total: 42 });
    });

    it('ejecuta la consulta y cachea el resultado si no hay hit', async () => {
      redisFake.get.mockResolvedValue(null);
      const consulta = jest.fn().mockResolvedValue({ total: 7 });

      const valor = await cacheWrap('dashboard:x', 10, consulta);

      expect(consulta).toHaveBeenCalledTimes(1);
      expect(valor).toEqual({ total: 7 });
      expect(redisFake.setEx).toHaveBeenCalledWith('cache:dashboard:x', 10, '{"total":7}');
    });

    it('sin Redis ejecuta siempre la consulta (el sistema sigue funcionando)', async () => {
      redisDisponible = false;
      const consulta = jest.fn().mockResolvedValue('dato');

      await expect(cacheWrap('k', 5, consulta)).resolves.toBe('dato');
      expect(consulta).toHaveBeenCalled();
    });

    it('un valor cacheado "false" cuenta como hit valido (no null)', async () => {
      redisFake.get.mockResolvedValue('false');
      const consulta = jest.fn();

      const valor = await cacheWrap('k', 5, consulta);

      expect(valor).toBe(false);
      expect(consulta).not.toHaveBeenCalled();
    });
  });

  describe('invalidateDashboard', () => {
    it('no hace nada sin Redis', async () => {
      redisDisponible = false;

      await invalidateDashboard();

      expect(redisFake.scan).not.toHaveBeenCalled();
    });

    it('recorre el cursor hasta agotarlo y borra las claves del dashboard', async () => {
      redisFake.scan
        .mockResolvedValueOnce({ cursor: '17', keys: ['cache:dashboard:a'] })
        .mockResolvedValueOnce({ cursor: '0', keys: ['cache:dashboard:b'] });

      await invalidateDashboard();

      expect(redisFake.scan).toHaveBeenCalledTimes(2);
      expect(redisFake.del).toHaveBeenCalledWith(['cache:dashboard:a']);
      expect(redisFake.del).toHaveBeenCalledWith(['cache:dashboard:b']);
    });

    it('no llama a del si el scan no devuelve claves', async () => {
      redisFake.scan.mockResolvedValue({ cursor: '0', keys: [] });

      await invalidateDashboard();

      expect(redisFake.del).not.toHaveBeenCalled();
    });

    it('usa el patron correcto y no borra otras claves del sistema', async () => {
      redisFake.scan.mockResolvedValue({ cursor: '0', keys: [] });

      await invalidateDashboard();

      expect(redisFake.scan).toHaveBeenCalledWith(
        '0', expect.objectContaining({ MATCH: 'cache:dashboard:*' }),
      );
    });

    it('un fallo de invalidacion no bloquea la peticion en curso', async () => {
      redisFake.scan.mockRejectedValue(new Error('timeout'));

      await expect(invalidateDashboard()).resolves.toBeUndefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('storage.service — driver local (el valor por defecto)', () => {
  it('crea la carpeta de la mesa y escribe el archivo', async () => {
    const ruta = await uploadActaImage(Buffer.from('jpeg'), 'image/jpeg', '045821');

    expect(fsMkdir).toHaveBeenCalledWith(
      expect.stringContaining('045821'), { recursive: true },
    );
    expect(fsWriteFile).toHaveBeenCalled();
    expect(ruta).toMatch(/^actas\/045821\/\d+-aaaa-bbbb-cccc\.jpg$/);
  });

  it('usa extension png cuando el mimetype es png', async () => {
    const ruta = await uploadActaImage(Buffer.from('png'), 'image/png', '045821');

    expect(ruta).toMatch(/\.png$/);
  });

  it('trata cualquier otro mimetype como jpg', async () => {
    const ruta = await uploadActaImage(Buffer.from('x'), 'image/jpg', '1');

    expect(ruta).toMatch(/\.jpg$/);
  });

  it('propaga el error si el disco esta lleno', async () => {
    fsWriteFile.mockRejectedValueOnce(new Error('ENOSPC: no space left on device'));

    await expect(uploadActaImage(Buffer.from('x'), 'image/jpeg', '1'))
      .rejects.toThrow(/ENOSPC/);
  });

  it('getActaUrl construye la URL publica servida por Nginx', async () => {
    const url = await getActaUrl('actas/045821/foto.jpg');

    expect(url).toBe('/actas/045821/foto.jpg');
  });

  it('getActaUrl respeta un publicUrl configurado con barra final', async () => {
    storageConfig.publicUrl = 'https://cdn.ejemplo.pe/actas/';

    const url = await getActaUrl('actas/045821/foto.jpg');

    expect(url).toBe('https://cdn.ejemplo.pe/actas/045821/foto.jpg');
  });

  it('getActaUrl devuelve tal cual una URL absoluta ya almacenada', async () => {
    const url = await getActaUrl('https://s3.amazonaws.com/bucket/foto.jpg');

    expect(url).toBe('https://s3.amazonaws.com/bucket/foto.jpg');
  });

  it('getActaUrl devuelve null si no hay ruta', async () => {
    await expect(getActaUrl(null)).resolves.toBeNull();
    await expect(getActaUrl('')).resolves.toBeNull();
  });

  it('deleteActaImage borra del disco', async () => {
    await deleteActaImage('actas/045821/foto.jpg');

    const llamado = fsUnlink.mock.calls[0]?.[0] || '';
    expect(llamado.replace(/\\/g, '/')).toContain('actas/045821/foto.jpg');
  });

  it('deleteActaImage no falla si el archivo ya no existe', async () => {
    fsUnlink.mockRejectedValueOnce(new Error('ENOENT'));

    await expect(deleteActaImage('actas/x.jpg')).resolves.toBeUndefined();
  });

  it('deleteActaImage ignora ruta vacia', async () => {
    await deleteActaImage(null);

    expect(fsUnlink).not.toHaveBeenCalled();
  });
});

describe('storage.service — driver supabase', () => {
  beforeEach(() => {
    storageConfig.driver = 'supabase';
  });

  it('sube al bucket configurado sin permitir sobrescritura', async () => {
    supaUpload.mockResolvedValue({ error: null });

    const ruta = await uploadActaImage(Buffer.from('x'), 'image/jpeg', '045821');

    expect(supabaseFake.storage.from).toHaveBeenCalledWith('actas-electorales');
    expect(supaUpload).toHaveBeenCalledWith(
      ruta, expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/jpeg', upsert: false }),
    );
    expect(fsWriteFile).not.toHaveBeenCalled();
  });

  it('lanza error descriptivo si la subida falla', async () => {
    supaUpload.mockResolvedValue({ error: { message: 'bucket lleno' } });

    await expect(uploadActaImage(Buffer.from('x'), 'image/jpeg', '1'))
      .rejects.toThrow(/bucket lleno/);
  });

  it('genera URL firmada con vigencia de 1 hora', async () => {
    supaSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://firmada' }, error: null });

    const url = await getActaUrl('actas/x.jpg');

    expect(supaSignedUrl).toHaveBeenCalledWith('actas/x.jpg', 3600);
    expect(url).toBe('https://firmada');
  });

  it('devuelve null si no se pudo firmar la URL', async () => {
    const consola = silenciarConsola();
    supaSignedUrl.mockResolvedValue({ data: null, error: { message: 'expirado' } });

    await expect(getActaUrl('actas/x.jpg')).resolves.toBeNull();

    expect(consola).toHaveBeenCalled();
    consola.mockRestore();
  });

  it('elimina del bucket', async () => {
    supaRemove.mockResolvedValue({ error: null });

    await deleteActaImage('actas/x.jpg');

    expect(supaRemove).toHaveBeenCalledWith(['actas/x.jpg']);
  });

  it('registra pero no lanza si falla el borrado remoto', async () => {
    const consola = silenciarConsola();
    supaRemove.mockResolvedValue({ error: { message: 'no encontrado' } });

    await expect(deleteActaImage('actas/x.jpg')).resolves.toBeUndefined();

    expect(consola).toHaveBeenCalled();
    consola.mockRestore();
  });

});

// ═══════════════════════════════════════════════════════════════════
describe('auditoria.service — firma posicional (la que usan los CRUD)', () => {
  it('mapea (tabla, accion, usuarioId, datosNuevos) correctamente', async () => {
    await registrarAuditoria('usuarios', 'create', 7, { id: 10, dni: '1' }, { dni: '1' });

    expect(mockDb.calls('auditoria').inserts[0]).toMatchObject({
      tabla_afectada: 'usuarios',
      accion: 'INSERT',
      usuario_id: 7,
      registro_id: 10,
    });
  });

  it.each([
    ['create', 'INSERT'],
    ['CREATE', 'INSERT'],
    ['insert', 'INSERT'],
    ['POST', 'INSERT'],
    ['update', 'UPDATE'],
    ['PUT', 'UPDATE'],
    ['delete', 'DELETE'],
    ['remove', 'DELETE'],
    [undefined, 'UPDATE'],
  ])('normaliza la accion "%s" al enum %s', async (entrada, esperado) => {
    await registrarAuditoria('t', entrada, 1, { id: 1 });

    expect(mockDb.calls('auditoria').inserts[0].accion).toBe(esperado);
  });

  it('no inserta nada si falta el nombre de la tabla', async () => {
    await registrarAuditoria(undefined, 'create', 1, {});

    expect(mockDb.calls('auditoria').inserts).toHaveLength(0);
  });

  it('registro_id cae a 0 cuando no se puede determinar', async () => {
    await registrarAuditoria('t', 'update', 1, { sinId: true });

    expect(mockDb.calls('auditoria').inserts[0].registro_id).toBe(0);
  });

  it('usuario_id null si el actor no es numerico', async () => {
    await registrarAuditoria('t', 'update', 'anonimo', { id: 1 });

    expect(mockDb.calls('auditoria').inserts[0].usuario_id).toBeNull();
  });

  it('no re-serializa un payload que ya viene como cadena', async () => {
    await registrarAuditoria({
      tabla: 't', accion: 'UPDATE', registroId: 1,
      datosNuevos: '{"ya":"serializado"}',
    });

    expect(mockDb.calls('auditoria').inserts[0].datos_nuevos).toBe('{"ya":"serializado"}');
  });

  it('un fallo de auditoria nunca tumba la operacion de negocio', async () => {
    const consola = silenciarConsola();
    mockDb.queueError('auditoria', new Error('tabla bloqueada'));

    await expect(registrarAuditoria({ tabla: 't', accion: 'UPDATE' })).resolves.toBeUndefined();

    expect(consola).toHaveBeenCalled();
    consola.mockRestore();
  });

  it('IP por defecto 127.0.0.1 cuando no se informa', async () => {
    await registrarAuditoria({ tabla: 't', accion: 'UPDATE', registroId: 1 });

    expect(mockDb.calls('auditoria').inserts[0].ip_address).toBe('127.0.0.1');
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('websocket.service — notificaciones sin servidor iniciado', () => {
  it('getIo devuelve null antes de setupWebSocket', () => {
    expect(getIo()).toBeFalsy();
  });

  it.each([
    ['notifyCoordinator', () => notifyCoordinator(4, 'evento', {})],
    ['notifyAdmin', () => notifyAdmin('evento', {})],
    ['notifyPersonero', () => notifyPersonero(3, 'evento', {})],
  ])('%s no lanza si io aun no existe (arranque o caida)', (_nombre, fn) => {
    expect(fn).not.toThrow();
  });

  it('notifyCoordinator ignora un localId nulo (mesa sin local)', () => {
    expect(() => notifyCoordinator(null, 'evento', {})).not.toThrow();
  });

  it('notifyPersonero ignora un userId nulo (acta sin personero)', () => {
    expect(() => notifyPersonero(null, 'evento', {})).not.toThrow();
  });

  it('getWsStats reporta cero conectados y adapter inactivo sin servidor', async () => {
    await expect(getWsStats()).resolves.toEqual({ conectados: 0, adapterRedis: false });
  });
});
