import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { useEffect, type ReactNode } from 'react';
import { MAP_CENTRO_DEFAULT } from '@/core/domain/constants';
import type { Punto } from '@/core/geo/geo-utils';
import { leerConfigMapa } from './config';

interface Props {
  centro?: Punto;
  zoom?: number;
  /** Tamaño y forma del contenedor (por ejemplo `h-64 w-full rounded-md`). */
  className?: string;
  /** Clic sobre el mapa (no sobre un marcador). */
  onClick?: (p: Punto) => void;
  /** Texto para lectores de pantalla. */
  etiqueta?: string;
  children?: ReactNode;
}

/** Aviso cuando no hay clave o Map ID: el resto de la pantalla sigue funcionando. */
export function AvisoMapaNoDisponible({ faltan, className = '' }: { faltan: string[]; className?: string }) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-borde bg-fondo p-4 text-center text-sm text-tinta-suave ${className}`}
    >
      <strong className="text-tinta">El mapa no está disponible</strong>
      <span>
        Falta configurar {faltan.map((f, i) => (
          <span key={f}>
            {i > 0 && ' y '}
            <code className="rounded bg-superficie px-1">{f}</code>
          </span>
        ))}{' '}
        en el archivo <code className="rounded bg-superficie px-1">.env</code>.
      </span>
    </div>
  );
}

/** Mapa de Google con la clave y el Map ID del entorno. Los hijos son marcadores y capas. */
export function MapaBase({ centro = MAP_CENTRO_DEFAULT, zoom = 13, className = 'h-full w-full', onClick, etiqueta = 'Mapa', children }: Props) {
  const cfg = leerConfigMapa();
  if (!cfg.disponible || !cfg.apiKey || !cfg.mapId) return <AvisoMapaNoDisponible faltan={cfg.faltan} className={className} />;
  return (
    <div className={className} role="region" aria-label={etiqueta}>
      <APIProvider apiKey={cfg.apiKey} language="es" region="CO">
        <Map
          mapId={cfg.mapId}
          defaultCenter={centro}
          defaultZoom={zoom}
          gestureHandling="greedy"
          clickableIcons={false}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          onClick={(e) => {
            const p = e.detail.latLng;
            if (p && onClick) onClick({ lat: p.lat, lng: p.lng });
          }}
        >
          {children}
        </Map>
      </APIProvider>
    </div>
  );
}

/** Centra el mapa en `punto` cada vez que cambia. Va como hijo de `MapaBase`. */
export function SeguirPunto({ punto }: { punto: Punto | null }) {
  const map = useMap();
  const lat = punto?.lat;
  const lng = punto?.lng;
  useEffect(() => {
    if (map && lat !== undefined && lng !== undefined) map.panTo({ lat, lng });
  }, [map, lat, lng]);
  return null;
}
