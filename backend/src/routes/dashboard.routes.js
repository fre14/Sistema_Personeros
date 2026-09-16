import { Router } from 'express';
import {
  getResumen, getResultadosPorCandidato, getResultadosPorDistrito, getResultadosPorLocal,
  getMesasPendientes, getAuditoria, getComposicionVoto
} from '../controllers/dashboard.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken, requireRole('admin'));

router.get('/resumen', getResumen);
router.get('/por-candidato', getResultadosPorCandidato);
router.get('/por-distrito', getResultadosPorDistrito);
router.get('/por-local', getResultadosPorLocal);
router.get('/composicion-voto', getComposicionVoto);
router.get('/mesas-pendientes', getMesasPendientes);
router.get('/auditoria', getAuditoria);

export default router;
