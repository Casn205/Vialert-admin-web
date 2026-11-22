import { useMemo, useState } from 'react';
import { ETIQUETA_TIPO_PERSONAL, nombreCompleto, type Personal, type TipoPersonal } from '@/core/domain/personal';
import type { PersonalForm } from '@/core/schemas/personal';
import { enmascarar } from '@/lib/format';
import { mensajeDe } from '@/lib/use-suscripcion';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, Spinner, campoClase, useToast, type Columna } from '@/shared-ui';
import { useAmbulanciasPorId, usePersonal } from '../hooks/usePersonal';
import { PersonalDetalleModal } from './PersonalDetalleModal';
import { PersonalFormModal } from './PersonalFormModal';

type Edicion = { persona: Personal | null } | null;

/** Lista y gestión de un tipo de personal. Se monta una vez por tipo (`key={tipo}`). */
export function PersonalSeccion({ tipo }: { tipo: TipoPersonal }) {
  const { personal, cargando, error, crear, actualizar, eliminar } = usePersonal(tipo);
  const ambulancias = useAmbulanciasPorId();
  const { mostrar } = useToast();
  const [busqueda, setBusqueda] = useState('');
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [detalle, setDetalle] = useState<Personal | null>(null);
  const [aEliminar, setAEliminar] = useState<Personal | null>(null);

  const etiqueta = ETIQUETA_TIPO_PERSONAL[tipo].toLowerCase();
  const esParamedico = tipo === 'paramedico';

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es');
    if (!q) return personal;
    return personal.filter((p) => `${nombreCompleto(p)} ${p.cedula}`.toLocaleLowerCase('es').includes(q));
  }, [personal, busqueda]);

  async function guardar(d: PersonalForm) {
    const editando = edicion?.persona ?? null;
    try {
      if (editando) {
        await actualizar(tipo, editando.id, {
          nombre: d.nombre,
          apellido: d.apellido,
          cedula: d.cedula,
          entidadId: d.entidadId,
          ...(esParamedico ? { telefono: d.telefono } : {}),
        });
        mostrar('ok', 'Cambios guardados.');
      } else {
        await crear({
          tipo,
          nombre: d.nombre,
          apellido: d.apellido,
          cedula: d.cedula,
          entidadId: d.entidadId,
          ...(esParamedico ? { telefono: d.telefono } : {}),
        });
        mostrar('ok', `${ETIQUETA_TIPO_PERSONAL[tipo]} creado.`);
      }
      setEdicion(null);
    } catch (e) {
      mostrar('error', `No se pudo guardar. ${mensajeDe(e)}`);
      throw e;
    }
  }

  async function confirmarEliminar() {
    if (!aEliminar) return;
    try {
      await eliminar(tipo, aEliminar.id);
      mostrar('ok', `${ETIQUETA_TIPO_PERSONAL[tipo]} eliminado.`);
      setAEliminar(null);
    } catch (e) {
      mostrar('error', `No se pudo eliminar. ${mensajeDe(e)}`);
    }
  }

  const columnas: Columna<Personal>[] = [
    { encabezado: 'Nombre', celda: (p) => <span className="font-medium">{nombreCompleto(p)}</span> },
    { encabezado: 'Cédula', celda: (p) => <span className="tabular-nums">{enmascarar(p.cedula)}</span> },
    ...(esParamedico
      ? [{ encabezado: 'Teléfono', celda: (p: Personal) => <span className="tabular-nums">{enmascarar(p.telefono ?? '')}</span> }]
      : []),
    { encabezado: 'Entidad', celda: (p) => p.entidadId || 'Sin dato' },
    {
      encabezado: 'Estado',
      celda: (p) => (p.estado === 'ocupado' ? <Badge tono="aviso">En turno</Badge> : <Badge tono="ok">Disponible</Badge>),
    },
    {
      encabezado: 'Ambulancia',
      celda: (p) =>
        p.ambulanciaId ? (ambulancias.get(p.ambulanciaId)?.placa ?? <span className="text-tinta-suave">No encontrada</span>) : <span className="text-tinta-suave">Sin asignar</span>,
    },
    {
      encabezado: 'Acciones',
      clase: 'text-right',
      celda: (p) => (
        <div className="flex justify-end gap-1">
          <Button variante="texto" onClick={() => setDetalle(p)} aria-label={`Ver detalle de ${nombreCompleto(p)}`}>
            Ver
          </Button>
          <Button variante="texto" onClick={() => setEdicion({ persona: p })} aria-label={`Editar ${nombreCompleto(p)}`}>
            Editar
          </Button>
          <Button
            variante="texto"
            className="text-critico hover:bg-critico/10"
            disabled={p.estado === 'ocupado'}
            title={p.estado === 'ocupado' ? 'Está asignado a una ambulancia en turno' : undefined}
            onClick={() => setAEliminar(p)}
            aria-label={`Eliminar ${nombreCompleto(p)}`}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-xs flex-1">
          <label htmlFor={`buscar-${tipo}`} className="sr-only">
            Buscar por nombre o cédula
          </label>
          <input id={`buscar-${tipo}`} type="search" placeholder="Buscar por nombre o cédula" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className={campoClase} />
        </div>
        <Button onClick={() => setEdicion({ persona: null })}>Nuevo {etiqueta}</Button>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-critico/30 bg-critico/10 px-3 py-2 text-sm text-critico">
          No se pudo cargar la lista. {error.message}
        </p>
      )}

      {cargando ? (
        <Spinner etiqueta="Cargando personal" />
      ) : personal.length === 0 && !error ? (
        <EmptyState titulo={`Aún no hay ${etiqueta}s`} descripcion="Agrega el primero para poder asignarlo a una ambulancia desde la app." accion={<Button onClick={() => setEdicion({ persona: null })}>Nuevo {etiqueta}</Button>} />
      ) : (
        <DataTable columnas={columnas} filas={visibles} clave={(p) => p.id} vacio="Nadie coincide con la búsqueda." descripcion={`Lista de ${etiqueta}s`} />
      )}

      <PersonalFormModal abierto={edicion !== null} tipo={tipo} persona={edicion?.persona ?? null} onCerrar={() => setEdicion(null)} onGuardar={guardar} />
      <PersonalDetalleModal persona={detalle} placa={detalle?.ambulanciaId ? (ambulancias.get(detalle.ambulanciaId)?.placa ?? null) : null} onCerrar={() => setDetalle(null)} />
      <ConfirmDialog
        abierto={aEliminar !== null}
        titulo={`Eliminar ${etiqueta}`}
        mensaje={`Se eliminará a ${aEliminar ? nombreCompleto(aEliminar) : ''}. Esta acción no se puede deshacer.`}
        confirmar={`Eliminar ${etiqueta}`}
        peligro
        onConfirmar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </div>
  );
}
