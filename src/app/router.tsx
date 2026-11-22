import { Navigate, type RouteObject } from 'react-router-dom';
import { RequireAdmin } from '@/features/auth';
import LoginPage from '@/features/auth/pages/LoginPage';
import { EmptyState, Spinner } from '@/shared-ui';
import { AppShell } from './layout/AppShell';

/** Carga diferida de la página por defecto de un módulo (mantiene liviano el arranque). */
const pagina = (cargar: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await cargar()).default,
});

const cargandoInicial = (
  <div className="flex min-h-screen items-center justify-center">
    <Spinner />
  </div>
);

/**
 * Todas las rutas de la aplicación, declaradas desde el inicio.
 * Cada fase reemplaza el contenido de su página; este archivo no cambia.
 */
export const rutas: RouteObject[] = [
  {
    hydrateFallbackElement: cargandoInicial,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAdmin />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="/mapa" replace /> },
              { path: 'mapa', lazy: pagina(() => import('@/features/live-map/pages/LiveMapPage')) },
              { path: 'alertas', lazy: pagina(() => import('@/features/alerts/pages/AlertsListPage')) },
              { path: 'alertas/:id', lazy: pagina(() => import('@/features/alerts/pages/AlertDetailPage')) },
              { path: 'ambulancias', lazy: pagina(() => import('@/features/ambulances/pages/AmbulancesPage')) },
              { path: 'personal', lazy: pagina(() => import('@/features/staff/pages/StaffPage')) },
              { path: 'hospitales', lazy: pagina(() => import('@/features/hospitals/pages/HospitalsPage')) },
              { path: 'dashboard', lazy: pagina(() => import('@/features/dashboard/pages/DashboardPage')) },
              {
                path: '*',
                element: <EmptyState titulo="Página no encontrada" descripcion="La dirección no existe. Usa el menú para volver a una sección." />,
              },
            ],
          },
        ],
      },
    ],
  },
];
