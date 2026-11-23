import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { Prioridad } from '@/core/domain/alerta';
import { TZ_OPERACION } from '@/core/domain/constants';
import { construirUnidades, contarPanel, type ContadoresPanel } from '@/core/domain/flota';
import type { FiltroKpi } from '@/core/domain/kpi';
import { agruparPorHoraDelDia, filtrarAlertasPanel } from '@/core/domain/kpi-vista';
import type { Ambulancia } from '@/core/domain/ambulancia';
import type { Ubicacion } from '@/core/domain/ubicacion';
import { useDeps } from '@/lib/deps-context';

export type PresetRango = 'hoy' | '7d' | '30d' | 'personalizado';

export interface FiltrosDashboard {
  preset: PresetRango;
  /** `YYYY-MM-DD` (solo con `personalizado`). */
  desdeTexto: string;
  hastaTexto: string;
  tipo: string;
  prioridad: Prioridad | '';
  incluirSimuladas: boolean;
}

export const FILTROS_INICIALES: FiltrosDashboard = {
  preset: '7d',
  desdeTexto: '',
  hastaTexto: '',
  tipo: '',
  prioridad: '',
  incluirSimuladas: false,
};

const DIA_MS = 86_400_000;

/** Rango de fechas del filtro, o `null` si el personalizado está incompleto o al revés. */
export function rangoDe(f: Pick<FiltrosDashboard, 'preset' | 'desdeTexto' | 'hastaTexto'>, ahora = new Date()) {
  if (f.preset === 'personalizado') {
    if (!f.desdeTexto || !f.hastaTexto) return null;
    const desde = new Date(`${f.desdeTexto}T00:00:00`);
    const hasta = new Date(`${f.hastaTexto}T23:59:59.999`);
    return Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime()) || desde > hasta ? null : { desde, hasta };
  }
  if (f.preset === 'hoy') return { desde: new Date(new Date(ahora).setHours(0, 0, 0, 0)), hasta: ahora };
  return { desde: new Date(ahora.getTime() - (f.preset === '7d' ? 7 : 30) * DIA_MS), hasta: ahora };
}

/** Filtro en el formato de la API. Se recalcula solo cuando cambia algún filtro (no en cada render). */
export function useFiltroKpi(f: FiltrosDashboard): FiltroKpi | null {
  const { preset, desdeTexto, hastaTexto, tipo, prioridad, incluirSimuladas } = f;
  return useMemo(() => {
    const rango = rangoDe({ preset, desdeTexto, hastaTexto });
    if (!rango) return null;
    return {
      ...rango,
      ...(tipo ? { tipo } : {}),
      ...(prioridad ? { prioridad } : {}),
      incluirSimuladas,
    };
  }, [preset, desdeTexto, hastaTexto, tipo, prioridad, incluirSimuladas]);
}

const claveDe = (f: FiltroKpi | null) =>
  f ? [f.desde.getTime(), f.hasta.getTime(), f.tipo ?? '', f.prioridad ?? '', f.incluirSimuladas ?? false] : null;

export function useResumenKpi(f: FiltroKpi | null) {
  const { kpis } = useDeps();
  return useQuery({ queryKey: ['kpi', 'resumen', claveDe(f)], queryFn: () => kpis.resumen(f!), enabled: f !== null });
}

export function useSerieKpi(f: FiltroKpi | null, granularidad: 'dia' | 'hora') {
  const { kpis } = useDeps();
  return useQuery({
    queryKey: ['kpi', 'series', granularidad, claveDe(f)],
    queryFn: () => kpis.series({ ...f!, granularidad }),
    enabled: f !== null,
  });
}

export function useRankingKpi(f: FiltroKpi | null, por: 'ambulancia' | 'conductor' | 'paramedico' | 'hospital') {
  const { kpis } = useDeps();
  return useQuery({
    queryKey: ['kpi', 'ranking', por, claveDe(f)],
    queryFn: () => kpis.ranking({ ...f!, por }),
    enabled: f !== null,
  });
}

/** Alertas del rango (con los filtros aplicados en memoria): para tipo, prioridad y top de sectores. */
export function useAlertasDelPanel(f: FiltroKpi | null) {
  const { alertas } = useDeps();
  return useQuery({
    queryKey: ['kpi', 'alertas-panel', claveDe(f)],
    queryFn: async () => {
      const r = await alertas.listarPorRango({ desde: f!.desde, hasta: f!.hasta });
      return { alertas: filtrarAlertasPanel(r.alertas, f!), truncado: r.truncado };
    },
    enabled: f !== null,
  });
}

/** Alertas por hora del día (0–23) a partir de la serie por hora de la API. */
export function useAlertasPorHora(f: FiltroKpi | null) {
  const serie = useSerieKpi(f, 'hora');
  const horas = useMemo(() => (serie.data ? agruparPorHoraDelDia(serie.data, TZ_OPERACION) : null), [serie.data]);
  return { ...serie, horas };
}

/** Disponibilidad **instantánea** de la flota (solo en vivo: la app no guarda historial de turnos). */
export function useFlotaInstantanea(): { contadores: ContadoresPanel; error: Error | null } {
  const { ubicaciones, ambulancias } = useDeps();
  const [ubi, setUbi] = useState<Ubicacion[]>([]);
  const [amb, setAmb] = useState<Ambulancia[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => ubicaciones.suscribir(setUbi, setError), [ubicaciones]);
  useEffect(() => ambulancias.suscribir(setAmb, setError), [ambulancias]);
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 10_000); // para que "sin señal" cambie sin datos nuevos
    return () => clearInterval(id);
  }, []);

  const contadores = useMemo(
    () => contarPanel(construirUnidades({ ubicaciones: ubi, ambulancias: amb, conductores: [], paramedicos: [], ahora }), []),
    [ubi, amb, ahora],
  );
  return { contadores, error };
}
