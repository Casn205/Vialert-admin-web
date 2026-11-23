import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Spinner } from '@/shared-ui';

/** Muestra spinner, error o el contenido según el estado de una consulta. */
export function Cargable<T>({ consulta, children }: { consulta: UseQueryResult<T>; children: (datos: T) => ReactNode }) {
  if (consulta.isPending) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }
  if (consulta.isError) {
    return (
      <p role="alert" className="rounded-md border border-critico/40 bg-critico/10 px-3 py-2 text-sm text-critico">
        {consulta.error.message || 'No se pudieron cargar los datos.'}
      </p>
    );
  }
  return <>{children(consulta.data)}</>;
}
