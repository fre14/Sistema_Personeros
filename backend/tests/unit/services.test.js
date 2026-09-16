import { jest } from '@jest/globals';

const mockInsert = jest.fn();
const mockDb = jest.fn(() => ({
  insert: mockInsert,
}));

jest.unstable_mockModule('../../src/config/database.js', () => ({
  default: mockDb,
}));

const mockSupabaseUpload = jest.fn();
const mockSupabaseCreateSignedUrl = jest.fn();
const mockSupabaseRemove = jest.fn();

let supabaseInstance = {
  storage: {
    from: jest.fn(() => ({
      upload: mockSupabaseUpload,
      createSignedUrl: mockSupabaseCreateSignedUrl,
      remove: mockSupabaseRemove,
    })),
  },
};

jest.unstable_mockModule('../../src/config/storage.js', () => ({
  get supabase() { return supabaseInstance; },
  bucketName: 'actas',
  storageConfig: { driver: 'supabase', localPath: '/tmp', publicUrl: '/actas' },
}));

jest.unstable_mockModule('socket.io', () => ({
  Server: jest.fn(),
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { sign: jest.fn(), verify: jest.fn() },
}));

jest.unstable_mockModule('../../src/config/auth.js', () => ({
  authConfig: {},
}));

jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn(() => '1234-5678-9012'),
}));

const { registrarAuditoria } = await import('../../src/services/auditoria.service.js');
const { setupWebSocket, notifyCoordinator, notifyAdmin, notifyPersonero, getIo } = await import('../../src/services/websocket.service.js');
const { uploadActaImage, getActaUrl, deleteActaImage } = await import('../../src/services/storage.service.js');

describe('Services Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabaseInstance = {
      storage: {
        from: jest.fn(() => ({
          upload: mockSupabaseUpload,
          createSignedUrl: mockSupabaseCreateSignedUrl,
          remove: mockSupabaseRemove,
        })),
      },
    };
  });

  describe('Auditoria Service', () => {
    it('debería insertar correctamente con todos los campos', async () => {
      mockInsert.mockResolvedValueOnce([1]);
      const data = {
        tabla: 'usuarios', registroId: 1, accion: 'CREATE',
        datosAnteriores: { id: 1 }, datosNuevos: { id: 2 },
        usuarioId: 10, ip: '127.0.0.1', userAgent: 'test-agent',
        lat: -12.0, lng: -77.0
      };
      await registrarAuditoria(data);
      expect(mockDb).toHaveBeenCalledWith('auditoria');
      expect(mockInsert).toHaveBeenCalledWith({
        tabla_afectada: 'usuarios', registro_id: 1, accion: 'INSERT',
        datos_anteriores: JSON.stringify({ id: 1 }),
        datos_nuevos: JSON.stringify({ id: 2 }),
        usuario_id: 10, ip_address: '127.0.0.1', user_agent: 'test-agent',
        latitud: -12.0, longitud: -77.0
      });
    });

    it('no debería lanzar error si falla el insert (catches silently)', async () => {
      mockInsert.mockRejectedValueOnce(new Error('DB Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(registrarAuditoria({ tabla: 'test', accion: 'CREATE' })).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('maneja campos opcionales nulos correctamente', async () => {
      mockInsert.mockResolvedValueOnce([1]);
      await registrarAuditoria({ tabla: 'test', accion: 'DELETE' });
      expect(mockInsert).toHaveBeenCalledWith({
        tabla_afectada: 'test', registro_id: 0, accion: 'DELETE',
        datos_anteriores: null, datos_nuevos: null,
        usuario_id: null, ip_address: '127.0.0.1', user_agent: null,
        latitud: null, longitud: null
      });
    });
  });

  describe('WebSocket Service', () => {
    it('no debería fallar si io es nulo en notifyCoordinator', () => {
      expect(() => notifyCoordinator(1, 'event', {})).not.toThrow();
    });
    
    it('no debería fallar si io es nulo en notifyAdmin', () => {
      expect(() => notifyAdmin('event', {})).not.toThrow();
    });

    it('no debería fallar si io es nulo en notifyPersonero', () => {
      expect(() => notifyPersonero(1, 'event', {})).not.toThrow();
    });

    it('debería retornar null o undefined para getIo inicialmente', () => {
      expect(getIo()).toBeFalsy();
    });
  });

  describe('Storage Service', () => {
    it('uploadActaImage debería subir imagen y retornar ruta correcta', async () => {
      mockSupabaseUpload.mockResolvedValueOnce({ data: { path: 'test.jpg' }, error: null });
      const path = await uploadActaImage(Buffer.from('test'), 'image/jpeg', '001');
      expect(path).toMatch(/^actas\/001\/.*1234-5678-9012\.jpg$/);
      expect(mockSupabaseUpload).toHaveBeenCalled();
    });

    it('uploadActaImage debería manejar extension png', async () => {
      mockSupabaseUpload.mockResolvedValueOnce({ data: {}, error: null });
      const path = await uploadActaImage(Buffer.from('test'), 'image/png', '002');
      expect(path).toMatch(/^actas\/002\/.*1234-5678-9012\.png$/);
    });

    it('uploadActaImage lanza error si supabase falla', async () => {
      mockSupabaseUpload.mockResolvedValueOnce({ data: null, error: { message: 'Upload failed' } });
      await expect(uploadActaImage(Buffer.from('test'), 'image/png', '001')).rejects.toThrow('Upload failed');
    });

    it('getActaUrl debería retornar signed URL', async () => {
      mockSupabaseCreateSignedUrl.mockResolvedValueOnce({ data: { signedUrl: 'http://url' }, error: null });
      const url = await getActaUrl('path.jpg');
      expect(url).toBe('http://url');
    });

    it('getActaUrl debería retornar null si hay error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseCreateSignedUrl.mockResolvedValueOnce({ data: null, error: { message: 'Fail' } });
      const url = await getActaUrl('path.jpg');
      expect(url).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('getActaUrl debería retornar null si no se pasa path', async () => {
      const url = await getActaUrl(null);
      expect(url).toBeNull();
    });

    it('deleteActaImage debería eliminar correctamente', async () => {
      mockSupabaseRemove.mockResolvedValueOnce({ error: null });
      await deleteActaImage('path.jpg');
      expect(mockSupabaseRemove).toHaveBeenCalledWith(['path.jpg']);
    });

    it('deleteActaImage debería manejar errores silenciosamente', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseRemove.mockResolvedValueOnce({ error: { message: 'Fail' } });
      await expect(deleteActaImage('path.jpg')).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('deleteActaImage no hace nada si no se pasa path', async () => {
      mockSupabaseRemove.mockClear();
      await deleteActaImage(null);
      expect(mockSupabaseRemove).not.toHaveBeenCalled();
    });
  });
});
