import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { MAP_CENTRO_DEFAULT } from '@/core/domain/constants';
import type { Punto } from '@/core/geo/geo-utils';
import { MapaBase, SeguirPunto } from './MapaBase';

const redondear = (n: number) => Math.round(n * 1e6) / 1e6;

interface Props {
  /** Coordenadas actuales; `null` si aún no hay (o son inválidas). */
  valor: Punto | null;
  onCambio: (p: Punto) => void;
  className?: string;
}

/** Mapa para elegir un lugar con un clic (o arrastrando el marcador). */
export function SelectorCoordenadas({ valor, onCambio, className = 'h-56 w-full overflow-hidden rounded-md' }: Props) {
  const elegir = (p: Punto) => onCambio({ lat: redondear(p.lat), lng: redondear(p.lng) });
  return (
    <MapaBase
      centro={valor ?? MAP_CENTRO_DEFAULT}
      zoom={valor ? 15 : 12}
      className={className}
      onClick={elegir}
      etiqueta="Mapa para elegir las coordenadas"
    >
      <SeguirPunto punto={valor} />
      {valor && (
        <AdvancedMarker
          position={valor}
          draggable
          title="Arrastra para ajustar"
          onDragEnd={(e) => {
            if (e.latLng) elegir({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          }}
        />
      )}
    </MapaBase>
  );
}
