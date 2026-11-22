import type { ReactNode } from 'react';

interface Props {
  /** `id` del control; enlaza la etiqueta y los mensajes. */
  htmlFor: string;
  label: string;
  error?: string;
  ayuda?: string;
  children: ReactNode;
}

export function FormField({ htmlFor, label, error, ayuda, children }: Props) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {ayuda && !error && <p id={`${htmlFor}-ayuda`} className="text-xs text-tinta-suave">{ayuda}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-critico">
          {error}
        </p>
      )}
    </div>
  );
}
