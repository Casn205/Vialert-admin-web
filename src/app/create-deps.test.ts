import { describe, expect, it, vi } from 'vitest';
import { leerEnv } from '@/lib/env';
import { createFirebaseDeps } from '@/infrastructure/firebase/create-deps';
import { createDeps } from './create-deps';

vi.mock('@/infrastructure/firebase/create-deps', () => ({
  createFirebaseDeps: vi.fn(() => ({ fuente: 'firebase' })),
}));

describe('createDeps', () => {
  it('crea dependencias mock cuando VITE_DATA_SOURCE es mock', async () => {
    const deps = await createDeps(leerEnv({ VITE_DATA_SOURCE: 'mock' }));
    expect(deps.fuente).toBe('mock');
    expect(createFirebaseDeps).not.toHaveBeenCalled();
  });

  it('delega en la implementación Firebase cuando VITE_DATA_SOURCE es firebase', async () => {
    const env = leerEnv({
      VITE_DATA_SOURCE: 'firebase',
      VITE_FIREBASE_API_KEY: 'api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'example.test',
      VITE_FIREBASE_PROJECT_ID: 'project',
      VITE_FIREBASE_STORAGE_BUCKET: 'bucket',
      VITE_FIREBASE_MESSAGING_SENDER_ID: 'sender',
      VITE_FIREBASE_APP_ID: 'app',
      VITE_API_BASE_URL: 'https://api.example.test',
    });

    const deps = await createDeps(env);
    expect(deps.fuente).toBe('firebase');
    expect(vi.mocked(createFirebaseDeps)).toHaveBeenCalledWith(env);
  });
});
