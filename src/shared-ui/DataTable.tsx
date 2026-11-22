import type { ReactNode } from 'react';

export interface Columna<T> {
  encabezado: string;
  celda: (fila: T) => ReactNode;
  /** Clases extra de la celda (ancho, alineación). */
  clase?: string;
}

interface Props<T> {
  columnas: Columna<T>[];
  filas: readonly T[];
  clave: (fila: T) => string;
  /** Texto cuando no hay filas. */
  vacio?: string;
  onFila?: (fila: T) => void;
  descripcion?: string;
}

/** Tabla simple y accesible. Si es más ancha que la pantalla, se desplaza horizontalmente. */
export function DataTable<T>({ columnas, filas, clave, vacio = 'No hay datos para mostrar.', onFila, descripcion }: Props<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-borde bg-superficie">
      <table className="w-full min-w-max text-left text-sm">
        {descripcion && <caption className="sr-only">{descripcion}</caption>}
        <thead className="border-b border-borde bg-fondo text-xs font-semibold text-tinta-suave">
          <tr>
            {columnas.map((c) => (
              <th key={c.encabezado} scope="col" className={`px-4 py-2.5 ${c.clase ?? ''}`}>
                {c.encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borde">
          {filas.length === 0 && (
            <tr>
              <td colSpan={columnas.length} className="px-4 py-8 text-center text-tinta-suave">
                {vacio}
              </td>
            </tr>
          )}
          {filas.map((f) => (
            <tr
              key={clave(f)}
              onClick={onFila ? () => onFila(f) : undefined}
              className={onFila ? 'cursor-pointer hover:bg-fondo' : undefined}
            >
              {columnas.map((c) => (
                <td key={c.encabezado} className={`px-4 py-2.5 ${c.clase ?? ''}`}>
                  {c.celda(f)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
