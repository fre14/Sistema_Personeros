/**
 * PRUEBA DE CARGA: la jornada electoral completa, comprimida en minutos.
 *
 * Reproduce lo que pasa el 4 de octubre con usuarios de prueba reales del
 * sistema (los crea scripts/generar-datos-prueba.js):
 *
 *   Mañana    Los personeros y coordinadores entran, confirman su mesa y se
 *             QUEDAN CONECTADOS (WebSocket abierto todo el dia).
 *   Tarde     Los personeros suben el acta con foto: primero pocos, luego una
 *             avalancha y al final los rezagados. Donde hay eleccion
 *             distrital suben dos actas. Algunos tocan "Enviar" dos veces.
 *   Revision  Los coordinadores reciben el aviso en vivo, abren el acta y la
 *             APRUEBAN u OBSERVAN. El personero recibe el aviso y, si se la
 *             observaron, la corrige y la vuelve a enviar.
 *   Tablero   Los administradores miran los resultados en vivo: cada aviso
 *             refresca el tablero (agrupado cada 3 s, como la pantalla real).
 *
 * Al final cada personero comprueba en el sistema que su acta quedo con las
 * mismas cifras que envio, y el resumen compara el tablero con lo enviado.
 *
 * Perfiles (variable PERFIL):
 *   humo     ~3 min, 12 personeros. Comprueba que todo el circuito funciona.
 *   ensayo   ~10 min, 200 personeros. Ensayo intermedio.
 *   jornada  ~29 min, TODOS los personeros. La tarde entera en 15 minutos de
 *            subidas: unas 6 veces el ritmo real. Es la prueba de aprobacion.
 *   estres   ~11 min, todos los personeros subiendo en 4 minutos (unas 20
 *            veces el ritmo real). Busca el limite; no es criterio de aprobacion.
 *
 * Variables: BASE_URL (obligatoria), PASS_PRUEBA (clave de los usuarios de
 * prueba), DATOS (./datos-prueba.json), FOTO (./acta-muestra.jpg), PERFIL.
 *
 * Solo contra un sistema PREPARADO con aws/prueba-carga.sh preparar.
 */
import http from 'k6/http';
import ws from 'k6/ws';
import exec from 'k6/execution';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

// ── Configuracion ──────────────────────────────────────────────────
const BASE = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const API = `${BASE}/api`;
const WS_URL = `${BASE.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;
const CLAVE = __ENV.PASS_PRUEBA || '';
const PERFIL = __ENV.PERFIL || 'humo';

// Tiempos en segundos. llegada: todos entran en la mañana; calma: conectados
// sin hacer nada; ventana: la tarde de subidas; cola: revision y correcciones.
const PERFILES = {
  humo: {
    personeros: 12, admins: 1, lectores: 0,
    llegada: 20, calma: 10, ventana: 60, cola: 90, revision: [2, 5], correccion: [3, 8],
  },
  ensayo: {
    personeros: 200, admins: 3, lectores: 5,
    llegada: 60, calma: 30, ventana: 240, cola: 240, revision: [4, 15], correccion: [8, 25],
  },
  jornada: {
    personeros: 0, admins: 5, lectores: 20,
    llegada: 240, calma: 90, ventana: 900, cola: 480, revision: [5, 20], correccion: [15, 60],
  },
  estres: {
    personeros: 0, admins: 5, lectores: 40,
    llegada: 90, calma: 30, ventana: 240, cola: 300, revision: [3, 10], correccion: [8, 25],
  },
};
const P = PERFILES[PERFIL];
if (!P) throw new Error(`PERFIL desconocido: ${PERFIL}. Use humo, ensayo, jornada o estres.`);

const PROB_OBSERVAR = [0.15, 0.05]; // 1.a version: 15 % observada; 2.a: 5 %; luego se aprueba
const PROB_DOBLE_ENVIO = Number(__ENV.DOBLE_ENVIO || 0.03); // personeros que tocan "Enviar" dos veces
const REFRESCO_TABLERO_MS = 3000;   // la pantalla del admin agrupa avisos cada 3 s
const REFRESCO_LISTA_MS = 1500;     // la del coordinador, cada 1,5 s

const T_SUBIDAS = P.llegada + P.calma;
const T_FIN_REVISION = T_SUBIDAS + P.ventana + P.cola - 30;
const T_FIN = T_SUBIDAS + P.ventana + P.cola;

// ── Datos de prueba (compartidos entre VUs) ───────────────────────
const RUTA_DATOS = __ENV.DATOS || './datos-prueba.json';
const PERSONEROS = new SharedArray('personeros', () => {
  const todos = JSON.parse(open(RUTA_DATOS)).personeros;
  return P.personeros > 0 ? todos.slice(0, P.personeros) : todos;
});
const COORDINADORES = new SharedArray('coordinadores', () => {
  const datos = JSON.parse(open(RUTA_DATOS));
  const lista = P.personeros > 0 ? datos.personeros.slice(0, P.personeros) : datos.personeros;
  const locales = new Set(lista.map((p) => p.local));
  const elegidos = datos.coordinadores.filter((c) => locales.has(c.local));
  // Si un local tiene varios coordinadores, se reparten sus mesas.
  const porLocal = {};
  elegidos.forEach((c) => { porLocal[c.local] = (porLocal[c.local] || 0) + 1; });
  const visto = {};
  return elegidos.map((c) => {
    const turno = visto[c.local] || 0;
    visto[c.local] = turno + 1;
    return { dni: c.dni, local: c.local, turno, companeros: porLocal[c.local] };
  });
});
const ADMINS = new SharedArray('admins', () => JSON.parse(open(RUTA_DATOS)).admins);
const N_ADMINS = Math.min(P.admins, ADMINS.length);
const N_LECTORES = ADMINS.length ? P.lectores : 0;

// Cada VU carga la foto una vez al iniciar (~860 KB, el doble de lo que envia
// el celular tras comprimir: la prueba es mas exigente que la realidad).
const FOTO = open(__ENV.FOTO || './acta-muestra.jpg', 'b');

// ── Metricas ───────────────────────────────────────────────────────
const erroresLogin = new Rate('errores_login');
const tiempoLogin = new Trend('tiempo_login_ms', true);
const tiempoMiMesa = new Trend('tiempo_mi_mesa_ms', true);

const actasEnviadas = new Counter('actas_enviadas');
const actasAceptadas = new Counter('actas_aceptadas');
const actasRechazadas = new Counter('actas_rechazadas_por_regla');
const erroresSubida = new Rate('errores_subida_acta');
const tiempoSubida = new Trend('tiempo_subida_acta_ms', true);
const correccionesAceptadas = new Counter('correcciones_aceptadas');
const dobleEnvioProbado = new Counter('doble_envio_probado');
const dobleEnvioDuplicado = new Counter('doble_envio_duplicado');

const actasAprobadas = new Counter('actas_aprobadas');
const actasObservadas = new Counter('actas_observadas');
const conflictosRevision = new Counter('conflictos_revision');
const erroresRevision = new Rate('errores_revision');
const tiempoRevision = new Trend('tiempo_revision_ms', true);
const tiempoListaMesas = new Trend('tiempo_lista_mesas_ms', true);
const retrasoAvisoCoordinador = new Trend('retraso_aviso_coordinador_ms', true);
const avisoPersonero = new Rate('aviso_personero_recibido');

const erroresTablero = new Rate('errores_tablero');
const tiempoTablero = new Trend('tiempo_tablero_ms', true);
const retrasoTablero = new Trend('retraso_tablero_ms', true);

const wsFallidas = new Rate('ws_conexion_fallida');
const wsCaidas = new Counter('ws_desconexiones_inesperadas');

const confirmadasProv = new Counter('actas_confirmadas_provincial');
const confirmadasDist = new Counter('actas_confirmadas_distrital');
const votosConfProv = new Counter('votos_confirmados_provincial');
const votosConfDist = new Counter('votos_confirmados_distrital');
const actasSinTerminar = new Counter('actas_sin_terminar');
const cifrasDistintas = new Counter('actas_con_cifras_distintas');

const tableroVerifProv = new Gauge('tablero_verificadas_provincial');
const tableroVerifDist = new Gauge('tablero_verificadas_distrital');
const tableroVotosProv = new Gauge('tablero_votos_provincial');
const tableroVotosDist = new Gauge('tablero_votos_distrital');

// 400/404/409 son respuestas de negocio (mesa ya enviada, conflicto), no fallas.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 400, 404, 409));

// ── Escenarios ─────────────────────────────────────────────────────
const TOPE = `${T_FIN + 240}s`;
const escenarios = {
  personeros: {
    executor: 'per-vu-iterations', vus: PERSONEROS.length, iterations: 1,
    maxDuration: TOPE, exec: 'personero', gracefulStop: '60s',
  },
  tablero: {
    executor: 'per-vu-iterations', vus: Math.max(N_ADMINS, 1), iterations: 1,
    maxDuration: TOPE, exec: 'tablero', gracefulStop: '60s',
  },
};
if (COORDINADORES.length) {
  escenarios.coordinadores = {
    executor: 'per-vu-iterations', vus: COORDINADORES.length, iterations: 1,
    maxDuration: TOPE, exec: 'coordinador', gracefulStop: '60s',
  };
}
if (N_LECTORES > 0) {
  escenarios.lectores = {
    executor: 'constant-vus', vus: N_LECTORES, duration: `${T_FIN}s`, exec: 'lector', gracefulStop: '30s',
  };
}

export const options = {
  scenarios: escenarios,
  setupTimeout: '120s',
  teardownTimeout: '120s',
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    // Criterios de aprobacion. Si alguno falla, k6 termina con error.
    http_req_failed: ['rate<0.01'],
    errores_login: ['rate<0.01'],
    tiempo_login_ms: ['p(95)<3000'],
    errores_subida_acta: ['rate<0.01'],
    tiempo_subida_acta_ms: ['p(95)<5000'],
    doble_envio_duplicado: ['count<1'],
    errores_revision: ['rate<0.01'],
    tiempo_revision_ms: ['p(95)<2000'],
    retraso_aviso_coordinador_ms: ['p(95)<5000'],
    aviso_personero_recibido: ['rate>0.95'],
    errores_tablero: ['rate<0.02'],
    tiempo_tablero_ms: ['p(95)<2500'],
    retraso_tablero_ms: ['p(95)<8000'],
    ws_conexion_fallida: ['rate<0.02'],
    actas_con_cifras_distintas: ['count<1'],
  },
};

// ── Utilidades ─────────────────────────────────────────────────────
const entero = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const segundos = (a) => entero(a[0] * 1000, a[1] * 1000);
const jsonSeguro = (res, ruta) => { try { return res.json(ruta); } catch (e) { return undefined; } };
const cab = (token, extra) => ({
  headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {}),
  tags: extra || {},
});
const cabMultipart = (token, tags) => ({ headers: { Authorization: `Bearer ${token}` }, tags, timeout: '60s' });

function iniciarSesion(dni, rol) {
  const res = http.post(`${API}/auth/login`, JSON.stringify({ dni, password: CLAVE }), cab(null, { paso: 'login', rol }));
  tiempoLogin.add(res.timings.duration);
  const token = res.status === 200 ? jsonSeguro(res, 'data.accessToken') : null;
  erroresLogin.add(!token);
  return token || null;
}

/** Espera activa hasta el instante t0 + s segundos (sin pasarse del fin). */
function esperarHasta(t0, s) {
  const falta = t0 + s * 1000 - Date.now();
  if (falta > 0) sleep(falta / 1000);
}

/**
 * Mantiene un socket.io (Engine.IO v4) abierto hasta `hastaMs`, como el
 * navegador: responde los ping, y si la conexion se cae reconecta a los pocos
 * segundos. Cada segundo llama a tick(); los eventos van a alEvento().
 */
function mantenerSocket(token, rol, hastaMs, alEvento, tick) {
  while (Date.now() < hastaMs) {
    let unido = false;
    let cierreVoluntario = false;
    const abiertoEn = Date.now();
    const res = ws.connect(WS_URL, { tags: { rol } }, (socket) => {
      socket.on('message', (msg) => {
        if (msg === '2') { socket.send('3'); return; }                   // ping -> pong
        if (msg[0] === '0') { socket.send(`40${JSON.stringify({ token })}`); return; } // abrir -> unirse
        if (msg.indexOf('40') === 0) { unido = true; return; }
        if (msg.indexOf('44') === 0) { socket.close(); return; }          // token rechazado
        if (msg.indexOf('42') === 0) {
          const m = /^42\d*(\[[\s\S]*\])$/.exec(msg);
          if (!m) return;
          let evento;
          try { evento = JSON.parse(m[1]); } catch (e) { return; }
          alEvento(evento[0], evento[1] || {});
        }
      });
      socket.setInterval(() => {
        if (Date.now() >= hastaMs) { cierreVoluntario = true; socket.close(); return; }
        if (!unido && Date.now() - abiertoEn > 15000) { socket.close(); return; } // no se unio
        tick();
      }, 1000);
    });
    const abrio = !!(res && res.status === 101);
    wsFallidas.add(!abrio || !unido);
    if (abrio && unido && !cierreVoluntario) wsCaidas.add(1);
    // Mientras reconecta, la persona sigue usando la pagina por HTTP.
    const reintento = Date.now() + entero(1, 4) * 1000;
    while (Date.now() < Math.min(reintento, hastaMs)) { tick(); sleep(1); }
  }
}

/** Arma un acta aritmeticamente coherente para la mesa y los candidatos dados. */
function armarActa(electoresHabiles, candidatos) {
  const electores = Math.min(Number(electoresHabiles) || 300, 300);
  const emitidos = entero(Math.floor(electores * 0.55), electores);
  const blanco = entero(Math.floor(emitidos * 0.03), Math.floor(emitidos * 0.12));
  const nulo = entero(Math.floor(emitidos * 0.04), Math.floor(emitidos * 0.14));
  const impugnados = Math.random() < 0.1 ? entero(1, 2) : 0;
  const restantes = Math.max(emitidos - blanco - nulo - impugnados, 0);
  const pesos = candidatos.map((c, i) => (1 / (i + 1.5)) * (0.7 + Math.random() * 0.6));
  const suma = pesos.reduce((a, b) => a + b, 0);
  let asignados = 0;
  const votos = candidatos.map((c, i) => {
    const n = i === candidatos.length - 1 ? restantes - asignados : Math.floor((restantes * pesos[i]) / suma);
    asignados += n;
    return { candidato_id: c.id, votos: n };
  });
  return { votos, blanco, nulo, impugnados, emitidos: restantes + blanco + nulo + impugnados };
}

/** Correccion tipica tras una observacion: se mueven unos votos mal leidos. */
function corregirActa(acta) {
  const votos = acta.votos.map((v) => ({ candidato_id: v.candidato_id, votos: v.votos }));
  if (votos.length > 1) {
    const mover = Math.min(entero(1, 3), votos[0].votos);
    votos[0].votos -= mover;
    votos[1].votos += mover;
  }
  return Object.assign({}, acta, { votos });
}

function cuerpoActa(acta, tipo, mesa) {
  return {
    mesa_id: String(mesa.id),
    tipo_eleccion: tipo,
    votos: JSON.stringify(acta.votos),
    votos_blanco: String(acta.blanco),
    votos_nulo: String(acta.nulo),
    votos_impugnados: String(acta.impugnados),
    total_cedulas_votacion: String(acta.emitidos),
    observaciones_personero: 'Prueba de carga',
    foto_acta: http.file(FOTO, `acta-${mesa.numero_mesa || mesa.id}-${tipo}.jpg`, 'image/jpeg'),
  };
}

/** Registra el resultado de un envio (subida o correccion) del acta. */
function registrarEnvio(res, esCorreccion) {
  actasEnviadas.add(1);
  tiempoSubida.add(res.timings.duration);
  const exito = res.status === 201;
  const deRegla = res.status === 400 || res.status === 403 || res.status === 404 || res.status === 409;
  if (exito && esCorreccion) correccionesAceptadas.add(1);
  if (exito) actasAceptadas.add(1);
  if (deRegla) actasRechazadas.add(1);
  erroresSubida.add(!exito && !deRegla);
  check(res, { 'acta: sin error del servidor': (r) => r.status > 0 && r.status < 500 && r.status !== 429 });
  return exito;
}

// ═══════════════════════════════════════════════════════════════════
export function setup() {
  if (!CLAVE) throw new Error('Falta PASS_PRUEBA (la clave de los usuarios de prueba).');
  const salud = http.get(`${API}/health`);
  if (salud.status !== 200) throw new Error(`El sistema no responde en ${BASE} (health ${salud.status}).`);
  if (!ADMINS.length || !PERSONEROS.length) throw new Error('datos-prueba.json vacio: ejecute la preparacion.');
  const token = iniciarSesion(ADMINS[0], 'setup');
  if (!token) throw new Error('No se pudo entrar con el admin de prueba: ¿clave correcta? ¿se preparo la prueba?');
  console.log(`Perfil ${PERFIL}: ${PERSONEROS.length} personeros, ${COORDINADORES.length} coordinadores, `
    + `${N_ADMINS} tableros en vivo y ${N_LECTORES} lectores. Duracion ~${Math.round(T_FIN / 60)} min.`);
  // Todos los VUs usan el mismo reloj de la jornada simulada.
  return { t0: Date.now() + 3000 };
}

// ═══════════════════════════════════════════════════════════════════
// PERSONERO: entra, confirma su mesa, se queda conectado, sube su(s)
// acta(s) a la hora que le toca, corrige si se la observan y al final
// comprueba que el sistema guardo exactamente lo que envio.
// ═══════════════════════════════════════════════════════════════════
export function personero(datos) {
  const t0 = datos.t0;
  const yo = PERSONEROS[exec.scenario.iterationInTest % PERSONEROS.length];
  esperarHasta(t0, Math.random() * P.llegada);

  const token = iniciarSesion(yo.dni, 'personero');
  if (!token) return;

  const leerMesa = (paso) => {
    const res = http.get(`${API}/resultados/mi-mesa`, cab(token, { paso }));
    tiempoMiMesa.add(res.timings.duration);
    return res.status === 200 ? jsonSeguro(res, 'data') : null;
  };

  const info = leerMesa('mi_mesa');
  if (!info || !info.mesa) return;
  http.post(`${API}/resultados/confirmar-mesa`, JSON.stringify({ latitud: -13.1587, longitud: -74.2236 }),
    cab(token, { paso: 'confirmar_mesa' }));

  const mesa = info.mesa;
  const actas = [{ tipo: 'provincial', candidatos: info.candidatos_provinciales || info.candidatos || [] }];
  if (info.tiene_distrital && (info.candidatos_distritales || []).length) {
    actas.push({ tipo: 'distrital', candidatos: info.candidatos_distritales });
  }
  // Hora de subida: campana (80 %) + rezagados repartidos (20 %).
  const r = Math.random() < 0.8 ? (Math.random() + Math.random() + Math.random()) / 3 : Math.random();
  let proxima = t0 + (T_SUBIDAS + r * P.ventana) * 1000;
  actas.forEach((a) => {
    a.hora = proxima;
    proxima += entero(3, 15) * 1000; // la distrital, poco despues
    a.estado = 'por_subir';          // por_subir | enviada | observada | verificada
    a.enviada = null;                // ultima version aceptada por el sistema
    a.avisado = false;               // llego el aviso de verificacion por socket
  });
  let proximoSondeo = null;   // null: aun no toca; un instante: sondear desde ahi

  const enviar = (a) => {
    const acta = a.enviada ? corregirActa(a.enviada) : armarActa(mesa.total_electores_habiles, a.candidatos);
    const esCorreccion = !!a.enviada;
    const url = esCorreccion ? `${API}/resultados/${a.id}/corregir` : `${API}/resultados`;
    const metodo = esCorreccion ? 'PUT' : 'POST';
    const tags = { paso: esCorreccion ? 'corregir_acta' : 'subir_acta', tipo: a.tipo };

    let res;
    let exito;
    if (!esCorreccion && a.tipo === 'provincial' && Math.random() < PROB_DOBLE_ENVIO) {
      // Doble toque en "Enviar": dos envios identicos casi a la vez.
      dobleEnvioProbado.add(1);
      const cuerpo = cuerpoActa(acta, a.tipo, mesa);
      const pares = http.batch([
        [metodo, url, cuerpo, cabMultipart(token, tags)],
        [metodo, url, cuerpo, cabMultipart(token, tags)],
      ]);
      pares.forEach((x) => registrarEnvio(x, false));
      if (pares.filter((x) => x.status === 201).length > 1) dobleEnvioDuplicado.add(1);
      res = pares.find((x) => x.status === 201) || pares[0];
      exito = res.status === 201;
    } else {
      res = http.request(metodo, url, cuerpoActa(acta, a.tipo, mesa), cabMultipart(token, tags));
      exito = registrarEnvio(res, esCorreccion);
    }
    if (exito) {
      a.id = jsonSeguro(res, 'data.id') || a.id;
      a.enviada = acta;
      a.estado = 'enviada';
    } else if (res.status === 409 || res.status === 400) {
      a.estado = 'enviada'; // ya estaba enviada: se sigue el estado real con el sondeo
      proximoSondeo = Date.now();
    } else {
      a.hora = Date.now() + entero(5, 15) * 1000; // reintento, como haria la persona
    }
  };

  const sincronizar = () => {
    const d = leerMesa('revisar_estado');
    if (!d) return;
    actas.forEach((a) => {
      const r2 = a.tipo === 'distrital' ? d.resultado_distrital : d.resultado_provincial;
      if (!r2) return;
      a.id = a.id || r2.id;
      if (r2.estado === 'verificado') a.estado = 'verificada';
      if (r2.estado === 'observado' && a.estado === 'enviada') {
        a.estado = 'observada';
        a.hora = Date.now() + segundos(P.correccion);
      }
    });
  };

  const alEvento = (nombre, d) => {
    const a = actas.find((x) => x.tipo === (d.tipo_eleccion || 'provincial'));
    if (!a) return;
    if (nombre === 'resultado:verificado') {
      a.estado = 'verificada';
      a.avisado = true;
    } else if (nombre === 'resultado:observado' && a.estado === 'enviada') {
      a.estado = 'observada';
      a.hora = Date.now() + segundos(P.correccion);
    }
  };

  const tick = () => {
    const ahora = Date.now();
    for (const a of actas) {
      if ((a.estado === 'por_subir' || a.estado === 'observada') && ahora >= a.hora) {
        enviar(a);
        return; // una accion por segundo, como una persona
      }
    }
    // Respaldo: si el aviso no llega, la pantalla del personero se refresca sola.
    if (actas.some((a) => a.estado === 'enviada')) {
      if (proximoSondeo === null) {
        proximoSondeo = ahora + entero(40, 70) * 1000;
      } else if (ahora >= proximoSondeo) {
        sincronizar();
        proximoSondeo = ahora + entero(40, 70) * 1000;
      }
    }
  };

  mantenerSocket(token, 'personero', t0 + T_FIN * 1000, alEvento, tick);

  // Cierre: ¿quedo en el sistema exactamente lo que envio?
  const final = leerMesa('comprobacion_final');
  if (!final) return;
  actas.forEach((a) => {
    const r2 = a.tipo === 'distrital' ? final.resultado_distrital : final.resultado_provincial;
    if (!r2 || r2.estado !== 'verificado' || !a.enviada) {
      actasSinTerminar.add(1);
      return;
    }
    avisoPersonero.add(a.avisado);
    (a.tipo === 'distrital' ? confirmadasDist : confirmadasProv).add(1);
    (a.tipo === 'distrital' ? votosConfDist : votosConfProv).add(a.enviada.emitidos);
    const enviados = {};
    a.enviada.votos.forEach((v) => { enviados[v.candidato_id] = v.votos; });
    const guardados = {};
    (r2.detalles || []).forEach((v) => { guardados[v.candidato_id] = Number(v.votos); });
    const iguales = Number(r2.total_votos_emitidos) === a.enviada.emitidos
      && Number(r2.votos_blanco) === a.enviada.blanco
      && Number(r2.votos_nulo) === a.enviada.nulo
      && Object.keys(enviados).length === Object.keys(guardados).length
      && Object.keys(enviados).every((k) => guardados[k] === enviados[k]);
    if (!iguales) cifrasDistintas.add(1);
  });
}

// ═══════════════════════════════════════════════════════════════════
// COORDINADOR: abre su local, recibe el aviso de cada acta, la revisa
// (mira la foto y las cifras) y la aprueba u observa.
// ═══════════════════════════════════════════════════════════════════
export function coordinador(datos) {
  const t0 = datos.t0;
  const yo = COORDINADORES[exec.scenario.iterationInTest % COORDINADORES.length];
  esperarHasta(t0, Math.random() * P.llegada);

  const token = iniciarSesion(yo.dni, 'coordinador');
  if (!token) return;

  http.get(`${API}/coordinador/locales`, cab(token, { paso: 'mis_locales' }));
  const esMia = (mesaId) => yo.companeros <= 1 || Number(mesaId) % yo.companeros === yo.turno;

  const cola = [];            // actas por revisar: { id, llegada }
  const enCola = {};
  let revisando = null;       // { id, version, hasta }
  let listaSucia = true;
  let proximaLista = 0;
  let proximoRepaso = Date.now() + 45000;

  const encolar = (id, llegada) => {
    if (!id || enCola[id]) return;
    enCola[id] = true;
    cola.push({ id, llegada });
  };

  const leerLista = (repasar) => {
    const res = http.get(`${API}/coordinador/locales/${yo.local}/mesas`, cab(token, { paso: 'mesas_del_local' }));
    tiempoListaMesas.add(res.timings.duration);
    if (!repasar || res.status !== 200) return;
    // Repaso por si se perdio algun aviso: actas pendientes de mis mesas.
    (jsonSeguro(res, 'data.mesas') || []).forEach((m) => {
      if (!esMia(m.id)) return;
      if (m.resultado_estado === 'pendiente') encolar(m.resultado_id, null);
      if (m.resultado_distrital_estado === 'pendiente') encolar(m.resultado_distrital_id, null);
    });
  };
  leerLista(false);

  const alEvento = (nombre, d) => {
    if (nombre === 'resultado:nuevo' && esMia(d.mesa_id)) encolar(Number(d.resultado_id), Date.now());
    if (nombre.indexOf('resultado:') === 0 || nombre === 'personero:presente') listaSucia = true;
  };

  const decidir = () => {
    const observar = Math.random() < (PROB_OBSERVAR[revisando.version - 1] || 0);
    const url = `${API}/resultados/${revisando.id}/${observar ? 'observar' : 'verificar'}`;
    const cuerpo = observar ? JSON.stringify({ observaciones_coordinador: 'Las cifras no se leen con claridad' }) : null;
    const res = http.put(url, cuerpo, cab(token, { paso: observar ? 'observar_acta' : 'verificar_acta' }));
    tiempoRevision.add(res.timings.duration);
    const ok = res.status === 200;
    if (ok) (observar ? actasObservadas : actasAprobadas).add(1);
    if (res.status === 409 || res.status === 400) conflictosRevision.add(1);
    erroresRevision.add(!ok && res.status !== 409 && res.status !== 400);
    delete enCola[revisando.id];
    revisando = null;
  };

  const tick = () => {
    const ahora = Date.now();
    if (ahora >= t0 + T_FIN_REVISION * 1000) return;
    if (listaSucia && ahora >= proximaLista) {
      const repasar = ahora >= proximoRepaso;
      if (repasar) proximoRepaso = ahora + 45000;
      leerLista(repasar);
      listaSucia = false;
      proximaLista = ahora + REFRESCO_LISTA_MS;
      return;
    }
    if (ahora >= proximoRepaso) { listaSucia = true; return; }
    if (revisando) {
      if (ahora >= revisando.hasta) decidir();
      return;
    }
    const siguiente = cola.shift();
    if (!siguiente) return;
    const res = http.get(`${API}/resultados/${siguiente.id}`, cab(token, { paso: 'abrir_acta' }));
    const acta = res.status === 200 ? jsonSeguro(res, 'data') : null;
    if (!acta || acta.estado !== 'pendiente') { delete enCola[siguiente.id]; return; }
    if (siguiente.llegada && acta.updated_at) {
      retrasoAvisoCoordinador.add(Math.max(siguiente.llegada - Date.parse(acta.updated_at), 0));
    }
    revisando = { id: siguiente.id, version: Number(acta.version) || 1, hasta: ahora + segundos(P.revision) };
  };

  mantenerSocket(token, 'coordinador', t0 + T_FIN * 1000, alEvento, tick);
}

// ═══════════════════════════════════════════════════════════════════
// TABLERO EN VIVO: administradores con la pantalla de resultados abierta.
// Cada aviso marca la pantalla como desactualizada; se refresca como mucho
// cada 3 s. Mide cuanto tarda un acta en aparecer en el tablero.
// ═══════════════════════════════════════════════════════════════════
const PAGINAS = {
  resultados: (tipo, q) => [
    ['GET', `${API}/dashboard/resumen${q}`], ['GET', `${API}/dashboard/por-candidato${q}`],
    ['GET', `${API}/dashboard/composicion-voto${q}`], ['GET', `${API}/dashboard/por-distrito?tipo_eleccion=${tipo}`],
    ['GET', `${API}/dashboard/por-local?tipo_eleccion=${tipo}`], ['GET', `${API}/mesas?page=1&limit=25&tipo_eleccion=${tipo}`],
  ],
  inicio: (tipo, q) => [
    ['GET', `${API}/dashboard/resumen${q}`], ['GET', `${API}/dashboard/por-candidato${q}`],
    ['GET', `${API}/dashboard/mesas-pendientes${q}`],
  ],
};

function refrescarTablero(token, pagina, tipo, distritoId) {
  const q = `?tipo_eleccion=${tipo}${tipo === 'distrital' && distritoId ? `&distrito_id=${distritoId}` : ''}`;
  const pedidos = PAGINAS[pagina](tipo, q).map(([m, u]) => [m, u, null, cab(token, { paso: `tablero_${pagina}` })]);
  const inicio = Date.now();
  const respuestas = http.batch(pedidos);
  tiempoTablero.add(Date.now() - inicio);
  const ok = respuestas.every((r) => r.status === 200);
  erroresTablero.add(!ok);
  return ok ? jsonSeguro(respuestas[0], 'data') : null;
}

export function tablero(datos) {
  const t0 = datos.t0;
  const n = exec.scenario.iterationInTest;
  esperarHasta(t0, Math.random() * 10);
  const token = iniciarSesion(ADMINS[n % ADMINS.length], 'admin');
  if (!token) return;

  const distritos = jsonSeguro(http.get(`${API}/distritos`, cab(token, { paso: 'distritos' })), 'data') || [];
  const conDistrital = (Array.isArray(distritos) ? distritos : []).filter((d) => d.tiene_eleccion_distrital);
  const pagina = n % 2 === 0 ? 'resultados' : 'inicio';
  let refrescos = 0;
  let pendienteDesde = null;
  let ultimo = 0;
  let proximoInforme = t0 + 30000;

  const refrescar = () => {
    refrescos += 1;
    const distrital = conDistrital.length && refrescos % 4 === 0;
    const tipo = distrital ? 'distrital' : 'provincial';
    const distrito = distrital ? conDistrital[refrescos % conDistrital.length].id : null;
    const resumen = refrescarTablero(token, pagina, tipo, distrito);
    ultimo = Date.now();
    if (pendienteDesde) retrasoTablero.add(ultimo - pendienteDesde);
    pendienteDesde = null;
    // El primer tablero informa el avance real cada 30 s (se ve en la consola).
    if (n === 0 && resumen && tipo === 'provincial' && ultimo >= proximoInforme) {
      proximoInforme = ultimo + 30000;
      const m = Math.floor((ultimo - t0) / 60000);
      const s = String(Math.floor(((ultimo - t0) % 60000) / 1000)).padStart(2, '0');
      console.log(`[${m}:${s}] tablero provincial: verificadas ${resumen.mesas_verificadas}, `
        + `por revisar ${resumen.mesas_reportadas}, observadas ${resumen.mesas_observadas}, `
        + `sin acta ${resumen.mesas_pendientes} de ${resumen.total_mesas}`);
    }
  };
  refrescar();

  const alEvento = (nombre) => {
    if (nombre.indexOf('resultado:') === 0 && !pendienteDesde) pendienteDesde = Date.now();
  };
  const tick = () => {
    const ahora = Date.now();
    const toca = pendienteDesde && ahora - ultimo >= REFRESCO_TABLERO_MS;
    if (toca || ahora - ultimo >= 60000 || (n === 0 && ahora >= proximoInforme)) refrescar();
  };
  mantenerSocket(token, 'admin', t0 + T_FIN * 1000, alEvento, tick);
}

// ═══════════════════════════════════════════════════════════════════
// LECTORES: pantallas extra que consultan el tablero cada 5-10 s sin
// socket (margen de seguridad sobre la carga de lectura).
// ═══════════════════════════════════════════════════════════════════
let tokenLector = null;
export function lector(datos) {
  if (Date.now() >= datos.t0 + T_FIN * 1000) { sleep(1); return; }
  if (!tokenLector) {
    esperarHasta(datos.t0, Math.random() * 20);
    tokenLector = iniciarSesion(ADMINS[exec.vu.idInTest % ADMINS.length], 'lector');
    if (!tokenLector) { sleep(10); return; }
  }
  refrescarTablero(tokenLector, 'resultados', 'provincial', null);
  sleep(entero(5, 10));
}

// ═══════════════════════════════════════════════════════════════════
// Al terminar: lo que muestra el tablero, para cruzarlo con lo enviado.
// ═══════════════════════════════════════════════════════════════════
export function teardown() {
  if (!ADMINS.length) return;
  const token = iniciarSesion(ADMINS[0], 'teardown');
  if (!token) return;
  const leer = (tipo) => jsonSeguro(http.get(`${API}/dashboard/resumen?tipo_eleccion=${tipo}`, cab(token, { paso: 'teardown' })), 'data') || {};
  const prov = leer('provincial');
  const dist = leer('distrital');
  tableroVerifProv.add(Number(prov.mesas_verificadas) || 0);
  tableroVotosProv.add(Number(prov.total_votos_contados) || 0);
  tableroVerifDist.add(Number(dist.mesas_verificadas) || 0);
  tableroVotosDist.add(Number(dist.total_votos_contados) || 0);
}

// ═══════════════════════════════════════════════════════════════════
export function handleSummary(data) {
  const m = data.metrics;
  const val = (n, c) => (m[n] && m[n].values && m[n].values[c] !== undefined ? m[n].values[c] : 0);
  const cnt = (n) => val(n, 'count');
  const pct = (n) => (val(n, 'rate') * 100).toFixed(2);
  const ms = (n, c) => `${Math.round(val(n, c || 'p(95)'))} ms`;
  const umbralOk = (n) => !m[n] || !m[n].thresholds || Object.values(m[n].thresholds).every((t) => t.ok);
  const marca = (ok) => (ok ? 'CUMPLE' : 'NO CUMPLE  <-- revisar');
  const linea = '='.repeat(70);

  const confProv = cnt('actas_confirmadas_provincial');
  const confDist = cnt('actas_confirmadas_distrital');
  const tabProv = val('tablero_verificadas_provincial', 'value');
  const tabDist = val('tablero_verificadas_distrital', 'value');
  const votosProv = cnt('votos_confirmados_provincial');
  const votosDist = cnt('votos_confirmados_distrital');
  const tvProv = val('tablero_votos_provincial', 'value');
  const tvDist = val('tablero_votos_distrital', 'value');
  const integridad = confProv === tabProv && confDist === tabDist && votosProv === tvProv && votosDist === tvDist
    && cnt('actas_con_cifras_distintas') === 0 && cnt('doble_envio_duplicado') === 0;
  const umbrales = Object.keys(options.thresholds).every(umbralOk);

  const texto = `
${linea}
 JORNADA SIMULADA  perfil: ${PERFIL}   (${PERSONEROS.length} personeros, ${COORDINADORES.length} coordinadores, ${N_ADMINS} tableros)
${linea}
 VOLUMEN
   Peticiones HTTP:                 ${cnt('http_reqs')}   (fallidas ${pct('http_req_failed')} %)
   Actas enviadas / aceptadas:      ${cnt('actas_enviadas')} / ${cnt('actas_aceptadas')}   (${cnt('correcciones_aceptadas')} correcciones)
   Rechazadas por regla (normal):   ${cnt('actas_rechazadas_por_regla')}
   Fotos subidas:                   ${Math.round((cnt('actas_enviadas') * FOTO.byteLength) / 1048576)} MB
   Aprobadas / observadas:          ${cnt('actas_aprobadas')} / ${cnt('actas_observadas')}
   Actas sin terminar al cierre:    ${cnt('actas_sin_terminar')}
   Sockets caidos y reconectados:   ${cnt('ws_desconexiones_inesperadas')}

 SUBIDA DEL ACTA (lo critico)
   p95 ${ms('tiempo_subida_acta_ms')}   max ${ms('tiempo_subida_acta_ms', 'max')}   errores ${pct('errores_subida_acta')} %
   -> ${marca(umbralOk('tiempo_subida_acta_ms') && umbralOk('errores_subida_acta'))}
 DOBLE TOQUE EN "ENVIAR"
   probados ${cnt('doble_envio_probado')}, actas duplicadas ${cnt('doble_envio_duplicado')}
   -> ${marca(cnt('doble_envio_duplicado') === 0)}
 REVISION DEL COORDINADOR
   aviso al coordinador p95 ${ms('retraso_aviso_coordinador_ms')}   aprobar/observar p95 ${ms('tiempo_revision_ms')}   errores ${pct('errores_revision')} %
   -> ${marca(umbralOk('retraso_aviso_coordinador_ms') && umbralOk('tiempo_revision_ms') && umbralOk('errores_revision'))}
 AVISO AL PERSONERO (tiempo real entre servidores)
   recibidos por socket: ${pct('aviso_personero_recibido')} %
   -> ${marca(umbralOk('aviso_personero_recibido'))}
 TABLERO EN VIVO
   el acta aparece en el tablero en p95 ${ms('retraso_tablero_ms')}   carga de pantalla p95 ${ms('tiempo_tablero_ms')}   errores ${pct('errores_tablero')} %
   -> ${marca(umbralOk('retraso_tablero_ms') && umbralOk('tiempo_tablero_ms') && umbralOk('errores_tablero'))}
 ENTRADA AL SISTEMA
   login p95 ${ms('tiempo_login_ms')}   errores ${pct('errores_login')} %   sockets fallidos ${pct('ws_conexion_fallida')} %
   -> ${marca(umbralOk('errores_login') && umbralOk('tiempo_login_ms') && umbralOk('ws_conexion_fallida'))}

 INTEGRIDAD (lo enviado contra lo que muestra el tablero)
   Provincial: actas aprobadas ${confProv} / tablero ${tabProv}   votos ${votosProv} / tablero ${tvProv}
   Distrital:  actas aprobadas ${confDist} / tablero ${tabDist}   votos ${votosDist} / tablero ${tvDist}
   Actas con cifras distintas a las enviadas: ${cnt('actas_con_cifras_distintas')}
   -> ${marca(integridad)}

 VEREDICTO: ${umbrales && integridad ? 'APROBADA. El sistema soporto la jornada simulada.' : 'NO APROBADA. Revise las lineas marcadas.'}
${linea}
`;
  return {
    stdout: texto,
    'resultado-jornada.txt': texto,
    'resultado-jornada.json': JSON.stringify(data, null, 1),
  };
}
