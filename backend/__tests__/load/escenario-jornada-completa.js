/**
 * PRUEBA DE CARGA: jornada electoral completa, 850 personeros.
 *
 * Por que este escenario y no el anterior
 * ---------------------------------------
 * `escenario-800-usuarios.js` solo hacia dos GET a /mi-mesa por personero.
 * Eso mide el camino barato y deja fuera el evento que realmente satura el
 * sistema: 850 personeros subiendo una foto de acta de ~800 KB en una
 * ventana de pocos minutos. Ese momento concentra a la vez
 *
 *   - subida multipart (I/O de red y de disco/S3),
 *   - una transaccion de escritura con 2 inserts y 1 update por acta,
 *   - invalidacion de cache,
 *   - fan-out de WebSocket a coordinadores y admin.
 *
 * Aqui se reproduce ese pico completo, mas la verificacion por parte de
 * coordinadores y el refresco continuo del tablero.
 *
 * REQUISITOS PREVIOS (ver datos de prueba mas abajo)
 * --------------------------------------------------
 *   PC2:  cd backend && node scripts/generar-datos-prueba.js
 *   PC2:  k6 run -e BASE_URL=https://elecciones.midominio.pe \
 *              tests/load/escenario-jornada-completa.js
 *
 * Perfiles (variable PERFIL):
 *   humo    ->  5 VUs, 1 min. Valida que el escenario funciona.
 *   rampa   ->  hasta 400 VUs. Ensayo intermedio.
 *   jornada ->  850 personeros + 100 supervisores + 40 coordinadores (por defecto)
 *   estres  ->  1400 VUs. Busca el punto de quiebre, NO es criterio de aprobacion.
 *
 * IMPORTANTE: ejecutar SIEMPRE contra un entorno de pruebas con datos
 * sembrados, nunca contra la base de la jornada real.
 */
import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group, fail } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── Configuracion ──────────────────────────────────────────────────
const BASE = __ENV.BASE_URL || 'http://localhost';
const WS_BASE = (__ENV.WS_URL || BASE).replace(/^http/, 'ws');
const PERFIL = __ENV.PERFIL || 'jornada';
const TOTAL_PERSONEROS = Number(__ENV.TOTAL_PERSONEROS || 850);
const DNI_BASE_PERSONERO = Number(__ENV.DNI_BASE_PERSONERO || 10000000);
const DNI_BASE_COORD = Number(__ENV.DNI_BASE_COORD || 20000000);
const TOTAL_COORDINADORES = Number(__ENV.TOTAL_COORDINADORES || 40);
const DNI_ADMIN = __ENV.DNI_ADMIN || '00000000';
const PASS_ADMIN = __ENV.PASS_ADMIN || 'admin123';
const PASS_GENERICA = __ENV.PASS_GENERICA || 'Prueba2026';

// La foto se lee UNA vez en el contexto de init y se comparte entre VUs.
// Si se leyera por iteracion, k6 mediria su propio consumo de memoria.
const FOTO_ACTA = open('./acta-muestra.jpg', 'b');

// ── Metricas propias ───────────────────────────────────────────────
const erroresLogin = new Rate('errores_login');
const erroresSubida = new Rate('errores_subida_acta');
const erroresDashboard = new Rate('errores_dashboard');
const erroresVerificacion = new Rate('errores_verificacion');

const tiempoLogin = new Trend('tiempo_login_ms');
const tiempoSubida = new Trend('tiempo_subida_acta_ms');
const tiempoDashboard = new Trend('tiempo_dashboard_ms');
const tiempoMiMesa = new Trend('tiempo_mi_mesa_ms');
const tiempoVerificacion = new Trend('tiempo_verificacion_ms');

const actasEnviadas = new Counter('actas_enviadas');
const actasAceptadas = new Counter('actas_aceptadas');
const actasRechazadas = new Counter('actas_rechazadas_por_negocio');
const actasVerificadas = new Counter('actas_verificadas');
const bytesActas = new Counter('bytes_actas_subidos');
const socketsAbiertos = new Gauge('sockets_websocket_abiertos');
const erroresWebsocket = new Rate('errores_websocket');
const peticionesTotales = new Counter('peticiones_totales');

// ── Perfiles de carga ──────────────────────────────────────────────
const perfiles = {
  humo: {
    personeros: {
      executor: 'constant-vus', vus: 5, duration: '1m', exec: 'flujoPersonero',
    },
  },

  rampa: {
    personeros: {
      executor: 'ramping-vus', startVUs: 0, exec: 'flujoPersonero',
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 400 },
        { duration: '3m', target: 400 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    supervisores: {
      executor: 'constant-vus', vus: 25, duration: '7m', exec: 'flujoSupervisor',
    },
  },

  // Reproduce la curva real: los locales cierran escalonadamente entre las
  // 4 y las 6 PM, con un pico marcado cuando terminan de contar los mas
  // grandes. Los coordinadores verifican con ~5 min de retraso.
  jornada: {
    personeros: {
      executor: 'ramping-vus', startVUs: 0, exec: 'flujoPersonero',
      stages: [
        { duration: '2m', target: 150 },   // primeros locales pequenos
        { duration: '3m', target: 500 },   // entrada masiva
        { duration: '4m', target: 850 },   // PICO: todos a la vez
        { duration: '5m', target: 850 },   // pico sostenido
        { duration: '3m', target: 300 },   // rezagados
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '60s',
    },
    coordinadores: {
      executor: 'constant-vus', vus: TOTAL_COORDINADORES,
      duration: '19m', startTime: '3m', exec: 'flujoCoordinador',
    },
    supervisores: {
      executor: 'constant-vus', vus: 100, duration: '19m', exec: 'flujoSupervisor',
    },
    // Los sockets son una dimension distinta: 850 conexiones ABIERTAS y
    // ociosas consumen descriptores y memoria aunque no haya trafico HTTP.
    sockets: {
      executor: 'constant-vus', vus: Number(__ENV.VUS_WS || 200),
      duration: '15m', startTime: '2m', exec: 'flujoWebsocket',
    },
  },

  estres: {
    personeros: {
      executor: 'ramping-arrival-rate', startRate: 10, timeUnit: '1s',
      preAllocatedVUs: 300, maxVUs: 1400, exec: 'flujoPersonero',
      stages: [
        { duration: '2m', target: 50 },
        { duration: '3m', target: 120 },
        { duration: '3m', target: 250 },
        { duration: '2m', target: 0 },
      ],
    },
  },
};

export const options = {
  scenarios: perfiles[PERFIL] || perfiles.jornada,
  // Umbrales de APROBACION. Si alguno falla, k6 termina con codigo != 0,
  // lo que permite usarlo como puerta en CI antes de un despliegue.
  thresholds: {
    'http_req_failed': ['rate<0.02'],
    'errores_login': ['rate<0.02'],
    'errores_dashboard': ['rate<0.02'],

    // La subida del acta es la operacion critica: si falla, se pierde el
    // voto de una mesa. Se le exige mas que al resto.
    'errores_subida_acta': ['rate<0.01'],
    'tiempo_subida_acta_ms': ['p(95)<5000', 'p(99)<10000'],

    // El tablero lo miran coordinadores y prensa: debe sentirse en vivo.
    'tiempo_dashboard_ms': ['p(95)<800'],
    'tiempo_mi_mesa_ms': ['p(95)<1000'],
    'tiempo_login_ms': ['p(95)<1500'],

    'http_req_duration{tipo:lectura}': ['p(95)<1000'],
    'http_req_duration{tipo:escritura}': ['p(95)<5000'],
    'errores_websocket': ['rate<0.05'],
  },
  // Con 850 VUs y sockets abiertos, el propio k6 necesita margen.
  noConnectionReuse: false,
  discardResponseBodies: false,
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

// ── Utilidades ─────────────────────────────────────────────────────
const cabeceras = (token, extra = {}) => ({
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  },
});

const cabecerasAuth = (token, tags = {}) => ({
  headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  tags,
});

function iniciarSesion(dni, password, etiqueta) {
  const inicio = Date.now();
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ dni, password }),
    { ...cabeceras(), tags: { tipo: 'lectura', paso: `login_${etiqueta}` } },
  );
  tiempoLogin.add(Date.now() - inicio);
  peticionesTotales.add(1);

  const ok = check(res, {
    'login responde 200': (r) => r.status === 200,
    'login devuelve accessToken': (r) => {
      try { return !!r.json('data.accessToken'); } catch { return false; }
    },
  });

  erroresLogin.add(!ok);
  if (!ok) return null;
  try { return res.json('data.accessToken'); } catch { return null; }
}

/** Construye un acta aritmeticamente coherente para la mesa indicada. */
function armarActa(electoresHabiles) {
  const tope = Math.min(Number(electoresHabiles) || 300, 300);
  const emitidos = randomIntBetween(Math.floor(tope * 0.55), tope);

  const blanco = randomIntBetween(0, Math.floor(emitidos * 0.04));
  const nulo = randomIntBetween(0, Math.floor(emitidos * 0.05));
  const impugnados = randomIntBetween(0, 2);
  let restantes = emitidos - blanco - nulo - impugnados;
  if (restantes < 0) restantes = 0;

  // Reparto desigual entre 5 listas, como en una eleccion real.
  const pesos = [0.34, 0.26, 0.19, 0.13, 0.08];
  const votos = [];
  let asignado = 0;
  for (let i = 0; i < pesos.length; i += 1) {
    const cantidad = i === pesos.length - 1
      ? restantes - asignado
      : Math.floor(restantes * pesos[i]);
    votos.push({ candidato_id: i + 1, votos: Math.max(cantidad, 0) });
    asignado += Math.max(cantidad, 0);
  }

  return { votos, blanco, nulo, impugnados, total: emitidos };
}

// ═══════════════════════════════════════════════════════════════════
// FLUJO 1 — Personero: confirma presencia, espera, sube el acta y
//           comprueba si el coordinador se la aprobo u observo.
// ═══════════════════════════════════════════════════════════════════
export function flujoPersonero() {
  const indice = (__VU % TOTAL_PERSONEROS) + 1;
  const dni = String(DNI_BASE_PERSONERO + indice);
  const token = iniciarSesion(dni, __ENV.PASS_PERSONERO || PASS_GENERICA, 'personero');

  if (!token) { sleep(randomIntBetween(5, 15)); return; }

  let mesa = null;

  group('01 confirmar presencia en la mesa', () => {
    const res = http.post(
      `${BASE}/api/resultados/confirmar-mesa`,
      JSON.stringify({ latitud: -13.1587, longitud: -74.2236 }),
      { ...cabeceras(token), tags: { tipo: 'escritura', paso: 'confirmar_mesa' } },
    );
    peticionesTotales.add(1);
    check(res, { 'presencia confirmada': (r) => r.status === 200 || r.status === 404 });
  });

  group('02 consultar mi mesa y los candidatos', () => {
    const inicio = Date.now();
    const res = http.get(
      `${BASE}/api/resultados/mi-mesa`,
      { ...cabeceras(token), tags: { tipo: 'lectura', paso: 'mi_mesa' } },
    );
    tiempoMiMesa.add(Date.now() - inicio);
    peticionesTotales.add(1);

    check(res, { 'mi-mesa responde': (r) => r.status === 200 || r.status === 404 });
    if (res.status === 200) {
      try { mesa = res.json('data.mesa'); } catch { mesa = null; }
    }
  });

  // Espera realista: el personero aguarda el escrutinio de su mesa.
  sleep(randomIntBetween(20, 90));

  group('03 subir el acta con la foto', () => {
    if (!mesa || !mesa.id) return;

    const acta = armarActa(mesa.total_electores_habiles);
    const cuerpo = {
      mesa_id: String(mesa.id),
      votos: JSON.stringify(acta.votos),
      votos_blanco: String(acta.blanco),
      votos_nulo: String(acta.nulo),
      votos_impugnados: String(acta.impugnados),
      total_cedulas_votacion: String(acta.total),
      observaciones_personero: 'Sin observaciones',
      // Este es el punto caro: multipart con ~800 KB por personero.
      foto_acta: http.file(FOTO_ACTA, `acta-${mesa.numero_mesa || mesa.id}.jpg`, 'image/jpeg'),
    };

    const inicio = Date.now();
    const res = http.post(`${BASE}/api/resultados`, cuerpo,
      cabecerasAuth(token, { tipo: 'escritura', paso: 'subir_acta' }));
    const transcurrido = Date.now() - inicio;

    tiempoSubida.add(transcurrido);
    peticionesTotales.add(1);
    actasEnviadas.add(1);
    bytesActas.add(FOTO_ACTA.byteLength);

    // Distincion importante: un 400 por regla de negocio (mesa ya reportada,
    // acta ya transmitida) NO es un fallo de capacidad. Solo cuentan como
    // error los 5xx, los timeouts y los 429.
    const exito = res.status === 201;
    const rechazoDeNegocio = res.status === 400 || res.status === 403;

    if (exito) actasAceptadas.add(1);
    if (rechazoDeNegocio) actasRechazadas.add(1);
    erroresSubida.add(!exito && !rechazoDeNegocio);

    check(res, {
      'acta aceptada o rechazada por regla, nunca 5xx': (r) => r.status < 500,
      'no se agoto el rate limit de escritura': (r) => r.status !== 429,
      'la subida tardo menos de 10s': () => transcurrido < 10000,
    });
  });

  sleep(randomIntBetween(30, 120));

  group('04 revisar si el acta fue aprobada u observada', () => {
    const inicio = Date.now();
    const res = http.get(
      `${BASE}/api/resultados/mi-mesa`,
      { ...cabeceras(token), tags: { tipo: 'lectura', paso: 'revisar_estado' } },
    );
    tiempoMiMesa.add(Date.now() - inicio);
    peticionesTotales.add(1);
    check(res, { 'estado consultado': (r) => r.status < 500 });
  });

  sleep(randomIntBetween(20, 60));
}

// ═══════════════════════════════════════════════════════════════════
// FLUJO 2 — Coordinador: revisa las mesas de su local y verifica u
//           observa las actas que le van llegando.
// ═══════════════════════════════════════════════════════════════════
export function flujoCoordinador() {
  const indice = (__VU % TOTAL_COORDINADORES) + 1;
  const dni = String(DNI_BASE_COORD + indice);
  const token = iniciarSesion(dni, __ENV.PASS_COORDINADOR || PASS_GENERICA, 'coordinador');

  if (!token) { sleep(randomIntBetween(10, 20)); return; }

  let locales = [];

  group('coordinador lista sus locales', () => {
    const res = http.get(`${BASE}/api/coordinador/mis-locales`,
      { ...cabeceras(token), tags: { tipo: 'lectura', paso: 'mis_locales' } });
    peticionesTotales.add(1);
    if (res.status === 200) {
      try { locales = res.json('data') || []; } catch { locales = []; }
    }
    check(res, { 'mis-locales responde 200': (r) => r.status === 200 });
  });

  if (locales.length === 0) { sleep(20); return; }
  const local = locales[randomIntBetween(0, locales.length - 1)];

  for (let ronda = 0; ronda < 8; ronda += 1) {
    let mesas = [];

    group('coordinador revisa las mesas del local', () => {
      const res = http.get(`${BASE}/api/coordinador/locales/${local.id}/mesas`,
        { ...cabeceras(token), tags: { tipo: 'lectura', paso: 'mesas_del_local' } });
      peticionesTotales.add(1);
      if (res.status === 200) {
        try { mesas = res.json('data.mesas') || []; } catch { mesas = []; }
      }
      check(res, { 'mesas del local responden': (r) => r.status === 200 });
    });

    // Verifica las actas pendientes que encuentre. 1 de cada 8 la observa,
    // que es la proporcion tipica de actas con problemas de legibilidad.
    const pendientes = mesas.filter(
      (m) => m.resultado_id && m.resultado_estado === 'pendiente',
    );

    for (const m of pendientes.slice(0, 5)) {
      const observar = randomIntBetween(1, 8) === 1;
      const inicio = Date.now();

      const res = observar
        ? http.put(
            `${BASE}/api/resultados/${m.resultado_id}/observar`,
            JSON.stringify({ observaciones_coordinador: 'Los numeros no se leen con claridad' }),
            { ...cabeceras(token), tags: { tipo: 'escritura', paso: 'observar_acta' } },
          )
        : http.put(
            `${BASE}/api/resultados/${m.resultado_id}/verificar`, null,
            { ...cabeceras(token), tags: { tipo: 'escritura', paso: 'verificar_acta' } },
          );

      tiempoVerificacion.add(Date.now() - inicio);
      peticionesTotales.add(1);

      const ok = res.status === 200;
      const rechazoDeNegocio = res.status === 400;
      if (ok) actasVerificadas.add(1);
      erroresVerificacion.add(!ok && !rechazoDeNegocio);

      check(res, { 'verificacion sin error de servidor': (r) => r.status < 500 });
      sleep(randomIntBetween(1, 4));
    }

    sleep(randomIntBetween(15, 45));
  }
}

// ═══════════════════════════════════════════════════════════════════
// FLUJO 3 — Supervisor (admin y prensa): refresca el tablero sin parar.
//           Es la carga de LECTURA que el cache debe absorber.
// ═══════════════════════════════════════════════════════════════════
export function flujoSupervisor() {
  const token = iniciarSesion(DNI_ADMIN, PASS_ADMIN, 'admin');
  if (!token) { sleep(10); return; }

  for (let i = 0; i < 25; i += 1) {
    group('tablero en vivo', () => {
      const inicio = Date.now();
      const respuestas = http.batch([
        ['GET', `${BASE}/api/dashboard/resumen`, null,
          { ...cabeceras(token), tags: { tipo: 'lectura', paso: 'dash_resumen' } }],
        ['GET', `${BASE}/api/dashboard/por-candidato`, null,
          { ...cabeceras(token), tags: { tipo: 'lectura', paso: 'dash_candidato' } }],
        ['GET', `${BASE}/api/dashboard/por-distrito`, null,
          { ...cabeceras(token), tags: { tipo: 'lectura', paso: 'dash_distrito' } }],
        ['GET', `${BASE}/api/dashboard/composicion-voto`, null,
          { ...cabeceras(token), tags: { tipo: 'lectura', paso: 'dash_composicion' } }],
      ]);
      tiempoDashboard.add(Date.now() - inicio);
      peticionesTotales.add(4);

      const ok = respuestas.every((r) => r.status === 200);
      erroresDashboard.add(!ok);
      check(respuestas[0], { 'resumen responde 200': (r) => r.status === 200 });
    });

    // Cada 5 rondas, un supervisor abre la vista de mesas pendientes, que
    // es la consulta pesada que NO pasa por cache.
    if (i % 5 === 0) {
      const res = http.get(`${BASE}/api/dashboard/mesas-pendientes?limit=200`,
        { ...cabeceras(token), tags: { tipo: 'lectura', paso: 'mesas_pendientes' } });
      peticionesTotales.add(1);
      check(res, { 'mesas pendientes responde': (r) => r.status === 200 });
    }

    sleep(randomIntBetween(3, 8));
  }
}

// ═══════════════════════════════════════════════════════════════════
// FLUJO 4 — WebSocket: conexiones abiertas y ociosas.
//
// Mide algo que el trafico HTTP no revela: 850 sockets vivos consumen
// descriptores de archivo y memoria en cada instancia del backend, y el
// adapter de Redis replica cada notificacion a todas ellas.
// ═══════════════════════════════════════════════════════════════════
export function flujoWebsocket() {
  const indice = (__VU % TOTAL_PERSONEROS) + 1;
  const dni = String(DNI_BASE_PERSONERO + indice);
  const token = iniciarSesion(dni, __ENV.PASS_PERSONERO || PASS_GENERICA, 'ws');
  if (!token) { sleep(20); return; }

  const url = `${WS_BASE}/socket.io/?EIO=4&transport=websocket&token=${token}`;
  let huboError = false;

  const res = ws.connect(url, {}, (socket) => {
    socket.on('open', () => {
      socketsAbiertos.add(1);
      // Handshake de Socket.io v4 sobre WebSocket puro.
      socket.send('40' + JSON.stringify({ token }));
    });

    socket.on('message', (msg) => {
      // '2' es el ping del servidor; hay que responder '3' o cierra.
      if (msg === '2') socket.send('3');
    });

    socket.on('error', () => { huboError = true; });

    // Mantener el socket abierto simulando a un personero con la app abierta.
    socket.setTimeout(() => socket.close(), randomIntBetween(120, 300) * 1000);
  });

  erroresWebsocket.add(huboError || !(res && res.status === 101));
  check(res, { 'websocket acepta la conexion (101)': (r) => r && r.status === 101 });
}

// ═══════════════════════════════════════════════════════════════════
export function handleSummary(data) {
  const m = data.metrics;
  const v = (nombre, campo = 'p(95)') => (m[nombre]?.values?.[campo] ?? 0);
  const n = (nombre) => (m[nombre]?.values?.count ?? 0);
  const pct = (nombre) => ((m[nombre]?.values?.rate ?? 0) * 100).toFixed(2);
  const linea = '='.repeat(66);

  const enviadas = n('actas_enviadas');
  const aceptadas = n('actas_aceptadas');
  const mb = (n('bytes_actas_subidos') / 1024 / 1024).toFixed(0);

  const veredicto = (cond) => (cond ? 'CUMPLE' : 'NO CUMPLE  <-- revisar');

  const resumen = `
${linea}
 JORNADA ELECTORAL SIMULADA — perfil: ${PERFIL}
${linea}

 VOLUMEN
   Peticiones totales:        ${n('peticiones_totales')}
   Actas enviadas:            ${enviadas}
   Actas aceptadas (201):     ${aceptadas}
   Rechazadas por regla:      ${n('actas_rechazadas_por_negocio')}
   Actas verificadas:         ${n('actas_verificadas')}
   Fotos subidas:             ${mb} MB
   Fallos HTTP:               ${pct('http_req_failed')}%

 SUBIDA DEL ACTA  (operacion critica)
   p95: ${v('tiempo_subida_acta_ms').toFixed(0)} ms   p99: ${v('tiempo_subida_acta_ms', 'p(99)').toFixed(0)} ms   max: ${v('tiempo_subida_acta_ms', 'max').toFixed(0)} ms
   Tasa de error: ${pct('errores_subida_acta')}%
   -> ${veredicto(v('tiempo_subida_acta_ms') < 5000 && (m.errores_subida_acta?.values?.rate ?? 0) < 0.01)}

 TABLERO EN VIVO
   p95: ${v('tiempo_dashboard_ms').toFixed(0)} ms   errores: ${pct('errores_dashboard')}%
   -> ${veredicto(v('tiempo_dashboard_ms') < 800)}

 CONSULTA DE MI MESA
   p95: ${v('tiempo_mi_mesa_ms').toFixed(0)} ms
   -> ${veredicto(v('tiempo_mi_mesa_ms') < 1000)}

 LOGIN
   p95: ${v('tiempo_login_ms').toFixed(0)} ms   errores: ${pct('errores_login')}%
   -> ${veredicto(v('tiempo_login_ms') < 1500)}

 VERIFICACION POR COORDINADOR
   p95: ${v('tiempo_verificacion_ms').toFixed(0)} ms   errores: ${pct('errores_verificacion')}%

 WEBSOCKET
   Sockets abiertos (max):    ${(m.sockets_websocket_abiertos?.values?.max ?? 0)}
   Errores de conexion:       ${pct('errores_websocket')}%

 GENERAL
   p95: ${v('http_req_duration').toFixed(0)} ms   p99: ${v('http_req_duration', 'p(99)').toFixed(0)} ms

${linea}
 LECTURA DEL RESULTADO
 - "Rechazadas por regla" NO son fallos: son mesas que ya habian
   reportado. Solo preocupan los 5xx, los 429 y los timeouts.
 - Si la subida del acta degrada pero el tablero aguanta, el cuello de
   botella esta en el almacenamiento o en el pool de escritura, no en
   la capacidad de computo.
 - Si aparecen 429, hay que subir RATE_LIMIT_WRITE: con 850 personeros
   enviando en la misma ventana, 30/min por IP se agota si estan todos
   detras del mismo NAT del local de votacion.
${linea}
`;

  console.log(resumen);
  return {
    stdout: resumen,
    'resultado-jornada.json': JSON.stringify(data, null, 2),
    'resultado-jornada.txt': resumen,
  };
}
