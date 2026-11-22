import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ETIQUETA_ESTADO_ALERTA, ETIQUETA_PRIORIDAD, type Alerta } from '@/core/domain/alerta';
import { formatoDuracion } from '@/core/domain/alerta-duraciones';
import { esperaSeg, ETIQUETA_SIN_PRIORIDAD } from '@/core/domain/alerta-vista';
import { ETIQUETA_ESTADO_UNIDAD, etiquetaUnidad, textoPersonal, type UnidadVista } from '@/core/domain/flota';
import { useDeps } from '@/lib/deps-context';
import { haceCuanto } from '@/lib/format';
import { mensajeDe } from '@/lib/use-suscripcion';
import { Badge, Button, ConfirmDialog, tonoEstadoAlerta, tonoEstadoUnidad, tonoPrioridad, useToast } from '@/shared-ui';

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-tinta-suave">{etiqueta}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

const Tarjeta = ({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) => (
  <section className="space-y-2 rounded-lg border border-primario/40 bg-superficie p-3 shadow-sm" aria-label={titulo}>
    <div className="flex items-start justify-between gap-2">
      <h3 className="font-semibold">{titulo}</h3>
      <button type="button" onClick={onCerrar} aria-label="Cerrar detalle" className="text-tinta-suave hover:text-tinta">
        ×
      </button>
    </div>
    {children}
  </section>
);

/** Detalle de la unidad elegida, con la acción "Cerrar turno" para turnos colgados. */
export function DetalleUnidad({
  unidad,
  alertas,
  ahora,
  onCerrar,
}: {
  unidad: UnidadVista;
  alertas: readonly Alerta[];
  ahora: Date;
  onCerrar: () => void;
}) {
  const { ambulancias } = useDeps();
  const toast = useToast();
  const [confirmando, setConfirmando] = useState(false);
  const { ambulancia, ubicacion: u } = unidad;
  const alertaId = u.alertaId ?? ambulancia?.currentAlertaId ?? null;
  const alerta = alertaId ? alertas.find((a) => a.id === alertaId) : undefined;
  const puedeCerrarTurno = unidad.turnoColgado;

  async function cerrarTurno() {
    try {
      await ambulancias.cerrarTurno(unidad.id);
      toast.mostrar('ok', `Turno de ${etiquetaUnidad(unidad)} cerrado.`);
      onCerrar();
    } catch (e) {
      toast.mostrar('error', mensajeDe(e, 'No se pudo cerrar el turno.'));
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <Tarjeta titulo={etiquetaUnidad(unidad)} onCerrar={onCerrar}>
      <div className="flex flex-wrap gap-1.5">
        <Badge tono={tonoEstadoUnidad(unidad.estado)}>{ETIQUETA_ESTADO_UNIDAD[unidad.estado]}</Badge>
        {unidad.turnoColgado && <Badge tono="sinSenal">Sin señal en turno</Badge>}
        {!ambulancia && <Badge>Sin datos de la unidad</Badge>}
      </div>
      <dl className="space-y-1">
        <Dato etiqueta="Placa">{ambulancia?.placa ?? 'Sin dato'}</Dato>
        <Dato etiqueta="Código interno">{ambulancia?.codigoInterno ?? 'Sin dato'}</Dato>
        <Dato etiqueta="Entidad">{ambulancia?.entidadId || 'Sin dato'}</Dato>
        <Dato etiqueta="Personal a bordo">{textoPersonal(unidad)}</Dato>
        <Dato etiqueta="Velocidad">{u.velocidadKmh === null ? 'Sin dato' : `${Math.round(u.velocidadKmh)} km/h`}</Dato>
        <Dato etiqueta="Alerta asignada">
          {alertaId ? (
            <Link to={`/alertas/${alertaId}`} className="text-primario underline">
              {alerta ? alerta.type : 'Ver alerta'}
            </Link>
          ) : (
            'Ninguna'
          )}
        </Dato>
        <Dato etiqueta="Última actualización">{haceCuanto(u.actualizadoAt, ahora)}</Dato>
        <Dato etiqueta="Versión de la app">{u.appVersion ?? 'Sin dato'}</Dato>
      </dl>
      {puedeCerrarTurno && (
        <>
          <p className="text-xs text-tinta-suave">
            Esta unidad está de turno pero no publica su ubicación. Si su app se cerró sin liberar al personal, puedes cerrar el turno desde aquí.
          </p>
          <Button variante="peligro" className="w-full" onClick={() => setConfirmando(true)}>
            Cerrar turno
          </Button>
          <ConfirmDialog
            abierto={confirmando}
            titulo={`¿Cerrar el turno de ${etiquetaUnidad(unidad)}?`}
            mensaje="Úsalo solo si la unidad lleva tiempo sin señal. La unidad quedará habilitada y fuera de turno, y su personal quedará disponible. Si la app sigue abierta, volverá a publicar su ubicación. No se puede cerrar si tiene una alerta en curso."
            confirmar="Cerrar turno"
            peligro
            onConfirmar={cerrarTurno}
            onCancelar={() => setConfirmando(false)}
          />
        </>
      )}
    </Tarjeta>
  );
}

export function DetalleAlertaMapa({ alerta, ahora, onCerrar }: { alerta: Alerta; ahora: Date; onCerrar: () => void }) {
  return (
    <Tarjeta titulo={alerta.type} onCerrar={onCerrar}>
      <div className="flex flex-wrap gap-1.5">
        <Badge tono={tonoPrioridad(alerta.prioridad)}>{alerta.prioridad ? ETIQUETA_PRIORIDAD[alerta.prioridad] : ETIQUETA_SIN_PRIORIDAD}</Badge>
        <Badge tono={tonoEstadoAlerta(alerta.estado)}>{ETIQUETA_ESTADO_ALERTA[alerta.estado]}</Badge>
      </div>
      <p className="text-sm">{alerta.description}</p>
      <dl className="space-y-1">
        <Dato etiqueta="Tiempo de espera">{formatoDuracion(esperaSeg(alerta, ahora))}</Dato>
        <Dato etiqueta="Ambulancia">{alerta.ambulanciaAsignada ? 'Asignada' : 'Sin asignar'}</Dato>
      </dl>
      <Link to={`/alertas/${alerta.id}`} className="inline-block text-sm text-primario underline">
        Ver detalle y línea de tiempo
      </Link>
    </Tarjeta>
  );
}
