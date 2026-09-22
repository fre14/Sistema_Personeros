import { jest } from '@jest/globals';

// ═══════════════════════════════════════════════════════════════════
// config/ — redis.js 17%, database.js 45%, storage.js 0%.
//
// Es codigo de arranque, y precisamente por eso importa: decide si el
// sistema sale a produccion con SSL, con el pool dimensionado para 850
// usuarios, y si sobrevive a un Redis caido. Un fallo aqui no se ve en
// desarrollo — se ve el dia de la eleccion.
//
// Los modulos leen process.env EN EL MOMENTO DE IMPORTARSE, asi que cada
// escenario se prueba con jest.isolateModulesAsync + un entorno propio.
// ═══════════════════════════════════════════════════════════════════

const entornoOriginal = { ...process.env };

/** Ejecuta fn con un entorno limpio + las variables indicadas. */
const conEntorno = async (vars, fn) => {
  process.env = { ...entornoOriginal, ...vars };
  try {
    return await fn();
  } finally {
    process.env = { ...entornoOriginal };
  }
};

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════
describe('config/storage.js — seleccion de driver', () => {
  const createClient = jest.fn(() => ({ __supabase: true }));

  const importarStorage = async (vars) => {
    let modulo;
    await conEntorno(vars, async () => {
      jest.resetModules();
      jest.unstable_mockModule('@supabase/supabase-js', () => ({ createClient }));
      jest.unstable_mockModule('dotenv', () => ({ default: { config: jest.fn() } }));
      modulo = await import('../../../src/config/storage.js');
    });
    return modulo;
  };

  it('usa el driver local por defecto (sin configuracion previa)', async () => {
    const { storageConfig, supabase } = await importarStorage({
      STORAGE_DRIVER: undefined, SUPABASE_URL: undefined, SUPABASE_SERVICE_KEY: undefined,
    });

    expect(storageConfig.driver).toBe('local');
    expect(supabase).toBeNull();
  });

  it('activa supabase cuando estan las dos credenciales', async () => {
    const { storageConfig, supabase, bucketName } = await importarStorage({
      STORAGE_DRIVER: 'supabase',
      SUPABASE_URL: 'https://proyecto.supabase.co',
      SUPABASE_SERVICE_KEY: 'clave-de-servicio',
    });

    expect(storageConfig.driver).toBe('supabase');
    expect(supabase).toEqual({ __supabase: true });
    expect(bucketName).toBe('actas-electorales');
    expect(createClient).toHaveBeenCalledWith('https://proyecto.supabase.co', 'clave-de-servicio');
  });

  it('CAE A LOCAL si falta SUPABASE_SERVICE_KEY en vez de romper la carga de actas', async () => {
    const avisos = [];
    const spy = jest.spyOn(console, 'warn').mockImplementation((m) => avisos.push(m));

    const { storageConfig, supabase } = await importarStorage({
      STORAGE_DRIVER: 'supabase',
      SUPABASE_URL: 'https://proyecto.supabase.co',
      SUPABASE_SERVICE_KEY: undefined,
    });

    expect(storageConfig.driver).toBe('local');
    expect(supabase).toBeNull();
    expect(avisos.join(' ')).toMatch(/faltan SUPABASE/i);
    spy.mockRestore();
  });

  it('CAE A LOCAL si falta SUPABASE_URL', async () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { storageConfig } = await importarStorage({
      STORAGE_DRIVER: 'supabase',
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_KEY: 'clave',
    });

    expect(storageConfig.driver).toBe('local');
    spy.mockRestore();
  });

  it('el nombre del driver no distingue mayusculas', async () => {
    const { storageConfig } = await importarStorage({
      STORAGE_DRIVER: 'SUPABASE',
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_SERVICE_KEY: 'k',
    });

    expect(storageConfig.driver).toBe('supabase');
  });

  it('un driver desconocido no activa supabase', async () => {
    const { storageConfig } = await importarStorage({ STORAGE_DRIVER: 's3' });

    expect(storageConfig.driver).toBe('local');
  });

  it('respeta el bucket configurado', async () => {
    const { bucketName } = await importarStorage({
      STORAGE_DRIVER: 'supabase',
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_SERVICE_KEY: 'k',
      SUPABASE_STORAGE_BUCKET: 'actas-erm-2026',
    });

    expect(bucketName).toBe('actas-erm-2026');
  });

  it('respeta la ruta local y la URL publica configuradas', async () => {
    const { storageConfig } = await importarStorage({
      STORAGE_LOCAL_PATH: '/datos/actas',
      STORAGE_PUBLIC_URL: 'https://cdn.elecciones.pe/actas',
    });

    expect(storageConfig.localPath).toBe('/datos/actas');
    expect(storageConfig.publicUrl).toBe('https://cdn.elecciones.pe/actas');
  });

  it('usa una ruta local por defecto acorde al sistema operativo', async () => {
    const { storageConfig } = await importarStorage({
      STORAGE_LOCAL_PATH: undefined, STORAGE_PUBLIC_URL: undefined,
    });

    const esperada = process.platform === 'win32' ? 'C:/app/uploads' : '/app/uploads';
    expect(storageConfig.localPath).toBe(esperada);
    expect(storageConfig.publicUrl).toBe('/actas');
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('config/database.js — conexion y pool', () => {
  const knexFake = jest.fn(() => ({
    client: { pool: { numUsed: () => 1, numFree: () => 2, numPendingAcquires: () => 0 } },
    destroy: jest.fn(),
  }));

  const importarDb = async (vars) => {
    let config;
    await conEntorno(vars, async () => {
      jest.resetModules();
      knexFake.mockClear();
      jest.unstable_mockModule('knex', () => ({ default: knexFake }));
      jest.unstable_mockModule('dotenv', () => ({ default: { config: jest.fn() } }));
      await import('../../../src/config/database.js');
      config = knexFake.mock.calls[0][0];
    });
    return config;
  };

  it('usa PostgreSQL con los valores por defecto de desarrollo', async () => {
    const config = await importarDb({
      DATABASE_URL: undefined, DB_HOST: undefined, NODE_ENV: 'test',
    });

    expect(config.client).toBe('pg');
    expect(config.connection.host).toBe('localhost');
    expect(config.connection.port).toBe(5432);
    expect(config.connection.database).toBe('sistema_electoral');
  });

  it('prefiere DATABASE_URL cuando esta definida', async () => {
    const config = await importarDb({
      DATABASE_URL: 'postgres://u:p@db.interno:5432/electoral', NODE_ENV: 'test',
    });

    expect(config.connection.connectionString).toBe('postgres://u:p@db.interno:5432/electoral');
    expect(config.connection.host).toBeUndefined();
  });

  it('dimensiona el pool para el pico de la jornada (max 40 por defecto)', async () => {
    const config = await importarDb({ NODE_ENV: 'test' });

    // El pool por defecto de knex es 2/10: insuficiente para 850 usuarios.
    expect(config.pool.min).toBe(5);
    expect(config.pool.max).toBe(40);
    expect(config.pool.max).toBeGreaterThanOrEqual(20);
  });

  it('permite ajustar el pool por variable de entorno sin tocar codigo', async () => {
    const config = await importarDb({
      DB_POOL_MIN: '10', DB_POOL_MAX: '80', DB_ACQUIRE_TIMEOUT: '20000', NODE_ENV: 'test',
    });

    expect(config.pool.min).toBe(10);
    expect(config.pool.max).toBe(80);
    expect(config.pool.acquireTimeoutMillis).toBe(20000);
    expect(config.acquireConnectionTimeout).toBe(20000);
  });

  it('no propaga el error de creacion de conexion (degrada en vez de tumbar)', async () => {
    const config = await importarDb({ NODE_ENV: 'test' });

    expect(config.pool.propagateCreateError).toBe(false);
  });

  it('etiqueta la conexion con el INSTANCE_ID para rastrear cual backend consulta', async () => {
    const config = await importarDb({ INSTANCE_ID: 'backend-3', NODE_ENV: 'test' });

    expect(config.connection.application_name).toBe('backend-3');
  });

  describe('deteccion de SSL', () => {
    it.each(['localhost', '127.0.0.1', 'postgres', 'pgbouncer'])(
      'NO exige SSL con una base local (%s)', async (host) => {
        const config = await importarDb({ DB_HOST: host, DB_SSL: undefined, NODE_ENV: 'test' });

        expect(config.connection.ssl).toBe(false);
      });

    it('exige SSL con una base remota', async () => {
      const config = await importarDb({
        DB_HOST: 'electoral.abc123.us-east-1.rds.amazonaws.com', DB_SSL: undefined, NODE_ENV: 'test',
      });

      expect(config.connection.ssl).toEqual({ rejectUnauthorized: false });
    });

    it('DB_SSL=false desactiva SSL aunque la base sea remota', async () => {
      const config = await importarDb({
        DB_HOST: 'db.remota.com', DB_SSL: 'false', NODE_ENV: 'test',
      });

      expect(config.connection.ssl).toBe(false);
    });

    it('DB_SSL=true fuerza SSL aunque la base sea local', async () => {
      const config = await importarDb({ DB_HOST: 'localhost', DB_SSL: 'true', NODE_ENV: 'test' });

      expect(config.connection.ssl).toEqual({ rejectUnauthorized: false });
    });

    it('sin host definido no exige SSL', async () => {
      const config = await importarDb({ DB_HOST: '', DB_SSL: undefined, NODE_ENV: 'test' });

      expect(config.connection.ssl).toBe(false);
    });

    // ── HALLAZGO ──────────────────────────────────────────────────
    // usaSSL() recibe la DATABASE_URL COMPLETA y la clasifica como local
    // si contiene la palabra "postgres". Pero TODA cadena de conexion de
    // PostgreSQL empieza por "postgres://", asi que la condicion siempre
    // se cumple y la autodeteccion NUNCA activa SSL por esta via.
    //
    // Consecuencia en produccion: si se despliega con DATABASE_URL contra
    // una base gestionada (RDS, Supabase, Neon) y NO se define DB_SSL=true
    // de forma explicita, el trafico con la base viaja sin cifrar.
    //
    // Estos dos tests fijan el comportamiento ACTUAL. Si se corrige el
    // defecto, fallaran, que es justo lo que se busca.
    it('[defecto] NO activa SSL con DATABASE_URL remota: "postgres://" la marca como local', async () => {
      const config = await importarDb({
        DATABASE_URL: 'postgres://u:p@electoral.rds.amazonaws.com:5432/db',
        DB_SSL: undefined, NODE_ENV: 'test',
      });

      expect(config.connection.ssl).toBe(false);
    });

    it('[mitigacion] con DATABASE_URL remota hay que exigir DB_SSL=true a mano', async () => {
      const config = await importarDb({
        DATABASE_URL: 'postgres://u:p@electoral.rds.amazonaws.com:5432/db',
        DB_SSL: 'true', NODE_ENV: 'test',
      });

      expect(config.connection.ssl).toEqual({ rejectUnauthorized: false });
    });

    it('DATABASE_URL apuntando a pgbouncer no exige SSL', async () => {
      const config = await importarDb({
        DATABASE_URL: 'postgres://u:p@pgbouncer:6432/db', DB_SSL: undefined, NODE_ENV: 'test',
      });

      expect(config.connection.ssl).toBe(false);
    });
  });

  it('en produccion instala el vigilante de saturacion del pool', async () => {
    const spy = jest.spyOn(global, 'setInterval');

    await importarDb({ NODE_ENV: 'production' });

    expect(spy).toHaveBeenCalledWith(expect.any(Function), 15000);
    spy.mockRestore();
  });

  it('avisa cuando hay peticiones esperando conexion', async () => {
    const avisos = [];
    jest.spyOn(console, 'warn').mockImplementation((m) => avisos.push(m));
    let tarea;
    jest.spyOn(global, 'setInterval').mockImplementation((fn) => {
      tarea = fn;
      return { unref: () => {} };
    });
    knexFake.mockReturnValueOnce({
      client: { pool: { numUsed: () => 40, numFree: () => 0, numPendingAcquires: () => 12 } },
    });

    await importarDb({ NODE_ENV: 'production' });
    tarea();

    expect(avisos.join(' ')).toMatch(/pool saturado/i);
    jest.restoreAllMocks();
  });

  it('no avisa cuando el pool esta holgado', async () => {
    const avisos = [];
    jest.spyOn(console, 'warn').mockImplementation((m) => avisos.push(m));
    let tarea;
    jest.spyOn(global, 'setInterval').mockImplementation((fn) => {
      tarea = fn;
      return { unref: () => {} };
    });

    await importarDb({ NODE_ENV: 'production' });
    tarea();

    expect(avisos.join(' ')).not.toMatch(/pool saturado/i);
    jest.restoreAllMocks();
  });

  it('el vigilante no falla si el pool aun no existe', async () => {
    let tarea;
    jest.spyOn(global, 'setInterval').mockImplementation((fn) => {
      tarea = fn;
      return { unref: () => {} };
    });
    knexFake.mockReturnValueOnce({ client: {} });

    await importarDb({ NODE_ENV: 'production' });

    expect(() => tarea()).not.toThrow();
    jest.restoreAllMocks();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('config/redis.js — ciclo de vida y modo degradado', () => {
  const crearClienteFake = ({ fallaConexion = false, cuelga = false } = {}) => {
    const manejadores = new Map();
    return {
      __manejadores: manejadores,
      on: jest.fn(function (evento, fn) { manejadores.set(evento, fn); return this; }),
      connect: jest.fn(() => {
        if (fallaConexion) return Promise.reject(new Error('ECONNREFUSED'));
        if (cuelga) return new Promise(() => {}); // nunca resuelve
        return Promise.resolve();
      }),
      disconnect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      emitir: (evento, ...args) => manejadores.get(evento)?.(...args),
    };
  };

  const importarRedis = async (vars, cliente) => {
    let modulo;
    await conEntorno(vars, async () => {
      jest.resetModules();
      jest.unstable_mockModule('redis', () => ({ createClient: jest.fn(() => cliente) }));
      modulo = await import('../../../src/config/redis.js');
    });
    return modulo;
  };

  const silenciar = () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  };

  it('no arranca si REDIS_ENABLED=false', async () => {
    silenciar();
    const cliente = crearClienteFake();
    const { initRedis, getRedis } = await importarRedis({ REDIS_ENABLED: 'false' }, cliente);

    await expect(initRedis()).resolves.toBeNull();

    expect(cliente.connect).not.toHaveBeenCalled();
    expect(getRedis()).toBeNull();
    jest.restoreAllMocks();
  });

  it('conecta y queda listo tras el evento ready', async () => {
    silenciar();
    const cliente = crearClienteFake();
    const { initRedis, getRedis, isRedisReady } = await importarRedis({}, cliente);

    await initRedis();
    cliente.emitir('ready');

    expect(isRedisReady()).toBe(true);
    expect(getRedis()).toBe(cliente);
    jest.restoreAllMocks();
  });

  it('getRedis devuelve null mientras no llegue el evento ready', async () => {
    silenciar();
    const cliente = crearClienteFake();
    const { initRedis, getRedis } = await importarRedis({}, cliente);

    await initRedis();

    expect(getRedis()).toBeNull();
    jest.restoreAllMocks();
  });

  it('el evento end marca el cliente como no listo', async () => {
    silenciar();
    const cliente = crearClienteFake();
    const { initRedis, getRedis } = await importarRedis({}, cliente);

    await initRedis();
    cliente.emitir('ready');
    cliente.emitir('end');

    expect(getRedis()).toBeNull();
    jest.restoreAllMocks();
  });

  it('SIGUE FUNCIONANDO si Redis rechaza la conexion (modo degradado)', async () => {
    silenciar();
    const cliente = crearClienteFake({ fallaConexion: true });
    const { initRedis, getRedis, isRedisReady } = await importarRedis({}, cliente);

    await expect(initRedis()).resolves.toBeNull();

    expect(cliente.disconnect).toHaveBeenCalled();
    expect(getRedis()).toBeNull();
    expect(isRedisReady()).toBe(false);
    jest.restoreAllMocks();
  });

  it('no se queda colgado indefinidamente esperando a Redis', async () => {
    silenciar();
    jest.useFakeTimers();
    const cliente = crearClienteFake({ cuelga: true });
    const { initRedis } = await importarRedis({}, cliente);

    const promesa = initRedis();
    await jest.advanceTimersByTimeAsync(2500);

    await expect(promesa).resolves.toBeNull();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('el manejador de error no ruidea antes de estar listo', async () => {
    const errores = [];
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation((m) => errores.push(m));
    const cliente = crearClienteFake();
    const { initRedis } = await importarRedis({}, cliente);

    await initRedis();
    cliente.emitir('error', new Error('reintentando'));

    expect(errores).toHaveLength(0);
    jest.restoreAllMocks();
  });

  it('el manejador de error si reporta una caida posterior', async () => {
    const errores = [];
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation((m) => errores.push(m));
    const cliente = crearClienteFake();
    const { initRedis } = await importarRedis({}, cliente);

    await initRedis();
    cliente.emitir('ready');
    cliente.emitir('error', new Error('conexion perdida'));

    expect(errores.join(' ')).toMatch(/redis error/i);
    jest.restoreAllMocks();
  });

  it('closeRedis cierra y limpia el estado', async () => {
    silenciar();
    const cliente = crearClienteFake();
    const { initRedis, closeRedis, getRedis } = await importarRedis({}, cliente);

    await initRedis();
    cliente.emitir('ready');
    await closeRedis();

    expect(cliente.quit).toHaveBeenCalled();
    expect(getRedis()).toBeNull();
    jest.restoreAllMocks();
  });

  it('closeRedis no falla si el cliente ya estaba cerrado', async () => {
    silenciar();
    const cliente = crearClienteFake();
    cliente.quit.mockRejectedValue(new Error('ya cerrado'));
    const { initRedis, closeRedis } = await importarRedis({}, cliente);

    await initRedis();

    await expect(closeRedis()).resolves.toBeUndefined();
    jest.restoreAllMocks();
  });

  it('closeRedis sin cliente iniciado es inocuo', async () => {
    silenciar();
    const { closeRedis } = await importarRedis({}, crearClienteFake());

    await expect(closeRedis()).resolves.toBeUndefined();
    jest.restoreAllMocks();
  });

  describe('construccion de la URL', () => {
    const urlUsada = async (vars) => {
      let url;
      await conEntorno(vars, async () => {
        jest.resetModules();
        const createClient = jest.fn(() => crearClienteFake());
        jest.unstable_mockModule('redis', () => ({ createClient }));
        const { initRedis } = await import('../../../src/config/redis.js');
        silenciar();
        await initRedis();
        url = createClient.mock.calls[0][0].url;
        jest.restoreAllMocks();
      });
      return url;
    };

    it('usa REDIS_URL cuando esta definida', async () => {
      const url = await urlUsada({ REDIS_URL: 'redis://cache.interno:6379/0' });

      expect(url).toBe('redis://cache.interno:6379/0');
    });

    it('arma la URL desde host y puerto sin contrasena', async () => {
      const url = await urlUsada({
        REDIS_URL: undefined, REDIS_HOST: 'cache', REDIS_PORT: '6380', REDIS_PASSWORD: undefined,
      });

      expect(url).toBe('redis://cache:6380');
    });

    it('incluye la contrasena escapada (soporta caracteres especiales)', async () => {
      const url = await urlUsada({
        REDIS_URL: undefined, REDIS_HOST: 'cache', REDIS_PORT: '6379',
        REDIS_PASSWORD: 'p@ss:w/rd',
      });

      expect(url).toBe('redis://:p%40ss%3Aw%2Frd@cache:6379');
    });

    it('cae a 127.0.0.1:6379 sin configuracion', async () => {
      const url = await urlUsada({
        REDIS_URL: undefined, REDIS_HOST: undefined,
        REDIS_PORT: undefined, REDIS_PASSWORD: undefined,
      });

      expect(url).toBe('redis://127.0.0.1:6379');
    });
  });

  it('reintenta con backoff acotado a 3 segundos', async () => {
    silenciar();
    let opciones;
    await conEntorno({}, async () => {
      jest.resetModules();
      const createClient = jest.fn((o) => { opciones = o; return crearClienteFake(); });
      jest.unstable_mockModule('redis', () => ({ createClient }));
      const { initRedis } = await import('../../../src/config/redis.js');
      await initRedis();
    });

    const estrategia = opciones.socket.reconnectStrategy;
    expect(estrategia(1)).toBe(100);
    expect(estrategia(10)).toBe(1000);
    expect(estrategia(500)).toBe(3000); // tope
    jest.restoreAllMocks();
  });
});
