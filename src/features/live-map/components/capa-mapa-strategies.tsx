import type { ComponentType } from 'react';
import type { Alerta } from '@/core/domain/alerta';
import type { UnidadVista } from '@/core/domain/flota';
import type { Hospital } from '@/core/domain/hospital';
import type { Celda } from '@/core/geo/grid';
import type { CapaId } from '../store/map-filters';
import { CapaCalor, CapaSectores } from './CapasHistoricas';
import { MarcadoresAlertas, MarcadoresHospitales, MarcadoresUnidades } from './Marcadores';

export interface ContextoCapaMapa {
  unidades: readonly UnidadVista[];
  alertas: readonly Alerta[];
  hospitales: readonly Hospital[];
  historicas: readonly Alerta[];
  celdas: readonly Celda[];
  ahora: Date;
  alertaId: string | null;
  unidadId: string | null;
  seleccionarAlerta: (id: string) => void;
  seleccionarUnidad: (id: string) => void;
}

export interface CapaMapaStrategy {
  id: CapaId;
  Componente: ComponentType<ContextoCapaMapa>;
}

function CapaAmbulancias({ unidades, unidadId, seleccionarUnidad }: ContextoCapaMapa) {
  return <MarcadoresUnidades unidades={unidades} seleccionada={unidadId} onElegir={seleccionarUnidad} />;
}

function CapaAlertas({ alertas, ahora, alertaId, seleccionarAlerta }: ContextoCapaMapa) {
  return <MarcadoresAlertas alertas={alertas} ahora={ahora} seleccionada={alertaId} onElegir={seleccionarAlerta} />;
}

function CapaHospitales({ hospitales }: ContextoCapaMapa) {
  return <MarcadoresHospitales hospitales={hospitales} />;
}

function CapaCalorHistorico({ historicas }: ContextoCapaMapa) {
  return <CapaCalor alertas={historicas} />;
}

function CapaCuadricula({ celdas }: ContextoCapaMapa) {
  return <CapaSectores celdas={celdas} />;
}

const estrategiasPorCapa: Record<CapaId, CapaMapaStrategy> = {
  ambulancias: { id: 'ambulancias', Componente: CapaAmbulancias },
  alertas: { id: 'alertas', Componente: CapaAlertas },
  hospitales: { id: 'hospitales', Componente: CapaHospitales },
  calor: { id: 'calor', Componente: CapaCalorHistorico },
  sectores: { id: 'sectores', Componente: CapaCuadricula },
};

export const ESTRATEGIAS_CAPA_MAPA = [
  estrategiasPorCapa.calor,
  estrategiasPorCapa.sectores,
  estrategiasPorCapa.hospitales,
  estrategiasPorCapa.alertas,
  estrategiasPorCapa.ambulancias,
];
