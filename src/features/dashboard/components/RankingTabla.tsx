import { formatoDuracion } from '@/core/domain/alerta-duraciones';
import type { FiltroKpi } from '@/core/domain/kpi';
import { useRankingKpi } from '../hooks/use-dashboard';
import { Cargable } from './Cargable';

type Por = 'ambulancia' | 'conductor' | 'paramedico' | 'hospital';

const th = 'px-2 py-1 text-left text-xs font-medium text-tinta-suave';
const td = 'px-2 py-1 text-sm';

export function RankingTabla({ titulo, por, filtro }: { titulo: string; por: Por; filtro: FiltroKpi }) {
  const consulta = useRankingKpi(filtro, por);
  return (
    <section aria-label={titulo} className="rounded-lg border border-borde bg-superficie p-4">
      <h3 className="mb-2 text-sm font-semibold">{titulo}</h3>
      <Cargable consulta={consulta}>
        {(items) =>
          items.length === 0 ? (
            <p className="py-4 text-center text-sm text-tinta-suave">Sin dato</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>{por === 'hospital' ? 'Hospital' : 'Nombre'}</th>
                  <th className={th}>{por === 'hospital' ? 'Traslados' : 'Atendidas'}</th>
                  <th className={th}>{por === 'hospital' ? 'Traslado medio' : 'Respuesta media'}</th>
                  {por !== 'hospital' && <th className={th}>En escena</th>}
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 5).map((i) => (
                  <tr key={i.id} className="border-t border-borde">
                    <td className={td}>{i.etiqueta}</td>
                    <td className={td}>{por === 'hospital' ? (i.traslados ?? 0) : i.atendidas}</td>
                    <td className={td}>{formatoDuracion(por === 'hospital' ? (i.trasladoMedioSeg ?? null) : i.respuestaMediaSeg)}</td>
                    {por !== 'hospital' && <td className={td}>{formatoDuracion(i.enEscenaMediaSeg)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </Cargable>
    </section>
  );
}
