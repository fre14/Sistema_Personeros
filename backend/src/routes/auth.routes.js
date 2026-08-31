import { Router } from 'express';
import { login, refreshToken, getProfile } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { loginSchema } from '../validations/auth.validation.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/refresh', refreshToken);
router.get('/profile', authenticateToken, getProfile);

export default router;
