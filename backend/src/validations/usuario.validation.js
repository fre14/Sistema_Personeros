import { z } from 'zod';

export const createUsuarioSchema = z.object({
  dni: z.string().length(8, 'El DNI debe tener 8 caracteres'),
  nombres: z.string().min(1, 'Los nombres son requeridos'),
  apellidos: z.string().min(1, 'Los apellidos son requeridos'),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rol: z.enum(['admin', 'coordinador', 'personero']),
});

export const updateUsuarioSchema = z.object({
  dni: z.string().length(8, 'El DNI debe tener 8 caracteres').optional(),
  nombres: z.string().min(1).optional(),
  apellidos: z.string().min(1).optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  rol: z.enum(['admin', 'coordinador', 'personero']).optional(),
});
