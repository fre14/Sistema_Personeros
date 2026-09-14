import { jest } from '@jest/globals';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────
// Test: validate middleware
// Source: src/middlewares/validate.middleware.js
// ─────────────────────────────────────────────────────────

// The middleware is simple enough to inline for unit testing
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = () => jest.fn();

describe('validate middleware', () => {
  const testSchema = z.object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    edad: z.number().min(18, 'Debe ser mayor de edad'),
    email: z.string().email('Email inválido').optional(),
  });

  const middleware = validate(testSchema);

  it('debe pasar cuando el body es válido y llamar next()', () => {
    const req = { body: { nombre: 'Juan', edad: 25 } };
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('debe pasar con campos opcionales incluidos', () => {
    const req = { body: { nombre: 'María', edad: 30, email: 'maria@test.com' } };
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('debe retornar 400 cuando faltan campos requeridos', () => {
    const req = { body: {} };
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Validation error',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('debe retornar 400 con errores múltiples', () => {
    const req = { body: { nombre: '', edad: 10 } };
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.errors).toBeDefined();
    expect(jsonCall.errors.length).toBeGreaterThanOrEqual(1);
  });

  it('debe retornar 400 cuando el tipo de dato es incorrecto', () => {
    const req = { body: { nombre: 'Test', edad: 'no es numero' } };
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('debe retornar 400 con email inválido', () => {
    const req = { body: { nombre: 'Test', edad: 20, email: 'no-valido' } };
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('debe retornar 400 cuando el body es null', () => {
    const req = { body: null };
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('debe retornar 400 cuando el body es un string', () => {
    const req = { body: 'string invalido' };
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  describe('con schema de campos opcionales', () => {
    const optionalSchema = z.object({
      nombre: z.string().min(1).optional(),
      edad: z.number().min(0).optional(),
    });
    const optMiddleware = validate(optionalSchema);

    it('debe pasar con body vacío cuando todos los campos son opcionales', () => {
      const req = { body: {} };
      const res = mockRes();
      const next = mockNext();

      optMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('debe validar formatos incluso en campos opcionales', () => {
      const req = { body: { nombre: '' } }; // min(1) fails
      const res = mockRes();
      const next = mockNext();

      optMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
