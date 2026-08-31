import { Router } from 'express';
import {
  asignarPersonero, reasignarPersonero, getAsignacionesPersoneros, removeAsignacionPersonero,
  asignarCoordinador, reasignarCoordinador, getAsignacionesCoordinadores, removeAsignacionCoordinador,
  getHistorial
} from '../controllers/asignaciones.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { asignarPersoneroSchema, asignarCoordinadorSchema, reasignarSchema } from '../validations/asignacion.validation.js';

const router = Router();

router.use(authenticateToken, requireRole('admin'));

router.get('/personeros', getAsignacionesPersoneros);
router.post('/personeros', validate(asignarPersoneroSchema), asignarPersonero);
router.put('/personeros/:id/reasignar', validate(reasignarSchema), reasignarPersonero);
router.delete('/personeros/:id', removeAsignacionPersonero);

router.get('/coordinadores', getAsignacionesCoordinadores);
router.post('/coordinadores', validate(asignarCoordinadorSchema), asignarCoordinador);
router.put('/coordinadores/:id/reasignar', validate(reasignarSchema), reasignarCoordinador);
router.delete('/coordinadores/:id', removeAsignacionCoordinador);

router.get('/historial', getHistorial);

export default router;
