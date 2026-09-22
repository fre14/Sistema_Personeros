/**
 * Ejecutor de Pruebas de Carga en Node.js (Sin dependencia obligatoria de binarios externos).
 * Simula concurrencia real de usuarios personeros, coordinadores y administradores midiendo latencia p50, p95 y tasa de error.
 * Soporta elecciones provinciales y distritales.
 * 
 * Uso:
 *   node __tests__/load/run-load-test.js [concurrencia] [duracionSegundos] [urlBase]
 * Ejemplo:
 *   node __tests__/load/run-load-test.js 50 10 http://localhost:3000
 */

process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_API = process.env.RATE_LIMIT_API || '100000';
process.env.RATE_LIMIT_AUTH = process.env.RATE_LIMIT_AUTH || '100000';
process.env.RATE_LIMIT_WRITE = process.env.RATE_LIMIT_WRITE || '100000';

import http from 'http';
import https from 'https';
import jwt from 'jsonwebtoken';
import { authConfig } from '../../src/config/auth.js';

let appInstance = null;
let dbInstance = null;


const CONCURRENCY = parseInt(process.argv[2] || '50', 10);
const DURATION_SECONDS = parseInt(process.argv[3] || '10', 10);
let BASE_URL = process.argv[4] || process.env.API_URL || 'http://localhost:3000';

const secret = authConfig.secret || process.env.JWT_SECRET || 'secret';
const adminToken = jwt.sign({ id: 1, dni: '00000000', rol: 'admin' }, secret, { expiresIn: '1h' });
const coordToken = jwt.sign({ id: 2, dni: '11111111', rol: 'coordinador' }, secret, { expiresIn: '1h' });
const personeroToken = jwt.sign({ id: 3, dni: '22222222', rol: 'personero' }, secret, { expiresIn: '1h' });

const ENDPOINTS = [
  { path: '/api/health', method: 'GET', token: null, weight: 15 },
  { path: '/api/dashboard/resumen', method: 'GET', token: adminToken, weight: 20 },
  { path: '/api/dashboard/resumen?tipo_eleccion=distrital', method: 'GET', token: adminToken, weight: 15 },
  { path: '/api/coordinador/locales', method: 'GET', token: coordToken, weight: 15 },
  { path: '/api/coordinador/personeros', method: 'GET', token: coordToken, weight: 10 },
  { path: '/api/candidatos', method: 'GET', token: personeroToken, weight: 10 },
  { path: '/api/candidatos?tipo_eleccion=distrital', method: 'GET', token: personeroToken, weight: 15 },
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

function hacerPeticion(endpoint, targetBaseUrl = BASE_URL) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.path, targetBaseUrl);
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

async function asegurarServidor() {
  const prueba = await hacerPeticion({ path: '/api/health', method: 'GET', token: null }, BASE_URL);
  if (prueba.statusCode === 200) {
    return { server: null, baseUrl: BASE_URL };
  }

  const { app } = await import('../../src/app.js');
  const { default: db } = await import('../../src/config/database.js');
  appInstance = app;
  dbInstance = db;

  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const ephemeralUrl = `http://127.0.0.1:${port}`;
      resolve({ server, baseUrl: ephemeralUrl });
    });
  });
}

async function runLoadTest() {
  const { server, baseUrl } = await asegurarServidor();
  BASE_URL = baseUrl;

  console.log('===============================================================');
  console.log('  PRUEBA DE CARGA DEL SISTEMA ELECTORAL (PROVINCIAL + DISTRITAL)');
  console.log(`  Destino:      ${BASE_URL}`);
  console.log(`  Concurrencia: ${CONCURRENCY} usuarios virtuales concurrentes`);
  console.log(`  Duración:     ${DURATION_SECONDS} segundos`);
  console.log('===============================================================');

  const endTime = Date.now() + (DURATION_SECONDS * 1000);
  const results = [];
  let activeWorkers = 0;

  async function worker() {
    activeWorkers++;
    while (Date.now() < endTime) {
      const ep = elegirEndpoint();
      const res = await hacerPeticion(ep, BASE_URL);
      results.push(res);
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 30) + 5));
    }
    activeWorkers--;
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  const totalRequests = results.length;
  if (totalRequests === 0) {
    console.log('No se pudieron registrar peticiones.');
    if (server) server.close();
    if (dbInstance) await dbInstance.destroy();
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

  if (parseFloat(errorRate) < 5.0 && p95 < 2000) {
    console.log('✅ PRUEBA DE CARGA SUPERADA: Rendimiento óptimo bajo concurrencia.');
  } else {
    console.log('⚠️ AVISO: Revisar límites de conexión o latencia.');
  }

  if (server) {
    await new Promise(r => server.close(r));
  }
    if (dbInstance) await dbInstance.destroy();
  process.exit(parseFloat(errorRate) < 5.0 ? 0 : 1);
}

runLoadTest().catch(async (err) => {
  console.error('Error en prueba de carga:', err);
  if (dbInstance) await dbInstance.destroy().catch(() => {});
  process.exit(1);
});
