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

let errorHandlers = {};
const mockArchive = {
  pipe: jest.fn(),
  on: jest.fn((event, cb) => {
    errorHandlers[event] = cb;
  }),
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
    errorHandlers = {};
  });

  describe('descargarProvincial', () => {
    it('genera un archivo zip con actas provinciales verificadas con datos de personero y coordinador', async () => {
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
          personero_nombre: 'Juan Perez',
          personero_dni: '12345678',
          personero_telefono: '999888777',
          coordinador_nombre: 'Maria Lopez',
          coordinador_dni: '87654321',
          coordinador_telefono: '911222333',
          observaciones_personero: 'Mesa instalada conforme',
          observaciones_coordinador: 'Revisado y verificado',
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
      expect(mockArchive.append).toHaveBeenCalledWith(
        expect.stringContaining('PERSONERO DE MESA:'),
        expect.objectContaining({ name: expect.stringMatching(/reporte_.*\.txt/) })
      );
      expect(mockArchive.append).toHaveBeenCalledWith(
        expect.stringContaining('999888777'),
        expect.anything()
      );
      expect(mockArchive.append).toHaveBeenCalledWith(
        expect.stringContaining('COORDINADOR DE LOCAL:'),
        expect.anything()
      );
      expect(mockArchive.append).toHaveBeenCalledWith(
        expect.stringContaining('911222333'),
        expect.anything()
      );
      expect(mockArchive.append).toHaveBeenCalledWith(
        expect.stringContaining('Observaciones Personero: Mesa instalada conforme'),
        expect.anything()
      );
      expect(mockArchive.append).toHaveBeenCalledWith(
        expect.stringContaining('Observaciones Coordinador: Revisado y verificado'),
        expect.anything()
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

    it('ejecuta el handler de error del archive para provincial', async () => {
      mockDb.queue('resultados_mesa', []);
      const req = crearReq({ user: usuarioAdmin() });
      const res = crearRes();
      res.headersSent = false;

      await descargarProvincial(req, res);
      if (errorHandlers['error']) {
        errorHandlers['error'](new Error('Zip error test'));
        expect(res.status).toHaveBeenCalledWith(500);
      }
    });

    it('captura excepcion y responde 500 en descargarProvincial', async () => {
      mockDb.queueError('resultados_mesa', new Error('Fallo de BD'));
      const req = crearReq({ user: usuarioAdmin() });
      const res = crearRes();
      res.headersSent = false;

      await descargarProvincial(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
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

    it('filtra por distrito_id cuando se proporciona en req.query', async () => {
      mockDb.queue('distritos', { id: 16, nombre: 'Andres Avelino Caceres' });
      mockDb.queue('resultados_mesa', []);

      const req = crearReq({ user: usuarioAdmin(), query: { distrito_id: '16' } });
      const res = crearRes();

      await descargarDistrital(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/actas_distritales_Andres_Avelino_Caceres_.*\.zip/)
      );
    });

    it('ejecuta el handler de error del archive para distrital', async () => {
      mockDb.queue('resultados_mesa', []);
      const req = crearReq({ user: usuarioAdmin() });
      const res = crearRes();
      res.headersSent = false;

      await descargarDistrital(req, res);
      if (errorHandlers['error']) {
        errorHandlers['error'](new Error('Zip error test distrital'));
        expect(res.status).toHaveBeenCalledWith(500);
      }
    });

    it('captura excepcion y responde 500 en descargarDistrital', async () => {
      mockDb.queueError('distritos', new Error('DB error distrital'));
      const req = crearReq({ user: usuarioAdmin(), query: { distrito_id: '5' } });
      const res = crearRes();
      res.headersSent = false;

      await descargarDistrital(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
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

    it('genera leeme cuando no hay actas en descargarCompleta', async () => {
      mockDb.queue('resultados_mesa', []);

      const req = crearReq({ user: usuarioAdmin() });
      const res = crearRes();

      await descargarCompleta(req, res);

      expect(mockArchive.append).toHaveBeenCalledWith(
        expect.stringContaining('No se encontraron actas electorales verificadas'),
        expect.objectContaining({ name: 'LEEME.txt' })
      );
    });

    it('ejecuta el handler de error del archive para completa', async () => {
      mockDb.queue('resultados_mesa', []);
      const req = crearReq({ user: usuarioAdmin() });
      const res = crearRes();
      res.headersSent = false;

      await descargarCompleta(req, res);
      if (errorHandlers['error']) {
        errorHandlers['error'](new Error('Zip error test completa'));
        expect(res.status).toHaveBeenCalledWith(500);
      }
    });

    it('captura excepcion y responde 500 en descargarCompleta', async () => {
      mockDb.queueError('resultados_mesa', new Error('DB crash completa'));
      const req = crearReq({ user: usuarioAdmin() });
      const res = crearRes();
      res.headersSent = false;

      await descargarCompleta(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
