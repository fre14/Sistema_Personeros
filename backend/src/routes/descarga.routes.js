import { Router } from 'express';
import {
  descargarProvincial,
  descargarDistrital,
  descargarCompleta,
} from '../controllers/descarga.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken, requireRole('admin'));

router.get('/provincial', descargarProvincial);
router.get('/distrital', descargarDistrital);
router.get('/completa', descargarCompleta);

export default router;
