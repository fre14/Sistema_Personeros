import { Router } from 'express';
import { getAll, getById, create, update, remove } from '../controllers/distritos.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { createDistritoSchema, updateDistritoSchema } from '../validations/distrito.validation.js';

const router = Router();

router.use(authenticateToken, requireRole('admin'));

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', validate(createDistritoSchema), create);
router.put('/:id', validate(updateDistritoSchema), update);
router.delete('/:id', remove);

export default router;
