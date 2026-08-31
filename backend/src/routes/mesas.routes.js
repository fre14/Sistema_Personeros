import { Router } from 'express';
import { getAll, getById, create, update, remove } from '../controllers/mesas.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { createMesaSchema, updateMesaSchema } from '../validations/mesa.validation.js';

const router = Router();

router.use(authenticateToken, requireRole('admin'));

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', validate(createMesaSchema), create);
router.put('/:id', validate(updateMesaSchema), update);
router.delete('/:id', remove);

export default router;
