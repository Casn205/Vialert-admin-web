import { UBICACION_SIN_SENAL_SEG } from './constants';
import type { Alerta } from './alerta';
import type { Ambulancia } from './ambulancia';
import { nombreCompleto, type Personal } from './personal';
import type { Ubicacion } from './ubicacion';
import { dentroDelRadio, type Punto } from '../geo/geo-utils';

/** Estado que se dibuja en el mapa (los colores de la app móvil, más "sin señal"). */
export type EstadoUnidad = 'disponible' | 'atendiendo' | 'traslado' | 'sinSenal';

export const ETIQUETA_ESTADO_UNIDAD: Record<EstadoUnidad, string> = {
  disponible: 'Disponible',
  atendiendo: 'Atendiendo alerta',
  traslado: 'Traslado a hospital',
  sinSenal: 'Sin señal',
};

/** Verde = habilitada, rojo = enRuta, naranja = enRutaHospital, violeta = sin señal (como `AdminFlotaVivoScreen`). */
export const COLOR_ESTADO_UNIDAD: Record<EstadoUnidad, string> = {
  disponible: '#2b8a57',
  atendiendo: '#c8372d',
  traslado: '#d9822b',
  sinSenal: '#7a56b0',
};

/** Una unidad lista para dibujar: su ubicación cruzada con su documento de `ambulancias` y su personal. */
export interface UnidadVista {
  /** id de la ambulancia (= id del documento de ubicación). */
  id: string;
  ubicacion: Ubicacion;
  /** `null` si existe ubicación pero no el documento de la ambulancia ("sin datos de la unidad"). */
  ambulancia: Ambulancia | null;
  /** Estado operativo real (sin tener en cuenta la señal). */
  operativo: Exclude<EstadoUnidad, 'sinSenal'>;
  sinSenal: boolean;
  /** Lo que se dibuja: `sinSenal` pisa al estado operativo. */
  estado: EstadoUnidad;
  /** En turno pero sin señal: la app probablemente se cerró sin liberar al personal. */
  turnoColgado: boolean;
  conductor: Personal | null;
  paramedico: Personal | null;
}

/** `actualizadoAt` nulo = escritura pendiente del servidor = "ahora" (no es sin señal). */
export function estaSinSenal(u: Pick<Ubicacion, 'actualizadoAt'>, ahora: Date, umbralSeg = UBICACION_SIN_SENAL_SEG): boolean {
  if (!u.actualizadoAt) return false;
  return (ahora.getTime() - u.actualizadoAt.getTime()) / 1000 > umbralSeg;
}

/**
 * Se oculta solo si el documento de la ambulancia existe y `enTurno === false`
 * (un documento de ubicación viejo). Sin documento de ambulancia se muestra.
 */
export function esVisible(ambulancia: Pick<Ambulancia, 'enTurno'> | null): boolean {
  return !(ambulancia && !ambulancia.enTurno);
}

/**
 * Estado operativo de la unidad. Se usa `estadoOperativo` de la ubicación (fiable);
 * si falta, se deduce de si hay una alerta en curso (el de `ambulancias` es ambiguo: la app deja `enRuta` al iniciar turno).
 */
export function estadoOperativoDe(
  u: Pick<Ubicacion, 'estadoOperativo' | 'alertaId'>,
  a: Pick<Ambulancia, 'currentAlertaId' | 'estadoOperativo'> | null,
): Exclude<EstadoUnidad, 'sinSenal'> {
  switch (u.estadoOperativo) {
    case 'habilitada':
      return 'disponible';
    case 'enRuta':
      return 'atendiendo';
    case 'enRutaHospital':
      return 'traslado';
    default: {
      const enAtencion = u.alertaId !== null || (a?.currentAlertaId ?? null) !== null;
      if (!enAtencion) return 'disponible';
      return a?.estadoOperativo === 'enRutaHospital' ? 'traslado' : 'atendiendo';
    }
  }
}

export interface EntradaUnidades {
  ubicaciones: readonly Ubicacion[];
  ambulancias: readonly Ambulancia[];
  conductores: readonly Personal[];
  paramedicos: readonly Personal[];
  ahora: Date;
  umbralSinSenalSeg?: number;
}

/** Personal a bordo: primero por `current*Id` de la ambulancia y, si falta, por `ambulanciaId` del personal. */
function personalABordo(lista: readonly Personal[], actualId: string | null | undefined, ambulanciaId: string): Personal | null {
  if (actualId) {
    const p = lista.find((x) => x.id === actualId);
    if (p) return p;
  }
  return lista.find((x) => x.ambulanciaId === ambulanciaId) ?? null;
}

/** Cruza ubicaciones, ambulancias y personal; oculta las unidades fuera de turno. */
export function construirUnidades(e: EntradaUnidades): UnidadVista[] {
  const porId = new Map(e.ambulancias.map((a) => [a.id, a]));
  const unidades: UnidadVista[] = [];
  for (const ubicacion of e.ubicaciones) {
    const ambulancia = porId.get(ubicacion.ambulanciaId) ?? null;
    if (!esVisible(ambulancia)) continue;
    const sinSenal = estaSinSenal(ubicacion, e.ahora, e.umbralSinSenalSeg);
    const operativo = estadoOperativoDe(ubicacion, ambulancia);
    unidades.push({
      id: ubicacion.ambulanciaId,
      ubicacion,
      ambulancia,
      operativo,
      sinSenal,
      estado: sinSenal ? 'sinSenal' : operativo,
      turnoColgado: sinSenal && ambulancia?.enTurno === true,
      conductor: personalABordo(e.conductores, ambulancia?.currentConductorId, ubicacion.ambulanciaId),
      paramedico: personalABordo(e.paramedicos, ambulancia?.currentParamedicoId, ubicacion.ambulanciaId),
    });
  }
  return unidades;
}

export interface ContadoresPanel {
  alertasActivas: number;
  alertasEnProceso: number;
  disponibles: number;
  atendiendo: number;
  traslado: number;
  sinSenal: number;
}

export function contarPanel(unidades: readonly UnidadVista[], alertas: readonly Alerta[]): ContadoresPanel {
  const n = (f: (u: UnidadVista) => boolean) => unidades.filter(f).length;
  return {
    alertasActivas: alertas.filter((a) => a.estado === 'activa').length,
    alertasEnProceso: alertas.filter((a) => a.estado === 'enProceso').length,
    disponibles: n((u) => u.estado === 'disponible'),
    atendiendo: n((u) => u.estado === 'atendiendo'),
    traslado: n((u) => u.estado === 'traslado'),
    sinSenal: n((u) => u.estado === 'sinSenal'),
  };
}

/** Unidades disponibles (habilitadas y con señal) dentro de `radioKm` del `centro`, de más cerca a más lejos. */
export function disponiblesEnArea(
  unidades: readonly UnidadVista[],
  centro: Punto,
  radioKm: number,
): { unidad: UnidadVista; distanciaKm: number }[] {
  const libres = unidades.filter((u) => u.estado === 'disponible');
  return dentroDelRadio(libres, (u) => u.ubicacion, centro, radioKm).map(({ item, distanciaKm }) => ({
    unidad: item,
    distanciaKm,
  }));
}

/** "Marco Polo · Leo Messi" o "Sin personal registrado". */
export function textoPersonal(u: Pick<UnidadVista, 'conductor' | 'paramedico'>): string {
  const nombres = [u.conductor, u.paramedico].filter((p): p is Personal => p !== null).map(nombreCompleto);
  return nombres.length ? nombres.join(' · ') : 'Sin personal registrado';
}

/** Nombre corto de la unidad para listas: placa, o el id si no hay documento. */
export function etiquetaUnidad(u: Pick<UnidadVista, 'id' | 'ambulancia'>): string {
  return u.ambulancia ? `${u.ambulancia.placa} · ${u.ambulancia.codigoInterno}` : `Unidad ${u.id}`;
}
