import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
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
  const params = {
    headers: {
      'Authorization': `Bearer ${data.token}`,
    },
  };

  const res1 = http.get(`${BASE_URL}/api/dashboard/resumen`, params);
  check(res1, { 'resumen status is 200': (r) => r.status === 200 });

  const res2 = http.get(`${BASE_URL}/api/dashboard/por-candidato`, params);
  check(res2, { 'por-candidato status is 200': (r) => r.status === 200 });

  const res3 = http.get(`${BASE_URL}/api/dashboard/mesas-pendientes`, params);
  check(res3, { 'mesas-pendientes status is 200': (r) => r.status === 200 });

  sleep(3);
}
