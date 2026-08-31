import { z } from 'zod';

export const createMesaSchema = z.object({
  numero_mesa: z.string().min(1, 'El numero_mesa es requerido'),
  local_id: z.number().positive('El local_id debe ser positivo'),
  total_electores_habiles: z.number().min(0, 'Debe ser al menos 0'),
});

export const updateMesaSchema = z.object({
  numero_mesa: z.string().min(1, 'El numero_mesa es requerido').optional(),
  local_id: z.number().positive('El local_id debe ser positivo').optional(),
  total_electores_habiles: z.number().min(0, 'Debe ser al menos 0').optional(),
});
