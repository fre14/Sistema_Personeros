import { Router } from 'express';
import {
  getMisLocales,
  getMesasDeLocal,
  getPersonerosSupervisados
} from '../controllers/coordinador.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken, requireRole('coordinador', 'admin'));

router.get('/locales', getMisLocales);
router.get('/locales/:localId/mesas', getMesasDeLocal);
router.get('/locales/:localId/personeros', getPersonerosSupervisados);
router.get('/personeros', getPersonerosSupervisados);

export default router;
