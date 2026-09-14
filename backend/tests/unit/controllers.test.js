import { jest } from '@jest/globals';

// ─────────────────────────────────────────────────────────
// Test: auth.controller.js & dashboard.controller.js
// Uses jest.unstable_mockModule for ESM mocking
// ─────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════
// MOCK SETUP (must be before dynamic imports)
// ═══════════════════════════════════════════════════════

const mockInsert = jest.fn();
const mockDbChain = {
  where: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  first: jest.fn(),
  count: jest.fn().mockReturnThis(),
  sum: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnValue({ returning: jest.fn() }),
  update: jest.fn(),
};

const mockDb = jest.fn(() => mockDbChain);
mockDb.fn = { now: jest.fn() };

jest.unstable_mockModule('../../src/config/database.js', () => ({
  default: mockDb,
}));

jest.unstable_mockModule('../../src/services/auditoria.service.js', () => ({
  registrarAuditoria: jest.fn(),
}));

jest.unstable_mockModule('../../src/services/websocket.service.js', () => ({
  notifyCoordinator: jest.fn(),
  notifyAdmin: jest.fn(),
  notifyPersonero: jest.fn(),
  getIo: jest.fn(),
  setupWebSocket: jest.fn(),
}));

jest.unstable_mockModule('../../src/services/storage.service.js', () => ({
  uploadActaImage: jest.fn(),
  getActaUrl: jest.fn(),
  deleteActaImage: jest.fn(),
}));

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: { id: 1, dni: '00000000', rol: 'admin' },
  ...overrides,
});

// ═══════════════════════════════════════════════════════
// AUTH CONTROLLER TESTS
// ═══════════════════════════════════════════════════════
describe('Auth Controller', () => {
  let authController;
  let bcrypt;

  beforeAll(async () => {
    // Dynamic import after mocks are set
    authController = await import('../../src/controllers/auth.controller.js');
    bcrypt = await import('bcryptjs');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('debe retornar 401 cuando el DNI no existe', async () => {
      const req = mockReq({ body: { dni: '99999999', password: 'abc123' } });
      const res = mockRes();

      mockDbChain.first.mockResolvedValueOnce(null); // user not found

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('debe retornar 401 cuando la contraseña es incorrecta', async () => {
      const req = mockReq({ body: { dni: '00000000', password: 'wrongpass' } });
      const res = mockRes();

      const hashedPassword = await bcrypt.hash('correctpass', 12);
      mockDbChain.first.mockResolvedValueOnce({
        id: 1, dni: '00000000', nombres: 'Admin', apellidos: 'Sistema',
        password_hash: hashedPassword, rol: 'admin', activo: true,
      });

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('debe retornar tokens cuando las credenciales son correctas', async () => {
      const req = mockReq({ body: { dni: '00000000', password: 'admin123' } });
      const res = mockRes();

      const hashedPassword = await bcrypt.hash('admin123', 12);
      mockDbChain.first.mockResolvedValueOnce({
        id: 1, dni: '00000000', nombres: 'Admin', apellidos: 'Sistema',
        password_hash: hashedPassword, rol: 'admin', activo: true,
      });

      await authController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            user: expect.objectContaining({ id: 1, rol: 'admin' }),
          }),
        })
      );
    });

    it('debe permitir login de personero con número de mesa', async () => {
      const req = mockReq({ body: { dni: '22222222', password: '000101' } });
      const res = mockRes();

      // First call: user lookup - returns personero with wrong password_hash
      mockDbChain.first
        .mockResolvedValueOnce({
          id: 3, dni: '22222222', nombres: 'Pedro', apellidos: 'Test',
          password_hash: await bcrypt.hash('otraclave', 12), rol: 'personero', activo: true,
        })
        // Second call: mesa lookup for personero alt-auth
        .mockResolvedValueOnce({ numero_mesa: '000101' });

      await authController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: expect.any(String),
          }),
        })
      );
    });

    it('debe retornar 401 con número de mesa incorrecto para personero', async () => {
      const req = mockReq({ body: { dni: '22222222', password: '999999' } });
      const res = mockRes();

      mockDbChain.first
        .mockResolvedValueOnce({
          id: 3, dni: '22222222', nombres: 'Pedro', apellidos: 'Test',
          password_hash: await bcrypt.hash('otraclave', 12), rol: 'personero', activo: true,
        })
        .mockResolvedValueOnce({ numero_mesa: '000101' }); // doesn't match

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('debe retornar 500 cuando hay un error de servidor', async () => {
      const req = mockReq({ body: { dni: '00000000', password: 'admin123' } });
      const res = mockRes();

      mockDbChain.first.mockRejectedValueOnce(new Error('DB connection failed'));

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('Error') })
      );
    });
  });

  describe('refreshToken', () => {
    it('debe retornar 401 cuando no se proporciona token', async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();

      await authController.refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('debe retornar 401 con token inválido', async () => {
      const req = mockReq({ body: { token: 'invalid.token.here' } });
      const res = mockRes();

      await authController.refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('debe retornar nuevo accessToken con refresh token válido', async () => {
      const jwt = await import('jsonwebtoken');
      const validRefresh = jwt.default.sign(
        { id: 1, dni: '00000000', rol: 'admin' },
        process.env.JWT_REFRESH_SECRET || 'refresh_secret',
        { expiresIn: '7d' }
      );

      const req = mockReq({ body: { token: validRefresh } });
      const res = mockRes();

      await authController.refreshToken(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ accessToken: expect.any(String) }),
        })
      );
    });
  });

  describe('getProfile', () => {
    it('debe retornar perfil del usuario sin password_hash', async () => {
      const req = mockReq({ user: { id: 1 } });
      const res = mockRes();

      mockDbChain.first.mockResolvedValueOnce({
        id: 1, dni: '00000000', nombres: 'Admin', apellidos: 'Sistema',
        password_hash: 'hash_secreto', rol: 'admin', activo: true,
      });

      await authController.getProfile(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      const data = res.json.mock.calls[0][0].data;
      expect(data.password_hash).toBeUndefined();
    });

    it('debe retornar 404 cuando el usuario no existe', async () => {
      const req = mockReq({ user: { id: 999 } });
      const res = mockRes();

      mockDbChain.first.mockResolvedValueOnce(null);

      await authController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debe retornar 500 en error de servidor', async () => {
      const req = mockReq({ user: { id: 1 } });
      const res = mockRes();

      mockDbChain.first.mockRejectedValueOnce(new Error('DB error'));

      await authController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('changePassword', () => {
    it('debe retornar 400 cuando la nueva contraseña es muy corta', async () => {
      const req = mockReq({
        user: { id: 1 },
        body: { currentPassword: 'admin123', newPassword: '12' },
      });
      const res = mockRes();

      await authController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe retornar 404 cuando el usuario no existe', async () => {
      const req = mockReq({
        user: { id: 999 },
        body: { currentPassword: 'admin123', newPassword: 'newpass123' },
      });
      const res = mockRes();

      mockDbChain.first.mockResolvedValueOnce(null);

      await authController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debe retornar 400 con contraseña actual incorrecta', async () => {
      const req = mockReq({
        user: { id: 1 },
        body: { currentPassword: 'wrongcurrent', newPassword: 'newpass123' },
      });
      const res = mockRes();

      const bcryptMod = await import('bcryptjs');
      mockDbChain.first.mockResolvedValueOnce({
        id: 1, password_hash: await bcryptMod.hash('admin123', 12),
      });

      await authController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe cambiar contraseña exitosamente', async () => {
      const req = mockReq({
        user: { id: 1 },
        body: { currentPassword: 'admin123', newPassword: 'newpass123' },
      });
      const res = mockRes();

      const bcryptMod = await import('bcryptjs');
      mockDbChain.first.mockResolvedValueOnce({
        id: 1, password_hash: await bcryptMod.hash('admin123', 12),
      });
      mockDbChain.update.mockResolvedValueOnce(1);

      await authController.changePassword(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('actualizada'),
        })
      );
    });

    it('debe retornar 500 en error de servidor', async () => {
      const req = mockReq({
        user: { id: 1 },
        body: { currentPassword: 'admin123', newPassword: 'newpass123' },
      });
      const res = mockRes();

      mockDbChain.first.mockRejectedValueOnce(new Error('DB error'));

      await authController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

// ═══════════════════════════════════════════════════════
// DASHBOARD CONTROLLER TESTS
// ═══════════════════════════════════════════════════════
describe('Dashboard Controller', () => {
  let dashboardController;

  beforeAll(async () => {
    dashboardController = await import('../../src/controllers/dashboard.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getResumen', () => {
    it('debe retornar resumen con todos los campos estadísticos', async () => {
      const req = mockReq();
      const res = mockRes();

      // Mock all the chained queries
      mockDbChain.first
        .mockResolvedValueOnce({ c: '787' })   // total_mesas count
        .mockResolvedValueOnce({ c: '800' })   // total_personeros
        .mockResolvedValueOnce({ c: '750' })   // personeros_asig
        .mockResolvedValueOnce({ c: '96' })    // total_locales
        .mockResolvedValueOnce({ s: '50000' }); // total_votos

      // mesas_estados groupBy returns array
      mockDbChain.groupBy.mockResolvedValueOnce([
        { estado: 'pendiente', c: '200' },
        { estado: 'reportada', c: '300' },
        { estado: 'verificada', c: '250' },
        { estado: 'observada', c: '37' },
      ]);

      await dashboardController.getResumen(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            total_mesas: expect.any(Number),
            mesas_pendientes: expect.any(Number),
            mesas_verificadas: expect.any(Number),
            porcentaje_avance: expect.any(Number),
          }),
        })
      );
    });

    it('debe retornar 500 en error de servidor', async () => {
      const req = mockReq();
      const res = mockRes();

      mockDbChain.first.mockRejectedValueOnce(new Error('DB error'));

      await dashboardController.getResumen(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getResultadosPorCandidato', () => {
    it('debe retornar resultados por candidato con porcentajes', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();

      mockDbChain.orderBy.mockResolvedValueOnce([
        { id: 1, nombre_completo: 'Candidato A', organizacion_politica: 'Partido A', total_votos: '6000' },
        { id: 2, nombre_completo: 'Candidato B', organizacion_politica: 'Partido B', total_votos: '4000' },
      ]);

      await dashboardController.getResultadosPorCandidato(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              total_votos: expect.any(Number),
              porcentaje: expect.any(Number),
            }),
          ]),
        })
      );
    });

    it('debe filtrar por distrito_id cuando se proporciona', async () => {
      const req = mockReq({ query: { distrito_id: '1' } });
      const res = mockRes();

      mockDbChain.orderBy.mockResolvedValueOnce([]);

      await dashboardController.getResultadosPorCandidato(req, res);

      expect(mockDbChain.where).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('debe retornar 500 en error de servidor', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();

      mockDbChain.orderBy.mockRejectedValueOnce(new Error('DB error'));

      await dashboardController.getResultadosPorCandidato(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMesasPendientes', () => {
    it('debe retornar mesas pendientes', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();

      // The query chain ends without .first(), so mock the final resolution
      mockDb.mockImplementationOnce(() => ({
        ...mockDbChain,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([
          { id: 1, numero_mesa: '000101', estado: 'pendiente', local_nombre: 'IE Test' },
        ]),
      }));

      await dashboardController.getMesasPendientes(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('getAuditoria', () => {
    it('debe retornar logs de auditoría', async () => {
      const req = mockReq();
      const res = mockRes();

      mockDbChain.limit.mockResolvedValueOnce([
        { id: 1, tabla_afectada: 'usuarios', accion: 'INSERT' },
        { id: 2, tabla_afectada: 'mesas', accion: 'UPDATE' },
      ]);

      await dashboardController.getAuditoria(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
        })
      );
    });

    it('debe retornar 500 en error de servidor', async () => {
      const req = mockReq();
      const res = mockRes();

      mockDbChain.limit.mockRejectedValueOnce(new Error('DB error'));

      await dashboardController.getAuditoria(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getResultadosPorDistrito', () => {
    it('debe retornar array (stub simplificado)', async () => {
      const req = mockReq();
      const res = mockRes();

      await dashboardController.getResultadosPorDistrito(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: [] })
      );
    });
  });

  describe('getResultadosPorLocal (dashboard)', () => {
    it('debe retornar array (stub simplificado)', async () => {
      const req = mockReq();
      const res = mockRes();

      await dashboardController.getResultadosPorLocal(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: [] })
      );
    });
  });
});
