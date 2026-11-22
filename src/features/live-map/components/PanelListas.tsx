import type { Alerta } from '@/core/domain/alerta';
import { ETIQUETA_PRIORIDAD } from '@/core/domain/alerta';
import { formatoDuracion } from '@/core/domain/alerta-duraciones';
import { colorDePrioridad, esperaSeg, ETIQUETA_SIN_PRIORIDAD, ordenarPorUrgencia } from '@/core/domain/alerta-vista';
import {
  ETIQUETA_ESTADO_UNIDAD,
  etiquetaUnidad,
  textoPersonal,
  type UnidadVista,
} from '@/core/domain/flota';
import type { Celda } from '@/core/geo/grid';
import { topCeldas } from '@/core/geo/grid';
import { Badge, tonoEstadoAlerta, tonoEstadoUnidad } from '@/shared-ui';
import { RADIOS_KM, useMapFilters } from '../store/map-filters';

function Seccion({ titulo, children, ayuda }: { titulo: string; children: React.ReactNode; ayuda?: string }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-tinta-suave">{titulo}</h3>
      {ayuda && <p className="text-xs text-tinta-suave">{ayuda}</p>}
      {children}
    </section>
  );
}

const itemClase = (activo: boolean) =>
  `flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-sm hover:bg-fondo ${activo ? 'border-primario bg-primario/5' : 'border-borde bg-superficie'}`;

export function ListaAlertas({ alertas, ahora }: { alertas: readonly Alerta[]; ahora: Date }) {
  const { alertaId, seleccionarAlerta } = useMapFilters();
  const ordenadas = ordenarPorUrgencia(alertas);
  return (
    <Seccion titulo={`Alertas activas (${ordenadas.length})`}>
      {ordenadas.length === 0 ? (
        <p className="text-sm text-tinta-suave">No hay alertas activas.</p>
      ) : (
        <ul className="space-y-1">
          {ordenadas.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                aria-pressed={a.id === alertaId}
                onClick={() => seleccionarAlerta(a.id === alertaId ? null : a.id, a.id === alertaId ? undefined : a)}
                className={itemClase(a.id === alertaId)}
              >
                <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: colorDePrioridad(a.prioridad) }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {a.type} · {a.prioridad ? ETIQUETA_PRIORIDAD[a.prioridad] : ETIQUETA_SIN_PRIORIDAD}
                  </span>
                  <span className="block truncate text-xs text-tinta-suave">{a.description}</span>
                  <span className="block text-xs text-tinta-suave">Espera {formatoDuracion(esperaSeg(a, ahora))}</span>
                </span>
                <Badge tono={tonoEstadoAlerta(a.estado)}>{a.estado === 'activa' ? 'Activa' : 'En proceso'}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

export function ListaFlota({ unidades }: { unidades: readonly UnidadVista[] }) {
  const { unidadId, seleccionarUnidad } = useMapFilters();
  // Los turnos posiblemente colgados primero: son los que requieren acción.
  const lista = [...unidades].sort(
    (a, b) => Number(b.turnoColgado) - Number(a.turnoColgado) || etiquetaUnidad(a).localeCompare(etiquetaUnidad(b), 'es'),
  );
  return (
    <Seccion titulo={`Unidades en el mapa (${lista.length})`}>
      {lista.length === 0 ? (
        <p className="text-sm text-tinta-suave">Ninguna unidad está de turno.</p>
      ) : (
        <ul className="space-y-1">
          {lista.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                aria-pressed={u.id === unidadId}
                onClick={() => seleccionarUnidad(u.id === unidadId ? null : u.id, u.id === unidadId ? undefined : u.ubicacion)}
                className={itemClase(u.id === unidadId)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{etiquetaUnidad(u)}</span>
                  <span className="block truncate text-xs text-tinta-suave">{textoPersonal(u)}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tono={tonoEstadoUnidad(u.estado)}>{ETIQUETA_ESTADO_UNIDAD[u.estado]}</Badge>
                  {u.turnoColgado && <Badge tono="sinSenal">Sin señal en turno</Badge>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

export function DisponiblesEnArea({
  resultados,
  centroDeAlerta,
}: {
  resultados: readonly { unidad: UnidadVista; distanciaKm: number }[];
  centroDeAlerta: boolean;
}) {
  const { radioKm, fijarFiltros, unidadId, seleccionarUnidad } = useMapFilters();
  return (
    <Seccion
      titulo="Ambulancias disponibles en el área"
      ayuda={centroDeAlerta ? 'Desde la alerta seleccionada.' : 'Desde el centro del mapa. Selecciona una alerta para medir desde ella.'}
    >
      <div role="group" aria-label="Radio del área" className="flex gap-1">
        {RADIOS_KM.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={radioKm === r}
            onClick={() => fijarFiltros({ radioKm: r })}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${radioKm === r ? 'border-primario bg-primario text-white' : 'border-borde bg-superficie hover:bg-fondo'}`}
          >
            {r} km
          </button>
        ))}
      </div>
      {resultados.length === 0 ? (
        <p className="text-sm text-tinta-suave">No hay unidades disponibles a menos de {radioKm} km.</p>
      ) : (
        <ol className="space-y-1">
          {resultados.map(({ unidad, distanciaKm }) => (
            <li key={unidad.id}>
              <button
                type="button"
                onClick={() => seleccionarUnidad(unidad.id, unidad.ubicacion)}
                aria-pressed={unidad.id === unidadId}
                className={itemClase(unidad.id === unidadId)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{etiquetaUnidad(unidad)}</span>
                  <span className="block truncate text-xs text-tinta-suave">{textoPersonal(unidad)}</span>
                </span>
                <span className="shrink-0 text-sm font-medium tabular-nums">{distanciaKm.toFixed(1)} km</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Seccion>
  );
}

export function TopSectores({ celdas, dias }: { celdas: readonly Celda[]; dias: number }) {
  const enfocar = useMapFilters((s) => s.enfocar);
  const top = topCeldas(celdas, 5);
  return (
    <Seccion titulo="Sectores con más alertas" ayuda={`Cuadrícula de 500 m, últimos ${dias} días.`}>
      {top.length === 0 ? (
        <p className="text-sm text-tinta-suave">No hay alertas en el rango y los filtros elegidos.</p>
      ) : (
        <ol className="space-y-1">
          {top.map((c, i) => (
            <li key={c.id}>
              <button type="button" onClick={() => enfocar(c.centro)} className={itemClase(false)}>
                <span className="w-5 shrink-0 text-tinta-suave">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate tabular-nums">
                  {c.centro.lat.toFixed(4)}, {c.centro.lng.toFixed(4)}
                </span>
                <span className="shrink-0 font-semibold">
                  {c.conteo} <span className="font-normal text-tinta-suave">alerta{c.conteo === 1 ? '' : 's'}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Seccion>
  );
}
