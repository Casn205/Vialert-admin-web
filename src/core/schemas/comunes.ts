import { z } from 'zod';

export const textoObligatorio = (campo: string) =>
  z.string().trim().min(1, `${campo} es obligatorio`);

/** Mismas reglas que `AmbulanciaBuilder` de la app: obligatorio y debe contener '@'. */
export const emailAmbulancia = z
  .string()
  .trim()
  .min(1, 'El correo es obligatorio')
  .refine((v) => v.includes('@'), 'El correo no tiene un formato válido');

/** Normaliza como la app: sin espacios en los extremos y en MAYÚSCULAS. */
export const entidad = z.string().trim().min(1, 'La entidad es obligatoria').toUpperCase();

export const passwordNueva = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres');
