import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import { authConfig } from '../../src/config/auth.js';

export const generateToken = (payload) => {
    return jwt.sign(payload, authConfig.secret || process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
};

export const generateAdminToken = () => {
    return generateToken({ id: 1, dni: '00000000', rol: 'admin' });
};

export const generateCoordinadorToken = (id = 2) => {
    return generateToken({ id, dni: '11111111', rol: 'coordinador' });
};

export const generatePersoneroToken = (id = 3) => {
    return generateToken({ id, dni: '22222222', rol: 'personero' });
};

export const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

export const mockRequest = (overrides = {}) => {
    return {
        body: {},
        params: {},
        query: {},
        headers: {},
        ...overrides
    };
};
