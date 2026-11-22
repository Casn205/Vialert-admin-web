export type EstadoOperativoUbicacion = 'habilitada' | 'enRuta' | 'enRutaHospital';
export const ESTADOS_UBICACION: readonly EstadoOperativoUbicacion[] = [
  'habilitada',
  'enRuta',
  'enRutaHospital',
];

/** Posición de una ambulancia de turno (`ubicaciones/{ambulanciaId}`). */
export interface Ubicacion {
  ambulanciaId: string;
  lat: number;
  lng: number;
  rumbo: number | null;
  velocidadKmh: number | null;
  precisionM: number | null;
  /** Deducido de la atención en curso: es el estado fiable para el mapa. */
  estadoOperativo: EstadoOperativoUbicacion | null;
  alertaId: string | null;
  appVersion: string | null;
  /** Latido. `null` = escritura pendiente (se trata como "ahora"). */
  actualizadoAt: Date | null;
}
