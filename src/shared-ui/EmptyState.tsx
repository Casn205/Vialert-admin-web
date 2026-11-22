import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}

export function EmptyState({ titulo, descripcion, accion }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-borde bg-superficie px-6 py-12 text-center">
      <h2 className="text-base font-semibold">{titulo}</h2>
      {descripcion && <p className="max-w-md text-sm text-tinta-suave">{descripcion}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}
