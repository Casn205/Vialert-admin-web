const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Convierte cualquier formato de fecha que existe en Firestore a `Date`:
 * `Timestamp` (cliente o admin), texto ISO-8601 o texto solo-fecha ("2025-11-20").
 * "YYYY-MM-DD" se interpreta como fecha LOCAL (igual que la app Dart), no UTC.
 */
export function aFecha(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string') {
    const m = SOLO_FECHA.exec(v);
    const d = m ? new Date(+m[1]!, +m[2]! - 1, +m[3]!) : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const t = v as { toDate?: () => Date };
  if (typeof t.toDate === 'function') {
    const d = t.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
