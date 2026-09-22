import { jest } from '@jest/globals';
import { authenticateToken, requireRole } from '../../../src/middlewares/auth.middleware.js';
import { generateAdminToken, generatePersoneroToken, generateCoordinadorToken, generateToken, mockRequest, mockResponse } from '../../setup/helpers.js';
import jwt from 'jsonwebtoken';

describe('Auth Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = jest.fn();
  });

  describe('authenticateToken', () => {
    it('debería devolver 401 si no hay header de Authorization', () => {
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringMatching(/Access denied/i) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('debería devolver 401 si Authorization no tiene Bearer', () => {
      req.headers.authorization = 'UnrelatedTokenString';
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('debería devolver 403 con Invalid token si el token es malformado', () => {
      req.headers.authorization = 'Bearer token.invalido.123';
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringMatching(/Invalid token/i) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('debería devolver 403 si el token ha expirado', () => {
      const expiredToken = jwt.sign({ id: 1 }, process.env.JWT_SECRET || 'secret', { expiresIn: '-1h' });
      req.headers.authorization = `Bearer ${expiredToken}`;
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringMatching(/Invalid token/i) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('debería setear req.user y llamar a next si el token es válido', () => {
      const token = generateAdminToken();
      req.headers.authorization = `Bearer ${token}`;
      authenticateToken(req, res, next);
      expect(req.user).toBeDefined();
      expect(req.user.rol).toBe('admin');
      expect(next).toHaveBeenCalled();
    });

    it('debería devolver 403 si se firma con un secret distinto', () => {
      const badToken = jwt.sign({ id: 1 }, 'wrong-secret-key-12345');
      req.headers.authorization = `Bearer ${badToken}`;
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringMatching(/Invalid token/i) })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('debería llamar a next si el usuario tiene el rol correcto', () => {
      req.user = { rol: 'admin' };
      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('debería devolver 403 si el usuario tiene rol incorrecto', () => {
      req.user = { rol: 'personero' };
      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringMatching(/Insufficient permissions/i) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('debería llamar a next si se permiten múltiples roles y el usuario tiene uno', () => {
      req.user = { rol: 'coordinador' };
      const middleware = requireRole('admin', 'coordinador');
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('debería devolver 403 si no hay req.user', () => {
      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringMatching(/Insufficient permissions/i) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('debería devolver 403 si requiere admin pero es personero', () => {
      req.user = { rol: 'personero' };
      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringMatching(/Insufficient permissions/i) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('debería llamar a next si requiere admin, coordinador y es coordinador', () => {
      req.user = { rol: 'coordinador' };
      const middleware = requireRole('admin', 'coordinador');
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('debería devolver 403 si requiere personero pero es admin', () => {
      req.user = { rol: 'admin' };
      const middleware = requireRole('personero');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringMatching(/Insufficient permissions/i) })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
