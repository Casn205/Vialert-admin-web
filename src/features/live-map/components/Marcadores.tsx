import { AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { Alerta } from '@/core/domain/alerta';
import { colorDePrioridad, esperaSeg } from '@/core/domain/alerta-vista';
import { COLOR_ESTADO_UNIDAD, ETIQUETA_ESTADO_UNIDAD, etiquetaUnidad, type UnidadVista } from '@/core/domain/flota';
import type { Hospital } from '@/core/domain/hospital';
import { formatoDuracion } from '@/core/domain/alerta-duraciones';

/** Círculo de color con una flecha que gira según el rumbo (sin rumbo: solo el círculo). */
function IconoUnidad({ unidad, seleccionada }: { unidad: UnidadVista; seleccionada: boolean }) {
  const color = COLOR_ESTADO_UNIDAD[unidad.estado];
  const rumbo = unidad.ubicacion.rumbo;
  return (
    <svg
      width={seleccionada ? 40 : 32}
      height={seleccionada ? 40 : 32}
      viewBox="-16 -16 32 32"
      aria-hidden
      style={{ transform: `rotate(${rumbo ?? 0}deg)`, transition: 'transform 1s linear', opacity: unidad.sinSenal ? 0.85 : 1 }}
    >
      <circle r="12" fill={color} stroke="#fff" strokeWidth={seleccionada ? 3 : 2} strokeDasharray={unidad.sinSenal ? '4 3' : undefined} />
      {rumbo !== null ? (
        <path d="M0 -8 L5 4 L0 1.5 L-5 4 Z" fill="#fff" />
      ) : (
        <path d="M-5 0 H5 M0 -5 V5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function MarcadoresUnidades({
  unidades,
  seleccionada,
  onElegir,
}: {
  unidades: readonly UnidadVista[];
  seleccionada: string | null;
  onElegir: (id: string) => void;
}) {
  return unidades.map((u) => (
    <AdvancedMarker
      key={u.id}
      position={u.ubicacion}
      title={`${etiquetaUnidad(u)} · ${ETIQUETA_ESTADO_UNIDAD[u.estado]}`}
      zIndex={u.id === seleccionada ? 1000 : u.turnoColgado ? 500 : 100}
      onClick={() => onElegir(u.id)}
    >
      <IconoUnidad unidad={u} seleccionada={u.id === seleccionada} />
    </AdvancedMarker>
  ));
}

/** Pin distinto al de las ambulancias; el color es la prioridad. El texto flotante incluye el tiempo de espera. */
export function MarcadoresAlertas({
  alertas,
  ahora,
  seleccionada,
  onElegir,
}: {
  alertas: readonly Alerta[];
  ahora: Date;
  seleccionada: string | null;
  onElegir: (id: string) => void;
}) {
  return alertas.map((a) => {
    const color = colorDePrioridad(a.prioridad);
    const espera = esperaSeg(a, ahora);
    return (
      <AdvancedMarker
        key={a.id}
        position={a}
        zIndex={a.id === seleccionada ? 900 : 200}
        title={`${a.type} · ${a.description} · espera ${formatoDuracion(espera)}`}
        onClick={() => onElegir(a.id)}
      >
        <Pin background={color} borderColor="#14212b" glyphColor="#fff" scale={a.id === seleccionada ? 1.4 : 1} />
      </AdvancedMarker>
    );
  });
}

export function MarcadoresHospitales({ hospitales }: { hospitales: readonly Hospital[] }) {
  return hospitales.map((h) => (
    <AdvancedMarker key={h.id} position={h} title={h.nombre} zIndex={50}>
      <div className="flex size-6 items-center justify-center rounded-sm border-2 border-white bg-info text-xs font-bold text-white shadow">H</div>
    </AdvancedMarker>
  ));
}
