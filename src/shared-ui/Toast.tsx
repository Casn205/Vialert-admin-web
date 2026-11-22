import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type TipoToast = 'ok' | 'error' | 'info';
interface ToastItem {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

interface ToastApi {
  mostrar: (tipo: TipoToast, mensaje: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const COLOR: Record<TipoToast, string> = {
  ok: 'border-ok',
  error: 'border-critico',
  info: 'border-info',
};

let siguienteId = 1;

export function ToastProvider({ children, duracionMs = 5000 }: { children: ReactNode; duracionMs?: number }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const quitar = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const mostrar = useCallback(
    (tipo: TipoToast, mensaje: string) => {
      const id = siguienteId++;
      setItems((l) => [...l, { id, tipo, mensaje }]);
      setTimeout(() => quitar(id), duracionMs);
    },
    [quitar, duracionMs],
  );
  const api = useMemo(() => ({ mostrar }), [mostrar]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tipo === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-md border-l-4 bg-superficie px-3 py-2.5 text-sm shadow-lg ${COLOR[t.tipo]}`}
          >
            <span>{t.mensaje}</span>
            <button type="button" onClick={() => quitar(t.id)} aria-label="Cerrar aviso" className="text-tinta-suave hover:text-tinta">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
