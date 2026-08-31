import { Router } from 'express';
import { getAll, getById, create, update, remove } from '../controllers/candidatos.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { createCandidatoSchema, updateCandidatoSchema } from '../validations/candidato.validation.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getAll);
router.get('/:id', getById);

router.post('/', requireRole('admin'), validate(createCandidatoSchema), create);
router.put('/:id', requireRole('admin'), validate(updateCandidatoSchema), update);
router.delete('/:id', requireRole('admin'), remove);

export default router;
