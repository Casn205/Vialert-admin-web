import { create } from 'zustand';
import type { Prioridad } from '@/core/domain/alerta';
import { MAP_CENTRO_DEFAULT, RADIO_AREA_KM_DEFAULT } from '@/core/domain/constants';
import type { Punto } from '@/core/geo/geo-utils';

export type CapaId = 'ambulancias' | 'alertas' | 'hospitales' | 'calor' | 'sectores';

export const CAPAS: readonly { id: CapaId; etiqueta: string }[] = [
  { id: 'ambulancias', etiqueta: 'Ambulancias' },
  { id: 'alertas', etiqueta: 'Alertas activas' },
  { id: 'hospitales', etiqueta: 'Hospitales' },
  { id: 'calor', etiqueta: 'Calor histórico' },
  { id: 'sectores', etiqueta: 'Sectores (cuadrícula)' },
];

export const RANGOS_DIAS = [7, 30, 90] as const;
export const RADIOS_KM = [1, 3, 5] as const;

interface Datos {
  capas: Record<CapaId, boolean>;
  /** Rango del calor y los sectores. */
  rangoDias: number;
  tipo: string | null;
  prioridad: Prioridad | 'sin' | null;
  incluirSimuladas: boolean;
  /** Suma las alertas anteriores a la instrumentación (consulta por `createdAt`). */
  incluirLegado: boolean;
  radioKm: number;
  alertaId: string | null;
  unidadId: string | null;
  /** Último centro del mapa (para "disponibles en el área" si no hay alerta seleccionada). */
  centroMapa: Punto;
  /** Pide al mapa que se centre en un punto. `n` hace que un mismo punto se pueda pedir de nuevo. */
  foco: { punto: Punto; n: number } | null;
}

interface Acciones {
  alternarCapa: (id: CapaId) => void;
  fijarFiltros: (f: Partial<Pick<Datos, 'rangoDias' | 'tipo' | 'prioridad' | 'incluirSimuladas' | 'incluirLegado' | 'radioKm'>>) => void;
  seleccionarAlerta: (id: string | null, enfocar?: Punto) => void;
  seleccionarUnidad: (id: string | null, enfocar?: Punto) => void;
  fijarCentroMapa: (p: Punto) => void;
  enfocar: (p: Punto) => void;
}

/** Estado de interfaz del mapa. Los datos en vivo no viven aquí: vienen de los repositorios. */
export const estadoInicial: Datos = {
  // Calor y sectores arrancan apagados: se activan cuando se necesitan.
  capas: { ambulancias: true, alertas: true, hospitales: true, calor: false, sectores: false },
  rangoDias: 30,
  tipo: null,
  prioridad: null,
  incluirSimuladas: false,
  incluirLegado: false,
  radioKm: RADIO_AREA_KM_DEFAULT,
  alertaId: null,
  unidadId: null,
  centroMapa: { ...MAP_CENTRO_DEFAULT },
  foco: null,
};

export const useMapFilters = create<Datos & Acciones>()((set) => {
  const pedirFoco = (punto: Punto) => (s: Datos) => ({ foco: { punto, n: (s.foco?.n ?? 0) + 1 } });
  return {
    ...estadoInicial,
    alternarCapa: (id) => set((s) => ({ capas: { ...s.capas, [id]: !s.capas[id] } })),
    fijarFiltros: (f) => set(f),
    seleccionarAlerta: (id, enfocar) => set((s) => ({ alertaId: id, ...(enfocar ? pedirFoco(enfocar)(s) : {}) })),
    seleccionarUnidad: (id, enfocar) => set((s) => ({ unidadId: id, ...(enfocar ? pedirFoco(enfocar)(s) : {}) })),
    fijarCentroMapa: (centroMapa) => set({ centroMapa }),
    enfocar: (p) => set(pedirFoco(p)),
  };
});
