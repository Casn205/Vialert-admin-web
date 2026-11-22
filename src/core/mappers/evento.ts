import { TIPOS_EVENTO, type EventoAlerta } from '../domain/evento';
import { aFecha } from './fecha';
import { objeto, texto, uno, type Doc } from './util';

/** `alertas/{id}/eventos/{id}` → `EventoAlerta`. Un tipo desconocido se ignora (`null`). */
export function mapEvento(id: string, d: Doc): EventoAlerta | null {
  const tipo = uno(d.tipo, TIPOS_EVENTO);
  if (!tipo) return null;
  return {
    id,
    tipo,
    ts: aFecha(d.ts),
    ambulanciaId: texto(d.ambulanciaId),
    meta: objeto(d.meta),
  };
}
