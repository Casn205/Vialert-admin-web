import type { FiltroKpi, KpiRankingItem, KpiResumen, KpiSerie } from '@/core/domain/kpi';
import type { KpiRepository } from '@/core/ports';
import type { ApiClient } from './api-client';

function aQuery(f: FiltroKpi) {
  return {
    desde: f.desde,
    hasta: f.hasta,
    tipo: f.tipo,
    prioridad: f.prioridad,
    ambulanciaId: f.ambulanciaId,
    incluirSimuladas: f.incluirSimuladas,
  };
}

export class HttpKpiRepository implements KpiRepository {
  constructor(private readonly api: ApiClient) {}

  resumen(f: FiltroKpi): Promise<KpiResumen> {
    return this.api.get<KpiResumen>('/kpis/resumen', aQuery(f));
  }
  series(f: FiltroKpi & { granularidad: 'dia' | 'hora' }): Promise<KpiSerie[]> {
    return this.api.get<KpiSerie[]>('/kpis/series', { ...aQuery(f), granularidad: f.granularidad });
  }
  ranking(
    f: FiltroKpi & { por: 'ambulancia' | 'conductor' | 'paramedico' | 'hospital' },
  ): Promise<KpiRankingItem[]> {
    return this.api.get<KpiRankingItem[]>('/kpis/ranking', { ...aQuery(f), por: f.por });
  }
  descargarAlertasCsv(f: FiltroKpi): Promise<Blob> {
    return this.api.blob('/reportes/alertas.csv', aQuery(f));
  }
}
