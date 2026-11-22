import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AuthUser } from '@/core/domain/rol';
import { useDeps } from '@/lib/deps-context';

export type EstadoSesion = 'cargando' | 'anonimo' | 'admin';

interface Sesion {
  estado: EstadoSesion;
  user: AuthUser | null;
  /** Motivo por el que se cerró la sesión (sin permisos, error al verificar). */
  aviso: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SesionContext = createContext<Sesion | null>(null);

/**
 * Mantiene la sesión. Un usuario autenticado en Firebase solo entra si
 * `roles/{uid}.rol === 'admin'`; si no, se cierra su sesión y se le avisa.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { auth } = useDeps();
  const [estado, setEstado] = useState<EstadoSesion>('cargando');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const version = useRef(0);

  useEffect(() => {
    return auth.onAuthChange(async (u) => {
      const miVersion = ++version.current;
      if (!u) {
        setUser(null);
        setEstado('anonimo');
        return;
      }
      setEstado('cargando');
      try {
        const rol = await auth.obtenerRol(u.uid);
        if (miVersion !== version.current) return;
        if (rol === 'admin') {
          setUser(u);
          setAviso(null);
          setEstado('admin');
          return;
        }
        setAviso('Tu cuenta no tiene permisos de administrador.');
      } catch {
        if (miVersion !== version.current) return;
        setAviso('No se pudo verificar tu rol. Inténtalo de nuevo.');
      }
      await auth.logout().catch(() => {});
      if (miVersion === version.current) {
        setUser(null);
        setEstado('anonimo');
      }
    });
  }, [auth]);

  const login = useCallback(
    async (email: string, password: string) => {
      setAviso(null);
      await auth.login(email, password); // lanza AuthError con mensaje en español
    },
    [auth],
  );
  const logout = useCallback(() => auth.logout(), [auth]);

  const valor = useMemo(() => ({ estado, user, aviso, login, logout }), [estado, user, aviso, login, logout]);
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSession(): Sesion {
  const s = useContext(SesionContext);
  if (!s) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return s;
}
