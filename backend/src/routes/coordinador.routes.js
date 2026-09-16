import { Router } from 'express';
import {
  getMisLocales,
  getMesasDeLocal,
  getPersonerosSupervisados
} from '../controllers/coordinador.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas las rutas de coordinador requieren autenticación y rol de coordinador o admin
router.use(authenticateToken, requireRole('coordinador', 'admin'));

// Locales asignados con estadísticas de avance
router.get('/locales', getMisLocales);

// Mesas y personeros de un local asignado
router.get('/locales/:localId/mesas', getMesasDeLocal);

// Personeros asignados a las mesas del local (supervisados automáticamente)
router.get('/locales/:localId/personeros', getPersonerosSupervisados);
router.get('/personeros', getPersonerosSupervisados);

export default router;
