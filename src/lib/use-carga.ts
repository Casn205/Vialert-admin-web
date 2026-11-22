import { useEffect, useEffectEvent, useState } from 'react';

export interface EstadoCarga<T> {
  datos: T | null;
  error: Error | null;
  /** `true` mientras no ha llegado el resultado de la consulta actual. */
  cargando: boolean;
  /** Vuelve a ejecutar la consulta. */
  recargar: () => void;
}

/**
 * Ejecuta una consulta asíncrona y la repite cuando cambia `clave` (describe los parámetros de la consulta).
 * Descarta respuestas de consultas anteriores. `cargar` puede cambiar de identidad sin repetir la consulta.
 */
export function useCarga<T>(cargar: () => Promise<T>, clave: string): EstadoCarga<T> {
  const [reintento, setReintento] = useState(0);
  const [res, setRes] = useState<{ clave: string; datos: T | null; error: Error | null } | null>(null);
  const claveActual = `${clave}#${reintento}`;
  const ejecutar = useEffectEvent(cargar);

  useEffect(() => {
    let vigente = true;
    ejecutar().then(
      (datos) => vigente && setRes({ clave: claveActual, datos, error: null }),
      (e: unknown) =>
        vigente && setRes({ clave: claveActual, datos: null, error: e instanceof Error ? e : new Error(String(e)) }),
    );
    return () => {
      vigente = false;
    };
  }, [claveActual]);

  const actual = res?.clave === claveActual ? res : null;
  return {
    datos: actual?.datos ?? null,
    error: actual?.error ?? null,
    cargando: actual === null,
    recargar: () => setReintento((n) => n + 1),
  };
}
