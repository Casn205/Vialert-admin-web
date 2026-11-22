import { duracionesDeAlerta, formatoDuracion } from '@/core/domain/alerta-duraciones';
import type { Alerta } from '@/core/domain/alerta';
import { formatoPorcentaje } from './format-alerta';

export function DuracionesAlerta({ alerta }: { alerta: Alerta }) {
  const d = duracionesDeAlerta(alerta);
  const filas: [string, string][] = [
    ['Asignación', formatoDuracion(d.asignacion)],
    ['Respuesta', formatoDuracion(d.respuesta)],
    ['Viaje', formatoDuracion(d.viaje)],
    ['Permanencia en escena', formatoDuracion(d.enEscena)],
    ['Traslado', formatoDuracion(d.traslado)],
    ['Ciclo total', formatoDuracion(d.cicloTotal)],
    ['Error del ETA inicial', formatoPorcentaje(d.errorEta)],
  ];
  return (
    <section aria-labelledby="duraciones-titulo" className="space-y-2 rounded-lg border border-borde bg-superficie p-4">
      <h2 id="duraciones-titulo" className="font-semibold">
        Duraciones
      </h2>
      {alerta.createdAtServer === null ? (
        <p className="text-sm text-tinta-suave">Esta alerta es anterior a la medición de tiempos: no tiene hora del servidor ni hitos.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {filas.map(([etiqueta, valor]) => (
              <div key={etiqueta}>
                <dt className="text-xs text-tinta-suave">{etiqueta}</dt>
                <dd className={`text-sm font-medium ${valor === 'Sin dato' ? 'text-tinta-suave' : ''}`}>{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-tinta-suave">
            La llegada puede declararse por temporizador y no por GPS: el tiempo de respuesta es una referencia.
          </p>
        </>
      )}
    </section>
  );
}
