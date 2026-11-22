export type EstadoOperativo = 'habilitada' | 'enRuta' | 'enRutaHospital' | 'inactiva';
export const ESTADOS_OPERATIVOS: readonly EstadoOperativo[] = [
  'habilitada',
  'enRuta',
  'enRutaHospital',
  'inactiva',
];

export interface Ambulancia {
  /** uid de Firebase Auth. */
  id: string;
  email: string;
  placa: string;
  codigoInterno: string;
  /** Texto libre en MAYÚSCULAS. No referencia a `hospitales`. */
  entidadId: string;
  /** Ojo: al iniciar turno la app lo pone en `enRuta` aunque esté libre. */
  estadoOperativo: EstadoOperativo;
  currentConductorId: string | null;
  currentParamedicoId: string | null;
  currentAlertaId: string | null;
  enTurno: boolean;
  turnoIniciadoAt: Date | null;
  ultimoCambioEstadoAt: Date | null;
  createdAt: Date | null;
}

export interface NuevaAmbulancia {
  email: string;
  placa: string;
  codigoInterno: string;
  entidadId: string;
}

export interface FilaLote {
  placa: string;
  codigoInterno: string;
  email: string;
}

export interface NuevoLote {
  entidadId: string;
  estadoOperativo: 'habilitada' | 'inactiva';
  password: string;
  filas: FilaLote[];
}

/** Resultado de una fila del lote (`fila` es el índice en la lista enviada). */
export interface ResultadoFila {
  fila: number;
  ok: boolean;
  id?: string;
  error?: string;
}

export type CamposEditablesAmbulancia = Partial<
  Pick<Ambulancia, 'placa' | 'codigoInterno' | 'entidadId'>
>;
