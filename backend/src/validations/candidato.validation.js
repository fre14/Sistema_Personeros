import { z } from 'zod';

export const createCandidatoSchema = z.object({
  nombre_completo: z.string().min(1, 'El nombre_completo es requerido'),
  organizacion_politica: z.string().min(1, 'La organizacion_politica es requerida'),
  siglas: z.string().optional().nullable().or(z.literal('')),
  numero_lista: z.number().positive('El numero_lista debe ser positivo'),
});

export const updateCandidatoSchema = z.object({
  nombre_completo: z.string().min(1).optional(),
  organizacion_politica: z.string().min(1).optional(),
  siglas: z.string().optional().nullable().or(z.literal('')),
  numero_lista: z.number().positive().optional(),
  foto_url: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  activo: z.boolean().optional(),
});
