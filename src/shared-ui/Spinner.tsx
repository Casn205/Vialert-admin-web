export function Spinner({ etiqueta = 'Cargando' }: { etiqueta?: string }) {
  return (
    <span role="status" aria-label={etiqueta} className="inline-flex items-center gap-2 text-sm text-tinta-suave">
      <span className="size-4 rounded-full border-2 border-borde border-t-primario motion-safe:animate-spin" />
      <span className="sr-only">{etiqueta}</span>
    </span>
  );
}
