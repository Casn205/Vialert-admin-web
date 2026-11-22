import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  pie?: ReactNode;
}

/** Diálogo modal sobre `<dialog>` nativo: foco atrapado, cierre con Esc y clic en el fondo. */
export function Modal({ abierto, onCerrar, titulo, children, pie }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    }
    if (!abierto && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    }
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-titulo"
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCerrar();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg bg-superficie p-0 text-tinta shadow-xl"
    >
      {abierto && (
        <div className="flex flex-col gap-4 p-5">
          <h2 id="modal-titulo" className="text-lg font-semibold">
            {titulo}
          </h2>
          <div>{children}</div>
          {pie && <div className="flex justify-end gap-2">{pie}</div>}
        </div>
      )}
    </dialog>
  );
}
