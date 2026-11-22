import type { Hospital } from '../domain/hospital';
import { advertir, coordenadas, texto, type Doc } from './util';

export function mapHospital(id: string, d: Doc): Hospital | null {
  const pos = coordenadas(d);
  if (!pos) {
    advertir(`Hospital ${id} descartado: sin lat/lng válidos`);
    return null;
  }
  return { id, nombre: texto(d.nombre) ?? '', lat: pos.lat, lng: pos.lng };
}
