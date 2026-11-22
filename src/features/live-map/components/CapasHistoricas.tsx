import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useMemo } from 'react';
import type { Alerta } from '@/core/domain/alerta';
import type { Celda } from '@/core/geo/grid';
import { DeckOverlay } from './DeckOverlay';

/** Calor histórico con deck.gl (la `HeatmapLayer` de Google Maps ya no existe). */
export function CapaCalor({ alertas }: { alertas: readonly Alerta[] }) {
  const layers = useMemo(
    () => [
      new HeatmapLayer<Alerta>({
        id: 'calor-alertas',
        data: alertas as Alerta[],
        getPosition: (a) => [a.lng, a.lat],
        getWeight: 1,
        radiusPixels: 45,
        intensity: 1,
        threshold: 0.05,
        aggregation: 'SUM',
      }),
    ],
    [alertas],
  );
  return <DeckOverlay layers={layers} />;
}

/** Cuadrícula de sectores: rectángulos más intensos donde hay más alertas, con su número. */
export function CapaSectores({ celdas }: { celdas: readonly Celda[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const max = celdas[0]?.conteo ?? 1;
    const rectangulos = celdas.map(
      (c) =>
        new google.maps.Rectangle({
          map,
          bounds: { north: c.limites.norte, south: c.limites.sur, east: c.limites.este, west: c.limites.oeste },
          strokeColor: '#8a2f0a',
          strokeOpacity: 0.7,
          strokeWeight: 1,
          fillColor: '#d9480f',
          fillOpacity: 0.12 + 0.5 * (c.conteo / max),
          clickable: false,
        }),
    );
    return () => rectangulos.forEach((r) => r.setMap(null));
  }, [map, celdas]);

  return celdas.map((c) => (
    <AdvancedMarker key={c.id} position={c.centro} zIndex={20} title={`${c.conteo} alerta${c.conteo === 1 ? '' : 's'} en este sector`}>
      <span className="rounded-full bg-white/90 px-1.5 text-xs font-semibold text-[#8a2f0a] shadow">{c.conteo}</span>
    </AdvancedMarker>
  ));
}
