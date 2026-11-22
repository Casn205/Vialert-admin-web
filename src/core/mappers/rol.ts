import { ROLES, type RolUsuario } from '../domain/rol';
import { uno, type Doc } from './util';

/** `roles/{uid}` → rol, o `null` si el documento no existe o el rol es desconocido. */
export function mapRol(d: Doc | undefined): RolUsuario | null {
  return d ? uno(d.rol, ROLES) : null;
}
