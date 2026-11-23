import { formatoDuracion } from '@/core/domain/alerta-duraciones';
import type { Estadistica, KpiResumen } from '@/core/domain/kpi';

function Tarjeta({ titulo, principal, detalle }: { titulo: string; principal: string; detalle: string }) {
  return (
    <div className="rounded-lg border border-borde bg-superficie p-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-tinta-suave">{titulo}</h3>
      <p className="mt-1 text-2xl font-semibold">{principal}</p>
      <p className="mt-1 text-xs text-tinta-suave">{detalle}</p>
    </div>
  );
}

/** Tiempo: mediana destacada y p90. Con `n = 0` muestra "Sin dato" (nunca cero). */
function TarjetaTiempo({ titulo, e }: { titulo: string; e: Estadistica }) {
  return (
    <Tarjeta
      titulo={titulo}
      principal={e.n > 0 ? formatoDuracion(e.mediana) : 'Sin dato'}
      detalle={e.n > 0 ? `Mediana · p90 ${formatoDuracion(e.p90)} · n = ${e.n}` : 'n = 0'}
    />
  );
}

const pct = (n: number) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;

export function TarjetasKpi({ r }: { r: KpiResumen }) {
  const c = r.cumplimientoRespuesta;
  const sinAlertas = r.totalAlertas === 0;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Tarjeta
        titulo="Total de alertas"
        principal={String(r.totalAlertas)}
        detalle={`${r.porEstado.atendida} atendidas · ${r.porEstado.enProceso} en proceso · ${r.porEstado.activa} activas`}
      />
      <TarjetaTiempo titulo="Tiempo de respuesta" e={r.tiempos.respuesta} />
      <Tarjeta
        titulo="Cumplimiento de respuesta"
        principal={c.porcentaje !== null ? pct(c.porcentaje) : 'Sin dato'}
        detalle={`Respuestas ≤ ${formatoDuracion(c.umbralSeg)} · n = ${c.n}`}
      />
      <TarjetaTiempo titulo="Permanencia en escena" e={r.tiempos.enEscena} />
      <TarjetaTiempo titulo="Traslado" e={r.tiempos.traslado} />
      <Tarjeta
        titulo="Liberaciones"
        principal={sinAlertas ? 'Sin dato' : String(r.operacion.liberaciones)}
        detalle={
          r.operacion.recalculosPromedio !== null
            ? `Recálculos por alerta: ${r.operacion.recalculosPromedio.toLocaleString('es-CO', { maximumFractionDigits: 1 })}`
            : 'Sin alertas en el rango'
        }
      />
    </div>
  );
}
