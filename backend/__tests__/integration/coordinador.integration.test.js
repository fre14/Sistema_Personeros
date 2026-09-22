import request from 'supertest';
import { app } from '../../src/app.js';
import db from '../../src/config/database.js';
import { generateAdminToken, generateCoordinadorToken, generatePersoneroToken } from '../setup/helpers.js';

describe('Integración: Flujo y Supervisión de Coordinadores y Personeros', () => {
  let adminToken;
  let coordinadorToken;
  let personeroToken;
  let testLocalId;

  beforeAll(async () => {
    adminToken = generateAdminToken();
    coordinadorToken = generateCoordinadorToken(2);
    personeroToken = generatePersoneroToken(3);

    // Obtener un local de votación existente para las pruebas
    const local = await db('locales_votacion').first();
    if (local) {
      testLocalId = local.id;
    }
  });

  afterAll(async () => {
    // Cerrar conexiones
    await db.destroy();
  });

  describe('Seguridad y Control de Acceso (RBAC)', () => {
    it('debe rechazar con 401 si no se envía token', async () => {
      const res = await request(app)
        .get('/api/coordinador/locales')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('debe rechazar con 403 si un personero intenta acceder a rutas de coordinador', async () => {
      const res = await request(app)
        .get('/api/coordinador/locales')
        .set('Authorization', `Bearer ${personeroToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Insufficient permissions/i);
    });
  });

  describe('GET /api/coordinador/locales', () => {
    it('debe permitir a un administrador o coordinador listar los locales asignados con estadísticas', async () => {
      const res = await request(app)
        .get('/api/coordinador/locales')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      if (res.body.data.length > 0) {
        const local = res.body.data[0];
        expect(local).toHaveProperty('id');
        expect(local).toHaveProperty('nombre');
        expect(local).toHaveProperty('distrito');
        expect(local).toHaveProperty('stats');
        expect(local.stats).toHaveProperty('total');
        expect(local.stats).toHaveProperty('verificadas');
        expect(local.stats).toHaveProperty('pendientes');
        expect(local.stats).toHaveProperty('personeros_asignados');
      }
    });
  });

  describe('GET /api/coordinador/personeros', () => {
    it('debe retornar la lista de personeros supervisados automáticamente', async () => {
      const res = await request(app)
        .get('/api/coordinador/personeros')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      if (res.body.data.length > 0) {
        const p = res.body.data[0];
        expect(p).toHaveProperty('personero_id');
        expect(p).toHaveProperty('dni');
        expect(p).toHaveProperty('nombres');
        expect(p).toHaveProperty('mesa_id');
        expect(p).toHaveProperty('numero_mesa');
        expect(p).toHaveProperty('local_nombre');
      }
    });

    it('debe permitir buscar personeros por término de búsqueda (q)', async () => {
      const res = await request(app)
        .get('/api/coordinador/personeros?q=00')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/coordinador/locales/:localId/mesas', () => {
    it('debe retornar mesas y personeros asignados para el local especificado', async () => {
      if (!testLocalId) return;

      const res = await request(app)
        .get(`/api/coordinador/locales/${testLocalId}/mesas`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('local');
      expect(res.body.data).toHaveProperty('mesas');
      expect(Array.isArray(res.body.data.mesas)).toBe(true);

      if (res.body.data.mesas.length > 0) {
        const mesa = res.body.data.mesas[0];
        expect(mesa).toHaveProperty('id');
        expect(mesa).toHaveProperty('numero_mesa');
        expect(mesa).toHaveProperty('estado');
        expect(mesa).toHaveProperty('electores_habiles');
      }
    });

    it('debe devolver 404 si el local no existe', async () => {
      const res = await request(app)
        .get('/api/coordinador/locales/999999/mesas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });
});
