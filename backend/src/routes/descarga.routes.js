import { Router } from 'express';
import {
  descargarProvincial,
  descargarDistrital,
  descargarCompleta,
  descargarColegiosExcel,
  descargarAsignacionesExcel,
  descargarUsuariosExcel,
  descargarResultadosExcel,
} from '../controllers/descarga.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken, requireRole('admin'));

// Reportes Excel
router.get('/colegios-excel', descargarColegiosExcel);
router.get('/asignaciones-excel', descargarAsignacionesExcel);
router.get('/usuarios-excel', descargarUsuariosExcel);
router.get('/resultados-excel', descargarResultadosExcel);

// Reportes ZIP
router.get('/provincial', descargarProvincial);
router.get('/distrital', descargarDistrital);
router.get('/completa', descargarCompleta);

export default router;
