import { ETIQUETA_PRIORIDAD, PRIORIDADES, type Alerta } from './alerta';
import type { FiltroKpi, KpiSerie } from './kpi';

/** Funciones puras para dibujar el dashboard. Las fórmulas de KPI viven solo en la API. */

export interface DatoBarra {
  etiqueta: string;
  valor: number;
}

/** Aplica en memoria los mismos filtros que la API (para tipo, prioridad y sectores, que salen de las alertas). */
export function filtrarAlertasPanel(alertas: readonly Alerta[], f: FiltroKpi): Alerta[] {
  return alertas.filter(
    (a) =>
      a.createdAtServer !== null &&
      a.createdAtServer >= f.desde &&
      a.createdAtServer <= f.hasta &&
      (f.incluirSimuladas || !a.simulada) &&
      (!f.tipo || a.type === f.tipo) &&
      (!f.prioridad || a.prioridad === f.prioridad) &&
      (!f.ambulanciaId || a.ambulanciaAsignada === f.ambulanciaId),
  );
}

export function contarPorTipo(alertas: readonly Alerta[]): DatoBarra[] {
  const m = new Map<string, number>();
  for (const a of alertas) m.set(a.type || 'Sin tipo', (m.get(a.type || 'Sin tipo') ?? 0) + 1);
  return [...m.entries()].map(([etiqueta, valor]) => ({ etiqueta, valor })).sort((a, b) => b.valor - a.valor);
}

export function contarPorPrioridad(alertas: readonly Alerta[]): DatoBarra[] {
  const datos = PRIORIDADES.map((p) => ({
    etiqueta: ETIQUETA_PRIORIDAD[p],
    valor: alertas.filter((a) => a.prioridad === p).length,
  }));
  const sin = alertas.filter((a) => a.prioridad === null).length;
  return sin > 0 ? [...datos, { etiqueta: 'Sin prioridad', valor: sin }] : datos;
}

/** Suma las alertas de una serie por hora (0–23) del día en la zona `tz`. Siempre devuelve 24 valores. */
export function agruparPorHoraDelDia(series: readonly KpiSerie[], tz: string): number[] {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' });
  const horas = Array.from({ length: 24 }, () => 0);
  for (const s of series) {
    const h = Number(fmt.format(new Date(s.bucket)));
    if (Number.isInteger(h) && h >= 0 && h < 24) horas[h] = (horas[h] ?? 0) + s.total;
  }
  return horas;
}

/** "20/11" en la zona `tz`, para el eje de la serie por día. */
export function etiquetaDia(bucket: string, tz: string): string {
  return new Date(bucket).toLocaleDateString('es-CO', { timeZone: tz, day: '2-digit', month: '2-digit' });
}
