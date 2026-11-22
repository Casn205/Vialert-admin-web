import type { EstadoAlerta, Prioridad } from './alerta';

/** Contratos de la API de KPIs (la API es la fuente de verdad de las fórmulas). */

export interface Estadistica {
  n: number;
  /** Segundos. */
  media: number | null;
  mediana: number | null;
  p90: number | null;
}

export interface KpiResumen {
  rango: { desde: string; hasta: string };
  totalAlertas: number;
  porEstado: Record<EstadoAlerta, number>;
  tiempos: {
    asignacion: Estadistica;
    respuesta: Estadistica;
    viaje: Estadistica;
    enEscena: Estadistica;
    traslado: Estadistica;
    cicloTotal: Estadistica;
  };
  precisionEta: { n: number; errorRelativoMedio: number | null };
  cumplimientoRespuesta: { umbralSeg: number; n: number; porcentaje: number | null };
  operacion: { liberaciones: number; recalculosPromedio: number | null; alertasConFotos: number };
  descartadas: { simuladas: number; sinDato: Record<string, number>; anomalias: number };
}

export interface KpiSerie {
  /** Inicio del tramo (ISO), en zona de operación. */
  bucket: string;
  total: number;
  atendidas: number;
  respuestaMediaSeg: number | null;
}

export interface KpiRankingItem {
  id: string;
  etiqueta: string;
  atendidas: number;
  respuestaMediaSeg: number | null;
  enEscenaMediaSeg: number | null;
  /** Solo en el ranking de hospitales. */
  traslados?: number;
  trasladoMedioSeg?: number | null;
}

export interface FiltroKpi {
  desde: Date;
  hasta: Date;
  tipo?: string;
  prioridad?: Prioridad;
  ambulanciaId?: string;
  incluirSimuladas?: boolean;
}
