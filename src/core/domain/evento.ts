export type TipoEvento =
  | 'creada'
  | 'tomada'
  | 'liberada'
  | 'ruta_iniciada'
  | 'recalculo'
  | 'llegada'
  | 'atendida'
  | 'traslado_propuesto'
  | 'traslado_iniciado'
  | 'traslado_rechazado'
  | 'traslado_finalizado';

export const TIPOS_EVENTO: readonly TipoEvento[] = [
  'creada',
  'tomada',
  'liberada',
  'ruta_iniciada',
  'recalculo',
  'llegada',
  'atendida',
  'traslado_propuesto',
  'traslado_iniciado',
  'traslado_rechazado',
  'traslado_finalizado',
];

export const ETIQUETA_EVENTO: Record<TipoEvento, string> = {
  creada: 'Alerta creada',
  tomada: 'Tomada por una ambulancia',
  liberada: 'Devuelta a la cola',
  ruta_iniciada: 'Ruta iniciada',
  recalculo: 'Ruta recalculada',
  llegada: 'Llegada al lugar',
  atendida: 'Marcada como atendida',
  traslado_propuesto: 'Traslado propuesto',
  traslado_iniciado: 'Traslado iniciado',
  traslado_rechazado: 'Traslado rechazado',
  traslado_finalizado: 'Traslado finalizado',
};

/** Registro de solo agregar: `alertas/{id}/eventos/{id}`. */
export interface EventoAlerta {
  id: string;
  tipo: TipoEvento;
  ts: Date | null;
  ambulanciaId: string | null;
  /** En `llegada` y `traslado_finalizado`, `meta.origen` es 'temporizador' | 'manual'. */
  meta: Record<string, unknown>;
}
