import type { ContadoresPanel } from '@/core/domain/flota';
import { ETIQUETA_PRIORIDAD, PRIORIDADES } from '@/core/domain/alerta';
import { ETIQUETA_SIN_PRIORIDAD } from '@/core/domain/alerta-vista';
import { campoClase } from '@/shared-ui';
import { CAPAS, RANGOS_DIAS, useMapFilters } from '../store/map-filters';

const CONTADORES: { clave: keyof ContadoresPanel; etiqueta: string; color: string }[] = [
  { clave: 'alertasActivas', etiqueta: 'Alertas activas', color: 'text-critico' },
  { clave: 'alertasEnProceso', etiqueta: 'En proceso', color: 'text-aviso' },
  { clave: 'disponibles', etiqueta: 'Disponibles', color: 'text-ok' },
  { clave: 'atendiendo', etiqueta: 'Atendiendo', color: 'text-critico' },
  { clave: 'traslado', etiqueta: 'En traslado', color: 'text-aviso' },
  { clave: 'sinSenal', etiqueta: 'Sin señal', color: 'text-sin-senal' },
];

export function Contadores({ c }: { c: ContadoresPanel }) {
  return (
    <dl className="grid grid-cols-3 gap-2" aria-label="Resumen">
      {CONTADORES.map(({ clave, etiqueta, color }) => (
        <div key={clave} className="rounded-md border border-borde bg-superficie px-2 py-1.5">
          <dd className={`text-xl font-semibold leading-tight ${color}`}>{c[clave]}</dd>
          <dt className="text-[11px] leading-tight text-tinta-suave">{etiqueta}</dt>
        </div>
      ))}
    </dl>
  );
}

export function SelectorCapas() {
  const capas = useMapFilters((s) => s.capas);
  const alternar = useMapFilters((s) => s.alternarCapa);
  return (
    <fieldset className="space-y-1">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-tinta-suave">Capas</legend>
      {CAPAS.map(({ id, etiqueta }) => (
        <label key={id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={capas[id]} onChange={() => alternar(id)} className="size-4 accent-primario" />
          {etiqueta}
        </label>
      ))}
    </fieldset>
  );
}

/** Filtros del calor y los sectores (alertas históricas). */
export function FiltrosHistoricos({ tipos, truncado, cargando }: { tipos: readonly string[]; truncado: boolean; cargando: boolean }) {
  const { rangoDias, tipo, prioridad, incluirSimuladas, incluirLegado, fijarFiltros } = useMapFilters();
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-tinta-suave">Filtros de calor y sectores</legend>
      <div className="grid grid-cols-3 gap-2">
        <label className="col-span-1 space-y-0.5 text-xs">
          <span className="text-tinta-suave">Rango</span>
          <select className={campoClase} value={rangoDias} onChange={(e) => fijarFiltros({ rangoDias: Number(e.target.value) })}>
            {RANGOS_DIAS.map((d) => (
              <option key={d} value={d}>
                {d} días
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-1 space-y-0.5 text-xs">
          <span className="text-tinta-suave">Tipo</span>
          <select className={campoClase} value={tipo ?? ''} onChange={(e) => fijarFiltros({ tipo: e.target.value || null })}>
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-1 space-y-0.5 text-xs">
          <span className="text-tinta-suave">Prioridad</span>
          <select
            className={campoClase}
            value={prioridad ?? ''}
            onChange={(e) => fijarFiltros({ prioridad: (e.target.value || null) as typeof prioridad })}
          >
            <option value="">Todas</option>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>
                {ETIQUETA_PRIORIDAD[p]}
              </option>
            ))}
            <option value="sin">{ETIQUETA_SIN_PRIORIDAD}</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={incluirSimuladas} onChange={(e) => fijarFiltros({ incluirSimuladas: e.target.checked })} className="size-4 accent-primario" />
        Incluir alertas simuladas
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={incluirLegado} onChange={(e) => fijarFiltros({ incluirLegado: e.target.checked })} className="mt-0.5 size-4 accent-primario" />
        <span>
          Incluir alertas antiguas
          <span className="block text-xs text-tinta-suave">Anteriores a la medición de tiempos (sin hora del servidor).</span>
        </span>
      </label>
      {cargando && <p className="text-xs text-tinta-suave">Cargando alertas del rango…</p>}
      {truncado && (
        <p role="status" className="rounded-md bg-aviso/10 px-2 py-1 text-xs text-aviso">
          Hay más alertas de las que se pueden mostrar: el calor y los sectores usan solo las más recientes. Acorta el rango.
        </p>
      )}
    </fieldset>
  );
}
