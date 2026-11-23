import { ETIQUETA_PRIORIDAD, PRIORIDADES } from '@/core/domain/alerta';
import { TIPOS_ALERTA_CONOCIDOS } from '@/core/domain/constants';
import type { FiltrosDashboard, PresetRango } from '../hooks/use-dashboard';

const PRESETS: { valor: PresetRango; etiqueta: string }[] = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: '7d', etiqueta: '7 días' },
  { valor: '30d', etiqueta: '30 días' },
  { valor: 'personalizado', etiqueta: 'Personalizado' },
];

const campo = 'rounded-md border border-borde bg-superficie px-2 py-1.5 text-sm';

export function FiltrosDashboardForm({ valor, onChange }: { valor: FiltrosDashboard; onChange: (v: FiltrosDashboard) => void }) {
  const set = <K extends keyof FiltrosDashboard>(k: K, v: FiltrosDashboard[K]) => onChange({ ...valor, [k]: v });
  return (
    <form className="flex flex-wrap items-end gap-4 rounded-lg border border-borde bg-superficie p-4" onSubmit={(e) => e.preventDefault()}>
      <fieldset className="flex flex-wrap items-center gap-1">
        <legend className="mb-1 text-xs font-medium text-tinta-suave">Rango</legend>
        {PRESETS.map((p) => (
          <button
            key={p.valor}
            type="button"
            aria-pressed={valor.preset === p.valor}
            onClick={() => set('preset', p.valor)}
            className={`rounded-md border px-3 py-1.5 text-sm ${valor.preset === p.valor ? 'border-primario bg-primario text-white' : 'border-borde bg-superficie text-tinta'}`}
          >
            {p.etiqueta}
          </button>
        ))}
      </fieldset>

      {valor.preset === 'personalizado' && (
        <>
          <label className="flex flex-col gap-1 text-xs font-medium text-tinta-suave">
            Desde
            <input type="date" className={campo} value={valor.desdeTexto} onChange={(e) => set('desdeTexto', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-tinta-suave">
            Hasta
            <input type="date" className={campo} value={valor.hastaTexto} onChange={(e) => set('hastaTexto', e.target.value)} />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1 text-xs font-medium text-tinta-suave">
        Tipo
        <select className={campo} value={valor.tipo} onChange={(e) => set('tipo', e.target.value)}>
          <option value="">Todos</option>
          {TIPOS_ALERTA_CONOCIDOS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-tinta-suave">
        Prioridad
        <select className={campo} value={valor.prioridad} onChange={(e) => set('prioridad', e.target.value as FiltrosDashboard['prioridad'])}>
          <option value="">Todas</option>
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>{ETIQUETA_PRIORIDAD[p]}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={valor.incluirSimuladas} onChange={(e) => set('incluirSimuladas', e.target.checked)} />
        Incluir alertas simuladas
      </label>
    </form>
  );
}
