import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primario' | 'secundario' | 'peligro' | 'texto';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primario text-white hover:bg-primario-oscuro',
  secundario: 'border border-borde bg-superficie text-tinta hover:bg-fondo',
  peligro: 'bg-critico text-white hover:brightness-90',
  texto: 'text-primario hover:bg-primario/10',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
}

export function Button({ variante = 'primario', cargando = false, disabled, className = '', children, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${className}`}
      {...rest}
    >
      {cargando && <span className="size-3.5 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
