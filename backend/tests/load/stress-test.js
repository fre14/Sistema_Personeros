import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const successCounter = new Counter('successful_requests');
const failedCounter = new Counter('failed_requests');

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '3m', target: 500 },
    { duration: '3m', target: 1000 },
    { duration: '3m', target: 2000 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
  },
};

export default function () {
  const payload = JSON.stringify({
    dni: '00000000',
    password: 'admin123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, payload, params);
  
  if (loginRes.status === 200) {
    successCounter.add(1);
    const token = loginRes.json('accessToken');
    
    const dashboardRes = http.get(`${BASE_URL}/api/dashboard/resumen`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (dashboardRes.status === 200) {
      successCounter.add(1);
    } else {
      failedCounter.add(1);
    }
  } else {
    failedCounter.add(1);
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': `
      --- Breaking Point Analysis ---
      Total VUs reached: ${data.metrics.vus ? data.metrics.vus.max : 'unknown'}
      Successful Requests: ${data.metrics.successful_requests ? data.metrics.successful_requests.values.count : 0}
      Failed Requests: ${data.metrics.failed_requests ? data.metrics.failed_requests.values.count : 0}
      Error Rate: ${data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0}%
      p(95) Duration: ${data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'].toFixed(2) : 0}ms
      -------------------------------
    `
  };
}
