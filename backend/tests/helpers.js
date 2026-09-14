import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

export const generateToken = (payload) => {
    // Generates a JWT using 'secret' as the secret
    return jwt.sign(payload, 'secret', { expiresIn: '1h' });
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
