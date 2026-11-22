import { useCallback, useMemo } from 'react';
import type { Alerta } from '@/core/domain/alerta';
import { construirUnidades, type UnidadVista } from '@/core/domain/flota';
import type { Hospital } from '@/core/domain/hospital';
import type { Ambulancia } from '@/core/domain/ambulancia';
import type { Personal } from '@/core/domain/personal';
import type { Ubicacion } from '@/core/domain/ubicacion';
import { useDeps } from '@/lib/deps-context';
import { useAhora } from '@/lib/use-ahora';
import { useSuscripcion } from '@/lib/use-suscripcion';

export interface FlotaEnVivo {
  unidades: UnidadVista[];
  /** Alertas `activa` y `enProceso`. */
  alertas: Alerta[];
  hospitales: Hospital[];
  ahora: Date;
  /** Fuentes que fallaron, en español, para avisar sin tumbar la pantalla. */
  errores: string[];
  cargando: boolean;
}

const ACTUALIZA_CADA_MS = 10_000;

/** Todo lo que el mapa muestra en tiempo real, ya cruzado. Redibuja cada 10 s para que "sin señal" cambie solo. */
export function useFlotaEnVivo(): FlotaEnVivo {
  const { ubicaciones, ambulancias, personal, alertas, hospitales } = useDeps();
  const ubic = useSuscripcion<Ubicacion[]>(useCallback((cb, err) => ubicaciones.suscribir(cb, err), [ubicaciones]));
  const amb = useSuscripcion<Ambulancia[]>(useCallback((cb, err) => ambulancias.suscribir(cb, err), [ambulancias]));
  const cond = useSuscripcion<Personal[]>(useCallback((cb, err) => personal.suscribir('conductor', cb, err), [personal]));
  const para = useSuscripcion<Personal[]>(useCallback((cb, err) => personal.suscribir('paramedico', cb, err), [personal]));
  const alt = useSuscripcion<Alerta[]>(useCallback((cb, err) => alertas.suscribirActivas(cb, err), [alertas]));
  const hosp = useSuscripcion<Hospital[]>(useCallback((cb, err) => hospitales.suscribir(cb, err), [hospitales]));
  const ahora = useAhora(ACTUALIZA_CADA_MS);

  const unidades = useMemo(
    () =>
      construirUnidades({
        ubicaciones: ubic.datos ?? [],
        ambulancias: amb.datos ?? [],
        conductores: cond.datos ?? [],
        paramedicos: para.datos ?? [],
        ahora,
      }),
    [ubic.datos, amb.datos, cond.datos, para.datos, ahora],
  );

  const errores = [
    ubic.error && 'las ubicaciones',
    amb.error && 'las ambulancias',
    cond.error && 'los conductores',
    para.error && 'los paramédicos',
    alt.error && 'las alertas',
    hosp.error && 'los hospitales',
  ].filter((x): x is string => typeof x === 'string');

  return {
    unidades,
    alertas: alt.datos ?? [],
    hospitales: hosp.datos ?? [],
    ahora,
    errores,
    cargando: [ubic, amb, alt].some((s) => s.cargando),
  };
}
