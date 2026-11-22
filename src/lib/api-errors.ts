/**
 * `true` si el error viene de la API con estado 409 (`CONFLICT`: p. ej. "la ambulancia está en turno").
 * Se detecta por `status` para no importar `infrastructure/` desde las features.
 */
export function esConflicto(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'status' in e && (e as { status: unknown }).status === 409;
}
