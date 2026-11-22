import { useState } from 'react';
import { Modal } from '@/shared-ui';

function Miniatura({ url, n, onAbrir }: { url: string; n: number; onAbrir: () => void }) {
  const [rota, setRota] = useState(false);
  if (rota) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-borde bg-fondo p-2 text-center text-xs text-tinta-suave">
        No se pudo cargar la foto {n}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`Ampliar la foto ${n}`}
      className="aspect-[4/3] overflow-hidden rounded-md border border-borde bg-fondo hover:opacity-90"
    >
      <img src={url} alt={`Foto ${n} de la alerta`} loading="lazy" onError={() => setRota(true)} className="size-full object-cover" />
    </button>
  );
}

/** Galería de solo lectura (máx. 3 fotos por alerta). Al hacer clic se amplía. */
export function FotosAlerta({ fotos }: { fotos: readonly string[] }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  return (
    <section aria-labelledby="fotos-titulo" className="space-y-2 rounded-lg border border-borde bg-superficie p-4">
      <h2 id="fotos-titulo" className="font-semibold">
        Fotos {fotos.length > 0 && <span className="font-normal text-tinta-suave">({fotos.length})</span>}
      </h2>
      {fotos.length === 0 ? (
        <p className="text-sm text-tinta-suave">El ciudadano no adjuntó fotos.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {fotos.map((url, i) => (
            <li key={`${i}-${url}`}>
              <Miniatura url={url} n={i + 1} onAbrir={() => setAbierta(i)} />
            </li>
          ))}
        </ul>
      )}
      <Modal abierto={abierta !== null} onCerrar={() => setAbierta(null)} titulo={abierta === null ? 'Foto' : `Foto ${abierta + 1} de ${fotos.length}`}>
        {abierta !== null && fotos[abierta] && <img src={fotos[abierta]} alt={`Foto ${abierta + 1} de la alerta, ampliada`} className="max-h-[70vh] w-full rounded-md object-contain" />}
      </Modal>
    </section>
  );
}
