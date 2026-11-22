import { z } from 'zod';
import { textoObligatorio } from './comunes';

export const hospitalSchema = z.object({
  nombre: textoObligatorio('El nombre'),
  lat: z
    .number('La latitud debe ser un número')
    .min(-90, 'La latitud debe estar entre −90 y 90')
    .max(90, 'La latitud debe estar entre −90 y 90'),
  lng: z
    .number('La longitud debe ser un número')
    .min(-180, 'La longitud debe estar entre −180 y 180')
    .max(180, 'La longitud debe estar entre −180 y 180'),
});

export type HospitalForm = z.infer<typeof hospitalSchema>;
