import type { Deps } from '@/core/ports';
import { leerEnv, type Env } from '@/lib/env';

/**
 * Único lugar que decide qué implementaciones usa la aplicación:
 * `VITE_DATA_SOURCE=mock` (datos de ejemplo) o `firebase` (Firestore + API).
 * Se cargan bajo demanda: el navegador solo descarga la implementación elegida.
 */
export async function buildDeps(env: Env = leerEnv()): Promise<Deps> {
  if (env.VITE_DATA_SOURCE === 'mock') {
    const { createMockDeps } = await import('@/infrastructure/mock/mock-deps');
    return createMockDeps();
  }
  const { createFirebaseDeps } = await import('@/infrastructure/firebase/create-deps');
  return createFirebaseDeps(env);
}
