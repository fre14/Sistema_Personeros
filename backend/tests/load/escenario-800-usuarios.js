/**
 * Prueba de carga: 800 personeros simultaneos.
 *
 * Reproduce la jornada real: los personeros entran de golpe entre las 4 y
 * las 5 PM, consultan su mesa, envian el acta, y coordinadores y admin
 * refrescan el tablero todo el tiempo.
 *
 * Ejecutar:
 *   k6 run -e BASE_URL=https://elecciones.sudominio.com escenario-800-usuarios.js
 *
 * Instalar k6:
 *   sudo gpg -k && sudo gpg --no-default-keyring \
 *     --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
 *     --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
 *   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
 *     | sudo tee /etc/apt/sources.list.d/k6.list
 *   sudo apt-get update && sudo apt-get install k6
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost';
const DNI_ADMIN = __ENV.DNI_ADMIN || '00000000';
const PASS_ADMIN = __ENV.PASS_ADMIN || 'admin123';

const erroresLogin = new Rate('errores_login');
const erroresDashboard = new Rate('errores_dashboard');
const tiempoDashboard = new Trend('tiempo_dashboard_ms');
const tiempoLogin = new Trend('tiempo_login_ms');
const peticionesTotales = new Counter('peticiones_totales');

export const options = {
  scenarios: {
    // 800 personeros entrando y trabajando
    personeros: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },   // primeros locales cierran
        { duration: '3m', target: 600 },   // entrada masiva
        { duration: '5m', target: 800 },   // pico sostenido
        { duration: '5m', target: 800 },   // se mantiene el pico
        { duration: '2m', target: 200 },   // baja el ritmo
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'flujoPersonero',
    },
    // ~100 coordinadores y admin refrescando el tablero sin parar
    supervisores: {
      executor: 'constant-vus',
      vus: 100,
      duration: '18m',
      exec: 'flujoSupervisor',
    },
  },
  thresholds: {
    // Objetivos de la jornada
    'http_req_duration{expected_response:true}': ['p(95)<1500', 'p(99)<3000'],
    'http_req_failed': ['rate<0.02'],
    'errores_login': ['rate<0.02'],
    'errores_dashboard': ['rate<0.02'],
    'tiempo_dashboard_ms': ['p(95)<800'],
  },
};

const cabeceras = (token) => ({
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
});

function iniciarSesion(dni, password) {
  const inicio = Date.now();
  const res = http.post(`${BASE}/api/auth/login`,
    JSON.stringify({ dni, password }), cabeceras());
  tiempoLogin.add(Date.now() - inicio);
  peticionesTotales.add(1);

  const ok = check(res, {
    'login responde 200': (r) => r.status === 200,
    'login devuelve token': (r) => {
      try { return !!r.json('data.accessToken'); } catch { return false; }
    },
  });
  erroresLogin.add(!ok);
  if (!ok) return null;
  try { return res.json('data.accessToken'); } catch { return null; }
}

export function flujoPersonero() {
  // Los DNI de prueba deben existir en la base. Ver docs sobre datos de prueba.
  const indice = (__VU % 800) + 1;
  const dni = String(10000000 + indice);
  const token = iniciarSesion(dni, __ENV.PASS_PERSONERO || dni);

  if (!token) { sleep(5); return; }

  group('personero consulta su mesa', () => {
    const res = http.get(`${BASE}/api/resultados/mi-mesa`, cabeceras(token));
    peticionesTotales.add(1);
    check(res, { 'mi-mesa responde': (r) => r.status === 200 || r.status === 404 });
  });

  // El personero mira su pantalla, espera el escrutinio, revisa de nuevo
  sleep(Math.random() * 20 + 10);

  group('personero revisa estado', () => {
    const res = http.get(`${BASE}/api/resultados/mi-mesa`, cabeceras(token));
    peticionesTotales.add(1);
    check(res, { 'estado consultado': (r) => r.status < 500 });
  });

  sleep(Math.random() * 30 + 15);
}

export function flujoSupervisor() {
  const token = iniciarSesion(DNI_ADMIN, PASS_ADMIN);
  if (!token) { sleep(10); return; }

  for (let i = 0; i < 20; i++) {
    group('tablero en vivo', () => {
      const inicio = Date.now();
      const respuestas = http.batch([
        ['GET', `${BASE}/api/dashboard/resumen`, null, cabeceras(token)],
        ['GET', `${BASE}/api/dashboard/por-candidato`, null, cabeceras(token)],
        ['GET', `${BASE}/api/dashboard/por-distrito`, null, cabeceras(token)],
      ]);
      tiempoDashboard.add(Date.now() - inicio);
      peticionesTotales.add(3);

      const ok = respuestas.every((r) => r.status === 200);
      erroresDashboard.add(!ok);
      check(respuestas[0], { 'resumen responde 200': (r) => r.status === 200 });
    });

    sleep(Math.random() * 5 + 3);
  }
}

export function handleSummary(data) {
  const m = data.metrics;
  const p95 = (x) => (m[x]?.values?.['p(95)'] ?? 0).toFixed(0);
  const linea = '='.repeat(60);

  const resumen = `
${linea}
 RESULTADO DE LA PRUEBA DE CARGA
${linea}
 Peticiones totales:      ${m.peticiones_totales?.values?.count ?? 0}
 Peticiones fallidas:     ${((m.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2)}%

 Tiempo de respuesta general
   p95: ${p95('http_req_duration')} ms
   p99: ${(m.http_req_duration?.values?.['p(99)'] ?? 0).toFixed(0)} ms

 Login
   p95: ${p95('tiempo_login_ms')} ms
   errores: ${((m.errores_login?.values?.rate ?? 0) * 100).toFixed(2)}%

 Dashboard
   p95: ${p95('tiempo_dashboard_ms')} ms
   errores: ${((m.errores_dashboard?.values?.rate ?? 0) * 100).toFixed(2)}%

 Criterio de aprobacion: p95 < 1500 ms y fallos < 2%
${linea}
`;
  console.log(resumen);
  return { 'stdout': resumen, 'resumen-carga.json': JSON.stringify(data, null, 2) };
}
