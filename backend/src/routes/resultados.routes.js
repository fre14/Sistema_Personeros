import { Router } from 'express';
import {
  subirResultado, corregirResultado, verificarResultado, observarResultado,
  getResultadosPorLocal, getResultadoDetalle, getMiMesa, confirmarMesa
} from '../controllers/resultados.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { uploadActa } from '../middlewares/upload.middleware.js';
import { observarResultadoSchema } from '../validations/resultado.validation.js';

const router = Router();

router.get('/mi-mesa', authenticateToken, requireRole('personero'), getMiMesa);
router.post('/confirmar-mesa', authenticateToken, requireRole('personero'), confirmarMesa);

router.post('/', authenticateToken, requireRole('personero'), uploadActa, subirResultado);
router.put('/:id/corregir', authenticateToken, requireRole('personero'), uploadActa, corregirResultado);

router.put('/:id/verificar', authenticateToken, requireRole('coordinador'), verificarResultado);
router.put('/:id/observar', authenticateToken, requireRole('coordinador'), validate(observarResultadoSchema), observarResultado);

router.get('/local/:localId', authenticateToken, requireRole('coordinador'), getResultadosPorLocal);
router.get('/:id', authenticateToken, getResultadoDetalle);

export default router;
