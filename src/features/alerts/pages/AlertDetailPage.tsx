import { AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Ambulancia } from '@/core/domain/ambulancia';
import { ETIQUETA_ESTADO_ALERTA, ETIQUETA_PRIORIDAD } from '@/core/domain/alerta';
import { formatoDuracion } from '@/core/domain/alerta-duraciones';
import { colorDePrioridad, ETIQUETA_SIN_PRIORIDAD } from '@/core/domain/alerta-vista';
import type { Hospital } from '@/core/domain/hospital';
import { nombreCompleto, type Personal } from '@/core/domain/personal';
import { useDeps } from '@/lib/deps-context';
import { formatoFechaHora } from '@/lib/format';
import { useCarga } from '@/lib/use-carga';
import { useSuscripcion } from '@/lib/use-suscripcion';
import { Badge, EmptyState, MapaBase, Spinner, tonoEstadoAlerta, tonoPrioridad } from '@/shared-ui';
import { DuracionesAlerta } from '../components/DuracionesAlerta';
import { FotosAlerta } from '../components/FotosAlerta';
import { formatoDistancia } from '../components/format-alerta';
import { LineaDeTiempo } from '../components/LineaDeTiempo';

const ELIMINADO = '(eliminado)';

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-tinta-suave">{etiqueta}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
const sinDato = <span className="text-tinta-suave">Sin dato</span>;

export default function AlertDetailPage() {
  const { id = '' } = useParams();
  const { alertas, ambulancias, personal, hospitales } = useDeps();

  const alerta = useCarga(() => alertas.obtenerPorId(id), `alerta:${id}`);
  const eventos = useCarga(() => alertas.listarEventos(id), `eventos:${id}`);
  const amb = useSuscripcion<Ambulancia[]>(useCallback((cb, err) => ambulancias.suscribir(cb, err), [ambulancias]));
  const cond = useSuscripcion<Personal[]>(useCallback((cb, err) => personal.suscribir('conductor', cb, err), [personal]));
  const para = useSuscripcion<Personal[]>(useCallback((cb, err) => personal.suscribir('paramedico', cb, err), [personal]));
  const hosp = useSuscripcion<Hospital[]>(useCallback((cb, err) => hospitales.suscribir(cb, err), [hospitales]));

  const volver = (
    <Link to="/alertas" className="text-sm text-primario underline">
      ← Volver a las alertas
    </Link>
  );

  if (alerta.cargando) {
    return (
      <div className="space-y-3">
        {volver}
        <Spinner etiqueta="Cargando la alerta" />
      </div>
    );
  }
  if (alerta.error) {
    return (
      <div className="space-y-3">
        {volver}
        <EmptyState
          titulo="No se pudo cargar la alerta"
          descripcion={alerta.error.message}
          accion={
            <button type="button" onClick={alerta.recargar} className="text-sm text-primario underline">
              Reintentar
            </button>
          }
        />
      </div>
    );
  }
  const a = alerta.datos;
  if (!a) {
    return (
      <div className="space-y-3">
        {volver}
        <EmptyState titulo="Alerta no encontrada" descripcion="No existe una alerta con ese identificador. Puede que se haya eliminado." />
      </div>
    );
  }

  // Mientras la lista no llegó se muestra el id; si ya llegó y no está, "(eliminado)".
  const buscar = <T extends { id: string }>(lista: T[] | null, id: string | null, texto: (x: T) => string): string | null => {
    if (id === null) return null;
    if (lista === null) return id;
    const x = lista.find((e) => e.id === id);
    return x ? texto(x) : ELIMINADO;
  };
  const placa = (x: string) => buscar(amb.datos, x, (m) => m.placa) ?? 'Sin dato';
  const conductor = buscar(cond.datos, a.conductorId, nombreCompleto);
  const paramedico = buscar(para.datos, a.paramedicoId, nombreCompleto);
  const hospital = a.hospitalDestinoNombre ?? buscar(hosp.datos, a.hospitalDestinoId, (h) => h.nombre);

  return (
    <div className="space-y-4">
      {volver}
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{a.type || 'Alerta'}</h1>
        <Badge tono={tonoPrioridad(a.prioridad)}>{a.prioridad ? ETIQUETA_PRIORIDAD[a.prioridad] : ETIQUETA_SIN_PRIORIDAD}</Badge>
        <Badge tono={tonoEstadoAlerta(a.estado)}>{ETIQUETA_ESTADO_ALERTA[a.estado]}</Badge>
        {a.simulada && <Badge>Simulada</Badge>}
        <span className="ml-auto text-xs text-tinta-suave">ID {a.id}</span>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <section aria-labelledby="datos-titulo" className="space-y-3 rounded-lg border border-borde bg-superficie p-4">
            <h2 id="datos-titulo" className="font-semibold">
              Datos de la alerta
            </h2>
            <p className="text-sm">{a.description}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Dato etiqueta="Creada (hora del servidor)">{a.createdAtServer ? formatoFechaHora(a.createdAtServer) : sinDato}</Dato>
              <Dato etiqueta="Creada (hora del teléfono)">{a.createdAt ? formatoFechaHora(a.createdAt) : sinDato}</Dato>
              <Dato etiqueta="Creada por">{a.creadaPorUsuarioId || sinDato}</Dato>
              <Dato etiqueta="Ubicación">
                {a.lat.toFixed(5)}, {a.lng.toFixed(5)}
              </Dato>
              <Dato etiqueta="ETA inicial">{a.etaInicialSeg === null ? sinDato : formatoDuracion(a.etaInicialSeg)}</Dato>
              <Dato etiqueta="Distancia inicial">{a.distanciaInicialM === null ? sinDato : formatoDistancia(a.distanciaInicialM)}</Dato>
              <Dato etiqueta="Recálculos de ruta">{a.recalculos}</Dato>
              <Dato etiqueta="Veces devuelta a la cola">{a.liberaciones}</Dato>
            </dl>
          </section>

          <section aria-labelledby="atencion-titulo" className="space-y-3 rounded-lg border border-borde bg-superficie p-4">
            <h2 id="atencion-titulo" className="font-semibold">
              Atención
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Dato etiqueta="Ambulancia">{a.ambulanciaAsignada ? placa(a.ambulanciaAsignada) : sinDato}</Dato>
              <Dato etiqueta="Hospital de destino">{hospital ?? sinDato}</Dato>
              <Dato etiqueta="Conductor">{conductor ?? sinDato}</Dato>
              <Dato etiqueta="Paramédico">{paramedico ?? sinDato}</Dato>
            </dl>
          </section>

          <DuracionesAlerta alerta={a} />
          <FotosAlerta fotos={a.fotos} />
        </div>

        <div className="space-y-4">
          <MapaBase className="h-56 w-full overflow-hidden rounded-lg border border-borde" centro={a} zoom={15} etiqueta="Ubicación de la alerta">
            <AdvancedMarker position={a} title={a.description}>
              <Pin background={colorDePrioridad(a.prioridad)} borderColor="#14212b" glyphColor="#fff" />
            </AdvancedMarker>
          </MapaBase>
          <LineaDeTiempo
            eventos={eventos.datos}
            cargando={eventos.cargando}
            error={eventos.error}
            inicio={a.createdAtServer}
            nombreAmbulancia={placa}
          />
        </div>
      </div>
    </div>
  );
}
