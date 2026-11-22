import { useCallback } from 'react';
import type { Ambulancia } from '@/core/domain/ambulancia';
import type { Personal, TipoPersonal } from '@/core/domain/personal';
import type { OnError } from '@/core/ports';
import { useDeps } from '@/lib/deps-context';
import { useSuscripcion } from '@/lib/use-suscripcion';

const porNombre = (a: Personal, b: Personal) =>
  a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es');

/** Conductores o paramédicos en vivo, ordenados por apellido, y las operaciones de escritura. */
export function usePersonal(tipo: TipoPersonal) {
  const { personal } = useDeps();
  const suscribir = useCallback(
    (cb: (p: Personal[]) => void, onError: OnError) =>
      personal.suscribir(tipo, (l) => cb([...l].sort(porNombre)), onError),
    [personal, tipo],
  );
  const { datos, error, cargando } = useSuscripcion<Personal[]>(suscribir);

  return {
    personal: datos ?? [],
    cargando,
    error,
    crear: personal.crear.bind(personal),
    actualizar: personal.actualizar.bind(personal),
    eliminar: personal.eliminar.bind(personal),
  };
}

/** Ambulancias por id, para mostrar la placa de la unidad a la que está asignado el personal. */
export function useAmbulanciasPorId(): Map<string, Ambulancia> {
  const { ambulancias } = useDeps();
  const suscribir = useCallback(
    (cb: (m: Map<string, Ambulancia>) => void, onError: OnError) =>
      ambulancias.suscribir((l) => cb(new Map(l.map((a) => [a.id, a]))), onError),
    [ambulancias],
  );
  const { datos } = useSuscripcion<Map<string, Ambulancia>>(suscribir);
  return datos ?? new Map();
}
