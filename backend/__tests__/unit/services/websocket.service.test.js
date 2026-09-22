import { jest } from '@jest/globals';
import { createDbMock, silenciarConsola } from '../../setup/knex-mock.js';

// ═══════════════════════════════════════════════════════════════════
// setupWebSocket — 100+ lineas sin cubrir.
//
// Por que importa con 850 usuarios: sin el adapter de Redis, una
// notificacion emitida por backend-1 no llega a los personeros conectados
// a backend-2. Con 4 instancias detras del balanceador, 3 de cada 4
// usuarios se quedarian sin ver la actualizacion de su acta.
// ═══════════════════════════════════════════════════════════════════

const mockDb = createDbMock();

// ── Doble de Socket.io ────────────────────────────────────────────
const middlewares = [];
const manejadores = new Map();
let socketsEnSala = [];

const ioFake = {
  use: jest.fn((fn) => middlewares.push(fn)),
  on: jest.fn((evento, fn) => manejadores.set(evento, fn)),
  adapter: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() })),
  in: jest.fn(() => ({ fetchSockets: jest.fn(async () => socketsEnSala) })),
  fetchSockets: jest.fn(async () => socketsEnSala),
  engine: { clientsCount: 0 },
};

const ServerFake = jest.fn(() => ioFake);
const createAdapter = jest.fn(() => ({ __adapter: true }));

// ── Redis ─────────────────────────────────────────────────────────
let redisDisponible = true;
let duplicarFalla = false;
const clienteDuplicado = () => ({
  connect: jest.fn(async () => {
    if (duplicarFalla) throw new Error('ECONNREFUSED');
  }),
});
const redisFake = { duplicate: jest.fn(clienteDuplicado) };
const getRedis = jest.fn(() => (redisDisponible ? redisFake : null));

const jwtVerify = jest.fn();

jest.unstable_mockModule('socket.io', () => ({ Server: ServerFake }));
jest.unstable_mockModule('@socket.io/redis-adapter', () => ({ createAdapter }));
jest.unstable_mockModule('../../../src/config/redis.js', () => ({
  getRedis, initRedis: jest.fn(), isRedisReady: jest.fn(), closeRedis: jest.fn(),
}));
jest.unstable_mockModule('../../../src/config/database.js', () => ({ default: mockDb.db }));
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { verify: jwtVerify, sign: jest.fn() },
  verify: jwtVerify, sign: jest.fn(),
}));
jest.unstable_mockModule('../../../src/config/auth.js', () => ({
  authConfig: { secret: 'secreto-de-prueba' },
}));

const { setupWebSocket, notifyCoordinator, notifyAdmin, notifyPersonero, getWsStats } =
  await import('../../../src/services/websocket.service.js');

/** Crea un socket simulado con handlers registrables. */
const crearSocket = (user, auth = {}) => {
  const eventos = new Map();
  return {
    user,
    handshake: { auth, headers: {} },
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn((evento, fn) => eventos.set(evento, fn)),
    emitir: (evento, ...args) => eventos.get(evento)?.(...args),
    tieneManejador: (evento) => eventos.has(evento),
  };
};

let consola;
beforeEach(() => {
  jest.clearAllMocks();
  mockDb.reset();
  middlewares.length = 0;
  manejadores.clear();
  socketsEnSala = [];
  redisDisponible = true;
  duplicarFalla = false;
  consola = silenciarConsola();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

// ═══════════════════════════════════════════════════════════════════
describe('setupWebSocket — configuracion del servidor', () => {
  it('configura transports, heartbeat y recuperacion de estado', async () => {
    await setupWebSocket({}, ['https://elecciones.pe']);

    const opciones = ServerFake.mock.calls[0][1];
    expect(opciones.transports).toEqual(['websocket', 'polling']);
    expect(opciones.pingInterval).toBe(25000);
    expect(opciones.pingTimeout).toBe(60000);
    expect(opciones.connectionStateRecovery.maxDisconnectionDuration).toBe(120000);
  });

  it('limita el tamano de mensaje a 1 MB (evita abuso del canal)', async () => {
    await setupWebSocket({}, []);

    expect(ServerFake.mock.calls[0][1].maxHttpBufferSize).toBe(1e6);
  });

  describe('politica CORS', () => {
    const ejecutarOrigen = async (origen, permitidos) => {
      await setupWebSocket({}, permitidos);
      const { origin } = ServerFake.mock.calls[0][1].cors;
      const cb = jest.fn();
      origin(origen, cb);
      return cb;
    };

    it('acepta peticiones sin Origin (apps moviles nativas)', async () => {
      const cb = await ejecutarOrigen(undefined, ['https://elecciones.pe']);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('acepta un origen de la lista blanca', async () => {
      const cb = await ejecutarOrigen('https://elecciones.pe', ['https://elecciones.pe']);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('acepta cualquier origen si se configuro comodin', async () => {
      const cb = await ejecutarOrigen('https://cualquiera.com', ['*']);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('RECHAZA un origen no autorizado', async () => {
      const cb = await ejecutarOrigen('https://sitio-falso.com', ['https://elecciones.pe']);
      expect(cb).toHaveBeenCalledWith(expect.any(Error));
      expect(cb.mock.calls[0][0].message).toMatch(/no permitido/i);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('setupWebSocket — adapter Redis (multi-instancia)', () => {
  it('activa el adapter duplicando el cliente para pub y sub', async () => {
    await setupWebSocket({}, []);

    expect(redisFake.duplicate).toHaveBeenCalledTimes(2);
    expect(createAdapter).toHaveBeenCalled();
    expect(ioFake.adapter).toHaveBeenCalledWith({ __adapter: true });
  });

  it('reporta adapterRedis=true en las estadisticas', async () => {
    await setupWebSocket({}, []);

    await expect(getWsStats()).resolves.toMatchObject({ adapterRedis: true });
  });

  it('sigue funcionando en modo local si Redis no esta disponible', async () => {
    redisDisponible = false;

    await expect(setupWebSocket({}, [])).resolves.toBe(ioFake);

    expect(ioFake.adapter).not.toHaveBeenCalled();
  });

  it('no tumba el arranque si falla la conexion del adapter', async () => {
    duplicarFalla = true;

    await expect(setupWebSocket({}, [])).resolves.toBe(ioFake);

    expect(consola).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('setupWebSocket — autenticacion del socket', () => {
  const autenticar = async (handshakeAuth, headers = {}) => {
    await setupWebSocket({}, []);
    const middleware = middlewares[0];
    const socket = { handshake: { auth: handshakeAuth, headers } };
    const next = jest.fn();
    middleware(socket, next);
    return { socket, next };
  };

  it('rechaza un socket sin token', async () => {
    const { next } = await autenticar({});

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toMatch(/falta token/i);
  });

  it('rechaza un token invalido o expirado', async () => {
    jwtVerify.mockImplementation(() => { throw new Error('jwt expired'); });

    const { next } = await autenticar({ token: 'caducado' });

    expect(next.mock.calls[0][0].message).toMatch(/invalido o expirado/i);
  });

  it('acepta un token valido y adjunta el usuario al socket', async () => {
    jwtVerify.mockReturnValue({ id: 3, rol: 'personero' });

    const { socket, next } = await autenticar({ token: 'valido' });

    expect(socket.user).toEqual({ id: 3, rol: 'personero' });
    expect(next).toHaveBeenCalledWith();
  });

  it('acepta el token por cabecera Authorization y le quita el prefijo Bearer', async () => {
    jwtVerify.mockReturnValue({ id: 1, rol: 'admin' });

    await autenticar({}, { authorization: 'Bearer abc123' });

    expect(jwtVerify).toHaveBeenCalledWith('abc123', 'secreto-de-prueba');
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('setupWebSocket — salas segun rol', () => {
  const conectar = async (user) => {
    await setupWebSocket({}, []);
    const socket = crearSocket(user);
    await manejadores.get('connection')(socket);
    return socket;
  };

  it('todo usuario entra a su sala personal', async () => {
    const socket = await conectar({ id: 3, rol: 'personero' });

    expect(socket.join).toHaveBeenCalledWith('user:3');
  });

  it('el admin entra al tablero global', async () => {
    const socket = await conectar({ id: 1, rol: 'admin' });

    expect(socket.join).toHaveBeenCalledWith('admin:dashboard');
  });

  it('el personero entra a su sala de notificaciones', async () => {
    const socket = await conectar({ id: 3, rol: 'personero' });

    expect(socket.join).toHaveBeenCalledWith('personero:3');
  });

  it('el coordinador se suscribe a TODOS sus locales asignados', async () => {
    mockDb.queue('asignacion_coordinadores', [4, 7, 12]);

    const socket = await conectar({ id: 2, rol: 'coordinador' });

    expect(socket.join).toHaveBeenCalledWith('coordinador:todos');
    expect(socket.join).toHaveBeenCalledWith('local:4');
    expect(socket.join).toHaveBeenCalledWith('local:7');
    expect(socket.join).toHaveBeenCalledWith('local:12');
  });

  it('un fallo al leer los locales no impide la conexion', async () => {
    mockDb.queueError('asignacion_coordinadores', new Error('caida'));

    const socket = await conectar({ id: 2, rol: 'coordinador' });

    expect(socket.join).toHaveBeenCalledWith('user:2');
    expect(consola).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('setupWebSocket — limite de sockets por usuario', () => {
  it('desconecta los sockets sobrantes al superar el maximo', async () => {
    const viejos = [
      { disconnect: jest.fn() }, { disconnect: jest.fn() }, { disconnect: jest.fn() },
    ];
    socketsEnSala = viejos;
    await setupWebSocket({}, []);

    await manejadores.get('connection')(crearSocket({ id: 3, rol: 'personero' }));

    // Con el maximo en 3 y 3 sockets previos, se libera 1.
    expect(viejos[0].disconnect).toHaveBeenCalledWith(true);
    expect(viejos[2].disconnect).not.toHaveBeenCalled();
  });

  it('no desconecta nada si el usuario esta por debajo del limite', async () => {
    const viejos = [{ disconnect: jest.fn() }];
    socketsEnSala = viejos;
    await setupWebSocket({}, []);

    await manejadores.get('connection')(crearSocket({ id: 3, rol: 'personero' }));

    expect(viejos[0].disconnect).not.toHaveBeenCalled();
  });

  it('si falla el conteo, la conexion se permite igual', async () => {
    await setupWebSocket({}, []);
    ioFake.in.mockReturnValueOnce({
      fetchSockets: jest.fn(async () => { throw new Error('adapter caido'); }),
    });

    const socket = crearSocket({ id: 3, rol: 'personero' });
    await manejadores.get('connection')(socket);

    expect(socket.join).toHaveBeenCalledWith('user:3');
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('setupWebSocket — eventos join_local / leave_local', () => {
  const conectarYObtener = async (user) => {
    await setupWebSocket({}, []);
    const socket = crearSocket(user);
    await manejadores.get('connection')(socket);
    socket.join.mockClear();
    return socket;
  };

  it('el admin puede unirse a cualquier local sin consultar permisos', async () => {
    const socket = await conectarYObtener({ id: 1, rol: 'admin' });

    await socket.emitir('join_local', 9);

    expect(socket.join).toHaveBeenCalledWith('local:9');
  });

  it('un personero NO puede unirse a la sala de un local', async () => {
    const socket = await conectarYObtener({ id: 3, rol: 'personero' });

    await socket.emitir('join_local', 9);

    expect(socket.join).not.toHaveBeenCalled();
  });

  it('un coordinador solo entra a un local que tenga asignado', async () => {
    mockDb.queue('asignacion_coordinadores', []); // carga inicial
    const socket = await conectarYObtener({ id: 2, rol: 'coordinador' });
    mockDb.queue('asignacion_coordinadores', { id: 30 });

    await socket.emitir('join_local', 4);

    expect(socket.join).toHaveBeenCalledWith('local:4');
  });

  it('un coordinador NO entra a un local ajeno', async () => {
    mockDb.queue('asignacion_coordinadores', []);
    const socket = await conectarYObtener({ id: 2, rol: 'coordinador' });
    mockDb.queue('asignacion_coordinadores', undefined);

    await socket.emitir('join_local', 99);

    expect(socket.join).not.toHaveBeenCalled();
  });

  it('un fallo de BD al verificar el permiso no concede acceso', async () => {
    mockDb.queue('asignacion_coordinadores', []);
    const socket = await conectarYObtener({ id: 2, rol: 'coordinador' });
    mockDb.queueError('asignacion_coordinadores', new Error('caida'));

    await socket.emitir('join_local', 4);

    expect(socket.join).not.toHaveBeenCalled();
  });

  it('leave_local saca al socket de la sala', async () => {
    const socket = await conectarYObtener({ id: 1, rol: 'admin' });

    socket.emitir('leave_local', 4);

    expect(socket.leave).toHaveBeenCalledWith('local:4');
  });

  it('ping_estado responde con ok y marca de tiempo', async () => {
    const socket = await conectarYObtener({ id: 1, rol: 'admin' });
    const cb = jest.fn();

    socket.emitir('ping_estado', cb);

    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('ping_estado sin callback no lanza', async () => {
    const socket = await conectarYObtener({ id: 1, rol: 'admin' });

    expect(() => socket.emitir('ping_estado', undefined)).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('emision de notificaciones con io activo', () => {
  beforeEach(async () => {
    await setupWebSocket({}, []);
  });

  it('notifyCoordinator emite a la sala del local', () => {
    const emit = jest.fn();
    ioFake.to.mockReturnValueOnce({ emit });

    notifyCoordinator(4, 'resultado:nuevo', { mesa_id: 9 });

    expect(ioFake.to).toHaveBeenCalledWith('local:4');
    expect(emit).toHaveBeenCalledWith('resultado:nuevo', { mesa_id: 9 });
  });

  it('notifyAdmin emite al tablero global', () => {
    const emit = jest.fn();
    ioFake.to.mockReturnValueOnce({ emit });

    notifyAdmin('resultado:verificado', { id: 1 });

    expect(ioFake.to).toHaveBeenCalledWith('admin:dashboard');
    expect(emit).toHaveBeenCalledWith('resultado:verificado', { id: 1 });
  });

  it('notifyPersonero emite a la sala del personero', () => {
    const emit = jest.fn();
    ioFake.to.mockReturnValueOnce({ emit });

    notifyPersonero(3, 'resultado:observado', { motivo: 'borrosa' });

    expect(ioFake.to).toHaveBeenCalledWith('personero:3');
  });

  it('getWsStats cuenta los sockets conectados', async () => {
    socketsEnSala = [{}, {}, {}];

    await expect(getWsStats()).resolves.toMatchObject({ conectados: 3 });
  });

  it('getWsStats cae al contador del engine si fetchSockets falla', async () => {
    ioFake.fetchSockets.mockRejectedValueOnce(new Error('adapter caido'));
    ioFake.engine.clientsCount = 42;

    await expect(getWsStats()).resolves.toMatchObject({ conectados: 42 });
  });
});
