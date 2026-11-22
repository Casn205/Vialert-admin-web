export interface Punto {
  lat: number;
  lng: number;
}

export interface Limites {
  sur: number;
  oeste: number;
  norte: number;
  este: number;
}

const RADIO_TIERRA_M = 6_371_008.8;
const rad = (g: number) => (g * Math.PI) / 180;

/** Distancia entre dos puntos (fórmula de Haversine), en metros. */
export function distanciaM(a: Punto, b: Punto): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const distanciaKm = (a: Punto, b: Punto): number => distanciaM(a, b) / 1000;

/** Rectángulo mínimo que contiene a todos los puntos, o `null` si no hay ninguno. */
export function limitesDe(puntos: readonly Punto[]): Limites | null {
  const [primero, ...resto] = puntos;
  if (!primero) return null;
  const l: Limites = { sur: primero.lat, norte: primero.lat, oeste: primero.lng, este: primero.lng };
  for (const p of resto) {
    if (p.lat < l.sur) l.sur = p.lat;
    if (p.lat > l.norte) l.norte = p.lat;
    if (p.lng < l.oeste) l.oeste = p.lng;
    if (p.lng > l.este) l.este = p.lng;
  }
  return l;
}

/** Elementos dentro de `radioKm` del `centro`, ordenados de más cerca a más lejos. */
export function dentroDelRadio<T>(
  items: readonly T[],
  posDe: (item: T) => Punto,
  centro: Punto,
  radioKm: number,
): { item: T; distanciaKm: number }[] {
  return items
    .map((item) => ({ item, distanciaKm: distanciaKm(centro, posDe(item)) }))
    .filter((x) => x.distanciaKm <= radioKm)
    .sort((a, b) => a.distanciaKm - b.distanciaKm);
}
