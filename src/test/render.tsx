import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Deps } from '@/core/ports';
import { createMockDeps } from '@/infrastructure/mock/mock-deps';
import { DepsProvider } from '@/lib/deps-context';
import { ToastProvider } from '@/shared-ui';

/** Renderiza una página con datos de ejemplo en memoria, avisos y router. */
export function renderConDeps(ui: ReactElement, opts: { deps?: Deps; ruta?: string } = {}) {
  const deps = opts.deps ?? createMockDeps({ movimiento: false });
  const utils = render(
    <DepsProvider deps={deps}>
      <ToastProvider>
        <MemoryRouter initialEntries={[opts.ruta ?? '/']}>{ui}</MemoryRouter>
      </ToastProvider>
    </DepsProvider>,
  );
  return { ...utils, deps, user: userEvent.setup() };
}
