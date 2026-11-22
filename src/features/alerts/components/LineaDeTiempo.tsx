import { ETIQUETA_EVENTO, type EventoAlerta } from '@/core/domain/evento';
import { formatoDuracion } from '@/core/domain/alerta-duraciones';
import { Spinner } from '@/shared-ui';
import { formatoHoraSeg } from './format-alerta';

const CON_ORIGEN = new Set(['llegada', 'traslado_finalizado']);
const ORIGEN: Record<string, string> = { temporizador: 'por temporizador', manual: 'manualmente' };

interface Props {
  eventos: readonly EventoAlerta[] | null;
  cargando: boolean;
  error: Error | null;
  /** Base de los tiempos relativos (`createdAtServer`). */
  inicio: Date | null;
  /** id de ambulancia → texto (placa). */
  nombreAmbulancia: (id: string) => string;
}

export function LineaDeTiempo({ eventos, cargando, error, inicio, nombreAmbulancia }: Props) {
  return (
    <section aria-labelledby="timeline-titulo" className="space-y-3 rounded-lg border border-borde bg-superficie p-4">
      <h2 id="timeline-titulo" className="font-semibold">
        Línea de tiempo
      </h2>
      {cargando && <Spinner etiqueta="Cargando eventos" />}
      {error && (
        <p role="alert" className="text-sm text-critico">
          No se pudieron cargar los eventos ({error.message}).
        </p>
      )}
      {!cargando && !error && eventos?.length === 0 && (
        <p className="text-sm text-tinta-suave">Esta alerta no tiene eventos registrados (es anterior a la medición de tiempos).</p>
      )}
      {eventos && eventos.length > 0 && (
        <ol className="relative space-y-3 border-l-2 border-borde pl-4">
          {eventos.map((e) => {
            const origen = CON_ORIGEN.has(e.tipo) && typeof e.meta.origen === 'string' ? e.meta.origen : null;
            const relativo = inicio && e.ts ? Math.round((e.ts.getTime() - inicio.getTime()) / 1000) : null;
            return (
              <li key={e.id} className="relative">
                <span className="absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full bg-primario ring-4 ring-superficie" aria-hidden />
                <p className="text-sm font-medium">{ETIQUETA_EVENTO[e.tipo]}</p>
                <p className="text-xs text-tinta-suave">
                  <time dateTime={e.ts?.toISOString()}>{formatoHoraSeg(e.ts)}</time>
                  {relativo !== null && relativo >= 0 && <> · +{formatoDuracion(relativo)} desde la creación</>}
                </p>
                {e.ambulanciaId && <p className="text-xs text-tinta-suave">Unidad: {nombreAmbulancia(e.ambulanciaId)}</p>}
                {origen && (
                  <p className="text-xs text-tinta-suave">
                    Registrada {ORIGEN[origen] ?? `(origen: ${origen})`}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
