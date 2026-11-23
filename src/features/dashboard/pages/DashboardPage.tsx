import { useMemo, useState } from 'react';
import { ETIQUETA_ESTADO_ALERTA, ESTADOS_ALERTA } from '@/core/domain/alerta';
import { TZ_OPERACION } from '@/core/domain/constants';
import { contarPorPrioridad, contarPorTipo, etiquetaDia } from '@/core/domain/kpi-vista';
import { Cargable } from '../components/Cargable';
import { ExportarCsv } from '../components/ExportarCsv';
import { FiltrosDashboardForm } from '../components/FiltrosDashboard';
import { DisponibilidadFlota, TopSectores } from '../components/FlotaYSectores';
import { GraficaBarras } from '../components/GraficaBarras';
import { RankingTabla } from '../components/RankingTabla';
import { TarjetasKpi } from '../components/TarjetasKpi';
import {
  FILTROS_INICIALES,
  useAlertasDelPanel,
  useAlertasPorHora,
  useFiltroKpi,
  useResumenKpi,
  useSerieKpi,
  type FiltrosDashboard,
} from '../hooks/use-dashboard';

export default function DashboardPage() {
  const [filtros, setFiltros] = useState<FiltrosDashboard>(FILTROS_INICIALES);
  const filtro = useFiltroKpi(filtros);

  const resumen = useResumenKpi(filtro);
  const porDia = useSerieKpi(filtro, 'dia');
  const porHora = useAlertasPorHora(filtro);
  const panel = useAlertasDelPanel(filtro);

  const datosDia = useMemo(
    () => (porDia.data ?? []).map((s) => ({ etiqueta: etiquetaDia(s.bucket, TZ_OPERACION), valor: s.total })),
    [porDia.data],
  );
  const datosHora = useMemo(() => (porHora.horas ?? []).map((valor, h) => ({ etiqueta: String(h), valor })), [porHora.horas]);

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold">Indicadores</h1>
        <ExportarCsv filtro={filtro} />
      </div>

      <div className="space-y-1 rounded-md border border-aviso/40 bg-aviso/10 px-3 py-2 text-xs text-tinta">
        <p>Las alertas anteriores a la instrumentación no incluyen tiempos.</p>
        <p>La llegada puede declararse por temporizador, no por GPS: el tiempo de respuesta es una referencia.</p>
      </div>

      <FiltrosDashboardForm valor={filtros} onChange={setFiltros} />

      {filtro === null ? (
        <p role="alert" className="rounded-md border border-aviso/40 bg-aviso/10 px-3 py-2 text-sm">
          Elige un rango de fechas válido (la fecha inicial no puede ser posterior a la final).
        </p>
      ) : (
        <>
          <Cargable consulta={resumen}>
            {(r) => (
              <>
                <TarjetasKpi r={r} />
                <p className="text-xs text-tinta-suave">
                  Excluidas: {r.descartadas.simuladas} simuladas · {r.descartadas.anomalias} duraciones anómalas.
                </p>
                <div className="grid gap-3 lg:grid-cols-2">
                  <GraficaBarras
                    titulo="Alertas por estado"
                    datos={ESTADOS_ALERTA.map((e) => ({ etiqueta: ETIQUETA_ESTADO_ALERTA[e], valor: r.porEstado[e] }))}
                  />
                </div>
              </>
            )}
          </Cargable>

          <div className="grid gap-3 lg:grid-cols-2">
            <Cargable consulta={porDia}>{() => <GraficaBarras titulo="Alertas por día" datos={datosDia} />}</Cargable>
            <Cargable consulta={porHora}>{() => <GraficaBarras titulo="Alertas por hora del día" datos={datosHora} />}</Cargable>
          </div>

          <Cargable consulta={panel}>
            {({ alertas, truncado }) => (
              <>
                {truncado && (
                  <p className="text-xs text-aviso">
                    El rango tiene muchas alertas: tipo, prioridad y sectores usan solo las más recientes.
                  </p>
                )}
                <div className="grid gap-3 lg:grid-cols-2">
                  <GraficaBarras titulo="Alertas por tipo" datos={contarPorTipo(alertas)} />
                  <GraficaBarras titulo="Alertas por prioridad" datos={contarPorPrioridad(alertas)} />
                </div>
                <TopSectores alertas={alertas} />
              </>
            )}
          </Cargable>

          <DisponibilidadFlota />

          <div className="grid gap-3 lg:grid-cols-2">
            <RankingTabla titulo="Ambulancias" por="ambulancia" filtro={filtro} />
            <RankingTabla titulo="Conductores" por="conductor" filtro={filtro} />
            <RankingTabla titulo="Paramédicos" por="paramedico" filtro={filtro} />
            <RankingTabla titulo="Hospitales" por="hospital" filtro={filtro} />
          </div>
        </>
      )}
    </div>
  );
}
