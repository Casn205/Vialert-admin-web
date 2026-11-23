import { useState } from 'react';
import type { FiltroKpi } from '@/core/domain/kpi';
import { useDeps } from '@/lib/deps-context';
import { mensajeDe } from '@/lib/use-suscripcion';
import { Button } from '@/shared-ui';

const dia = (d: Date) => d.toISOString().slice(0, 10);

/** Descarga un `Blob` como archivo desde el navegador. */
function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

/** Exporta las alertas del rango y filtros actuales (`GET /reportes/alertas.csv`). */
export function ExportarCsv({ filtro }: { filtro: FiltroKpi | null }) {
  const { kpis } = useDeps();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportar() {
    if (!filtro) return;
    setCargando(true);
    setError(null);
    try {
      descargar(await kpis.descargarAlertasCsv(filtro), `alertas_${dia(filtro.desde)}_${dia(filtro.hasta)}.csv`);
    } catch (e) {
      setError(mensajeDe(e, 'No se pudo exportar el CSV.'));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variante="secundario" cargando={cargando} disabled={!filtro} onClick={() => void exportar()}>
        Exportar CSV
      </Button>
      {error && (
        <p role="alert" className="text-xs text-critico">
          {error}
        </p>
      )}
    </div>
  );
}
