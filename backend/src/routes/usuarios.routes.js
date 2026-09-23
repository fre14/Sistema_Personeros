import { Router } from 'express';
import { getAll, getById, create, update, toggleActive, remove, bulkUpdateEstado } from '../controllers/usuarios.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { createUsuarioSchema, updateUsuarioSchema } from '../validations/usuario.validation.js';

const router = Router();

router.use(authenticateToken, requireRole('admin'));

router.get('/', getAll);
router.post('/bulk-estado', bulkUpdateEstado);
router.get('/:id', getById);
router.post('/', validate(createUsuarioSchema), create);
router.put('/:id', validate(updateUsuarioSchema), update);
router.patch('/:id/toggle-active', toggleActive);
router.delete('/:id', remove);

export default router;
