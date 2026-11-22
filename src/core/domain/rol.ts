export type RolUsuario = 'usuario' | 'ambulancia' | 'admin';
export const ROLES: readonly RolUsuario[] = ['usuario', 'ambulancia', 'admin'];

export interface AuthUser {
  uid: string;
  email: string | null;
}

export type CodigoAuthError = 'credenciales' | 'bloqueado' | 'red' | 'desconocido';

/** Error de autenticación ya traducido: la UI no conoce los códigos de Firebase. */
export class AuthError extends Error {
  readonly codigo: CodigoAuthError;
  constructor(codigo: CodigoAuthError, message: string) {
    super(message);
    this.name = 'AuthError';
    this.codigo = codigo;
  }
}
