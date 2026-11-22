import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createMockDeps } from '@/infrastructure/mock/mock-deps';
import { renderConDeps } from '@/test/render';
import HospitalsPage from './pages/HospitalsPage';

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Map: ({ children, onClick }: { children: React.ReactNode; onClick?: (e: { detail: { latLng: { lat: number; lng: number } } }) => void }) => (
    <div data-testid="mapa" onClick={() => onClick?.({ detail: { latLng: { lat: 10.4555555555, lng: -73.2611111111 } } })}>
      {children}
    </div>
  ),
  AdvancedMarker: () => <span data-testid="marcador" />,
  useMap: () => null,
}));

const nombresEnTabla = () =>
  screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0]!.textContent);

async function abrirNuevo(user: ReturnType<typeof renderConDeps>['user']) {
  await user.click(screen.getByRole('button', { name: 'Nuevo hospital' }));
  return screen.findByRole('dialog');
}

describe('HospitalsPage', () => {
  it('lista los hospitales ordenados por nombre con sus coordenadas', async () => {
    renderConDeps(<HospitalsPage />);
    expect(await screen.findByText('CLINICA SANTA ISABEL')).toBeInTheDocument();
    expect(nombresEnTabla()).toEqual(['CLINICA NORTE (EJEMPLO)', 'CLINICA SANTA ISABEL', 'HOSPITAL CENTRAL (EJEMPLO)']);
    expect(screen.getByText('10.46230, -73.25120')).toBeInTheDocument();
  });

  it('filtra por nombre', async () => {
    const { user } = renderConDeps(<HospitalsPage />);
    await screen.findByText('CLINICA SANTA ISABEL');
    await user.type(screen.getByLabelText('Buscar por nombre'), 'central');
    expect(nombresEnTabla()).toEqual(['HOSPITAL CENTRAL (EJEMPLO)']);
    await user.clear(screen.getByLabelText('Buscar por nombre'));
    await user.type(screen.getByLabelText('Buscar por nombre'), 'zzz');
    expect(screen.getByText('Ningún hospital coincide con la búsqueda.')).toBeInTheDocument();
  });

  it('crea un hospital y avisa', async () => {
    const { user } = renderConDeps(<HospitalsPage />);
    await screen.findByText('CLINICA SANTA ISABEL');
    const dialogo = await abrirNuevo(user);
    await user.type(within(dialogo).getByLabelText('Nombre'), '  Hospital Sur  ');
    await user.type(within(dialogo).getByLabelText('Latitud'), '10.45');
    await user.type(within(dialogo).getByLabelText('Longitud'), '-73.26');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear hospital' }));

    expect(await screen.findByText('Hospital creado.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(nombresEnTabla()).toContain('Hospital Sur'); // el nombre se guarda sin espacios sobrantes
  });

  it('valida nombre y coordenadas y deja el diálogo abierto', async () => {
    const { user } = renderConDeps(<HospitalsPage />);
    await screen.findByText('CLINICA SANTA ISABEL');
    const dialogo = await abrirNuevo(user);

    await user.click(within(dialogo).getByRole('button', { name: 'Crear hospital' }));
    expect(await within(dialogo).findByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(within(dialogo).getAllByText(/debe ser un número/)).toHaveLength(2);

    await user.type(within(dialogo).getByLabelText('Nombre'), 'X');
    await user.type(within(dialogo).getByLabelText('Latitud'), '95');
    await user.type(within(dialogo).getByLabelText('Longitud'), '-200');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear hospital' }));
    expect(await within(dialogo).findByText('La latitud debe estar entre −90 y 90', { selector: 'p' })).toBeInTheDocument();
    expect(within(dialogo).getByText('La longitud debe estar entre −180 y 180', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('edita un hospital con el formulario prellenado', async () => {
    const { user } = renderConDeps(<HospitalsPage />);
    await user.click(await screen.findByRole('button', { name: 'Editar CLINICA SANTA ISABEL' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Editar hospital' });
    expect(within(dialogo).getByLabelText('Nombre')).toHaveValue('CLINICA SANTA ISABEL');
    expect(within(dialogo).getByLabelText('Latitud')).toHaveValue(10.462299929418908);

    await user.clear(within(dialogo).getByLabelText('Nombre'));
    await user.type(within(dialogo).getByLabelText('Nombre'), 'CLINICA SANTA ISABEL II');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    expect(nombresEnTabla()).toContain('CLINICA SANTA ISABEL II');
  });

  it('pide confirmación antes de eliminar y respeta "Cancelar"', async () => {
    const { user } = renderConDeps(<HospitalsPage />);
    await user.click(await screen.findByRole('button', { name: 'Eliminar CLINICA NORTE (EJEMPLO)' }));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(nombresEnTabla()).toContain('CLINICA NORTE (EJEMPLO)');

    await user.click(screen.getByRole('button', { name: 'Eliminar CLINICA NORTE (EJEMPLO)' }));
    await user.click(await screen.findByRole('button', { name: 'Eliminar hospital' }));
    expect(await screen.findByText('Hospital eliminado.')).toBeInTheDocument();
    expect(nombresEnTabla()).not.toContain('CLINICA NORTE (EJEMPLO)');
  });

  it('si falla el guardado avisa y no cierra el diálogo', async () => {
    const deps = createMockDeps({ movimiento: false });
    vi.spyOn(deps.hospitales, 'crear').mockRejectedValue(new Error('permission-denied'));
    const { user } = renderConDeps(<HospitalsPage />, { deps });
    await screen.findByText('CLINICA SANTA ISABEL');
    const dialogo = await abrirNuevo(user);
    await user.type(within(dialogo).getByLabelText('Nombre'), 'Hospital Sur');
    await user.type(within(dialogo).getByLabelText('Latitud'), '10');
    await user.type(within(dialogo).getByLabelText('Longitud'), '-73');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear hospital' }));

    expect(await screen.findByText(/No se pudo guardar el hospital\. permission-denied/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('muestra un estado vacío con acción cuando no hay hospitales', async () => {
    const deps = createMockDeps({ movimiento: false });
    for (const h of ['h-1', 'h-2', 'h-3']) await deps.hospitales.eliminar(h);
    renderConDeps(<HospitalsPage />, { deps });
    expect(await screen.findByText('Aún no hay hospitales')).toBeInTheDocument();
  });

  describe('selector de coordenadas en el mapa', () => {
    it('sin clave de Google Maps avisa y deja los campos numéricos', async () => {
      const { user } = renderConDeps(<HospitalsPage />);
      await screen.findByText('CLINICA SANTA ISABEL');
      const dialogo = await abrirNuevo(user);
      expect(within(dialogo).getByText('El mapa no está disponible')).toBeInTheDocument();
      expect(within(dialogo).getByLabelText('Latitud')).toBeInTheDocument();
    });

    it('con mapa, un clic rellena latitud y longitud (6 decimales) y permite guardar', async () => {
      vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'clave');
      vi.stubEnv('VITE_GOOGLE_MAPS_MAP_ID', 'map');
      try {
        const { user } = renderConDeps(<HospitalsPage />);
        await screen.findByText('CLINICA SANTA ISABEL');
        const dialogo = await abrirNuevo(user);
        expect(within(dialogo).queryByTestId('marcador')).not.toBeInTheDocument(); // sin coordenadas, sin marcador
        await user.click(within(dialogo).getByTestId('mapa'));
        expect(within(dialogo).getByLabelText('Latitud')).toHaveValue(10.455556);
        expect(within(dialogo).getByLabelText('Longitud')).toHaveValue(-73.261111);
        expect(within(dialogo).getByTestId('marcador')).toBeInTheDocument();
        await user.type(within(dialogo).getByLabelText('Nombre'), 'Hospital del mapa');
        await user.click(within(dialogo).getByRole('button', { name: 'Crear hospital' }));
        expect(await screen.findByText('Hospital creado.')).toBeInTheDocument();
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });
});
