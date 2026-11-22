import type { Layer } from '@deck.gl/core';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { useMap } from '@vis.gl/react-google-maps';
import { useEffect, useRef } from 'react';

/** Dibuja capas de deck.gl encima del mapa de Google (requiere un Map ID vectorial). Va como hijo del mapa. */
export function DeckOverlay({ layers }: { layers: Layer[] }) {
  const map = useMap();
  const overlay = useRef<GoogleMapsOverlay | null>(null);

  useEffect(() => {
    if (!map) return;
    const o = new GoogleMapsOverlay({});
    o.setMap(map);
    overlay.current = o;
    return () => {
      o.setMap(null);
      o.finalize();
      overlay.current = null;
    };
  }, [map]);

  // Declarado después: al crear el overlay en el mismo ciclo, ya existe cuando este efecto corre.
  useEffect(() => {
    overlay.current?.setProps({ layers });
  }, [map, layers]);

  return null;
}
