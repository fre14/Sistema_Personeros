import { Router } from 'express';
import { getAll, getById, create, update, remove } from '../controllers/locales.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { createLocalSchema, updateLocalSchema } from '../validations/local.validation.js';

const router = Router();

router.use(authenticateToken, requireRole('admin'));

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', validate(createLocalSchema), create);
router.put('/:id', validate(updateLocalSchema), update);
router.delete('/:id', remove);

export default router;
