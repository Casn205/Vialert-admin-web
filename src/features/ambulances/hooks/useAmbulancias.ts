import { useCallback } from 'react';
import type { Ambulancia } from '@/core/domain/ambulancia';
import type { OnError } from '@/core/ports';
import { useDeps } from '@/lib/deps-context';
import { useSuscripcion } from '@/lib/use-suscripcion';

/** Ambulancias en vivo, ordenadas por placa, y los comandos (que pasan por la API). */
export function useAmbulancias() {
  const { ambulancias } = useDeps();
  const suscribir = useCallback(
    (cb: (a: Ambulancia[]) => void, onError: OnError) =>
      ambulancias.suscribir((l) => cb([...l].sort((a, b) => a.placa.localeCompare(b.placa, 'es'))), onError),
    [ambulancias],
  );
  const { datos, error, cargando } = useSuscripcion<Ambulancia[]>(suscribir);

  return {
    ambulancias: datos ?? [],
    cargando,
    error,
    crear: ambulancias.crear.bind(ambulancias),
    crearLote: ambulancias.crearLote.bind(ambulancias),
    actualizar: ambulancias.actualizar.bind(ambulancias),
    deshabilitar: ambulancias.deshabilitar.bind(ambulancias),
    habilitar: ambulancias.habilitar.bind(ambulancias),
    resetearPassword: ambulancias.resetearPassword.bind(ambulancias),
    cerrarTurno: ambulancias.cerrarTurno.bind(ambulancias),
  };
}
