import { z } from 'zod';
import { entidad, textoObligatorio } from './comunes';

const base = {
  nombre: textoObligatorio('El nombre'),
  apellido: textoObligatorio('El apellido'),
  cedula: textoObligatorio('La cédula'),
  entidadId: entidad,
};

/** Alta de personal. El teléfono es obligatorio solo para paramédicos. */
export const personalSchema = z
  .object({
    tipo: z.enum(['conductor', 'paramedico']),
    ...base,
    telefono: z.string().trim().optional(),
  })
  .superRefine((p, ctx) => {
    if (p.tipo === 'paramedico' && !p.telefono) {
      ctx.addIssue({ code: 'custom', path: ['telefono'], message: 'El teléfono es obligatorio' });
    }
  });

export type PersonalForm = z.infer<typeof personalSchema>;

/** Edición: nunca `estado` ni `ambulanciaId`. */
export const personalEdicionSchema = z.object({
  ...base,
  telefono: z.string().trim().optional(),
});
