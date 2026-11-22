export type TipoPersonal = 'conductor' | 'paramedico';
export type EstadoPersonal = 'disponible' | 'ocupado';

export const ETIQUETA_TIPO_PERSONAL: Record<TipoPersonal, string> = {
  conductor: 'Conductor',
  paramedico: 'Paramédico',
};

export interface Personal {
  id: string;
  tipo: TipoPersonal;
  nombre: string;
  apellido: string;
  cedula: string;
  /** Texto libre (hay datos como "1" o "ninguno"). */
  entidadId: string;
  /** Lo gestiona la app: en la web es solo lectura. */
  estado: EstadoPersonal;
  /** Lo gestiona la app: en la web es solo lectura. */
  ambulanciaId: string | null;
  /** Solo paramédicos. */
  telefono: string | null;
}

export interface NuevoPersonal {
  tipo: TipoPersonal;
  nombre: string;
  apellido: string;
  cedula: string;
  entidadId: string;
  telefono?: string;
}

/** Campos que la web puede editar (nunca `estado` ni `ambulanciaId`). */
export type CamposEditablesPersonal = Partial<
  Pick<Personal, 'nombre' | 'apellido' | 'cedula' | 'entidadId' | 'telefono'>
>;

export function nombreCompleto(p: Pick<Personal, 'nombre' | 'apellido'>): string {
  return `${p.nombre} ${p.apellido}`.trim();
}
