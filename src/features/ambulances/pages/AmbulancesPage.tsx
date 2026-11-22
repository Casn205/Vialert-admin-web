import { useMemo, useState } from 'react';
import type { Ambulancia, CamposEditablesAmbulancia, EstadoOperativo, NuevoLote } from '@/core/domain/ambulancia';
import type { NuevaAmbulanciaForm } from '@/core/schemas/ambulancia';
import { esConflicto } from '@/lib/api-errors';
import { mensajeDe } from '@/lib/use-suscripcion';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, Spinner, campoClase, useToast, type Columna, type TonoBadge } from '@/shared-ui';
import { AmbulanciaFormModal } from '../components/AmbulanciaFormModal';
import { CrearFlotaModal } from '../components/CrearFlotaModal';
import { PasswordModal } from '../components/PasswordModal';
import { useAmbulancias } from '../hooks/useAmbulancias';

const ESTADO: Record<EstadoOperativo, { texto: string; tono: TonoBadge }> = {
  habilitada: { texto: 'Habilitada', tono: 'ok' },
  enRuta: { texto: 'En ruta', tono: 'critico' },
  enRutaHospital: { texto: 'Hacia hospital', tono: 'aviso' },
  inactiva: { texto: 'Deshabilitada', tono: 'neutro' },
};

type Edicion = { ambulancia: Ambulancia | null } | null;

export default function AmbulancesPage() {
  const a = useAmbulancias();
  const { mostrar } = useToast();
  const [busqueda, setBusqueda] = useState('');
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [flota, setFlota] = useState(false);
  const [paraPassword, setParaPassword] = useState<Ambulancia | null>(null);
  const [aDeshabilitar, setADeshabilitar] = useState<Ambulancia | null>(null);
  const [aCerrarTurno, setACerrarTurno] = useState<Ambulancia | null>(null);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es');
    if (!q) return a.ambulancias;
    return a.ambulancias.filter((x) =>
      [x.placa, x.codigoInterno, x.email, x.entidadId].some((t) => t.toLocaleLowerCase('es').includes(q)),
    );
  }, [a.ambulancias, busqueda]);

  /** Un conflicto (409) ya trae una frase completa de la API ("está en turno…"); el resto, el prefijo de la acción. */
  function avisarError(e: unknown, fallo: string) {
    mostrar('error', esConflicto(e) ? mensajeDe(e) : `${fallo} ${mensajeDe(e)}`);
  }

  async function crear(datos: NuevaAmbulanciaForm) {
    try {
      await a.crear(datos);
      mostrar('ok', 'Ambulancia creada.');
      setEdicion(null);
    } catch (e) {
      avisarError(e, 'No se pudo crear la ambulancia.');
      throw e;
    }
  }

  async function editar(id: string, datos: CamposEditablesAmbulancia) {
    try {
      await a.actualizar(id, datos);
      mostrar('ok', 'Cambios guardados.');
      setEdicion(null);
    } catch (e) {
      avisarError(e, 'No se pudo guardar la ambulancia.');
      throw e;
    }
  }

  async function crearFlota(datos: NuevoLote) {
    try {
      return await a.crearLote(datos);
    } catch (e) {
      avisarError(e, 'No se pudo crear la flota.');
      throw e;
    }
  }

  async function cambiarPassword(id: string, password: string) {
    try {
      await a.resetearPassword(id, password);
      mostrar('ok', 'Contraseña actualizada.');
      setParaPassword(null);
    } catch (e) {
      avisarError(e, 'No se pudo cambiar la contraseña.');
      throw e;
    }
  }

  async function deshabilitar() {
    if (!aDeshabilitar) return;
    try {
      await a.deshabilitar(aDeshabilitar.id);
      mostrar('ok', 'Ambulancia deshabilitada.');
    } catch (e) {
      avisarError(e, 'No se pudo deshabilitar la ambulancia.');
    }
    setADeshabilitar(null);
  }

  async function habilitar(x: Ambulancia) {
    try {
      await a.habilitar(x.id);
      mostrar('ok', 'Ambulancia habilitada.');
    } catch (e) {
      avisarError(e, 'No se pudo habilitar la ambulancia.');
    }
  }

  async function cerrarTurno() {
    if (!aCerrarTurno) return;
    try {
      await a.cerrarTurno(aCerrarTurno.id);
      mostrar('ok', 'Turno cerrado.');
    } catch (e) {
      avisarError(e, 'No se pudo cerrar el turno.');
    }
    setACerrarTurno(null);
  }

  const columnas: Columna<Ambulancia>[] = [
    { encabezado: 'Placa', celda: (x) => <span className="font-medium">{x.placa}</span> },
    { encabezado: 'Código', celda: (x) => x.codigoInterno },
    { encabezado: 'Entidad', celda: (x) => x.entidadId || <span className="text-tinta-suave">Sin dato</span> },
    { encabezado: 'Correo', celda: (x) => <span className="text-tinta-suave">{x.email}</span> },
    {
      encabezado: 'Estado',
      celda: (x) => {
        const e = ESTADO[x.estadoOperativo];
        return <Badge tono={e.tono}>{e.texto}</Badge>;
      },
    },
    {
      encabezado: 'Turno',
      celda: (x) => <Badge tono={x.enTurno ? 'info' : 'neutro'}>{x.enTurno ? 'En turno' : 'Fuera de turno'}</Badge>,
    },
    {
      encabezado: 'Acciones',
      clase: 'text-right',
      celda: (x) => (
        <div className="flex justify-end gap-1">
          <Button variante="texto" onClick={() => setEdicion({ ambulancia: x })} aria-label={`Editar ${x.placa}`}>
            Editar
          </Button>
          <Button variante="texto" onClick={() => setParaPassword(x)} aria-label={`Cambiar contraseña de ${x.placa}`}>
            Contraseña
          </Button>
          {x.estadoOperativo === 'inactiva' ? (
            <Button variante="texto" onClick={() => void habilitar(x)} aria-label={`Habilitar ${x.placa}`}>
              Habilitar
            </Button>
          ) : (
            <Button variante="texto" className="text-critico hover:bg-critico/10" onClick={() => setADeshabilitar(x)} aria-label={`Deshabilitar ${x.placa}`}>
              Deshabilitar
            </Button>
          )}
          {x.enTurno && (
            <Button variante="texto" className="text-critico hover:bg-critico/10" onClick={() => setACerrarTurno(x)} aria-label={`Cerrar turno de ${x.placa}`}>
              Cerrar turno
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Ambulancias</h1>
          <p className="text-sm text-tinta-suave">Cuentas y datos de las unidades. El estado y el turno los gestiona la app de cada ambulancia.</p>
        </div>
        <div className="flex gap-2">
          <Button variante="secundario" onClick={() => setFlota(true)}>
            Crear flota
          </Button>
          <Button onClick={() => setEdicion({ ambulancia: null })}>Nueva ambulancia</Button>
        </div>
      </div>

      {a.error && (
        <p role="alert" className="rounded-md border border-critico/30 bg-critico/10 px-3 py-2 text-sm text-critico">
          No se pudieron cargar las ambulancias. {a.error.message}
        </p>
      )}

      {a.cargando ? (
        <Spinner etiqueta="Cargando ambulancias" />
      ) : a.ambulancias.length === 0 && !a.error ? (
        <EmptyState
          titulo="Aún no hay ambulancias"
          descripcion="Crea la primera, o varias de una vez con «Crear flota»."
          accion={<Button onClick={() => setEdicion({ ambulancia: null })}>Nueva ambulancia</Button>}
        />
      ) : (
        <>
          <div className="max-w-xs">
            <label htmlFor="buscar-ambulancia" className="sr-only">
              Buscar ambulancia
            </label>
            <input id="buscar-ambulancia" type="search" placeholder="Buscar por placa, código, correo o entidad" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className={campoClase} />
          </div>
          <DataTable columnas={columnas} filas={visibles} clave={(x) => x.id} vacio="Ninguna ambulancia coincide con la búsqueda." descripcion="Lista de ambulancias" />
        </>
      )}

      <AmbulanciaFormModal abierto={edicion !== null} ambulancia={edicion?.ambulancia ?? null} onCerrar={() => setEdicion(null)} onCrear={crear} onEditar={editar} />
      <CrearFlotaModal abierto={flota} onCerrar={() => setFlota(false)} onCrear={crearFlota} />
      <PasswordModal ambulancia={paraPassword} onCerrar={() => setParaPassword(null)} onGuardar={cambiarPassword} />

      <ConfirmDialog
        abierto={aDeshabilitar !== null}
        titulo={`Deshabilitar ${aDeshabilitar?.placa ?? ''}`}
        mensaje="La cuenta de la ambulancia no podrá iniciar sesión hasta que la habilites de nuevo. Sus alertas pasadas se conservan. Solo se puede deshabilitar una unidad que no esté en turno."
        confirmar="Deshabilitar ambulancia"
        peligro
        onConfirmar={deshabilitar}
        onCancelar={() => setADeshabilitar(null)}
      />

      <ConfirmDialog
        abierto={aCerrarTurno !== null}
        titulo={`Cerrar turno de ${aCerrarTurno?.placa ?? ''}`}
        mensaje="Úsalo solo si la unidad lleva tiempo sin señal (turno colgado): se libera a su conductor y paramédico y se quita su ubicación del mapa. Si la app sigue abierta, volverá a publicar su ubicación. No se puede cerrar un turno con una alerta en curso."
        confirmar="Cerrar turno"
        peligro
        onConfirmar={cerrarTurno}
        onCancelar={() => setACerrarTurno(null)}
      />
    </div>
  );
}
