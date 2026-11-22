import { useSearchParams } from 'react-router-dom';
import { ETIQUETA_TIPO_PERSONAL, type TipoPersonal } from '@/core/domain/personal';
import { PersonalSeccion } from '../components/PersonalSeccion';

const TIPOS: readonly TipoPersonal[] = ['conductor', 'paramedico'];
const PLURAL: Record<TipoPersonal, string> = { conductor: 'Conductores', paramedico: 'Paramédicos' };

export default function StaffPage() {
  const [params, setParams] = useSearchParams();
  const tipo: TipoPersonal = params.get('tipo') === 'paramedico' ? 'paramedico' : 'conductor';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Personal</h1>
        <p className="text-sm text-tinta-suave">Conductores y paramédicos que se asignan a las ambulancias al iniciar turno.</p>
      </div>

      <div role="tablist" aria-label="Tipo de personal" className="flex gap-1 border-b border-borde">
        {TIPOS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`tab-${t}`}
            aria-selected={tipo === t}
            aria-controls="panel-personal"
            onClick={() => setParams(t === 'conductor' ? {} : { tipo: t }, { replace: true })}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tipo === t ? 'border-primario text-primario' : 'border-transparent text-tinta-suave hover:text-tinta'
            }`}
          >
            {PLURAL[t]}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="panel-personal" aria-labelledby={`tab-${tipo}`} aria-label={ETIQUETA_TIPO_PERSONAL[tipo]}>
        <PersonalSeccion key={tipo} tipo={tipo} />
      </div>
    </div>
  );
}
