import { useCallback } from 'react';
import type { Hospital } from '@/core/domain/hospital';
import type { OnError } from '@/core/ports';
import { useDeps } from '@/lib/deps-context';
import { useSuscripcion } from '@/lib/use-suscripcion';

/** Hospitales en vivo, ordenados por nombre, y las operaciones de escritura. */
export function useHospitales() {
  const { hospitales } = useDeps();
  const suscribir = useCallback(
    (cb: (h: Hospital[]) => void, onError: OnError) =>
      hospitales.suscribir((l) => cb([...l].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))), onError),
    [hospitales],
  );
  const { datos, error, cargando } = useSuscripcion<Hospital[]>(suscribir);

  return {
    hospitales: datos ?? [],
    cargando,
    error,
    crear: hospitales.crear.bind(hospitales),
    actualizar: hospitales.actualizar.bind(hospitales),
    eliminar: hospitales.eliminar.bind(hospitales),
  };
}
