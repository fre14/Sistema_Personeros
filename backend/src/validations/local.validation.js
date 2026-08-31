import { z } from 'zod';

export const createLocalSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  direccion: z.string().optional(),
  distrito_id: z.number().positive('El distrito_id debe ser positivo'),
  total_mesas: z.number().min(0).optional(),
});

export const updateLocalSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  direccion: z.string().optional(),
  distrito_id: z.number().positive('El distrito_id debe ser positivo').optional(),
  total_mesas: z.number().min(0).optional(),
});
