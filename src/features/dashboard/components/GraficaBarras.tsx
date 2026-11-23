import type { DatoBarra } from '@/core/domain/kpi-vista';

/** Gráfica de barras simple (CSS). Sin datos → "Sin dato". */
export function GraficaBarras({ titulo, datos }: { titulo: string; datos: readonly DatoBarra[] }) {
  const max = Math.max(0, ...datos.map((d) => d.valor));
  return (
    <section aria-label={titulo} className="rounded-lg border border-borde bg-superficie p-4">
      <h3 className="mb-3 text-sm font-semibold">{titulo}</h3>
      {max === 0 ? (
        <p className="py-6 text-center text-sm text-tinta-suave">Sin dato</p>
      ) : (
        <ul className="flex h-44 items-stretch gap-1">
          {datos.map((d) => (
            <li key={d.etiqueta} title={`${d.etiqueta}: ${d.valor}`} className="flex min-w-0 flex-1 flex-col items-center">
              <span className="text-[10px] text-tinta-suave">{d.valor > 0 ? d.valor : ''}</span>
              <div className="flex min-h-0 w-full flex-1 items-end">
                <div className="w-full rounded-t bg-primario" style={{ height: `${(d.valor / max) * 100}%` }} />
              </div>
              <span className="w-full truncate text-center text-[10px] text-tinta-suave">{d.etiqueta}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
