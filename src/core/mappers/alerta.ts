import { ESTADOS_ALERTA, PRIORIDADES, type Alerta } from '../domain/alerta';
import { aFecha } from './fecha';
import {
  advertir,
  booleano,
  coordenadas,
  listaTexto,
  numero,
  texto,
  uno,
  type Doc,
} from './util';

/** `alertas/{id}` → `Alerta`. Devuelve `null` (y avisa) si faltan coordenadas válidas. */
export function mapAlerta(id: string, d: Doc): Alerta | null {
  const pos = coordenadas(d);
  if (!pos) {
    advertir(`Alerta ${id} descartada: sin lat/lng válidos`);
    return null;
  }
  const estado = uno(d.estado, ESTADOS_ALERTA);
  if (!estado) advertir(`Alerta ${id}: estado desconocido, se usa 'activa'`, d.estado);

  return {
    id,
    type: texto(d.type) ?? '',
    description: texto(d.description) ?? '',
    lat: pos.lat,
    lng: pos.lng,
    createdAt: aFecha(d.createdAt),
    createdAtServer: aFecha(d.createdAtServer),
    creadaPorUsuarioId: texto(d.creadaPorUsuarioId) ?? '',
    creadaPorUid: texto(d.creadaPorUid),
    estado: estado ?? 'activa',
    ambulanciaAsignada: texto(d.ambulanciaAsignada),
    fotos: listaTexto(d.fotos),
    prioridad: uno(d.prioridad, PRIORIDADES),
    tomadaAt: aFecha(d.tomadaAt),
    rutaIniciadaAt: aFecha(d.rutaIniciadaAt),
    llegadaAt: aFecha(d.llegadaAt),
    atendidaAt: aFecha(d.atendidaAt),
    trasladoIniciadoAt: aFecha(d.trasladoIniciadoAt),
    trasladoFinalizadoAt: aFecha(d.trasladoFinalizadoAt),
    hospitalDestinoId: texto(d.hospitalDestinoId),
    hospitalDestinoNombre: texto(d.hospitalDestinoNombre),
    conductorId: texto(d.conductorId),
    paramedicoId: texto(d.paramedicoId),
    etaInicialSeg: numero(d.etaInicialSeg),
    distanciaInicialM: numero(d.distanciaInicialM),
    recalculos: numero(d.recalculos) ?? 0,
    liberaciones: numero(d.liberaciones) ?? 0,
    simulada: booleano(d.simulada) ?? false,
  };
}
