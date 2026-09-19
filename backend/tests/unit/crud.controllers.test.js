import { jest } from '@jest/globals';
import {
  createDbMock, crearReq, crearRes, usuarioAdmin, silenciarConsola,
} from '../support/knex-mock.js';

// ═══════════════════════════════════════════════════════════════════
// Controladores CRUD: usuarios, candidatos, distritos, locales, mesas.
// Los cinco estaban en 0% de cobertura. Aqui se cubren el camino feliz,
// los 404, las reglas de integridad referencial y los fallos de BD.
// ═══════════════════════════════════════════════════════════════════

const mockDb = createDbMock();
const registrarAuditoria = jest.fn().mockResolvedValue(undefined);
const hash = jest.fn().mockResolvedValue('$2a$12$hashsimulado');
const compare = jest.fn();

jest.unstable_mockModule('../../src/config/database.js', () => ({ default: mockDb.db }));
jest.unstable_mockModule('../../src/services/auditoria.service.js', () => ({ registrarAuditoria }));
jest.unstable_mockModule('bcryptjs', () => ({ default: { hash, compare }, hash, compare }));

const usuarios = await import('../../src/controllers/usuarios.controller.js');
const candidatos = await import('../../src/controllers/candidatos.controller.js');
const distritos = await import('../../src/controllers/distritos.controller.js');
const locales = await import('../../src/controllers/locales.controller.js');
const mesas = await import('../../src/controllers/mesas.controller.js');

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.reset();
  hash.mockResolvedValue('$2a$12$hashsimulado');
});

// ═══════════════════════════════════════════════════════════════════
describe('usuarios.controller', () => {
  describe('getAll', () => {
    it('lista con paginacion por defecto y devuelve meta', async () => {
      mockDb.queue('usuarios', { total: '2' }, [{ id: 1 }, { id: 2 }]);
      const req = crearReq({ user: usuarioAdmin() });
      const res = crearRes();

      await usuarios.getAll(req, res);

      expect(res.body.meta).toEqual({ total: 2, page: 1, limit: 50 });
      expect(res.body.data).toHaveLength(2);
    });

    it('filtra por rol', async () => {
      mockDb.queue('usuarios', { total: '1' }, [{ id: 3, rol: 'personero' }]);
      const req = crearReq({ user: usuarioAdmin(), query: { rol: 'personero' } });
      const res = crearRes();

      await usuarios.getAll(req, res);

      expect(mockDb.calls('usuarios').wheres).toContainEqual({ rol: 'personero' });
    });

    it('aplica busqueda libre por dni/nombres/apellidos', async () => {
      mockDb.queue('usuarios', { total: '1' }, [{ id: 4 }]);
      const req = crearReq({ user: usuarioAdmin(), query: { q: 'perez' } });
      const res = crearRes();

      await usuarios.getAll(req, res);

      expect(res.body.success).toBe(true);
    });

    it('respeta page y limit explicitos', async () => {
      mockDb.queue('usuarios', { total: '120' }, []);
      const req = crearReq({ user: usuarioAdmin(), query: { page: '3', limit: '20' } });
      const res = crearRes();

      await usuarios.getAll(req, res);

      expect(res.body.meta).toEqual({ total: 120, page: 3, limit: 20 });
    });

    it('responde 500 ante fallo de BD', async () => {
      mockDb.queueError('usuarios', new Error('caida'));
      const req = crearReq({ user: usuarioAdmin() });
      const res = crearRes();

      await usuarios.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getById', () => {
    it('devuelve 404 si no existe', async () => {
      mockDb.queue('usuarios', undefined);
      const req = crearReq({ user: usuarioAdmin(), params: { id: '99' } });
      const res = crearRes();

      await usuarios.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('adjunta la asignacion de mesa si es personero', async () => {
      mockDb.queue('usuarios', { id: 3, rol: 'personero' });
      mockDb.queue('asignacion_personeros', { id: 77, mesa_id: 9 });
      const req = crearReq({ user: usuarioAdmin(), params: { id: '3' } });
      const res = crearRes();

      await usuarios.getById(req, res);

      expect(res.body.data.asignacion).toEqual({ id: 77, mesa_id: 9 });
    });

    it('adjunta la asignacion de local si es coordinador', async () => {
      mockDb.queue('usuarios', { id: 2, rol: 'coordinador' });
      mockDb.queue('asignacion_coordinadores', { id: 30, local_id: 4 });
      const req = crearReq({ user: usuarioAdmin(), params: { id: '2' } });
      const res = crearRes();

      await usuarios.getById(req, res);

      expect(res.body.data.asignacion).toEqual({ id: 30, local_id: 4 });
    });

    it('no busca asignacion para un admin', async () => {
      mockDb.queue('usuarios', { id: 1, rol: 'admin' });
      const req = crearReq({ user: usuarioAdmin(), params: { id: '1' } });
      const res = crearRes();

      await usuarios.getById(req, res);

      expect(res.body.data.asignacion).toBeNull();
    });

    it('responde 500 ante fallo de BD', async () => {
      mockDb.queueError('usuarios', new Error('caida'));
      const req = crearReq({ user: usuarioAdmin(), params: { id: '1' } });
      const res = crearRes();

      await usuarios.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('create', () => {
    it('hashea la contrasena con coste 12 y nunca la guarda en claro', async () => {
      mockDb.queue('usuarios', [{ id: 10 }], { id: 10, dni: '12345678' });
      const req = crearReq({
        user: usuarioAdmin(),
        body: { dni: '12345678', nombres: 'Ana', apellidos: 'Perez', rol: 'personero', password: 'secreta123' },
      });
      const res = crearRes();

      await usuarios.create(req, res);

      expect(hash).toHaveBeenCalledWith('secreta123', 12);
      const insertado = mockDb.calls('usuarios').inserts[0];
      expect(insertado.password_hash).toBe('$2a$12$hashsimulado');
      expect(insertado.password).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('nunca devuelve el hash en la respuesta', async () => {
      mockDb.queue('usuarios', [{ id: 10 }], { id: 10, dni: '12345678', rol: 'personero' });
      const req = crearReq({
        user: usuarioAdmin(),
        body: { dni: '12345678', password: 'x' },
      });
      const res = crearRes();

      await usuarios.create(req, res);

      expect(res.body.data.password_hash).toBeUndefined();
    });

    it('responde 500 si el DNI ya existe (violacion de unicidad)', async () => {
      mockDb.queueError('usuarios', new Error('duplicate key value violates unique constraint'));
      const req = crearReq({ user: usuarioAdmin(), body: { dni: '12345678', password: 'x' } });
      const res = crearRes();

      await usuarios.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('update', () => {
    it('devuelve 404 si el usuario no existe', async () => {
      mockDb.queue('usuarios', undefined);
      const req = crearReq({ user: usuarioAdmin(), params: { id: '99' }, body: {} });
      const res = crearRes();

      await usuarios.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('no toca password_hash si no se envia contrasena', async () => {
      mockDb.queue('usuarios', { id: 10, dni: '1' }, 1, { id: 10 });
      const req = crearReq({ user: usuarioAdmin(), params: { id: '10' }, body: { nombres: 'Nuevo' } });
      const res = crearRes();

      await usuarios.update(req, res);

      expect(hash).not.toHaveBeenCalled();
      expect(mockDb.calls('usuarios').updates[0].password_hash).toBeUndefined();
    });

    it('rehashea si se envia contrasena nueva', async () => {
      mockDb.queue('usuarios', { id: 10, dni: '1' }, 1, { id: 10 });
      const req = crearReq({ user: usuarioAdmin(), params: { id: '10' }, body: { password: 'nueva123' } });
      const res = crearRes();

      await usuarios.update(req, res);

      expect(hash).toHaveBeenCalledWith('nueva123', 12);
      expect(mockDb.calls('usuarios').updates[0].password_hash).toBe('$2a$12$hashsimulado');
    });

    it('responde 500 ante fallo de BD', async () => {
      mockDb.queueError('usuarios', new Error('caida'));
      const req = crearReq({ user: usuarioAdmin(), params: { id: '1' }, body: {} });
      const res = crearRes();

      await usuarios.update(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('toggleActive', () => {
    it('devuelve 404 si no existe', async () => {
      mockDb.queue('usuarios', undefined);
      const req = crearReq({ user: usuarioAdmin(), params: { id: '99' } });
      const res = crearRes();

      await usuarios.toggleActive(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('invierte el estado activo', async () => {
      mockDb.queue('usuarios', { id: 10, activo: true }, 1, { id: 10, activo: false });
      const req = crearReq({ user: usuarioAdmin(), params: { id: '10' } });
      const res = crearRes();

      await usuarios.toggleActive(req, res);

      expect(mockDb.calls('usuarios').updates[0]).toEqual({ activo: false });
    });

    it('reactiva un usuario desactivado', async () => {
      mockDb.queue('usuarios', { id: 10, activo: false }, 1, { id: 10, activo: true });
      const req = crearReq({ user: usuarioAdmin(), params: { id: '10' } });
      const res = crearRes();

      await usuarios.toggleActive(req, res);

      expect(mockDb.calls('usuarios').updates[0]).toEqual({ activo: true });
    });

    it('responde 500 ante fallo de BD', async () => {
      mockDb.queueError('usuarios', new Error('caida'));
      const req = crearReq({ user: usuarioAdmin(), params: { id: '1' } });
      const res = crearRes();

      await usuarios.toggleActive(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('candidatos.controller', () => {
  it('getAll lista solo candidatos activos ordenados por numero de lista', async () => {
    mockDb.queue('candidatos', [{ id: 1, numero_lista: 1 }]);
    const req = crearReq({ user: usuarioAdmin() });
    const res = crearRes();

    await candidatos.getAll(req, res);

    expect(mockDb.calls('candidatos').wheres).toContainEqual({ activo: true });
    expect(res.body.data).toHaveLength(1);
  });

  it('getAll responde 500 ante fallo de BD', async () => {
    mockDb.queueError('candidatos', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin() });
    const res = crearRes();

    await candidatos.getAll(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getById busca por id y cae de vuelta a numero_lista', async () => {
    mockDb.queue('candidatos', undefined, { id: 7, numero_lista: 3 });
    const req = crearReq({ user: usuarioAdmin(), params: { id: '3' } });
    const res = crearRes();

    await candidatos.getById(req, res);

    expect(res.body.data.id).toBe(7);
  });

  it('getById devuelve 404 si no existe por ninguna via', async () => {
    mockDb.queue('candidatos', undefined, undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '99' } });
    const res = crearRes();

    await candidatos.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getById no intenta fallback si el id no es numerico', async () => {
    mockDb.queue('candidatos', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: 'abc' } });
    const res = crearRes();

    await candidatos.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getById responde 500 ante fallo de BD', async () => {
    mockDb.queueError('candidatos', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '1' } });
    const res = crearRes();

    await candidatos.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('create normaliza numero_lista a numero y siglas vacias', async () => {
    mockDb.queue('candidatos', [{ id: 5 }], { id: 5 });
    const req = crearReq({
      user: usuarioAdmin(),
      body: { nombre_completo: 'Ana Ruiz', organizacion_politica: 'Partido X', numero_lista: '4' },
    });
    const res = crearRes();

    await candidatos.create(req, res);

    expect(mockDb.calls('candidatos').inserts[0]).toMatchObject({
      numero_lista: 4, siglas: '', activo: true,
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('create responde 500 ante fallo de BD', async () => {
    mockDb.queueError('candidatos', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), body: { numero_lista: '1' } });
    const res = crearRes();

    await candidatos.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('update solo aplica los campos enviados', async () => {
    mockDb.queue('candidatos', { id: 5, nombre_completo: 'Viejo' }, 1, { id: 5 });
    const req = crearReq({ user: usuarioAdmin(), params: { id: '5' }, body: { siglas: 'PX' } });
    const res = crearRes();

    await candidatos.update(req, res);

    const cambios = mockDb.calls('candidatos').updates[0];
    expect(cambios.siglas).toBe('PX');
    expect(cambios.nombre_completo).toBeUndefined();
    expect(cambios.updated_at).toBeInstanceOf(Date);
  });

  it('update acepta todos los campos opcionales', async () => {
    mockDb.queue('candidatos', { id: 5 }, 1, { id: 5 });
    const req = crearReq({
      user: usuarioAdmin(), params: { id: '5' },
      body: {
        nombre_completo: 'Ana', organizacion_politica: 'PX', siglas: 'X',
        numero_lista: '9', foto_url: 'f.jpg', logo_url: 'l.jpg', activo: false,
      },
    });
    const res = crearRes();

    await candidatos.update(req, res);

    expect(mockDb.calls('candidatos').updates[0]).toMatchObject({
      nombre_completo: 'Ana', numero_lista: 9, activo: false, logo_url: 'l.jpg',
    });
  });

  it('update devuelve 404 si no existe', async () => {
    mockDb.queue('candidatos', undefined, undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '99' }, body: {} });
    const res = crearRes();

    await candidatos.update(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('update responde 500 ante fallo de BD', async () => {
    mockDb.queueError('candidatos', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '1' }, body: {} });
    const res = crearRes();

    await candidatos.update(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('remove hace baja logica, nunca borrado fisico', async () => {
    mockDb.queue('candidatos', { id: 5 }, 1, { id: 5, activo: false });
    const req = crearReq({ user: usuarioAdmin(), params: { id: '5' } });
    const res = crearRes();

    await candidatos.remove(req, res);

    expect(mockDb.calls('candidatos').updates[0].activo).toBe(false);
    expect(mockDb.calls('candidatos').deletes).toBe(0);
  });

  it('remove devuelve 404 si no existe', async () => {
    mockDb.queue('candidatos', undefined, undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '99' } });
    const res = crearRes();

    await candidatos.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('remove responde 500 ante fallo de BD', async () => {
    mockDb.queueError('candidatos', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '1' } });
    const res = crearRes();

    await candidatos.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('distritos.controller', () => {
  it('getAll lista ordenado', async () => {
    mockDb.queue('distritos', [{ id: 1, nombre: 'Ayacucho' }]);
    const req = crearReq({ user: usuarioAdmin() });
    const res = crearRes();

    await distritos.getAll(req, res);

    expect(res.body.data).toHaveLength(1);
  });

  it('getAll filtra por texto', async () => {
    mockDb.queue('distritos', [{ id: 1 }]);
    const req = crearReq({ user: usuarioAdmin(), query: { q: 'aya' } });
    const res = crearRes();

    await distritos.getAll(req, res);

    expect(res.body.success).toBe(true);
  });

  it('getAll responde 500 ante fallo de BD', async () => {
    mockDb.queueError('distritos', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin() });
    const res = crearRes();

    await distritos.getAll(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getById devuelve 404 si no existe', async () => {
    mockDb.queue('distritos', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '99' } });
    const res = crearRes();

    await distritos.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getById devuelve el distrito', async () => {
    mockDb.queue('distritos', { id: 1, nombre: 'Ayacucho' });
    const req = crearReq({ user: usuarioAdmin(), params: { id: '1' } });
    const res = crearRes();

    await distritos.getById(req, res);

    expect(res.body.data.nombre).toBe('Ayacucho');
  });

  it('getById responde 500 ante fallo de BD', async () => {
    mockDb.queueError('distritos', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '1' } });
    const res = crearRes();

    await distritos.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('create devuelve 201', async () => {
    mockDb.queue('distritos', [{ id: 2 }], { id: 2, nombre: 'Huamanga' });
    const req = crearReq({ user: usuarioAdmin(), body: { nombre: 'Huamanga' } });
    const res = crearRes();

    await distritos.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('create responde 500 ante fallo de BD', async () => {
    mockDb.queueError('distritos', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), body: {} });
    const res = crearRes();

    await distritos.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('update devuelve 404 si no existe', async () => {
    mockDb.queue('distritos', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '99' }, body: {} });
    const res = crearRes();

    await distritos.update(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('update aplica cambios', async () => {
    mockDb.queue('distritos', { id: 1 }, 1, { id: 1, nombre: 'Nuevo' });
    const req = crearReq({ user: usuarioAdmin(), params: { id: '1' }, body: { nombre: 'Nuevo' } });
    const res = crearRes();

    await distritos.update(req, res);

    expect(res.body.data.nombre).toBe('Nuevo');
  });

  it('update responde 500 ante fallo de BD', async () => {
    mockDb.queueError('distritos', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '1' }, body: {} });
    const res = crearRes();

    await distritos.update(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('remove bloquea el borrado si hay locales asociados', async () => {
    mockDb.queue('distritos', { id: 1 });
    mockDb.queue('locales_votacion', { c: '3' });
    const req = crearReq({ user: usuarioAdmin(), params: { id: '1' } });
    const res = crearRes();

    await distritos.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/locales asociados/i);
    expect(mockDb.calls('distritos').deletes).toBe(0);
  });

  it('remove elimina cuando no hay locales', async () => {
    mockDb.queue('distritos', { id: 1 });
    mockDb.queue('locales_votacion', { c: '0' });
    mockDb.queue('distritos', 1);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '1' } });
    const res = crearRes();

    await distritos.remove(req, res);

    expect(mockDb.calls('distritos').deletes).toBe(1);
    expect(res.body.success).toBe(true);
  });

  it('remove devuelve 404 si no existe', async () => {
    mockDb.queue('distritos', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '99' } });
    const res = crearRes();

    await distritos.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('remove responde 500 ante fallo de BD', async () => {
    mockDb.queueError('distritos', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '1' } });
    const res = crearRes();

    await distritos.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('locales.controller', () => {
  it('getAll lista con nombre de distrito', async () => {
    mockDb.queue('locales_votacion', [{ id: 4, distrito_nombre: 'Ayacucho' }]);
    const req = crearReq({ user: usuarioAdmin() });
    const res = crearRes();

    await locales.getAll(req, res);

    expect(res.body.data[0].distrito_nombre).toBe('Ayacucho');
  });

  it('getAll filtra por texto y distrito', async () => {
    mockDb.queue('locales_votacion', [{ id: 4 }]);
    const req = crearReq({ user: usuarioAdmin(), query: { q: 'san', distrito_id: '1' } });
    const res = crearRes();

    await locales.getAll(req, res);

    expect(mockDb.calls('locales_votacion').wheres).toContainEqual({ distrito_id: '1' });
  });

  it('getAll responde 500 ante fallo de BD', async () => {
    mockDb.queueError('locales_votacion', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin() });
    const res = crearRes();

    await locales.getAll(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getById agrega conteo de mesas y coordinadores', async () => {
    mockDb.queue('locales_votacion', { id: 4, nombre: 'IE San Juan' });
    mockDb.queue('mesas_sufragio', { c: '12' });
    mockDb.queue('asignacion_coordinadores', [{ id: 2, nombres: 'Luis' }]);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '4' } });
    const res = crearRes();

    await locales.getById(req, res);

    expect(res.body.data.mesas_count).toBe(12);
    expect(res.body.data.coordinadores).toHaveLength(1);
  });

  it('getById devuelve 404 si no existe', async () => {
    mockDb.queue('locales_votacion', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '99' } });
    const res = crearRes();

    await locales.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getById responde 500 ante fallo de BD', async () => {
    mockDb.queueError('locales_votacion', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '4' } });
    const res = crearRes();

    await locales.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('create devuelve 201', async () => {
    mockDb.queue('locales_votacion', [{ id: 4 }], { id: 4 });
    const req = crearReq({ user: usuarioAdmin(), body: { nombre: 'IE X', distrito_id: 1 } });
    const res = crearRes();

    await locales.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('create responde 500 ante fallo de BD', async () => {
    mockDb.queueError('locales_votacion', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), body: {} });
    const res = crearRes();

    await locales.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('update devuelve 404 si no existe', async () => {
    mockDb.queue('locales_votacion', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '99' }, body: {} });
    const res = crearRes();

    await locales.update(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('update aplica cambios', async () => {
    mockDb.queue('locales_votacion', { id: 4 }, 1, { id: 4, nombre: 'Nuevo' });
    const req = crearReq({ user: usuarioAdmin(), params: { id: '4' }, body: { nombre: 'Nuevo' } });
    const res = crearRes();

    await locales.update(req, res);

    expect(res.body.data.nombre).toBe('Nuevo');
  });

  it('update responde 500 ante fallo de BD', async () => {
    mockDb.queueError('locales_votacion', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '4' }, body: {} });
    const res = crearRes();

    await locales.update(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('remove bloquea si el local tiene mesas', async () => {
    mockDb.queue('locales_votacion', { id: 4 });
    mockDb.queue('mesas_sufragio', { c: '12' });
    const req = crearReq({ user: usuarioAdmin(), params: { id: '4' } });
    const res = crearRes();

    await locales.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockDb.calls('locales_votacion').deletes).toBe(0);
  });

  it('remove elimina cuando no hay mesas', async () => {
    mockDb.queue('locales_votacion', { id: 4 });
    mockDb.queue('mesas_sufragio', { c: '0' });
    mockDb.queue('locales_votacion', 1);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '4' } });
    const res = crearRes();

    await locales.remove(req, res);

    expect(mockDb.calls('locales_votacion').deletes).toBe(1);
  });

  it('remove devuelve 404 si no existe', async () => {
    mockDb.queue('locales_votacion', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '99' } });
    const res = crearRes();

    await locales.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('remove responde 500 ante fallo de BD', async () => {
    mockDb.queueError('locales_votacion', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '4' } });
    const res = crearRes();

    await locales.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
describe('mesas.controller', () => {
  it('getAll devuelve meta de paginacion', async () => {
    mockDb.queue('mesas_sufragio', { total: '850' }, [{ id: 1 }]);
    const req = crearReq({ user: usuarioAdmin() });
    const res = crearRes();

    await mesas.getAll(req, res);

    expect(res.body.meta).toEqual({ total: 850, page: 1, limit: 50 });
  });

  it('getAll aplica todos los filtros combinados', async () => {
    mockDb.queue('mesas_sufragio', { total: '1' }, [{ id: 1 }]);
    const req = crearReq({
      user: usuarioAdmin(),
      query: { local_id: '4', distrito_id: '1', estado: 'pendiente', q: '045', disponible: 'true' },
    });
    const res = crearRes();

    await mesas.getAll(req, res);

    expect(res.body.success).toBe(true);
  });

  it('getAll tolera page/limit no numericos cayendo a los valores por defecto', async () => {
    mockDb.queue('mesas_sufragio', { total: '10' }, []);
    const req = crearReq({ user: usuarioAdmin(), query: { page: 'abc', limit: 'xyz' } });
    const res = crearRes();

    await mesas.getAll(req, res);

    expect(res.body.meta).toEqual({ total: 10, page: 1, limit: 50 });
  });

  it('getAll responde 500 ante fallo de BD', async () => {
    mockDb.queueError('mesas_sufragio', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin() });
    const res = crearRes();

    await mesas.getAll(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getById agrega personero y ultimo resultado', async () => {
    mockDb.queue('mesas_sufragio', { id: 9, numero_mesa: '045821' });
    mockDb.queue('asignacion_personeros', { id: 3, nombres: 'Ana' });
    mockDb.queue('resultados_mesa', { id: 500, estado: 'pendiente' });
    const req = crearReq({ user: usuarioAdmin(), params: { id: '9' } });
    const res = crearRes();

    await mesas.getById(req, res);

    expect(res.body.data.personero.nombres).toBe('Ana');
    expect(res.body.data.resultado.id).toBe(500);
  });

  it('getById devuelve 404 si no existe', async () => {
    mockDb.queue('mesas_sufragio', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '99' } });
    const res = crearRes();

    await mesas.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getById responde 500 ante fallo de BD', async () => {
    mockDb.queueError('mesas_sufragio', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '9' } });
    const res = crearRes();

    await mesas.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('create incrementa el contador total_mesas del local', async () => {
    mockDb.queue('mesas_sufragio', [{ id: 9 }], { id: 9 });
    mockDb.queue('locales_votacion', 1);
    const req = crearReq({ user: usuarioAdmin(), body: { numero_mesa: '045821', local_id: 4 } });
    const res = crearRes();

    await mesas.create(req, res);

    expect(mockDb.calls('locales_votacion').increments).toEqual([{ columna: 'total_mesas', cantidad: 1 }]);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('create responde 500 ante fallo de BD', async () => {
    mockDb.queueError('mesas_sufragio', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), body: { local_id: 4 } });
    const res = crearRes();

    await mesas.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('update devuelve 404 si la mesa no existe', async () => {
    mockDb.queue('mesas_sufragio', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '99' }, body: {} });
    const res = crearRes();

    await mesas.update(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('update mueve el contador de mesas al cambiar de local', async () => {
    mockDb.queue('mesas_sufragio', { id: 9, local_id: 4 }, 1, { id: 9, local_id: 7 });
    mockDb.queue('locales_votacion', 1, 1);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '9' }, body: { local_id: 7 } });
    const res = crearRes();

    await mesas.update(req, res);

    expect(mockDb.calls('locales_votacion').decrements).toHaveLength(1);
    expect(mockDb.calls('locales_votacion').increments).toHaveLength(1);
  });

  it('update no toca contadores si el local no cambia', async () => {
    mockDb.queue('mesas_sufragio', { id: 9, local_id: 4 }, 1, { id: 9 });
    const req = crearReq({ user: usuarioAdmin(), params: { id: '9' }, body: { estado: 'cerrada' } });
    const res = crearRes();

    await mesas.update(req, res);

    expect(mockDb.calls('locales_votacion').increments).toHaveLength(0);
    expect(mockDb.calls('locales_votacion').decrements).toHaveLength(0);
  });

  it('update responde 500 ante fallo de BD', async () => {
    mockDb.queueError('mesas_sufragio', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '9' }, body: {} });
    const res = crearRes();

    await mesas.update(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('remove bloquea si la mesa ya tiene resultados (protege el conteo)', async () => {
    mockDb.queue('mesas_sufragio', { id: 9, local_id: 4 });
    mockDb.queue('resultados_mesa', { c: '1' });
    const req = crearReq({ user: usuarioAdmin(), params: { id: '9' } });
    const res = crearRes();

    await mesas.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/resultados asociados/i);
    expect(mockDb.calls('mesas_sufragio').deletes).toBe(0);
  });

  it('remove elimina y decrementa el contador del local', async () => {
    mockDb.queue('mesas_sufragio', { id: 9, local_id: 4 });
    mockDb.queue('resultados_mesa', { c: '0' });
    mockDb.queue('mesas_sufragio', 1);
    mockDb.queue('locales_votacion', 1);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '9' } });
    const res = crearRes();

    await mesas.remove(req, res);

    expect(mockDb.calls('mesas_sufragio').deletes).toBe(1);
    expect(mockDb.calls('locales_votacion').decrements).toHaveLength(1);
  });

  it('remove devuelve 404 si no existe', async () => {
    mockDb.queue('mesas_sufragio', undefined);
    const req = crearReq({ user: usuarioAdmin(), params: { id: '99' } });
    const res = crearRes();

    await mesas.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('remove responde 500 ante fallo de BD', async () => {
    mockDb.queueError('mesas_sufragio', new Error('caida'));
    const req = crearReq({ user: usuarioAdmin(), params: { id: '9' } });
    const res = crearRes();

    await mesas.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
