import { useEffect, useState } from 'react';
import type { Unsubscribe } from '@/core/ports';

export type Suscribir<T> = (cb: (datos: T) => void, onError: (e: Error) => void) => Unsubscribe;

export interface EstadoSuscripcion<T> {
  datos: T | null;
  error: Error | null;
  /** `true` hasta que llega el primer dato (o un error). */
  cargando: boolean;
}

/**
 * Se suscribe a un repositorio en vivo y se desuscribe al desmontar.
 * `suscribir` debe estar memorizada (useCallback): si cambia su identidad, se vuelve a suscribir.
 */
export function useSuscripcion<T>(suscribir: Suscribir<T>): EstadoSuscripcion<T> {
  const [estado, setEstado] = useState<{ datos: T | null; error: Error | null }>({ datos: null, error: null });

  useEffect(
    () =>
      suscribir(
        (datos) => setEstado({ datos, error: null }),
        (error) => setEstado((s) => ({ ...s, error })),
      ),
    [suscribir],
  );

  return { datos: estado.datos, error: estado.error, cargando: estado.datos === null && estado.error === null };
}

/** Mensaje legible de un error desconocido. */
export function mensajeDe(e: unknown, porDefecto = 'Ocurrió un error inesperado.'): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}
