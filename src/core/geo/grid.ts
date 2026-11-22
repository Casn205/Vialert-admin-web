import { MAP_CENTRO_DEFAULT, SECTOR_CELDA_M } from '../domain/constants';
import type { Limites, Punto } from './geo-utils';

export interface Celda {
  /** Estable entre consultas: depende solo de la posición y del tamaño. */
  id: string;
  conteo: number;
  centro: Punto;
  limites: Limites;
}

const METROS_POR_GRADO_LAT = 111_320;

/**
 * Agrupa puntos en una cuadrícula de celdas de ~`celdaM` metros de lado.
 * El origen es fijo (0,0), así una misma zona cae siempre en la misma celda.
 * `latReferencia` ajusta el ancho en longitud (default: centro del mapa de la app).
 * Devuelve las celdas con al menos un punto, de mayor a menor conteo.
 */
export function agruparEnCeldas(
  puntos: readonly Punto[],
  celdaM: number = SECTOR_CELDA_M,
  latReferencia: number = MAP_CENTRO_DEFAULT.lat,
): Celda[] {
  const dLat = celdaM / METROS_POR_GRADO_LAT;
  const dLng = celdaM / (METROS_POR_GRADO_LAT * Math.cos((latReferencia * Math.PI) / 180));
  const mapa = new Map<string, { fila: number; col: number; conteo: number }>();

  for (const p of puntos) {
    const fila = Math.floor(p.lat / dLat);
    const col = Math.floor(p.lng / dLng);
    const id = `${fila}:${col}`;
    const c = mapa.get(id);
    if (c) c.conteo += 1;
    else mapa.set(id, { fila, col, conteo: 1 });
  }

  return [...mapa.entries()]
    .map(([id, { fila, col, conteo }]): Celda => {
      const limites: Limites = {
        sur: fila * dLat,
        norte: (fila + 1) * dLat,
        oeste: col * dLng,
        este: (col + 1) * dLng,
      };
      return {
        id,
        conteo,
        limites,
        centro: { lat: (limites.sur + limites.norte) / 2, lng: (limites.oeste + limites.este) / 2 },
      };
    })
    .sort((a, b) => b.conteo - a.conteo || a.id.localeCompare(b.id));
}

/** Las `n` celdas con más alertas. */
export const topCeldas = (celdas: readonly Celda[], n = 5): Celda[] => celdas.slice(0, n);
