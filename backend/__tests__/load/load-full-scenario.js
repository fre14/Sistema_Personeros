import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const loginSuccess = new Rate('login_success_rate');
const submissionSuccess = new Rate('submission_success_rate');

export const options = {
  scenarios: {
    personeros_login: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 200 },
      ],
      exec: 'personerosLogin',
    },
    personeros_submit: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 800,
      stages: [
        { duration: '10m', target: 80 }, 
      ],
      exec: 'personerosSubmit',
    },
    coordinadores_verify: {
      executor: 'constant-vus',
      vus: 96,
      duration: '10m',
      exec: 'coordinadoresVerify',
    },
    admin_dashboard: {
      executor: 'constant-vus',
      vus: 10,
      duration: '10m',
      exec: 'adminDashboard',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_reqs: ['rate>200'],
    http_req_failed: ['rate<0.01'],
  },
};

export function personerosLogin() {
  const payload = JSON.stringify({
    dni: `PERSONERO_${__VU}`,
    password: 'password123',
  });
  const res = http.post(`${BASE_URL}/api/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  loginSuccess.add(res.status === 200);
  sleep(Math.random() * 5 + 1);
}

export function personerosSubmit() {
  const payload = JSON.stringify({
    mesa_id: Math.floor(Math.random() * 1000) + 1,
    votos: [{ candidato_id: 1, votos: 100 }],
    votos_blanco: 10,
    votos_nulo: 5,
    votos_impugnados: 2,
    total_cedulas_votacion: 117
  });
  const res = http.post(`${BASE_URL}/api/resultados`, payload, {
    headers: { 'Content-Type': 'application/json' }, 
  });
  submissionSuccess.add(res.status === 200 || res.status === 201);
  sleep(Math.random() * 10 + 5);
}

export function coordinadoresVerify() {
  const res = http.get(`${BASE_URL}/api/resultados/pendientes`);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(10);
}

export function adminDashboard() {
  const res = http.get(`${BASE_URL}/api/dashboard/resumen`);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(3);
}
