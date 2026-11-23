import type { Deps } from '@/core/ports';
import { leerEnv, type Env } from '@/lib/env';

/**
 * Factory que decide qué implementaciones usa la aplicación:
 * `VITE_DATA_SOURCE=mock` (datos de ejemplo) o `firebase` (Firestore + API).
 * Se cargan bajo demanda: el navegador solo descarga la implementación elegida.
 */
export async function createDeps(env: Env = leerEnv()): Promise<Deps> {
  switch (env.VITE_DATA_SOURCE) {
    case 'mock': {
      const { createMockDeps } = await import('@/infrastructure/mock/mock-deps');
      return createMockDeps();
    }
    case 'firebase': {
      const { createFirebaseDeps } = await import('@/infrastructure/firebase/create-deps');
      return createFirebaseDeps(env);
    }
    default: {
      const fuente: never = env.VITE_DATA_SOURCE;
      throw new Error(`Fuente de datos no soportada: ${fuente}`);
    }
  }
}
