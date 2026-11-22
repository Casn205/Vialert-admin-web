import { act, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockDeps } from '@/infrastructure/mock/mock-deps';
import { renderConDeps } from '@/test/render';
import LiveMapPage from './pages/LiveMapPage';
import { estadoInicial, useMapFilters } from './store/map-filters';

// Mapa de mentira: dibuja un elemento por marcador para poder contarlos sin cargar Google Maps.
vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Map: ({ children }: { children: ReactNode }) => <div data-testid="mapa">{children}</div>,
  AdvancedMarker: ({ title, children }: { title?: string; children?: ReactNode }) => (
    <div data-testid="marcador" title={title}>
      {children}
    </div>
  ),
  Pin: () => <span data-testid="pin" />,
  useMap: () => null,
}));

beforeEach(() => {
  useMapFilters.setState(estadoInicial);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const panel = () => within(screen.getByRole('complementary', { name: 'Panel del mapa' }));
const flota = () => within(panel().getByRole('heading', { name: /Unidades en el mapa/ }).closest('section')!);
const resumen = (etiqueta: string) => within(panel().getByLabelText('Resumen')).getByText(etiqueta).closest('div')!.querySelector('dd')!.textContent;

async function abrir(deps = createMockDeps({ movimiento: false })) {
  const r = renderConDeps(<LiveMapPage />, { deps });
  await panel().findByText('Unidades en el mapa (4)');
  return r;
}

describe('LiveMapPage: panel (sin clave de Google Maps)', () => {
  it('avisa que falta la configuración del mapa, pero el panel funciona', async () => {
    await abrir();
    expect(screen.getByText('El mapa no está disponible')).toBeInTheDocument();
    expect(screen.getByText('VITE_GOOGLE_MAPS_API_KEY')).toBeInTheDocument();
    expect(screen.getByText('VITE_GOOGLE_MAPS_MAP_ID')).toBeInTheDocument();
  });

  it('cuenta alertas y unidades; oculta la unidad fuera de turno', async () => {
    await abrir();
    expect(resumen('Alertas activas')).toBe('2');
    expect(resumen('En proceso')).toBe('1');
    expect(resumen('Disponibles')).toBe('1');
    expect(resumen('Atendiendo')).toBe('1');
    expect(resumen('En traslado')).toBe('1');
    expect(resumen('Sin señal')).toBe('1');
    expect(panel().queryByText(/AMB-05/)).not.toBeInTheDocument();
    expect(flota().getByText(/AMB-04/)).toBeInTheDocument();
  });

  it('lista las alertas por prioridad: la crítica primero', async () => {
    await abrir();
    const items = within(panel().getByRole('heading', { name: 'Alertas activas (3)' }).closest('section')!).getAllByRole('button');
    expect(items.map((b) => b.textContent)).toEqual([
      expect.stringContaining('Accidente · Crítica'),
      expect.stringContaining('Emergencia médica · Alta'),
      expect.stringContaining('Incendio · Baja'),
    ]);
    expect(items[0]).toHaveTextContent(/Espera 4 min/);
  });

  it('marca "Sin señal en turno" en la unidad colgada', async () => {
    await abrir();
    expect(within(flota().getByRole('button', { name: /AMB-04/ })).getByText('Sin señal en turno')).toBeInTheDocument();
    expect(within(flota().getByRole('button', { name: /AMB-01/ })).queryByText('Sin señal en turno')).not.toBeInTheDocument();
    // y es la primera de la lista: requiere acción
    expect(flota().getAllByRole('button')[0]).toHaveTextContent('AMB-04');
  });

  it('muestra las ambulancias disponibles en el radio, y el centro pasa a la alerta seleccionada', async () => {
    const { user } = await abrir();
    const area = within(panel().getByRole('heading', { name: 'Ambulancias disponibles en el área' }).closest('section')!);
    expect(area.getByText('AMB-01', { exact: false })).toBeInTheDocument(); // 3 km desde el centro del mapa
    expect(area.getByText(/Desde el centro del mapa/)).toBeInTheDocument();

    await user.click(panel().getByRole('button', { name: /Emergencia médica · Alta/ })); // alerta al sur-este
    expect(area.getByText(/Desde la alerta seleccionada/)).toBeInTheDocument();
    expect(area.getByText(/\d\.\d km/)).toBeInTheDocument(); // ≈ 1,9 km
    await user.click(area.getByRole('button', { name: '1 km' }));
    expect(area.getByText('No hay unidades disponibles a menos de 1 km.')).toBeInTheDocument();
  });

  it('excluye de "disponibles" a las unidades sin señal aunque estén cerca', async () => {
    await abrir();
    const area = within(panel().getByRole('heading', { name: 'Ambulancias disponibles en el área' }).closest('section')!);
    expect(area.queryByText(/AMB-04/)).not.toBeInTheDocument();
  });

  it('al elegir una unidad muestra su detalle con personal, velocidad y versión de la app', async () => {
    const { user } = await abrir();
    await user.click(flota().getByRole('button', { name: /AMB-02/ }));
    const detalle = within(panel().getByRole('region', { name: /AMB-02/ }));
    expect(detalle.getByText('Laura Pérez · Camila Duarte')).toBeInTheDocument();
    expect(detalle.getByText('Atendiendo alerta')).toBeInTheDocument();
    expect(detalle.getByText('Versión de la app').nextSibling).toHaveTextContent('1.4.0+12');
    expect(detalle.getByRole('link', { name: 'Emergencia médica' })).toHaveAttribute('href', '/alertas/al-2');
    expect(detalle.queryByRole('button', { name: 'Cerrar turno' })).not.toBeInTheDocument();
  });

  it('top de sectores: usa las alertas del rango, y los filtros cambian el resultado', async () => {
    const { user } = await abrir();
    const sectores = () => within(panel().getByRole('heading', { name: 'Sectores con más alertas' }).closest('section')!);
    await waitFor(() => expect(sectores().getAllByRole('listitem').length).toBeGreaterThan(0));
    const antes = sectores().getAllByRole('listitem').length;
    expect(antes).toBeLessThanOrEqual(5);

    await user.selectOptions(panel().getByLabelText('Tipo'), 'Incendio');
    await waitFor(() => expect(sectores().getAllByRole('listitem')).toHaveLength(2)); // dos incendios, en celdas distintas
    sectores().getAllByRole('listitem').forEach((li) => expect(li).toHaveTextContent(/1\s*alerta$/));
    await user.selectOptions(panel().getByLabelText('Tipo'), '');
    await user.selectOptions(panel().getByLabelText('Prioridad'), 'critica');
    await waitFor(() => expect(sectores().getAllByRole('listitem')).toHaveLength(1)); // solo hay una crítica
  });
});

describe('LiveMapPage: turno colgado', () => {
  it('una unidad en turno y sin señal ofrece "Cerrar turno" y, al confirmar, desaparece del mapa', async () => {
    const { user } = await abrir();
    await user.click(flota().getByRole('button', { name: /AMB-04/ }));
    const detalle = within(panel().getByRole('region', { name: /AMB-04/ }));
    expect(detalle.getByText('Sin señal en turno')).toBeInTheDocument();
    expect(detalle.getByText('Sara Ibarra · Paula Vega')).toBeInTheDocument();

    await user.click(detalle.getByRole('button', { name: 'Cerrar turno' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/solo si la unidad lleva tiempo sin señal/)).toBeInTheDocument();
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar turno' }));

    expect(await screen.findByText(/Turno de WZP119 · AMB-04 cerrado/)).toBeInTheDocument();
    await waitFor(() => expect(flota().queryByText(/AMB-04/)).not.toBeInTheDocument());
    expect(resumen('Sin señal')).toBe('0');
  });

  it('si la API rechaza (409), avisa con el mensaje y deja la unidad', async () => {
    const deps = createMockDeps({ movimiento: false });
    deps.ambulancias.cerrarTurno = vi.fn().mockRejectedValue(new Error('La ambulancia tiene una alerta en curso.'));
    const { user } = await abrir(deps);
    await user.click(flota().getByRole('button', { name: /AMB-04/ }));
    await user.click(within(panel().getByRole('region', { name: /AMB-04/ })).getByRole('button', { name: 'Cerrar turno' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cerrar turno' }));
    expect(await screen.findByText('La ambulancia tiene una alerta en curso.')).toBeInTheDocument();
    expect(flota().getByRole('button', { name: /AMB-04/ })).toBeInTheDocument();
  });

  it('una unidad con señal no ofrece cerrar el turno', async () => {
    const { user } = await abrir();
    await user.click(flota().getByRole('button', { name: /AMB-01/ }));
    expect(within(panel().getByRole('region', { name: /AMB-01/ })).queryByRole('button', { name: 'Cerrar turno' })).not.toBeInTheDocument();
  });

  it('pasado el umbral, una unidad con señal pasa a "sin señal" sin datos nuevos', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    try {
      renderConDeps(<LiveMapPage />, { deps: createMockDeps({ movimiento: false }) });
      await act(async () => {});
      expect(resumen('Sin señal')).toBe('1');
      await act(async () => {
        vi.advanceTimersByTime(100_000); // > 90 s sin latido, redibujo cada 10 s
      });
      expect(resumen('Sin señal')).toBe('4');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('LiveMapPage: capas (con mapa simulado)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'clave-de-prueba');
    vi.stubEnv('VITE_GOOGLE_MAPS_MAP_ID', 'map-id-de-prueba');
  });
  const marcadores = () => screen.getAllByTestId('marcador').map((m) => m.getAttribute('title') ?? '');

  it('dibuja unidades en turno, alertas activas y hospitales, y cada interruptor oculta su capa', async () => {
    const { user } = await abrir();
    expect(screen.queryByText('El mapa no está disponible')).not.toBeInTheDocument();
    expect(marcadores().filter((t) => /AMB-0\d ·/.test(t))).toHaveLength(4); // AMB-05 (fuera de turno) no se dibuja
    expect(screen.getAllByTestId('pin')).toHaveLength(3);
    expect(marcadores().filter((t) => /CLINICA|HOSPITAL/.test(t))).toHaveLength(3);
    expect(marcadores().find((t) => t.startsWith('Accidente'))).toMatch(/espera 4 min/);

    await user.click(panel().getByLabelText('Ambulancias'));
    expect(marcadores().filter((t) => /AMB-0\d ·/.test(t))).toHaveLength(0);
    await user.click(panel().getByLabelText('Alertas activas'));
    expect(screen.queryAllByTestId('pin')).toHaveLength(0);
    await user.click(panel().getByLabelText('Hospitales'));
    expect(screen.queryAllByTestId('marcador')).toHaveLength(0);
  });

  it('las capas de calor y sectores arrancan apagadas y el interruptor de sectores dibuja un número por celda', async () => {
    const { user } = await abrir();
    expect(panel().getByLabelText('Calor histórico')).not.toBeChecked();
    expect(panel().getByLabelText('Sectores (cuadrícula)')).not.toBeChecked();
    const antes = screen.getAllByTestId('marcador').length;
    await user.click(panel().getByLabelText('Sectores (cuadrícula)'));
    await waitFor(() => expect(screen.getAllByTestId('marcador').length).toBeGreaterThan(antes));
    await user.click(panel().getByLabelText('Calor histórico')); // no debe fallar sin WebGL ni Google real
    expect(panel().getByLabelText('Calor histórico')).toBeChecked();
  });

  it('el color de cada unidad sigue su estado (verde, rojo, naranja y violeta)', async () => {
    await abrir();
    const colores = screen
      .getAllByTestId('marcador')
      .filter((m) => /AMB-0\d ·/.test(m.getAttribute('title') ?? ''))
      .map((m) => [m.getAttribute('title')!.split(' · ').pop(), m.querySelector('circle')!.getAttribute('fill')]);
    expect(Object.fromEntries(colores)).toEqual({
      'Disponible': '#2b8a57',
      'Atendiendo alerta': '#c8372d',
      'Traslado a hospital': '#d9822b',
      'Sin señal': '#7a56b0',
    });
  });
});
