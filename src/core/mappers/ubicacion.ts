import { ESTADOS_UBICACION, type Ubicacion } from '../domain/ubicacion';
import { aFecha } from './fecha';
import { advertir, coordenadas, numero, texto, uno, type Doc } from './util';

/** `ubicaciones/{ambulanciaId}` → `Ubicacion`. `null` (y aviso) si faltan coordenadas válidas. */
export function mapUbicacion(id: string, d: Doc): Ubicacion | null {
  const pos = coordenadas(d);
  if (!pos) {
    advertir(`Ubicación ${id} descartada: sin lat/lng válidos`);
    return null;
  }
  return {
    ambulanciaId: id,
    lat: pos.lat,
    lng: pos.lng,
    rumbo: numero(d.rumbo),
    velocidadKmh: numero(d.velocidadKmh),
    precisionM: numero(d.precisionM),
    estadoOperativo: uno(d.estadoOperativo, ESTADOS_UBICACION),
    alertaId: texto(d.alertaId),
    appVersion: texto(d.appVersion),
    actualizadoAt: aFecha(d.actualizadoAt),
  };
}
