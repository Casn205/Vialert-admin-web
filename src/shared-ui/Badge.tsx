import type { ReactNode } from 'react';

export type TonoBadge = 'neutro' | 'ok' | 'critico' | 'aviso' | 'info' | 'sinSenal';

const TONOS: Record<TonoBadge, string> = {
  neutro: 'bg-fondo text-tinta-suave ring-borde',
  ok: 'bg-ok/10 text-ok ring-ok/30',
  critico: 'bg-critico/10 text-critico ring-critico/30',
  aviso: 'bg-aviso/10 text-aviso ring-aviso/30',
  info: 'bg-info/10 text-info ring-info/30',
  sinSenal: 'bg-sin-senal/10 text-sin-senal ring-sin-senal/30',
};

export function Badge({ tono = 'neutro', children }: { tono?: TonoBadge; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONOS[tono]}`}>
      {children}
    </span>
  );
}
