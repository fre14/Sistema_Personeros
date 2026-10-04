import { z } from 'zod';

export const asignarPersoneroSchema = z.object({
  usuario_id: z.number().positive('El usuario_id debe ser positivo'),
  mesa_id: z.number().positive('El mesa_id debe ser positivo'),
  reubicar: z.boolean().optional(),
});

export const asignarCoordinadorSchema = z.object({
  usuario_id: z.number().positive('El usuario_id debe ser positivo'),
  local_id: z.number().positive('El local_id debe ser positivo'),
});

export const reasignarSchema = z.object({
  usuario_nuevo_id: z.number().positive('El usuario_nuevo_id debe ser positivo'),
  motivo_cambio: z.string().optional(),
});

export const autoAsignarPersonerosSchema = z.object({
  local_id: z.number().positive().optional().nullable(),
  distrito_id: z.number().positive().optional().nullable(),
  usuario_ids: z.array(z.number().positive()).optional(),
}).optional();
