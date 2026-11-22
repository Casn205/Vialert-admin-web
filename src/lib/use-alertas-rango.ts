import type { Alerta } from '@/core/domain/alerta';
import type { RangoFechas } from '@/core/ports';
import { useDeps } from './deps-context';
import { useCarga, type EstadoCarga } from './use-carga';

export interface ConsultaRango {
  /** Identifica el rango (p. ej. "30d" o "2026-11-01|2026-11-10"): al cambiar, se vuelve a consultar. */
  clave: string;
  /** Se evalúa al consultar, así "hoy" y "últimos N días" se calculan en ese momento. */
  rango: () => RangoFechas;
  incluirLegado: boolean;
  limite?: number;
}

/** Alertas históricas de un rango (`createdAtServer`). Los demás filtros se aplican en memoria. */
export function useAlertasRango(c: ConsultaRango): EstadoCarga<{ alertas: Alerta[]; truncado: boolean }> {
  const { alertas } = useDeps();
  return useCarga(
    () => alertas.listarPorRango({ ...c.rango(), incluirLegado: c.incluirLegado, limite: c.limite }),
    `${c.clave}|${c.incluirLegado}|${c.limite ?? ''}`,
  );
}
