import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '@/shared-ui';
import { useSession } from '../hooks/useSession';

/** Protege las rutas: solo deja pasar a administradores verificados. */
export function RequireAdmin() {
  const { estado } = useSession();
  const ubicacion = useLocation();

  if (estado === 'cargando') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner etiqueta="Verificando acceso" />
      </div>
    );
  }
  if (estado !== 'admin') {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
  }
  return <Outlet />;
}
