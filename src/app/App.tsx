import { useMemo } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { rutas } from './router';

export function App() {
  const router = useMemo(() => createBrowserRouter(rutas), []);
  return <RouterProvider router={router} />;
}
