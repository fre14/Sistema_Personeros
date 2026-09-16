import { jest } from '@jest/globals';

// ─────────────────────────────────────────────────────────
// Unit Test: coordinador.controller.js
// ─────────────────────────────────────────────────────────

const mockDbChain = {
  where: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  first: jest.fn(),
  count: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
};

const mockDb = jest.fn(() => mockDbChain);
mockDb.raw = jest.fn((sql) => sql);

jest.unstable_mockModule('../../src/config/database.js', () => ({
  default: mockDb,
}));

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
  user: { id: 2, dni: '11111111', rol: 'coordinador' },
  ...overrides,
});

describe('Coordinador Controller - Pruebas Unitarias', () => {
  let coordinadorController;

  beforeAll(async () => {
    coordinadorController = await import('../../src/controllers/coordinador.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMisLocales', () => {
    it('debe retornar los locales asignados con sus estadísticas de mesas y personeros', async () => {
      const req = mockReq();
      const res = mockRes();

      // Mock lista de locales
      mockDbChain.orderBy.mockResolvedValueOnce([
        { id: 10, nombre: 'I.E. Mariscal Caceres', direccion: 'Av. Independencia', distrito: 'Ayacucho', distrito_id: 1 },
      ]);

      // Mock mesasEstados groupBy
      mockDbChain.groupBy.mockResolvedValueOnce([
        { estado: 'pendiente', c: '3' },
        { estado: 'reportada', c: '2' },
        { estado: 'verificada', c: '4' },
        { estado: 'observada', c: '1' },
      ]);

      // Mock personerosCount
      mockDbChain.first.mockResolvedValueOnce({ c: '8' });

      await coordinadorController.getMisLocales(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 10,
              nombre: 'I.E. Mariscal Caceres',
              stats: expect.objectContaining({
                total: 10,
                pendientes: 3,
                reportadas: 2,
                verificadas: 4,
                observadas: 1,
                personeros_asignados: 8,
              }),
            }),
          ]),
        })
      );
    });

    it('debe manejar errores de servidor y retornar 500', async () => {
      const req = mockReq();
      const res = mockRes();

      mockDbChain.orderBy.mockRejectedValueOnce(new Error('DB error'));

      await coordinadorController.getMisLocales(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Error obteniendo locales' })
      );
    });
  });

  describe('getMesasDeLocal', () => {
    it('debe rechazar con 403 si el coordinador no tiene asignado el local', async () => {
      const req = mockReq({ params: { localId: '99' } });
      const res = mockRes();

      mockDbChain.first.mockResolvedValueOnce(null); // No permission

      await coordinadorController.getMesasDeLocal(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringMatching(/No tiene asignado/i) })
      );
    });

    it('debe retornar 404 si el local no existe', async () => {
      const req = mockReq({ params: { localId: '99' }, user: { id: 1, rol: 'admin' } }); // admin bypasses permission
      const res = mockRes();

      mockDbChain.first.mockResolvedValueOnce(null); // Local not found

      await coordinadorController.getMesasDeLocal(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Local no encontrado' })
      );
    });

    it('debe retornar las mesas del local con datos del personero asignado', async () => {
      const req = mockReq({ params: { localId: '10' } });
      const res = mockRes();

      // Permiso verificado
      mockDbChain.first
        .mockResolvedValueOnce({ id: 1, usuario_id: 2, local_id: 10 }) // permiso
        .mockResolvedValueOnce({ id: 10, nombre: 'I.E. Mariscal Caceres', direccion: 'Av. Independencia', distrito: 'Ayacucho' }); // local

      // Mesas del local
      mockDbChain.orderBy.mockResolvedValueOnce([
        {
          id: 101,
          numero_mesa: '009434',
          estado: 'reportada',
          electores_habiles: 300,
          resultado_id: 5,
          resultado_estado: 'reportada',
          personero_id: 30,
          personero_nombre: 'Juan Pérez',
          personero_dni: '44556677',
          personero_telefono: '966123456',
        },
      ]);

      await coordinadorController.getMesasDeLocal(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            local: expect.objectContaining({ id: 10, nombre: 'I.E. Mariscal Caceres' }),
            mesas: expect.arrayContaining([
              expect.objectContaining({
                id: 101,
                numero_mesa: '009434',
                personero_nombre: 'Juan Pérez',
                personero_dni: '44556677',
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('getPersonerosSupervisados', () => {
    it('debe listar los personeros asignados a las mesas de los locales del coordinador', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();

      mockDbChain.orderBy.mockReturnValueOnce({
        orderBy: jest.fn().mockResolvedValueOnce([
          {
            personero_id: 30,
            dni: '44556677',
            nombres: 'Juan',
            apellidos: 'Pérez',
            nombre_completo: 'Juan Pérez',
            telefono: '966123456',
            mesa_id: 101,
            numero_mesa: '009434',
            estado_mesa: 'reportada',
            local_id: 10,
            local_nombre: 'I.E. Mariscal Caceres',
            distrito_nombre: 'Ayacucho',
            resultado_id: 5,
            estado_resultado: 'reportada',
          },
        ]),
      });

      await coordinadorController.getPersonerosSupervisados(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              personero_id: 30,
              dni: '44556677',
              nombre_completo: 'Juan Pérez',
              numero_mesa: '009434',
              local_nombre: 'I.E. Mariscal Caceres',
            }),
          ]),
        })
      );
    });

    it('debe manejar errores de servidor y retornar 500', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();

      mockDbChain.orderBy.mockReturnValueOnce({
        orderBy: jest.fn().mockRejectedValueOnce(new Error('DB Error')),
      });

      await coordinadorController.getPersonerosSupervisados(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Error listando personeros supervisados' })
      );
    });
  });
});
