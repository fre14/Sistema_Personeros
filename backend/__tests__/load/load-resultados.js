import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '3m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

export function setup() {
  const payload = JSON.stringify({
    dni: '00000000',
    password: 'admin123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);
  
  return { token: res.json('accessToken') };
}

export default function (data) {
  const mesa_id = (__VU % 100) + 1;

  const payload = JSON.stringify({
    mesa_id: mesa_id,
    votos: [
      { candidato_id: 1, votos: 150 },
      { candidato_id: 2, votos: 100 }
    ],
    votos_blanco: 10,
    votos_nulo: 5,
    votos_impugnados: 2,
    total_cedulas_votacion: 267
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.token}`,
    },
  };

  const res = http.post(`${BASE_URL}/api/resultados`, payload, params);

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  sleep(Math.random() * 2 + 1);
}
