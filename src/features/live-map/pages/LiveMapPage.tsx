import { useMemo } from 'react';
import { filtrarAlertas, rangoUltimosDias, tiposDisponibles } from '@/core/domain/alerta-vista';
import { contarPanel, disponiblesEnArea } from '@/core/domain/flota';
import { agruparEnCeldas } from '@/core/geo/grid';
import { useAlertasRango } from '@/lib/use-alertas-rango';
import { Spinner } from '@/shared-ui';
import { DetalleAlertaMapa, DetalleUnidad } from '../components/DetalleSeleccion';
import { MapaEnVivo } from '../components/MapaEnVivo';
import { Contadores, FiltrosHistoricos, SelectorCapas } from '../components/PanelControles';
import { DisponiblesEnArea, ListaAlertas, ListaFlota, TopSectores } from '../components/PanelListas';
import { useFlotaEnVivo } from '../hooks/useFlotaEnVivo';
import { useMapFilters } from '../store/map-filters';

export default function LiveMapPage() {
  const flota = useFlotaEnVivo();
  const { rangoDias, tipo, prioridad, incluirSimuladas, incluirLegado, radioKm, alertaId, unidadId, centroMapa, seleccionarAlerta, seleccionarUnidad } =
    useMapFilters();

  // Calor y sectores: alertas históricas del rango; tipo, prioridad y simuladas se filtran en memoria.
  const historico = useAlertasRango({
    clave: `${rangoDias}d`,
    rango: () => rangoUltimosDias(rangoDias, new Date()),
    incluirLegado,
  });
  const historicas = useMemo(
    () => filtrarAlertas(historico.datos?.alertas ?? [], { tipo, prioridad, estado: null, incluirSimuladas }),
    [historico.datos, tipo, prioridad, incluirSimuladas],
  );
  const celdas = useMemo(() => agruparEnCeldas(historicas), [historicas]);
  const tipos = useMemo(() => tiposDisponibles([...(historico.datos?.alertas ?? []), ...flota.alertas]), [historico.datos, flota.alertas]);

  const contadores = contarPanel(flota.unidades, flota.alertas);
  const alertaSel = alertaId ? flota.alertas.find((a) => a.id === alertaId) : undefined;
  const unidadSel = unidadId ? flota.unidades.find((u) => u.id === unidadId) : undefined;
  const centroArea = alertaSel ?? centroMapa;
  const disponibles = disponiblesEnArea(flota.unidades, centroArea, radioKm);

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-8.5rem)] lg:min-h-[32rem] lg:flex-row">
      <h1 className="sr-only">Mapa en vivo</h1>
      <div className="h-[60vh] min-h-[22rem] min-w-0 flex-1 lg:h-auto">
        {flota.cargando && !flota.errores.length ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-borde bg-superficie">
            <Spinner etiqueta="Cargando el mapa en vivo" />
          </div>
        ) : (
          <MapaEnVivo
            unidades={flota.unidades}
            alertas={flota.alertas}
            hospitales={flota.hospitales}
            historicas={historicas}
            celdas={celdas}
            ahora={flota.ahora}
          />
        )}
      </div>

      <aside aria-label="Panel del mapa" className="w-full shrink-0 space-y-4 overflow-y-auto rounded-lg border border-borde bg-fondo p-3 lg:w-[23rem]">
        {flota.errores.length > 0 && (
          <p role="alert" className="rounded-md bg-critico/10 px-2 py-1.5 text-sm text-critico">
            No se pudo leer en tiempo real: {flota.errores.join(', ')}. Los datos pueden estar desactualizados.
          </p>
        )}
        {historico.error && (
          <p role="alert" className="rounded-md bg-critico/10 px-2 py-1.5 text-sm text-critico">
            No se pudieron cargar las alertas históricas ({historico.error.message}).{' '}
            <button type="button" onClick={historico.recargar} className="underline">
              Reintentar
            </button>
          </p>
        )}
        <Contadores c={contadores} />
        {unidadSel && <DetalleUnidad unidad={unidadSel} alertas={flota.alertas} ahora={flota.ahora} onCerrar={() => seleccionarUnidad(null)} />}
        {alertaSel && <DetalleAlertaMapa alerta={alertaSel} ahora={flota.ahora} onCerrar={() => seleccionarAlerta(null)} />}
        <SelectorCapas />
        <ListaAlertas alertas={flota.alertas} ahora={flota.ahora} />
        <DisponiblesEnArea resultados={disponibles} centroDeAlerta={alertaSel !== undefined} />
        <ListaFlota unidades={flota.unidades} />
        <FiltrosHistoricos tipos={tipos} truncado={historico.datos?.truncado ?? false} cargando={historico.cargando} />
        <TopSectores celdas={celdas} dias={rangoDias} />
      </aside>
    </div>
  );
}
