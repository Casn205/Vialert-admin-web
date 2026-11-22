import { z } from 'zod';

const opcional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined));

const esquema = z
  .object({
    VITE_DATA_SOURCE: z.enum(['mock', 'firebase']).default('mock'),
    VITE_FIREBASE_API_KEY: opcional,
    VITE_FIREBASE_AUTH_DOMAIN: opcional,
    VITE_FIREBASE_PROJECT_ID: opcional,
    VITE_FIREBASE_STORAGE_BUCKET: opcional,
    VITE_FIREBASE_MESSAGING_SENDER_ID: opcional,
    VITE_FIREBASE_APP_ID: opcional,
    VITE_USE_EMULATORS: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    VITE_API_BASE_URL: opcional,
    VITE_GOOGLE_MAPS_API_KEY: opcional,
    VITE_GOOGLE_MAPS_MAP_ID: opcional,
  })
  .superRefine((env, ctx) => {
    if (env.VITE_DATA_SOURCE !== 'firebase') return;
    const obligatorias = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
      'VITE_API_BASE_URL',
    ] as const;
    for (const k of obligatorias) {
      if (!env[k]) {
        ctx.addIssue({
          code: 'custom',
          path: [k],
          message: `Falta ${k} (obligatoria con VITE_DATA_SOURCE=firebase)`,
        });
      }
    }
  });

export type Env = z.infer<typeof esquema>;

/** Valida las variables de entorno y falla con un mensaje legible. */
export function leerEnv(raw: Record<string, unknown> = import.meta.env): Env {
  const r = esquema.safeParse(raw);
  if (!r.success) {
    const detalle = r.error.issues.map((i) => `  - ${i.message}`).join('\n');
    throw new Error(`Configuración inválida (.env):\n${detalle}`);
  }
  return r.data;
}
