/**
 * Ejecutor de Pruebas de Carga en Node.js (Sin dependencia obligatoria de binarios externos).
 * Simula concurrencia real de usuarios personeros y coordinadores midiendo latencia p50, p95 y tasa de error.
 * 
 * Uso:
 *   node tests/load/run-load-test.js [concurrencia] [duracionSegundos] [urlBase]
 * Ejemplo:
 *   node tests/load/run-load-test.js 50 10 http://localhost:3000
 */

import http from 'http';
import https from 'https';
import jwt from 'jsonwebtoken';
import { authConfig } from '../../src/config/auth.js';

const CONCURRENCY = parseInt(process.argv[2] || '50', 10);
const DURATION_SECONDS = parseInt(process.argv[3] || '10', 10);
const BASE_URL = process.argv[4] || process.env.API_URL || 'http://localhost:3000';

const secret = authConfig.secret || process.env.JWT_SECRET || 'secret';
const adminToken = jwt.sign({ id: 1, dni: '00000000', rol: 'admin' }, secret, { expiresIn: '1h' });
const coordToken = jwt.sign({ id: 2, dni: '11111111', rol: 'coordinador' }, secret, { expiresIn: '1h' });
const personeroToken = jwt.sign({ id: 3, dni: '22222222', rol: 'personero' }, secret, { expiresIn: '1h' });

const ENDPOINTS = [
  { path: '/api/health', method: 'GET', token: null, weight: 20 },
  { path: '/api/dashboard/resumen', method: 'GET', token: adminToken, weight: 25 },
  { path: '/api/coordinador/locales', method: 'GET', token: coordToken, weight: 20 },
  { path: '/api/coordinador/personeros', method: 'GET', token: coordToken, weight: 15 },
  { path: '/api/candidatos', method: 'GET', token: personeroToken, weight: 20 },
];

function elegirEndpoint() {
  const total = ENDPOINTS.reduce((acc, e) => acc + e.weight, 0);
  let rnd = Math.random() * total;
  for (const ep of ENDPOINTS) {
    if (rnd < ep.weight) return ep;
    rnd -= ep.weight;
  }
  return ENDPOINTS[0];
}

function hacerPeticion(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.path, BASE_URL);
    const start = Date.now();

    const options = {
      method: endpoint.method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Accept': 'application/json',
      },
    };

    if (endpoint.token) {
      options.headers['Authorization'] = `Bearer ${endpoint.token}`;
    }

    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({
          statusCode: res.statusCode,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - start;
      resolve({
        statusCode: 0,
        duration,
        success: false,
        error: err.message,
      });
    });

    req.setTimeout(10000, () => {
      req.destroy(new Error('Timeout'));
    });

    req.end();
  });
}

async function runLoadTest() {
  console.log('===============================================================');
  console.log('  PRUEBA DE CARGA DEL SISTEMA ELECTORAL');
  console.log(`  Destino:      ${BASE_URL}`);
  console.log(`  Concurrencia: ${CONCURRENCY} usuarios virtuales`);
  console.log(`  Duración:     ${DURATION_SECONDS} segundos`);
  console.log('===============================================================');

  const endTime = Date.now() + (DURATION_SECONDS * 1000);
  const results = [];
  let activeWorkers = 0;

  async function worker() {
    activeWorkers++;
    while (Date.now() < endTime) {
      const ep = elegirEndpoint();
      const res = await hacerPeticion(ep);
      results.push(res);
      // Breve pausa para simular comportamiento humano (10ms a 50ms)
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 40) + 10));
    }
    activeWorkers--;
  }

  // Iniciar workers concurrentes
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  // Calcular métricas
  const totalRequests = results.length;
  if (totalRequests === 0) {
    console.log('No se pudieron registrar peticiones (¿servidor no disponible?).');
    return;
  }

  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = totalRequests - successfulRequests;
  const errorRate = ((failedRequests / totalRequests) * 100).toFixed(2);
  const durations = results.map(r => r.duration).sort((a, b) => a - b);
  
  const p50 = durations[Math.floor(durations.length * 0.50)] || 0;
  const p90 = durations[Math.floor(durations.length * 0.90)] || 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
  const p99 = durations[Math.floor(durations.length * 0.99)] || 0;
  const rps = (totalRequests / DURATION_SECONDS).toFixed(1);

  console.log('\n--- RESULTADOS DE LA PRUEBA DE CARGA ---');
  console.log(`Peticiones Totales:       ${totalRequests}`);
  console.log(`Peticiones Exitosas:      ${successfulRequests}`);
  console.log(`Peticiones Fallidas:      ${failedRequests} (${errorRate}%)`);
  console.log(`Throughput (RPS):         ${rps} req/seg`);
  console.log(`Latencia Mediana (p50):   ${p50} ms`);
  console.log(`Latencia p90:             ${p90} ms`);
  console.log(`Latencia p95:             ${p95} ms`);
  console.log(`Latencia p99:             ${p99} ms`);
  console.log('----------------------------------------');

  if (parseFloat(errorRate) < 2.0 && p95 < 1500) {
    console.log('✅ PRUEBA DE CARGA SUPERADA: Rendimiento óptimo bajo concurrencia.');
  } else {
    console.log('⚠️ AVISO: Revisar límites de conexión o latencia de red.');
  }
}

runLoadTest().catch(console.error);
