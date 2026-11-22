import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import type { Deps } from '@/core/ports';
import { SessionProvider } from '@/features/auth';
import { DepsProvider } from '@/lib/deps-context';
import { ToastProvider } from '@/shared-ui';

export function AppProviders({ deps, children }: { deps: Deps; children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } } }),
  );
  return (
    <DepsProvider deps={deps}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </QueryClientProvider>
    </DepsProvider>
  );
}
