import { AuthError, type AuthUser, type RolUsuario } from '@/core/domain/rol';
import type { AuthService, Unsubscribe } from '@/core/ports';

const CLAVE_SESION = 'ambulancias-web:mock-uid';

interface UsuarioMock extends AuthUser {
  password: string;
  rol: RolUsuario | null;
}

/** Usuarios del modo simulado. Documentados en el README. */
const USUARIOS: UsuarioMock[] = [
  { uid: 'mock-admin', email: 'admin@admin.com', password: 'admin123', rol: 'admin' },
  { uid: 'mock-amb', email: 'ambulancia@vialert.com', password: 'ambulancia123', rol: 'ambulancia' },
  { uid: 'mock-sinrol', email: 'sinrol@vialert.com', password: 'sinrol123', rol: null },
];

const leer = (): string | null => {
  try {
    return sessionStorage.getItem(CLAVE_SESION);
  } catch {
    return null;
  }
};
const guardar = (uid: string | null): void => {
  try {
    if (uid) sessionStorage.setItem(CLAVE_SESION, uid);
    else sessionStorage.removeItem(CLAVE_SESION);
  } catch {
    /* sin sessionStorage: la sesión simulada no persiste */
  }
};

const publico = (u: UsuarioMock): AuthUser => ({ uid: u.uid, email: u.email });

export class MockAuthService implements AuthService {
  private actual: UsuarioMock | null = USUARIOS.find((u) => u.uid === leer()) ?? null;
  private readonly oyentes = new Set<(u: AuthUser | null) => void>();

  onAuthChange(cb: (u: AuthUser | null) => void): Unsubscribe {
    this.oyentes.add(cb);
    queueMicrotask(() => {
      if (this.oyentes.has(cb)) cb(this.actual ? publico(this.actual) : null);
    });
    return () => {
      this.oyentes.delete(cb);
    };
  }

  private emitir(): void {
    const u = this.actual ? publico(this.actual) : null;
    for (const cb of [...this.oyentes]) cb(u);
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const u = USUARIOS.find((x) => x.email === email.trim().toLowerCase() && x.password === password);
    if (!u) throw new AuthError('credenciales', 'Correo o contraseña incorrectos.');
    this.actual = u;
    guardar(u.uid);
    this.emitir();
    return publico(u);
  }

  async logout(): Promise<void> {
    this.actual = null;
    guardar(null);
    this.emitir();
  }

  async obtenerRol(uid: string): Promise<RolUsuario | null> {
    return USUARIOS.find((u) => u.uid === uid)?.rol ?? null;
  }

  async obtenerIdToken(): Promise<string> {
    return 'mock-token';
  }
}
