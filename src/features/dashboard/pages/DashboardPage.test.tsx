import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Deps } from '@/core/ports';
import type { KpiResumen } from '@/core/domain/kpi';
import { createMockDeps } from '@/infrastructure/mock/mock-deps';
import { DepsProvider } from '@/lib/deps-context';
import DashboardPage from './DashboardPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function montar(deps: Deps) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <DepsProvider deps={deps}>
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    </DepsProvider>,
  );
}

/** Repositorio de KPI de ejemplo con otra descarga de CSV (el spread no copia métodos de una clase). */
function conCsv(kpis: Deps['kpis'], descargarAlertasCsv: Deps['kpis']['descargarAlertasCsv']): Deps['kpis'] {
  return {
    resumen: (f) => kpis.resumen(f),
    series: (f) => kpis.series(f),
    ranking: (f) => kpis.ranking(f),
    descargarAlertasCsv,
  };
}

const vacia = { n: 0, media: null, mediana: null, p90: null };
const resumenVacio: KpiResumen = {
  rango: { desde: '', hasta: '' },
  totalAlertas: 0,
  porEstado: { activa: 0, enProceso: 0, atendida: 0 },
  tiempos: { asignacion: vacia, respuesta: vacia, viaje: vacia, enEscena: vacia, traslado: vacia, cicloTotal: vacia },
  precisionEta: { n: 0, errorRelativoMedio: null },
  cumplimientoRespuesta: { umbralSeg: 600, n: 0, porcentaje: null },
  operacion: { liberaciones: 0, recalculosPromedio: null, alertasConFotos: 0 },
  descartadas: { simuladas: 0, sinDato: {}, anomalias: 0 },
};

describe('Dashboard', () => {
  it('con datos de ejemplo muestra tarjetas, gráficas, rankings y los avisos fijos', async () => {
    montar(createMockDeps({ movimiento: false }));
    expect(await screen.findByText('Total de alertas')).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Alertas por día' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Hospitales' })).toBeInTheDocument();
    expect(screen.getByText(/anteriores a la instrumentación/)).toBeInTheDocument();
    expect(screen.getByText(/no por GPS/)).toBeInTheDocument();
  });

  it('muestra "Sin dato" (no cero) donde n = 0', async () => {
    const base = createMockDeps({ movimiento: false });
    montar({
      ...base,
      kpis: {
        resumen: async () => resumenVacio,
        series: async () => [],
        ranking: async () => [],
        descargarAlertasCsv: async () => new Blob([]),
      },
    });
    const tarjeta = (await screen.findByText('Tiempo de respuesta')).closest('div')!;
    expect(within(tarjeta).getByText('Sin dato')).toBeInTheDocument();
    expect(within(await screen.findByRole('region', { name: 'Ambulancias' })).getByText('Sin dato')).toBeInTheDocument();
  });

  it('exporta el CSV del rango elegido con un nombre de archivo con las fechas', async () => {
    const base = createMockDeps({ movimiento: false });
    const descargarAlertasCsv = vi.fn(async () => new Blob(['id\r\n']));
    // jsdom no implementa createObjectURL: se simula la descarga.
    URL.createObjectURL = vi.fn(() => 'blob:csv');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toMatch(/^alertas_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/);
    });
    montar({ ...base, kpis: conCsv(base.kpis, descargarAlertasCsv) });

    fireEvent.click(await screen.findByRole('button', { name: 'Exportar CSV' }));

    await vi.waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(descargarAlertasCsv).toHaveBeenCalledWith(expect.objectContaining({ incluirSimuladas: false }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:csv');
  });

  it('avisa si la exportación falla', async () => {
    const base = createMockDeps({ movimiento: false });
    montar({
      ...base,
      kpis: conCsv(base.kpis, async () => Promise.reject(new Error('Sin conexión con el servidor.'))),
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Exportar CSV' }));

    expect(await screen.findByText('Sin conexión con el servidor.')).toBeInTheDocument();
  });
});
