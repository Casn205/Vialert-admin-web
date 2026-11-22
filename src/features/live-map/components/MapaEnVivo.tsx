import { useMap } from '@vis.gl/react-google-maps';
import { useEffect, useRef } from 'react';
import type { Alerta } from '@/core/domain/alerta';
import type { UnidadVista } from '@/core/domain/flota';
import type { Hospital } from '@/core/domain/hospital';
import { limitesDe, type Punto } from '@/core/geo/geo-utils';
import type { Celda } from '@/core/geo/grid';
import { MapaBase } from '@/shared-ui';
import { useMapFilters } from '../store/map-filters';
import { CapaCalor, CapaSectores } from './CapasHistoricas';
import { MarcadoresAlertas, MarcadoresHospitales, MarcadoresUnidades } from './Marcadores';

/** Encuadra las unidades una sola vez, cuando aparecen. */
function EncuadreInicial({ puntos }: { puntos: readonly Punto[] }) {
  const map = useMap();
  const hecho = useRef(false);
  useEffect(() => {
    if (!map || hecho.current || puntos.length === 0) return;
    hecho.current = true;
    const l = limitesDe(puntos);
    if (!l) return;
    if (puntos.length === 1) {
      map.setCenter(puntos[0]!);
      map.setZoom(15);
    } else {
      map.fitBounds({ north: l.norte, south: l.sur, east: l.este, west: l.oeste }, 64);
    }
  }, [map, puntos]);
  return null;
}

/** Atiende los pedidos de centrar el mapa y recuerda el centro para "disponibles en el área". */
function ConectarEstado() {
  const map = useMap();
  const foco = useMapFilters((s) => s.foco);
  const fijarCentroMapa = useMapFilters((s) => s.fijarCentroMapa);

  useEffect(() => {
    if (map && foco) map.panTo(foco.punto);
  }, [map, foco]);

  useEffect(() => {
    if (!map) return;
    const l = map.addListener('idle', () => {
      const c = map.getCenter();
      if (c) fijarCentroMapa({ lat: c.lat(), lng: c.lng() });
    });
    return () => l.remove();
  }, [map, fijarCentroMapa]);

  return null;
}

interface Props {
  unidades: readonly UnidadVista[];
  alertas: readonly Alerta[];
  hospitales: readonly Hospital[];
  historicas: readonly Alerta[];
  celdas: readonly Celda[];
  ahora: Date;
}

export function MapaEnVivo({ unidades, alertas, hospitales, historicas, celdas, ahora }: Props) {
  const { capas, alertaId, unidadId, seleccionarAlerta, seleccionarUnidad } = useMapFilters();
  const puntos = unidades.map((u) => u.ubicacion);
  return (
    <MapaBase className="h-full min-h-[22rem] w-full overflow-hidden rounded-lg border border-borde" etiqueta="Mapa en vivo de ambulancias y alertas">
      <ConectarEstado />
      <EncuadreInicial puntos={puntos} />
      {capas.calor && <CapaCalor alertas={historicas} />}
      {capas.sectores && <CapaSectores celdas={celdas} />}
      {capas.hospitales && <MarcadoresHospitales hospitales={hospitales} />}
      {capas.alertas && (
        <MarcadoresAlertas alertas={alertas} ahora={ahora} seleccionada={alertaId} onElegir={(id) => seleccionarAlerta(id)} />
      )}
      {capas.ambulancias && (
        <MarcadoresUnidades unidades={unidades} seleccionada={unidadId} onElegir={(id) => seleccionarUnidad(id)} />
      )}
    </MapaBase>
  );
}
