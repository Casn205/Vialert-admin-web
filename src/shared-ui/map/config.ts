import { leerEnv } from '@/lib/env';

export interface ConfigMapa {
  apiKey: string | undefined;
  mapId: string | undefined;
  /** Hay clave y Map ID: el mapa se puede dibujar. */
  disponible: boolean;
  /** Variables que faltan, para el aviso. */
  faltan: string[];
}

/** Lee la clave y el Map ID de Google Maps. `AdvancedMarker` exige el Map ID (de tipo vectorial para deck.gl). */
export function leerConfigMapa(): ConfigMapa {
  const env = leerEnv();
  const faltan: string[] = [];
  if (!env.VITE_GOOGLE_MAPS_API_KEY) faltan.push('VITE_GOOGLE_MAPS_API_KEY');
  if (!env.VITE_GOOGLE_MAPS_MAP_ID) faltan.push('VITE_GOOGLE_MAPS_MAP_ID');
  return {
    apiKey: env.VITE_GOOGLE_MAPS_API_KEY,
    mapId: env.VITE_GOOGLE_MAPS_MAP_ID,
    disponible: faltan.length === 0,
    faltan,
  };
}
