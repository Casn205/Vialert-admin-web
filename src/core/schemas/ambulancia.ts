import { z } from 'zod';
import { emailAmbulancia, entidad, passwordNueva, textoObligatorio } from './comunes';

const unidad = {
  placa: textoObligatorio('La placa'),
  codigoInterno: textoObligatorio('El código interno'),
};

export const nuevaAmbulanciaSchema = z.object({
  email: emailAmbulancia,
  password: passwordNueva,
  ...unidad,
  entidadId: entidad,
});

export const editarAmbulanciaSchema = z.object({
  ...unidad,
  entidadId: entidad,
});

export const filaLoteSchema = z.object({ ...unidad, email: emailAmbulancia });

/** "Crear flota": plantilla común (entidad, estado, contraseña) + filas. Máx. 50. */
export const loteSchema = z.object({
  entidadId: entidad,
  estadoOperativo: z.enum(['habilitada', 'inactiva']),
  password: passwordNueva,
  filas: z.array(filaLoteSchema).min(1, 'Agrega al menos una ambulancia').max(50, 'Máximo 50 por lote'),
});

export const passwordSchema = z.object({ password: passwordNueva });

export type NuevaAmbulanciaForm = z.infer<typeof nuevaAmbulanciaSchema>;
export type LoteForm = z.infer<typeof loteSchema>;
