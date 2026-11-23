import type { Alerta } from '@/core/domain/alerta';
import { agruparEnCeldas, topCeldas } from '@/core/geo/grid';
import { useFlotaInstantanea } from '../hooks/use-dashboard';

export function DisponibilidadFlota() {
  const { contadores: c, error } = useFlotaInstantanea();
  const items = [
    ['Disponibles', c.disponibles],
    ['Atendiendo', c.atendiendo],
    ['En traslado', c.traslado],
    ['Sin señal', c.sinSenal],
  ] as const;
  return (
    <section aria-label="Disponibilidad de flota" className="rounded-lg border border-borde bg-superficie p-4">
      <h3 className="text-sm font-semibold">Disponibilidad de flota (ahora)</h3>
      <p className="mb-3 text-xs text-tinta-suave">Instantánea en vivo: no hay historial de turnos.</p>
      {error ? (
        <p role="alert" className="text-sm text-critico">No se pudo leer la flota en vivo.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map(([etiqueta, n]) => (
            <div key={etiqueta}>
              <dt className="text-xs text-tinta-suave">{etiqueta}</dt>
              <dd className="text-xl font-semibold">{n}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function TopSectores({ alertas }: { alertas: readonly Alerta[] }) {
  const top = topCeldas(agruparEnCeldas(alertas.map((a) => ({ lat: a.lat, lng: a.lng }))), 5);
  return (
    <section aria-label="Top sectores" className="rounded-lg border border-borde bg-superficie p-4">
      <h3 className="mb-2 text-sm font-semibold">Sectores con más alertas</h3>
      {top.length === 0 ? (
        <p className="py-4 text-center text-sm text-tinta-suave">Sin dato</p>
      ) : (
        <ol className="space-y-1 text-sm">
          {top.map((c, i) => (
            <li key={c.id} className="flex justify-between border-t border-borde py-1 first:border-t-0">
              <span>
                {i + 1}. Cuadrícula ≈ {c.centro.lat.toFixed(4)}, {c.centro.lng.toFixed(4)}
              </span>
              <span className="font-medium">{c.conteo}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
