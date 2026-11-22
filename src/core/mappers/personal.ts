import type { Personal, TipoPersonal } from '../domain/personal';
import { advertir, texto, uno, type Doc } from './util';

/** `personal/{conductores|paramedicos}/items/{id}` → `Personal`. */
export function mapPersonal(tipo: TipoPersonal, id: string, d: Doc): Personal {
  const estado = uno(d.estado, ['disponible', 'ocupado'] as const);
  if (!estado) advertir(`Personal ${id}: estado desconocido, se usa 'disponible'`, d.estado);
  return {
    id,
    tipo,
    nombre: texto(d.nombre) ?? '',
    apellido: texto(d.apellido) ?? '',
    cedula: texto(d.cedula) ?? '',
    entidadId: texto(d.entidadId) ?? '',
    estado: estado ?? 'disponible',
    ambulanciaId: texto(d.ambulanciaId),
    telefono: tipo === 'paramedico' ? (texto(d.telefono) ?? '') : null,
  };
}
