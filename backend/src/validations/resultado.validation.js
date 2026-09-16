import { z } from 'zod';

export const subirResultadoSchema = z.object({
  mesa_id: z.number().positive('El mesa_id debe ser positivo'),
  votos: z.array(z.object({
    candidato_id: z.number().positive(),
    votos: z.number().min(0)
  })),
  votos_blanco: z.number().min(0),
  votos_nulo: z.number().min(0),
  votos_impugnados: z.number().min(0).default(0),
  total_cedulas_votacion: z.number().min(0),
  observaciones_personero: z.string().optional()
});

export const verificarResultadoSchema = z.object({});

export const observarResultadoSchema = z.object({
  observaciones_coordinador: z.string().optional(),
  observacion: z.string().optional()
}).refine(data => (data.observaciones_coordinador && data.observaciones_coordinador.trim().length > 0) || (data.observacion && data.observacion.trim().length > 0), {
  message: 'Las observaciones son requeridas'
});
