import { EmptyState } from './EmptyState';

/** Página de relleno para las rutas que se implementan en fases posteriores. */
export function PlaceholderPage({ titulo, fase }: { titulo: string; fase: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{titulo}</h1>
      <EmptyState titulo="Esta sección aún no está disponible" descripcion={`Se construye en ${fase} del plan.`} />
    </div>
  );
}
