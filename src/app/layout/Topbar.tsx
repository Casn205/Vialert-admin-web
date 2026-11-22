import { useLocation } from 'react-router-dom';
import { useSession } from '@/features/auth';
import { useDeps } from '@/lib/deps-context';
import { Badge, Button } from '@/shared-ui';
import { tituloDe } from '../nav';

export function Topbar() {
  const { pathname } = useLocation();
  const { user, logout } = useSession();
  const { fuente } = useDeps();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-borde bg-superficie px-5 py-3">
      <p className="text-sm font-medium text-tinta-suave">{tituloDe(pathname)}</p>
      <div className="flex items-center gap-3">
        {fuente === 'mock' && <Badge tono="aviso">Datos simulados</Badge>}
        <span className="text-sm text-tinta-suave">{user?.email}</span>
        <Button variante="secundario" onClick={() => void logout()}>
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
