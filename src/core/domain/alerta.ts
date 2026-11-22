export type EstadoAlerta = 'activa' | 'enProceso' | 'atendida';
export const ESTADOS_ALERTA: readonly EstadoAlerta[] = ['activa', 'enProceso', 'atendida'];

export type Prioridad = 'critica' | 'alta' | 'media' | 'baja';
export const PRIORIDADES: readonly Prioridad[] = ['critica', 'alta', 'media', 'baja'];

export const ETIQUETA_ESTADO_ALERTA: Record<EstadoAlerta, string> = {
  activa: 'Activa',
  enProceso: 'En proceso',
  atendida: 'Atendida',
};

export const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

/** Alerta tal como la entiende la web. `null` significa "sin dato" (nunca cero). */
export interface Alerta {
  id: string;
  type: string;
  description: string;
  lat: number;
  lng: number;
  /** Hora del teléfono. No usar para medir tiempos. */
  createdAt: Date | null;
  /** Hora del servidor: base de todos los tiempos. */
  createdAtServer: Date | null;
  creadaPorUsuarioId: string;
  creadaPorUid: string | null;
  estado: EstadoAlerta;
  ambulanciaAsignada: string | null;
  fotos: string[];
  prioridad: Prioridad | null;
  tomadaAt: Date | null;
  rutaIniciadaAt: Date | null;
  llegadaAt: Date | null;
  atendidaAt: Date | null;
  trasladoIniciadoAt: Date | null;
  trasladoFinalizadoAt: Date | null;
  hospitalDestinoId: string | null;
  hospitalDestinoNombre: string | null;
  conductorId: string | null;
  paramedicoId: string | null;
  etaInicialSeg: number | null;
  distanciaInicialM: number | null;
  recalculos: number;
  liberaciones: number;
  simulada: boolean;
}

/** Fecha de creación para mostrar y ordenar: servidor si existe, si no teléfono. */
export function fechaCreacion(a: Pick<Alerta, 'createdAtServer' | 'createdAt'>): Date | null {
  return a.createdAtServer ?? a.createdAt;
}
