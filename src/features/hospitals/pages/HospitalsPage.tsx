import { useMemo, useState } from 'react';
import type { Hospital } from '@/core/domain/hospital';
import type { HospitalForm } from '@/core/schemas/hospital';
import { mensajeDe } from '@/lib/use-suscripcion';
import { Button, ConfirmDialog, DataTable, EmptyState, Spinner, campoClase, useToast, type Columna } from '@/shared-ui';
import { HospitalFormModal } from '../components/HospitalFormModal';
import { useHospitales } from '../hooks/useHospitales';

type Edicion = { hospital: Hospital | null } | null;

export default function HospitalsPage() {
  const { hospitales, cargando, error, crear, actualizar, eliminar } = useHospitales();
  const { mostrar } = useToast();
  const [busqueda, setBusqueda] = useState('');
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [aEliminar, setAEliminar] = useState<Hospital | null>(null);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es');
    return q ? hospitales.filter((h) => h.nombre.toLocaleLowerCase('es').includes(q)) : hospitales;
  }, [hospitales, busqueda]);

  async function guardar(datos: HospitalForm) {
    const editando = edicion?.hospital ?? null;
    try {
      if (editando) {
        await actualizar(editando.id, datos);
        mostrar('ok', 'Cambios guardados.');
      } else {
        await crear(datos);
        mostrar('ok', 'Hospital creado.');
      }
      setEdicion(null);
    } catch (e) {
      mostrar('error', `No se pudo guardar el hospital. ${mensajeDe(e)}`);
      throw e;
    }
  }

  async function confirmarEliminar() {
    if (!aEliminar) return;
    try {
      await eliminar(aEliminar.id);
      mostrar('ok', 'Hospital eliminado.');
      setAEliminar(null);
    } catch (e) {
      mostrar('error', `No se pudo eliminar el hospital. ${mensajeDe(e)}`);
    }
  }

  const columnas: Columna<Hospital>[] = [
    { encabezado: 'Nombre', celda: (h) => <span className="font-medium">{h.nombre}</span> },
    {
      encabezado: 'Ubicación',
      celda: (h) => <span className="tabular-nums text-tinta-suave">{h.lat.toFixed(5)}, {h.lng.toFixed(5)}</span>,
    },
    {
      encabezado: 'Acciones',
      clase: 'text-right',
      celda: (h) => (
        <div className="flex justify-end gap-1">
          <Button variante="texto" onClick={() => setEdicion({ hospital: h })} aria-label={`Editar ${h.nombre}`}>
            Editar
          </Button>
          <Button variante="texto" className="text-critico hover:bg-critico/10" onClick={() => setAEliminar(h)} aria-label={`Eliminar ${h.nombre}`}>
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Hospitales</h1>
          <p className="text-sm text-tinta-suave">Destinos de traslado que se proponen a las ambulancias.</p>
        </div>
        <Button onClick={() => setEdicion({ hospital: null })}>Nuevo hospital</Button>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-critico/30 bg-critico/10 px-3 py-2 text-sm text-critico">
          No se pudieron cargar los hospitales. {error.message}
        </p>
      )}

      {cargando ? (
        <Spinner etiqueta="Cargando hospitales" />
      ) : hospitales.length === 0 && !error ? (
        <EmptyState
          titulo="Aún no hay hospitales"
          descripcion="Agrega el primero para que las ambulancias puedan proponer traslados."
          accion={<Button onClick={() => setEdicion({ hospital: null })}>Nuevo hospital</Button>}
        />
      ) : (
        <>
          <div className="max-w-xs">
            <label htmlFor="buscar-hospital" className="sr-only">
              Buscar por nombre
            </label>
            <input id="buscar-hospital" type="search" placeholder="Buscar por nombre" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className={campoClase} />
          </div>
          <DataTable columnas={columnas} filas={visibles} clave={(h) => h.id} vacio="Ningún hospital coincide con la búsqueda." descripcion="Lista de hospitales" />
        </>
      )}

      <HospitalFormModal abierto={edicion !== null} hospital={edicion?.hospital ?? null} onCerrar={() => setEdicion(null)} onGuardar={guardar} />

      <ConfirmDialog
        abierto={aEliminar !== null}
        titulo="Eliminar hospital"
        mensaje={`Se eliminará «${aEliminar?.nombre ?? ''}». Las alertas pasadas conservan el nombre del hospital al que se trasladaron. Esta acción no se puede deshacer.`}
        confirmar="Eliminar hospital"
        peligro
        onConfirmar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </div>
  );
}
