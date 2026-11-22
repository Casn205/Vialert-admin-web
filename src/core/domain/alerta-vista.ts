import { TIPOS_ALERTA_CONOCIDOS } from './constants';
import { fechaCreacion, PRIORIDADES, type Alerta, type EstadoAlerta, type Prioridad } from './alerta';

/** Color del pin por prioridad (crítica rojo, alta naranja, media amarillo, baja verde, sin prioridad gris). */
export const COLOR_PRIORIDAD: Record<Prioridad | 'sin', string> = {
  critica: '#c8372d',
  alta: '#e2832b',
  media: '#e0b72a',
  baja: '#2b8a57',
  sin: '#7b8794',
};

export const ETIQUETA_SIN_PRIORIDAD = 'Sin prioridad';

export function colorDePrioridad(p: Prioridad | null): string {
  return COLOR_PRIORIDAD[p ?? 'sin'];
}

const ORDEN_PRIORIDAD = new Map<Prioridad | null, number>([...PRIORIDADES.map((p, i) => [p, i] as const), [null, PRIORIDADES.length]]);

/**
 * Orden de la lista del panel: por prioridad (crítica → baja, sin prioridad al final) y, dentro de cada una,
 * la más antigua primero (es la que más lleva esperando). Sin fecha, al final de su grupo.
 */
export function ordenarPorUrgencia(alertas: readonly Alerta[]): Alerta[] {
  const t = (a: Alerta) => fechaCreacion(a)?.getTime() ?? Number.POSITIVE_INFINITY;
  return [...alertas].sort(
    (a, b) => (ORDEN_PRIORIDAD.get(a.prioridad) ?? 99) - (ORDEN_PRIORIDAD.get(b.prioridad) ?? 99) || t(a) - t(b) || a.id.localeCompare(b.id),
  );
}

/** Segundos que lleva esperando: `ahora − (createdAtServer ?? createdAt)`. `null` si no hay fecha. Nunca negativo. */
export function esperaSeg(a: Pick<Alerta, 'createdAtServer' | 'createdAt'>, ahora: Date): number | null {
  const f = fechaCreacion(a);
  if (!f) return null;
  return Math.max(0, Math.round((ahora.getTime() - f.getTime()) / 1000));
}

export interface FiltroAlertas {
  tipo: string | null;
  /** `'sin'` = alertas sin prioridad. */
  prioridad: Prioridad | 'sin' | null;
  estado: EstadoAlerta | null;
  incluirSimuladas: boolean;
}

export const FILTRO_ALERTAS_VACIO: FiltroAlertas = { tipo: null, prioridad: null, estado: null, incluirSimuladas: false };

/** Filtros en memoria (no exigen índices en Firestore). */
export function filtrarAlertas(alertas: readonly Alerta[], f: FiltroAlertas): Alerta[] {
  return alertas.filter(
    (a) =>
      (f.incluirSimuladas || !a.simulada) &&
      (f.tipo === null || a.type === f.tipo) &&
      (f.estado === null || a.estado === f.estado) &&
      (f.prioridad === null || (f.prioridad === 'sin' ? a.prioridad === null : a.prioridad === f.prioridad)),
  );
}

/** Opciones del filtro de tipo: los 4 conocidos más los que aparezcan en los datos. */
export function tiposDisponibles(alertas: readonly Alerta[]): string[] {
  const extra = new Set<string>();
  for (const a of alertas) {
    const t = a.type.trim();
    if (t && !(TIPOS_ALERTA_CONOCIDOS as readonly string[]).includes(t)) extra.add(t);
  }
  return [...TIPOS_ALERTA_CONOCIDOS, ...[...extra].sort((x, y) => x.localeCompare(y, 'es'))];
}

/** Rango de los últimos `dias` días (1 = hoy), desde las 00:00 hora local hasta `ahora`. */
export function rangoUltimosDias(dias: number, ahora: Date): { desde: Date; hasta: Date } {
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - (Math.max(1, dias) - 1));
  return { desde, hasta: ahora };
}

/** Un rango personalizado de fechas "YYYY-MM-DD": del inicio del primer día al final del último. `null` si es inválido. */
export function rangoDeFechas(desde: string, hasta: string): { desde: Date; hasta: Date } | null {
  const p = (s: string) => /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const a = p(desde);
  const b = p(hasta);
  if (!a || !b) return null;
  const d = new Date(+a[1]!, +a[2]! - 1, +a[3]!);
  const h = new Date(+b[1]!, +b[2]! - 1, +b[3]!, 23, 59, 59, 999);
  if (Number.isNaN(d.getTime()) || Number.isNaN(h.getTime()) || d > h) return null;
  return { desde: d, hasta: h };
}
