import { jest } from '@jest/globals';
import { createDbMock, crearReq, crearRes, usuarioAdmin } from '../../setup/knex-mock.js';

const mockDb = createDbMock();
const getActaBuffer = jest.fn();

jest.unstable_mockModule('../../../src/config/database.js', () => ({ default: mockDb.db }));
jest.unstable_mockModule('../../../src/services/storage.service.js', () => ({
  getActaBuffer,
  uploadActaImage: jest.fn(),
  getActaUrl: jest.fn(),
  deleteActaImage: jest.fn(),
}));

const mockArchive = {
  pipe: jest.fn(),
  on: jest.fn(),
  append: jest.fn(),
  finalize: jest.fn().mockResolvedValue(undefined),
};

jest.unstable_mockModule('archiver', () => ({
  ZipArchive: jest.fn(() => mockArchive),
}));

const {
  descargarProvincial,
  descargarDistrital,
  descargarCompleta,
} = await import('../../../src/controllers/descarga.controller.js');

describe('Descarga Controller — Pruebas Unitarias', () => {
  beforeEach(() => {
    mockDb.reset();
    jest.clearAllMocks();
  });

  describe('descargarProvincial', () => {
    it('genera un archivo zip con actas provinciales verificadas', async () => {
      const actasMock = [
        {
          id: 1,
          mesa_id: 10,
          tipo_eleccion: 'provincial',
          estado: 'verificado',
          numero_mesa: '001234',
          total_electores_habiles: 300,
          local_nombre: 'IE Mariscal Caceres',
          local_direccion: 'Av Independencia 123',
          distrito_nombre: 'Ayacucho',
          foto_acta_url: 'actas/001234/foto.jpg',
          votos_blanco: 5,
          votos_nulo: 3,
          votos_impugnados: 1,
          total_votos_emitidos: 200,
          total_cedulas_votacion: 200,
          subido_en: new Date(),
          verificado_en: new Date(),
        },
      ];

      const detallesMock = [
        {
          resultado_id: 1,
          candidato_id: 101,
          votos: 191,
          nombre_completo: 'Candidato 1',
          organizacion_politica: 'Partido A',
          siglas: 'PA',
          numero_lista: 1,
        },
      ];

      mockDb.queue('resultados_mesa', actasMock);
      mockDb.queue('detalle_resultados', detallesMock);
      getActaBuffer.mockResolvedValueOnce(Buffer.from('fake-image-bytes'));

      const req = crearReq({ user: usuarioAdmin() });
      const res = crearRes();

      await descargarProvincial(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/attachment; filename="actas_provinciales_.*\.zip"/)
      );
      expect(mockArchive.append).toHaveBeenCalled();
      expect(mockArchive.finalize).toHaveBeenCalled();
    });

    it('genera un leeme cuando no hay actas verificadas', async () => {
      mockDb.queue('resultados_mesa', []);

      const req = crearReq({ user: usuarioAdmin() });
      const res = crearRes();

      await descargarProvincial(req, res);

      expect(mockArchive.append).toHaveBeenCalledWith(
        expect.stringContaining('No se encontraron actas'),
        expect.objectContaining({ name: 'provincial/LEEME.txt' })
      );
      expect(mockArchive.finalize).toHaveBeenCalled();
    });
  });

  describe('descargarDistrital', () => {
    it('genera un archivo zip con actas distritales verificadas', async () => {
      const actasMock = [
        {
          id: 2,
          mesa_id: 20,
          tipo_eleccion: 'distrital',
          estado: 'verificado',
          numero_mesa: '005678',
          total_electores_habiles: 280,
          local_nombre: 'IE San Juan',
          local_direccion: 'Jr Lima 456',
          distrito_nombre: 'San Juan Bautista',
          foto_acta_url: 'actas/005678_distrital/foto.jpg',
          votos_blanco: 10,
          votos_nulo: 2,
          votos_impugnados: 0,
          total_votos_emitidos: 150,
          total_cedulas_votacion: 150,
          subido_en: new Date(),
          verificado_en: new Date(),
        },
      ];

      mockDb.queue('resultados_mesa', actasMock);
      mockDb.queue('detalle_resultados', []);

      const req = crearReq({ user: usuarioAdmin() });
      const res = crearRes();

      await descargarDistrital(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/attachment; filename="actas_distritales_.*\.zip"/)
      );
      expect(mockArchive.finalize).toHaveBeenCalled();
    });

    it('genera un leeme distrital si no hay actas', async () => {
      mockDb.queue('resultados_mesa', []);

      const req = crearReq({ user: usuarioAdmin() });
      const res = crearRes();

      await descargarDistrital(req, res);

      expect(mockArchive.append).toHaveBeenCalledWith(
        expect.stringContaining('No se encontraron actas distritales'),
        expect.objectContaining({ name: 'distrital/LEEME.txt' })
      );
    });
  });

  describe('descargarCompleta', () => {
    it('genera un archivo zip completo con todas las actas verificadas', async () => {
      const actasMock = [
        {
          id: 1,
          mesa_id: 10,
          tipo_eleccion: 'provincial',
          estado: 'verificado',
          numero_mesa: '001234',
          total_electores_habiles: 300,
          local_nombre: 'IE Mariscal Caceres',
          distrito_nombre: 'Ayacucho',
        },
        {
          id: 2,
          mesa_id: 20,
          tipo_eleccion: 'distrital',
          estado: 'verificado',
          numero_mesa: '005678',
          total_electores_habiles: 280,
          local_nombre: 'IE San Juan',
          distrito_nombre: 'San Juan Bautista',
        },
      ];

      mockDb.queue('resultados_mesa', actasMock);
      mockDb.queue('detalle_resultados', []);

      const req = crearReq({ user: usuarioAdmin() });
      const res = crearRes();

      await descargarCompleta(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/attachment; filename="actas_electorales_completas_.*\.zip"/)
      );
      expect(mockArchive.finalize).toHaveBeenCalled();
    });
  });
});
