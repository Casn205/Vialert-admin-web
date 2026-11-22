/** Constantes de dominio. Ajustar aquí tras observar datos reales. */

/** Segundos sin actualizar `actualizadoAt` para considerar a una unidad "sin señal".
 *  La app publica cada 5 s al atender una alerta y cada 30 s estando libre. */
export const UBICACION_SIN_SENAL_SEG = 90;

/** Lado de la celda de la cuadrícula de sectores, en metros. */
export const SECTOR_CELDA_M = 500;

/** Radio por defecto de "ambulancias disponibles en el área", en km. */
export const RADIO_AREA_KM_DEFAULT = 3;

/** Una duración mayor a esto (24 h) se considera anomalía. */
export const MAX_DURACION_SEG = 86_400;

/** Tope de alertas por consulta por rango. */
export const LIMITE_ALERTAS_DEFAULT = 2000;

/** Centro del mapa que usa la app móvil. */
export const MAP_CENTRO_DEFAULT = { lat: 10.4631, lng: -73.2532 } as const;

/** Tipos de alerta que ofrece hoy la app (el campo `type` es texto libre). */
export const TIPOS_ALERTA_CONOCIDOS = [
  'Accidente',
  'Emergencia médica',
  'Incendio',
  'Otro',
] as const;

/** Zona horaria de operación (UTC-5). */
export const TZ_OPERACION = 'America/Bogota';
