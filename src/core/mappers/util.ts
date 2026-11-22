/** Documento de Firestore sin tipar. Todo valor se valida antes de usarse. */
export type Doc = Record<string, unknown>;

export const texto = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export const numero = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

export const booleano = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);

export function uno<T extends string>(v: unknown, validos: readonly T[]): T | null {
  return typeof v === 'string' && (validos as readonly string[]).includes(v) ? (v as T) : null;
}

export const listaTexto = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

export const objeto = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Latitud/longitud válidas o `null`. */
export function coordenadas(d: Doc): { lat: number; lng: number } | null {
  const lat = numero(d.lat);
  const lng = numero(d.lng);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Advertencia de datos: un documento descartado o un valor desconocido. */
export function advertir(mensaje: string, contexto?: unknown): void {
  console.warn(`[datos] ${mensaje}`, contexto ?? '');
}
