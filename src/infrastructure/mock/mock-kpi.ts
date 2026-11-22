import { duracionesDeAlerta } from '@/core/domain/alerta-duraciones';
import type { Alerta } from '@/core/domain/alerta';
import type { Estadistica, FiltroKpi, KpiRankingItem, KpiResumen, KpiSerie } from '@/core/domain/kpi';
import type { KpiRepository } from '@/core/ports';
import type { Store } from './store';

const UMBRAL_SEG = 600;

/** Media, mediana y p90 (nearest-rank), en segundos enteros. */
export function estadistica(valores: (number | null)[]): Estadistica {
  const v = valores.filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (v.length === 0) return { n: 0, media: null, mediana: null, p90: null };
  const rank = (p: number) => v[Math.max(0, Math.ceil(p * v.length) - 1)]!;
  return {
    n: v.length,
    media: Math.round(v.reduce((s, x) => s + x, 0) / v.length),
    mediana: rank(0.5),
    p90: rank(0.9),
  };
}

const media = (v: (number | null)[]) => estadistica(v).media;

/** KPIs calculados en el navegador sobre los datos de ejemplo. La fuente real es la API. */
export class MockKpiRepository implements KpiRepository {
  constructor(private readonly alertas: Store<Alerta[]>) {}

  private filtrar(f: FiltroKpi): Alerta[] {
    return this.alertas.get().filter((a) =>
      a.createdAtServer !== null && a.createdAtServer >= f.desde && a.createdAtServer <= f.hasta &&
      (f.incluirSimuladas || !a.simulada) &&
      (!f.tipo || a.type === f.tipo) && (!f.prioridad || a.prioridad === f.prioridad) &&
      (!f.ambulanciaId || a.ambulanciaAsignada === f.ambulanciaId),
    );
  }

  async resumen(f: FiltroKpi): Promise<KpiResumen> {
    const lista = this.filtrar(f);
    const d = lista.map(duracionesDeAlerta);
    const col = (k: keyof (typeof d)[number]) => d.map((x) => x[k]);
    const resp = d.map((x) => x.respuesta).filter((x): x is number => x !== null);
    const errores = d.map((x) => x.errorEta).filter((x): x is number => x !== null);
    const todas = this.alertas.get();
    return {
      rango: { desde: f.desde.toISOString(), hasta: f.hasta.toISOString() },
      totalAlertas: lista.length,
      porEstado: {
        activa: lista.filter((a) => a.estado === 'activa').length,
        enProceso: lista.filter((a) => a.estado === 'enProceso').length,
        atendida: lista.filter((a) => a.estado === 'atendida').length,
      },
      tiempos: {
        asignacion: estadistica(col('asignacion')),
        respuesta: estadistica(col('respuesta')),
        viaje: estadistica(col('viaje')),
        enEscena: estadistica(col('enEscena')),
        traslado: estadistica(col('traslado')),
        cicloTotal: estadistica(col('cicloTotal')),
      },
      precisionEta: {
        n: errores.length,
        errorRelativoMedio: errores.length ? errores.reduce((s, x) => s + x, 0) / errores.length : null,
      },
      cumplimientoRespuesta: {
        umbralSeg: UMBRAL_SEG,
        n: resp.length,
        porcentaje: resp.length ? Math.round((resp.filter((s) => s <= UMBRAL_SEG).length / resp.length) * 100) : null,
      },
      operacion: {
        liberaciones: lista.reduce((s, a) => s + a.liberaciones, 0),
        recalculosPromedio: lista.length ? lista.reduce((s, a) => s + a.recalculos, 0) / lista.length : null,
        alertasConFotos: lista.filter((a) => a.fotos.length > 0).length,
      },
      descartadas: {
        simuladas: f.incluirSimuladas ? 0 : todas.filter((a) => a.simulada).length,
        sinDato: { createdAtServer: todas.filter((a) => a.createdAtServer === null).length },
        anomalias: 0,
      },
    };
  }

  async series(f: FiltroKpi & { granularidad: 'dia' | 'hora' }): Promise<KpiSerie[]> {
    const grupos = new Map<string, Alerta[]>();
    for (const a of this.filtrar(f)) {
      const d = new Date(a.createdAtServer!);
      if (f.granularidad === 'dia') d.setHours(0, 0, 0, 0);
      else d.setMinutes(0, 0, 0);
      const k = d.toISOString();
      grupos.set(k, [...(grupos.get(k) ?? []), a]);
    }
    return [...grupos.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, l]) => ({
        bucket,
        total: l.length,
        atendidas: l.filter((a) => a.estado === 'atendida').length,
        respuestaMediaSeg: media(l.map((a) => duracionesDeAlerta(a).respuesta)),
      }));
  }

  async ranking(f: FiltroKpi & { por: 'ambulancia' | 'conductor' | 'paramedico' | 'hospital' }): Promise<KpiRankingItem[]> {
    const clave = (a: Alerta) =>
      f.por === 'ambulancia' ? a.ambulanciaAsignada : f.por === 'conductor' ? a.conductorId : f.por === 'paramedico' ? a.paramedicoId : a.hospitalDestinoId;
    const grupos = new Map<string, Alerta[]>();
    for (const a of this.filtrar(f)) {
      const k = clave(a);
      if (k) grupos.set(k, [...(grupos.get(k) ?? []), a]);
    }
    return [...grupos.entries()]
      .map(([id, l]): KpiRankingItem => {
        const d = l.map(duracionesDeAlerta);
        return {
          id,
          etiqueta: f.por === 'hospital' ? (l[0]?.hospitalDestinoNombre ?? id) : id,
          atendidas: l.filter((a) => a.estado === 'atendida').length,
          respuestaMediaSeg: media(d.map((x) => x.respuesta)),
          enEscenaMediaSeg: media(d.map((x) => x.enEscena)),
          ...(f.por === 'hospital' ? { traslados: d.filter((x) => x.traslado !== null).length, trasladoMedioSeg: media(d.map((x) => x.traslado)) } : {}),
        };
      })
      .sort((a, b) => b.atendidas - a.atendidas);
  }

  async descargarAlertasCsv(f: FiltroKpi): Promise<Blob> {
    const filas = this.filtrar(f).map((a) => {
      const d = duracionesDeAlerta(a);
      return [a.id, a.type, a.estado, a.prioridad ?? '', a.createdAtServer?.toISOString() ?? '', d.respuesta ?? '', d.traslado ?? ''].join(',');
    });
    const csv = ['id,tipo,estado,prioridad,creada,respuestaSeg,trasladoSeg', ...filas].join('\n');
    return new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  }
}
