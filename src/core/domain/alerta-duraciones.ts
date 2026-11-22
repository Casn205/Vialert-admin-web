import { MAX_DURACION_SEG } from './constants';
import type { Alerta } from './alerta';

/** Duraciones en segundos; `null` = sin dato o anómala. Mismas definiciones que la API (sección 8 del plan). */
export interface DuracionesAlerta {
  asignacion: number | null;
  respuesta: number | null;
  viaje: number | null;
  /** Permanencia en escena: de la llegada al inicio del traslado. */
  enEscena: number | null;
  traslado: number | null;
  cicloTotal: number | null;
  /** (viaje − etaInicialSeg) / etaInicialSeg */
  errorEta: number | null;
}

function diff(desde: Date | null, hasta: Date | null): number | null {
  if (!desde || !hasta) return null;
  const s = Math.round((hasta.getTime() - desde.getTime()) / 1000);
  return s >= 0 && s <= MAX_DURACION_SEG ? s : null;
}

export function duracionesDeAlerta(a: Alerta): DuracionesAlerta {
  const t0 = a.createdAtServer;
  const viaje = diff(a.rutaIniciadaAt, a.llegadaAt);
  return {
    asignacion: diff(t0, a.tomadaAt),
    respuesta: diff(t0, a.llegadaAt),
    viaje,
    enEscena: diff(a.llegadaAt, a.trasladoIniciadoAt),
    traslado: diff(a.trasladoIniciadoAt, a.trasladoFinalizadoAt),
    cicloTotal: diff(t0, a.trasladoFinalizadoAt ?? a.atendidaAt),
    errorEta:
      viaje !== null && a.etaInicialSeg !== null && a.etaInicialSeg > 0
        ? (viaje - a.etaInicialSeg) / a.etaInicialSeg
        : null,
  };
}

/** "8 min 20 s" / "45 s" / "Sin dato". */
export function formatoDuracion(seg: number | null): string {
  if (seg === null) return 'Sin dato';
  if (seg < 60) return `${seg} s`;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  if (m < 60) return s ? `${m} min ${s} s` : `${m} min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h} h ${mm} min` : `${h} h`;
}
