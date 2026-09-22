import { jest } from '@jest/globals';

/**
 * Harness de mocking para Knex.
 *
 * Por que existe: el mock anterior devolvia SIEMPRE el mismo objeto encadenable
 * para cualquier db('tabla'), asi que era imposible simular un controlador que
 * consulta varias tablas en secuencia (p. ej. subirResultado consulta
 * asignacion_personeros, mesas_sufragio, candidatos y resultados_mesa antes de
 * abrir la transaccion). Por eso 7 controladores quedaban en 0% de cobertura.
 *
 * Este harness mantiene una COLA DE RESPUESTAS POR TABLA. Cada vez que se hace
 * await sobre una consulta de esa tabla se consume el siguiente elemento de su
 * cola, en orden. Eso permite escribir el camino feliz y cada rama de error sin
 * pelearse con el mock.
 *
 * Uso tipico:
 *
 *   const { db, queue, reset, calls } = createDbMock();
 *   queue('asignacion_personeros', { id: 1 });   // 1a consulta -> asignacion
 *   queue('mesas_sufragio', { id: 9, estado: 'pendiente' });
 *   await subirResultado(req, res);
 *   expect(calls('resultados_mesa').inserts).toHaveLength(1);
 */

const METODOS_ENCADENABLES = [
  'where', 'whereIn', 'whereNotIn', 'whereNull', 'whereNotNull', 'whereNot',
  'whereRaw', 'whereExists', 'andWhere', 'orWhere', 'andOn', 'on', 'onIn',
  'join', 'leftJoin', 'rightJoin', 'innerJoin', 'crossJoin',
  'select', 'distinct', 'column', 'as',
  'count', 'countDistinct', 'sum', 'sumDistinct', 'avg', 'min', 'max',
  'groupBy', 'groupByRaw', 'having', 'havingRaw',
  'orderBy', 'orderByRaw', 'limit', 'offset',
  'clearSelect', 'clearOrder', 'clearWhere', 'whereILike', 'orWhereILike', 'from',
  'returning', 'onConflict', 'merge', 'ignore',
  'forUpdate', 'forShare', 'transacting', 'withSchema',
];

/**
 * Crea un doble de knex con colas de respuesta por tabla.
 *
 * @param {object} [opciones]
 * @param {*} [opciones.porDefecto] valor devuelto cuando la cola de la tabla
 *        esta vacia. Por defecto [] (lista vacia), que es lo que devuelve knex
 *        en un select sin filas.
 */
export const createDbMock = ({ porDefecto = [] } = {}) => {
  /** @type {Map<string, any[]>} */
  const colas = new Map();
  /** @type {Map<string, {inserts:any[],updates:any[],deletes:number,increments:any[],decrements:any[],wheres:any[]}>} */
  const registro = new Map();
  /** @type {string[]} orden real en que se toco cada tabla */
  const ordenTablas = [];

  const normalizar = (tabla) => String(tabla).split(' as ')[0].trim();

  const registroDe = (tabla) => {
    const clave = normalizar(tabla);
    if (!registro.has(clave)) {
      registro.set(clave, {
        inserts: [], updates: [], deletes: 0,
        increments: [], decrements: [], wheres: [],
      });
    }
    return registro.get(clave);
  };

  const siguienteRespuesta = (tabla) => {
    const clave = normalizar(tabla);
    const cola = colas.get(clave);
    if (cola && cola.length > 0) {
      const valor = cola.shift();
      if (valor instanceof Error) throw valor;
      return valor;
    }
    return porDefecto;
  };

  const crearBuilder = (tabla) => {
    const clave = normalizar(tabla);
    if (!ordenTablas.includes(clave)) ordenTablas.push(clave);
    const reg = registroDe(tabla);

    const builder = {
      __tabla: clave,
      // Permite inspeccionar desde el test que la consulta se armo sobre la
      // tabla esperada sin acoplarse al SQL generado.
      toString: () => `[mock knex builder: ${clave}]`,
    };

    for (const metodo of METODOS_ENCADENABLES) {
      builder[metodo] = jest.fn(function (...args) {
        if (metodo === 'where' || metodo === 'whereIn') reg.wheres.push(args[0]);
        // Knex acepta callbacks para agrupar condiciones y para las clausulas
        // ON de los joins: db('t').where(function(){ this.where(...) }),
        // .leftJoin('x', function(){ this.on(...) }), whereIn('id', function(){
        // this.select(...).from(...) }). Si el doble no los ejecuta, todo ese
        // codigo queda sin cubrir y aparece como funciones no invocadas —
        // justo donde viven los filtros de permisos.
        for (const arg of args) {
          if (typeof arg === 'function') {
            try { arg.call(builder); } catch { /* el cuerpo se ejecuto igual */ }
          }
        }
        return builder;
      });
    }

    // clone() debe producir un builder INDEPENDIENTE: el controlador de
    // usuarios y el de mesas hacen query.clone().count() para el total y luego
    // await query para la pagina. Si clone devolviera this, ambas consultas
    // consumirian la misma respuesta.
    builder.clone = jest.fn(() => crearBuilder(tabla));

    builder.insert = jest.fn(function (filas) {
      reg.inserts.push(filas);
      return builder;
    });

    builder.update = jest.fn(function (cambios) {
      reg.updates.push(cambios);
      return builder;
    });

    builder.increment = jest.fn(function (columna, cantidad = 1) {
      reg.increments.push({ columna, cantidad });
      return builder;
    });

    builder.decrement = jest.fn(function (columna, cantidad = 1) {
      reg.decrements.push({ columna, cantidad });
      return builder;
    });

    const borrar = jest.fn(function () {
      reg.deletes += 1;
      return builder;
    });
    builder.del = borrar;
    builder.delete = borrar;

    builder.first = jest.fn(function () {
      return builder;
    });

    builder.pluck = jest.fn(function () {
      return builder;
    });

    // El builder es "thenable": await sobre cualquier punto de la cadena
    // consume la siguiente respuesta encolada para esa tabla.
    builder.then = (resolver, rechazar) => {
      try {
        return Promise.resolve(siguienteRespuesta(tabla)).then(resolver, rechazar);
      } catch (error) {
        return Promise.reject(error).then(resolver, rechazar);
      }
    };
    builder.catch = (fn) => builder.then(undefined, fn);
    builder.finally = (fn) => builder.then(
      (v) => { fn(); return v; },
      (e) => { fn(); throw e; },
    );

    return builder;
  };

  const db = jest.fn((tabla) => crearBuilder(tabla));

  db.raw = jest.fn((sql) => ({ __raw: sql, toString: () => String(sql) }));
  db.fn = { now: jest.fn(() => '__NOW__') };
  db.ref = jest.fn((r) => r);
  db.destroy = jest.fn(async () => {});

  // db.transaction(cb): ejecuta el callback con un trx que se comporta como db.
  // Si el callback lanza, se propaga (igual que knex hace rollback y relanza).
  db.transaction = jest.fn(async (cb) => {
    const trx = jest.fn((tabla) => crearBuilder(tabla));
    trx.raw = db.raw;
    trx.fn = db.fn;
    trx.commit = jest.fn(async () => {});
    trx.rollback = jest.fn(async () => {});
    return cb(trx);
  });

  return {
    db,

    /** Encola una o varias respuestas para una tabla, en orden de consumo. */
    queue(tabla, ...respuestas) {
      const clave = normalizar(tabla);
      if (!colas.has(clave)) colas.set(clave, []);
      colas.get(clave).push(...respuestas);
      return this;
    },

    /** Encola un rechazo (simula fallo de base de datos). */
    queueError(tabla, error = new Error('fallo de base de datos')) {
      return this.queue(tabla, error);
    },

    /** Escrituras registradas sobre una tabla. */
    calls(tabla) {
      return registroDe(tabla);
    },

    /** Tablas consultadas, en el orden en que se tocaron. */
    tablasUsadas() {
      return [...ordenTablas];
    },

    /** Cuantas respuestas quedan sin consumir (util para detectar tests mal armados). */
    pendientes() {
      const resto = {};
      for (const [tabla, cola] of colas) {
        if (cola.length) resto[tabla] = cola.length;
      }
      return resto;
    },

    reset() {
      colas.clear();
      registro.clear();
      ordenTablas.length = 0;
      db.mockClear();
      db.transaction.mockClear();
      db.raw.mockClear();
      db.fn.now.mockClear();
    },
  };
};

/** Respuesta express simulada, con captura del cuerpo enviado. */
export const crearRes = () => {
  const res = {
    statusCode: 200,
    body: undefined,
    headersSent: false,
  };
  res.status = jest.fn((codigo) => {
    res.statusCode = codigo;
    return res;
  });
  res.json = jest.fn((cuerpo) => {
    res.body = cuerpo;
    res.headersSent = true;
    return res;
  });
  res.send = jest.fn((cuerpo) => {
    res.body = cuerpo;
    res.headersSent = true;
    return res;
  });
  res.setHeader = jest.fn();
  res.end = jest.fn(() => { res.headersSent = true; return res; });
  return res;
};

/** Peticion express simulada. */
export const crearReq = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ip: '190.12.0.1',
  socket: { remoteAddress: '190.12.0.1' },
  user: { id: 1, dni: '00000000', rol: 'admin' },
  ...overrides,
});

export const usuarioAdmin = (id = 1) => ({ id, dni: '00000000', rol: 'admin' });
export const usuarioCoordinador = (id = 2) => ({ id, dni: '11111111', rol: 'coordinador' });
export const usuarioPersonero = (id = 3) => ({ id, dni: '22222222', rol: 'personero' });

/** Silencia console.error durante un test y devuelve el spy para aserciones. */
export const silenciarConsola = () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  return spy;
};
