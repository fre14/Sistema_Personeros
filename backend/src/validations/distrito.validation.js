import { z } from 'zod';

export const createDistritoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  codigo: z.string().min(1, 'El código es requerido'),
});

export const updateDistritoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  codigo: z.string().min(1, 'El código es requerido').optional(),
});
