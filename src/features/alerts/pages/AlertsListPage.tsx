import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ESTADOS_ALERTA, ETIQUETA_ESTADO_ALERTA, ETIQUETA_PRIORIDAD, fechaCreacion, PRIORIDADES, type Alerta, type EstadoAlerta, type Prioridad } from '@/core/domain/alerta';
import { duracionesDeAlerta, formatoDuracion } from '@/core/domain/alerta-duraciones';
import { ETIQUETA_SIN_PRIORIDAD, filtrarAlertas, rangoDeFechas, rangoUltimosDias, tiposDisponibles } from '@/core/domain/alerta-vista';
import type { Ambulancia } from '@/core/domain/ambulancia';
import { useDeps } from '@/lib/deps-context';
import { formatoFechaHora } from '@/lib/format';
import { useAlertasRango } from '@/lib/use-alertas-rango';
import { useSuscripcion } from '@/lib/use-suscripcion';
import { Badge, Button, campoClase, DataTable, Spinner, tonoEstadoAlerta, tonoPrioridad, type Columna } from '@/shared-ui';

const POR_PAGINA = 25;
type Rango = 'hoy' | '7' | '30' | 'personalizado';
const RANGOS: { id: Rango; etiqueta: string }[] = [
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: '7', etiqueta: 'Últimos 7 días' },
  { id: '30', etiqueta: 'Últimos 30 días' },
  { id: 'personalizado', etiqueta: 'Personalizado' },
];

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AlertsListPage() {
  const { ambulancias } = useDeps();
  const amb = useSuscripcion<Ambulancia[]>(useCallback((cb, err) => ambulancias.suscribir(cb, err), [ambulancias]));

  const [rango, setRango] = useState<Rango>('7');
  const [desde, setDesde] = useState(hoyISO);
  const [hasta, setHasta] = useState(hoyISO);
  const [estado, setEstado] = useState<EstadoAlerta | ''>('');
  const [tipo, setTipo] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad | 'sin' | ''>('');
  const [incluirSimuladas, setIncluirSimuladas] = useState(false);
  const [incluirLegado, setIncluirLegado] = useState(false);
  const [masRecientesPrimero, setMasRecientesPrimero] = useState(true);
  const [pagina, setPagina] = useState(0);

  const personalizado = rango === 'personalizado' ? rangoDeFechas(desde, hasta) : null;
  const rangoInvalido = rango === 'personalizado' && personalizado === null;
  const consulta = useAlertasRango({
    clave: rango === 'personalizado' ? `${desde}|${hasta}` : rango,
    rango: () => {
      if (rango === 'personalizado') return personalizado ?? rangoUltimosDias(1, new Date());
      return rangoUltimosDias(rango === 'hoy' ? 1 : Number(rango), new Date());
    },
    incluirLegado,
  });

  const delRango = useMemo(() => (rangoInvalido ? [] : (consulta.datos?.alertas ?? [])), [consulta.datos, rangoInvalido]);
  const tipos = useMemo(() => tiposDisponibles(delRango), [delRango]);
  const filas = useMemo(() => {
    const lista = filtrarAlertas(delRango, { tipo: tipo || null, prioridad: prioridad || null, estado: estado || null, incluirSimuladas });
    const t = (a: Alerta) => fechaCreacion(a)?.getTime() ?? 0;
    return lista.sort((a, b) => (masRecientesPrimero ? t(b) - t(a) : t(a) - t(b)));
  }, [delRango, tipo, prioridad, estado, incluirSimuladas, masRecientesPrimero]);

  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, paginas - 1);
  const visibles = filas.slice(paginaActual * POR_PAGINA, (paginaActual + 1) * POR_PAGINA);
  // Cada cambio de filtro vuelve a la primera página.
  const cambiar = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPagina(0);
  };

  const placa = (id: string | null) => (id === null ? 'Sin dato' : (amb.datos?.find((a) => a.id === id)?.placa ?? (amb.datos ? '(eliminada)' : id)));

  const columnas: Columna<Alerta>[] = [
    {
      encabezado: 'Fecha',
      celda: (a) => (
        <>
          {formatoFechaHora(fechaCreacion(a))}
          {a.createdAtServer === null && <span className="block text-xs text-tinta-suave">Hora del teléfono</span>}
        </>
      ),
    },
    { encabezado: 'Tipo', celda: (a) => a.type || 'Sin dato' },
    { encabezado: 'Prioridad', celda: (a) => <Badge tono={tonoPrioridad(a.prioridad)}>{a.prioridad ? ETIQUETA_PRIORIDAD[a.prioridad] : ETIQUETA_SIN_PRIORIDAD}</Badge> },
    {
      encabezado: 'Estado',
      celda: (a) => (
        <span className="flex items-center gap-1">
          <Badge tono={tonoEstadoAlerta(a.estado)}>{ETIQUETA_ESTADO_ALERTA[a.estado]}</Badge>
          {a.simulada && <Badge>Simulada</Badge>}
        </span>
      ),
    },
    { encabezado: 'Ambulancia', celda: (a) => placa(a.ambulanciaAsignada) },
    { encabezado: 'Respuesta', celda: (a) => formatoDuracion(duracionesDeAlerta(a).respuesta) },
    { encabezado: 'Descripción', celda: (a) => <span className="block max-w-xs truncate">{a.description}</span> },
    {
      encabezado: 'Detalle',
      celda: (a) => (
        <Link to={`/alertas/${a.id}`} className="text-primario underline" aria-label={`Ver detalle de la alerta ${a.type} del ${formatoFechaHora(fechaCreacion(a))}`}>
          Ver
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Alertas</h1>

      <form onSubmit={(e) => e.preventDefault()} className="grid gap-3 rounded-lg border border-borde bg-superficie p-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Filtros">
        <label className="space-y-0.5 text-xs">
          <span className="text-tinta-suave">Rango</span>
          <select className={campoClase} value={rango} onChange={(e) => cambiar(setRango)(e.target.value as Rango)}>
            {RANGOS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.etiqueta}
              </option>
            ))}
          </select>
        </label>
        {rango === 'personalizado' && (
          <>
            <label className="space-y-0.5 text-xs">
              <span className="text-tinta-suave">Desde</span>
              <input type="date" className={campoClase} value={desde} max={hasta} onChange={(e) => cambiar(setDesde)(e.target.value)} />
            </label>
            <label className="space-y-0.5 text-xs">
              <span className="text-tinta-suave">Hasta</span>
              <input type="date" className={campoClase} value={hasta} min={desde} onChange={(e) => cambiar(setHasta)(e.target.value)} />
            </label>
          </>
        )}
        <label className="space-y-0.5 text-xs">
          <span className="text-tinta-suave">Estado</span>
          <select className={campoClase} value={estado} onChange={(e) => cambiar(setEstado)(e.target.value as EstadoAlerta | '')}>
            <option value="">Todos</option>
            {ESTADOS_ALERTA.map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO_ALERTA[e]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-0.5 text-xs">
          <span className="text-tinta-suave">Tipo</span>
          <select className={campoClase} value={tipo} onChange={(e) => cambiar(setTipo)(e.target.value)}>
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-0.5 text-xs">
          <span className="text-tinta-suave">Prioridad</span>
          <select className={campoClase} value={prioridad} onChange={(e) => cambiar(setPrioridad)(e.target.value as Prioridad | 'sin' | '')}>
            <option value="">Todas</option>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>
                {ETIQUETA_PRIORIDAD[p]}
              </option>
            ))}
            <option value="sin">{ETIQUETA_SIN_PRIORIDAD}</option>
          </select>
        </label>
        <div className="flex flex-col justify-end gap-1 text-sm sm:col-span-2 lg:col-span-5 lg:flex-row lg:gap-6">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-primario" checked={incluirSimuladas} onChange={(e) => cambiar(setIncluirSimuladas)(e.target.checked)} />
            Incluir alertas simuladas
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-primario" checked={incluirLegado} onChange={(e) => cambiar(setIncluirLegado)(e.target.checked)} />
            Incluir alertas antiguas (sin hora del servidor)
          </label>
        </div>
      </form>

      {rangoInvalido && (
        <p role="alert" className="text-sm text-critico">
          El rango no es válido: la fecha «Desde» debe ser anterior o igual a «Hasta».
        </p>
      )}
      {consulta.error && (
        <p role="alert" className="text-sm text-critico">
          No se pudieron cargar las alertas ({consulta.error.message}).{' '}
          <button type="button" onClick={consulta.recargar} className="underline">
            Reintentar
          </button>
        </p>
      )}
      {consulta.datos?.truncado && !rangoInvalido && (
        <p role="status" className="rounded-md bg-aviso/10 px-3 py-2 text-sm text-aviso">
          Hay más alertas en este rango de las que se pueden mostrar: se listan solo las más recientes. Acorta el rango para verlas todas.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-tinta-suave" aria-live="polite">
          {consulta.cargando && !rangoInvalido ? <Spinner etiqueta="Cargando alertas" /> : `${filas.length} alerta${filas.length === 1 ? '' : 's'}`}
        </p>
        <Button variante="secundario" onClick={() => setMasRecientesPrimero((v) => !v)} aria-label={`Ordenar por fecha: ahora ${masRecientesPrimero ? 'más recientes primero' : 'más antiguas primero'}`}>
          {masRecientesPrimero ? 'Más recientes primero ↓' : 'Más antiguas primero ↑'}
        </Button>
      </div>

      <DataTable
        columnas={columnas}
        filas={visibles}
        clave={(a) => a.id}
        vacio={consulta.cargando ? 'Cargando…' : 'No hay alertas con estos filtros.'}
        descripcion="Listado de alertas"
      />

      {paginas > 1 && (
        <nav aria-label="Paginación" className="flex items-center justify-end gap-3 text-sm">
          <Button variante="secundario" onClick={() => setPagina(paginaActual - 1)} disabled={paginaActual === 0}>
            Anterior
          </Button>
          <span>
            Página {paginaActual + 1} de {paginas}
          </span>
          <Button variante="secundario" onClick={() => setPagina(paginaActual + 1)} disabled={paginaActual >= paginas - 1}>
            Siguiente
          </Button>
        </nav>
      )}
    </div>
  );
}
