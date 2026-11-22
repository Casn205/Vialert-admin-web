import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { AuthError, type AuthUser, type RolUsuario } from '@/core/domain/rol';
import { mapRol } from '@/core/mappers/rol';
import type { AuthService, Unsubscribe } from '@/core/ports';

const CREDENCIALES = new Set([
  'auth/invalid-credential',
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-email',
  'auth/missing-password',
]);

function traducir(e: unknown): AuthError {
  const code = (e as { code?: string }).code ?? '';
  if (CREDENCIALES.has(code)) return new AuthError('credenciales', 'Correo o contraseña incorrectos.');
  if (code === 'auth/user-disabled') return new AuthError('bloqueado', 'Esta cuenta está deshabilitada.');
  if (code === 'auth/too-many-requests') return new AuthError('bloqueado', 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
  if (code === 'auth/network-request-failed') return new AuthError('red', 'No hay conexión con el servidor. Revisa tu internet.');
  return new AuthError('desconocido', 'No se pudo iniciar sesión. Inténtalo de nuevo.');
}

export class FirebaseAuthService implements AuthService {
  constructor(
    private readonly auth: Auth,
    private readonly db: Firestore,
  ) {}

  onAuthChange(cb: (u: AuthUser | null) => void): Unsubscribe {
    return onAuthStateChanged(this.auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null));
  }

  async login(email: string, password: string): Promise<AuthUser> {
    try {
      const { user } = await signInWithEmailAndPassword(this.auth, email.trim(), password);
      return { uid: user.uid, email: user.email };
    } catch (e) {
      throw traducir(e);
    }
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  async obtenerRol(uid: string): Promise<RolUsuario | null> {
    const snap = await getDoc(doc(this.db, 'roles', uid));
    return mapRol(snap.exists() ? snap.data() : undefined);
  }

  async obtenerIdToken(): Promise<string> {
    const u = this.auth.currentUser;
    if (!u) throw new Error('No hay sesión');
    return u.getIdToken();
  }
}
