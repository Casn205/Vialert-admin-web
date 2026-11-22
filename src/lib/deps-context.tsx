import { createContext, useContext, type ReactNode } from 'react';
import type { Deps } from '@/core/ports';

const DepsContext = createContext<Deps | null>(null);

/** Entrega los repositorios a toda la aplicación. Las features los leen con `useDeps()`. */
export function DepsProvider({ deps, children }: { deps: Deps; children: ReactNode }) {
  return <DepsContext.Provider value={deps}>{children}</DepsContext.Provider>;
}

export function useDeps(): Deps {
  const d = useContext(DepsContext);
  if (!d) throw new Error('useDeps debe usarse dentro de <DepsProvider>');
  return d;
}
