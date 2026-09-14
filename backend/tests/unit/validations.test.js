import { loginSchema } from '../../src/validations/auth.validation.js';
import { createUsuarioSchema, updateUsuarioSchema } from '../../src/validations/usuario.validation.js';
import { subirResultadoSchema, observarResultadoSchema } from '../../src/validations/resultado.validation.js';
import { asignarPersoneroSchema, asignarCoordinadorSchema, reasignarSchema } from '../../src/validations/asignacion.validation.js';
import { createCandidatoSchema, updateCandidatoSchema } from '../../src/validations/candidato.validation.js';
import { createLocalSchema, updateLocalSchema } from '../../src/validations/local.validation.js';
import { createMesaSchema, updateMesaSchema } from '../../src/validations/mesa.validation.js';
import { createDistritoSchema, updateDistritoSchema } from '../../src/validations/distrito.validation.js';

describe('Validaciones Zod', () => {

  describe('auth.validation.js - loginSchema', () => {
    it('debería validar datos correctos', () => {
      const data = { dni: '12345678', password: 'password123' };
      expect(() => loginSchema.parse(data)).not.toThrow();
    });

    it('debería rechazar un DNI muy corto', () => {
      const data = { dni: '123', password: 'password123' };
      expect(() => loginSchema.parse(data)).toThrow();
    });

    it('debería rechazar un DNI muy largo', () => {
      const data = { dni: '123456789', password: 'password123' };
      expect(() => loginSchema.parse(data)).toThrow();
    });

    it('debería rechazar password muy corto', () => {
      const data = { dni: '12345678', password: '123' };
      expect(() => loginSchema.parse(data)).toThrow();
    });

    it('debería rechazar campos faltantes', () => {
      const data = { dni: '12345678' };
      expect(() => loginSchema.parse(data)).toThrow();
    });
  });

  describe('usuario.validation.js - createUsuarioSchema', () => {
    it('debería validar datos de usuario completos', () => {
      const data = { dni: '12345678', nombres: 'Juan', apellidos: 'Perez', password: 'password', rol: 'personero', email: 'juan@test.com', telefono: '999888777' };
      expect(() => createUsuarioSchema.parse(data)).not.toThrow();
    });

    it('debería validar sin campos opcionales', () => {
      const data = { dni: '12345678', nombres: 'Juan', apellidos: 'Perez', password: 'password', rol: 'personero' };
      expect(() => createUsuarioSchema.parse(data)).not.toThrow();
    });

    it('debería rechazar DNI que no tiene 8 caracteres', () => {
      const data = { dni: '1234567', nombres: 'Juan', apellidos: 'Perez', password: 'password', rol: 'personero' };
      expect(() => createUsuarioSchema.parse(data)).toThrow();
    });

    it('debería rechazar nombres vacíos', () => {
      const data = { dni: '12345678', nombres: '', apellidos: 'Perez', password: 'password', rol: 'personero' };
      expect(() => createUsuarioSchema.parse(data)).toThrow();
    });

    it('debería rechazar email inválido', () => {
      const data = { dni: '12345678', nombres: 'Juan', apellidos: 'Perez', password: 'password', rol: 'personero', email: 'no-es-email' };
      expect(() => createUsuarioSchema.parse(data)).toThrow();
    });

    it('debería rechazar password menor a 6 caracteres', () => {
      const data = { dni: '12345678', nombres: 'Juan', apellidos: 'Perez', password: '123', rol: 'personero' };
      expect(() => createUsuarioSchema.parse(data)).toThrow();
    });

    it('debería rechazar un rol inválido', () => {
      const data = { dni: '12345678', nombres: 'Juan', apellidos: 'Perez', password: 'password123', rol: 'admin_supremo' };
      expect(() => createUsuarioSchema.parse(data)).toThrow();
    });
  });

  describe('usuario.validation.js - updateUsuarioSchema', () => {
    it('debería validar con campos parciales', () => {
      const data = { nombres: 'Pedro' };
      expect(() => updateUsuarioSchema.parse(data)).not.toThrow();
    });

    it('debería seguir validando el formato del DNI', () => {
      const data = { dni: '12' };
      expect(() => updateUsuarioSchema.parse(data)).toThrow();
    });

    it('debería permitir objeto vacío', () => {
      expect(() => updateUsuarioSchema.parse({})).not.toThrow();
    });
  });

  describe('resultado.validation.js - subirResultadoSchema', () => {
    it('debería validar resultado correcto', () => {
      const data = { mesa_id: 1, votos_blanco: 10, votos_nulo: 5, votos_impugnado: 0, votos: [{ candidato_id: 1, cantidad: 50 }, { candidato_id: 2, cantidad: 30 }] };
      expect(() => subirResultadoSchema.parse(data)).not.toThrow();
    });

    it('debería rechazar votos negativos', () => {
      const data = { mesa_id: 1, votos_blanco: -5, votos_nulo: 5, votos_impugnado: 0, votos: [{ candidato_id: 1, cantidad: 50 }] };
      expect(() => subirResultadoSchema.parse(data)).toThrow();
    });

    it('debería rechazar falta de mesa_id', () => {
      const data = { votos_blanco: 10, votos_nulo: 5, votos_impugnado: 0, votos: [{ candidato_id: 1, cantidad: 50 }] };
      expect(() => subirResultadoSchema.parse(data)).toThrow();
    });

    it('debería rechazar array de votos vacío o inválido', () => {
      const data = { mesa_id: 1, votos_blanco: 10, votos_nulo: 5, votos_impugnado: 0, votos: [] };
      expect(() => subirResultadoSchema.parse(data)).toThrow(); // Asumiendo min(1)
    });
  });

  describe('resultado.validation.js - observarResultadoSchema', () => {
    it('debería validar con observaciones', () => {
      const data = { observaciones: 'Faltan actas' };
      expect(() => observarResultadoSchema.parse(data)).not.toThrow();
    });

    it('debería rechazar sin observaciones', () => {
      const data = { otra_cosa: 123 };
      expect(() => observarResultadoSchema.parse(data)).toThrow();
    });
  });

  describe('asignacion.validation.js - asignarPersoneroSchema', () => {
    it('debería validar datos correctos', () => {
      expect(() => asignarPersoneroSchema.parse({ usuario_id: 1, mesa_id: 2 })).not.toThrow();
    });
    it('debería rechazar falta de campos', () => {
      expect(() => asignarPersoneroSchema.parse({ usuario_id: 1 })).toThrow();
    });
  });

  describe('asignacion.validation.js - asignarCoordinadorSchema', () => {
    it('debería validar datos correctos', () => {
      expect(() => asignarCoordinadorSchema.parse({ usuario_id: 1, local_id: 2 })).not.toThrow();
    });
    it('debería rechazar valores inválidos', () => {
      expect(() => asignarCoordinadorSchema.parse({ usuario_id: 'a', local_id: -1 })).toThrow();
    });
  });

  describe('asignacion.validation.js - reasignarSchema', () => {
    it('debería validar reasignación', () => {
      expect(() => reasignarSchema.parse({ nuevo_id: 3 })).not.toThrow();
    });
    it('debería rechazar falta de nuevo_id', () => {
      expect(() => reasignarSchema.parse({})).toThrow();
    });
  });

  describe('candidato.validation.js - createCandidatoSchema', () => {
    it('debería validar datos correctos', () => {
      expect(() => createCandidatoSchema.parse({ nombre: 'Juan', partido: 'Partido A', numero: 1 })).not.toThrow();
    });
    it('debería rechazar nombre vacío', () => {
      expect(() => createCandidatoSchema.parse({ nombre: '', partido: 'Partido A', numero: 1 })).toThrow();
    });
  });

  describe('candidato.validation.js - updateCandidatoSchema', () => {
    it('debería validar actualización parcial', () => {
      expect(() => updateCandidatoSchema.parse({ partido: 'Partido B' })).not.toThrow();
    });
    it('debería permitir objeto vacío', () => {
      expect(() => updateCandidatoSchema.parse({})).not.toThrow();
    });
  });

  describe('local.validation.js - createLocalSchema', () => {
    it('debería validar datos correctos', () => {
      expect(() => createLocalSchema.parse({ nombre: 'Colegio A', direccion: 'Calle 1', distrito_id: 1 })).not.toThrow();
    });
    it('debería rechazar campos faltantes', () => {
      expect(() => createLocalSchema.parse({ nombre: 'Colegio A' })).toThrow();
    });
  });

  describe('local.validation.js - updateLocalSchema', () => {
    it('debería validar actualización parcial', () => {
      expect(() => updateLocalSchema.parse({ nombre: 'Colegio B' })).not.toThrow();
    });
    it('debería rechazar id de distrito inválido', () => {
      expect(() => updateLocalSchema.parse({ distrito_id: -5 })).toThrow();
    });
  });

  describe('mesa.validation.js - createMesaSchema', () => {
    it('debería validar datos correctos', () => {
      expect(() => createMesaSchema.parse({ numero: '001001', local_id: 1, electores: 300 })).not.toThrow();
    });
    it('debería rechazar mesa sin local', () => {
      expect(() => createMesaSchema.parse({ numero: '001001', electores: 300 })).toThrow();
    });
  });

  describe('mesa.validation.js - updateMesaSchema', () => {
    it('debería validar actualización', () => {
      expect(() => updateMesaSchema.parse({ electores: 250 })).not.toThrow();
    });
    it('debería rechazar electores negativos', () => {
      expect(() => updateMesaSchema.parse({ electores: -10 })).toThrow();
    });
  });

  describe('distrito.validation.js - createDistritoSchema', () => {
    it('debería validar datos correctos', () => {
      expect(() => createDistritoSchema.parse({ nombre: 'Lima', ubigeo: '150101' })).not.toThrow();
    });
    it('debería rechazar ubigeo con formato incorrecto', () => {
      expect(() => createDistritoSchema.parse({ nombre: 'Lima', ubigeo: 'abc' })).toThrow();
    });
  });

  describe('distrito.validation.js - updateDistritoSchema', () => {
    it('debería validar actualización parcial', () => {
      expect(() => updateDistritoSchema.parse({ nombre: 'Lince' })).not.toThrow();
    });
    it('debería permitir vacío', () => {
      expect(() => updateDistritoSchema.parse({})).not.toThrow();
    });
  });

});
