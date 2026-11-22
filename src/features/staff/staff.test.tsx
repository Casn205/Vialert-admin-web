import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderConDeps } from '@/test/render';
import StaffPage from './pages/StaffPage';

const fila = (nombre: string) => screen.getByText(nombre).closest('tr')!;
const nombresEnTabla = () =>
  screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0]!.textContent);

describe('StaffPage · conductores', () => {
  it('lista conductores por apellido, con cédula enmascarada y placa de la ambulancia', async () => {
    renderConDeps(<StaffPage />);
    expect(await screen.findByText('Sara Ibarra')).toBeInTheDocument();
    expect(nombresEnTabla()).toEqual(['Sara Ibarra', 'Andrés Mejía', 'Laura Pérez', 'Marco Polo', 'Julián Rojas']);

    const marco = within(fila('Marco Polo'));
    expect(marco.getByText('••••1111')).toBeInTheDocument(); // cédula 1101111111
    expect(marco.queryByText('1101111111')).not.toBeInTheDocument();
    expect(marco.getByText('En turno')).toBeInTheDocument();
    expect(await marco.findByText('TKV201')).toBeInTheDocument(); // placa de amb-1

    const julian = within(fila('Julián Rojas'));
    expect(julian.getByText('Disponible')).toBeInTheDocument();
    expect(julian.getByText('Sin asignar')).toBeInTheDocument();
  });

  it('no muestra teléfono en conductores', async () => {
    renderConDeps(<StaffPage />);
    await screen.findByText('Sara Ibarra');
    expect(screen.queryByRole('columnheader', { name: 'Teléfono' })).not.toBeInTheDocument();
  });

  it('busca por nombre o cédula', async () => {
    const { user } = renderConDeps(<StaffPage />);
    await screen.findByText('Sara Ibarra');
    await user.type(screen.getByLabelText('Buscar por nombre o cédula'), 'laura');
    expect(nombresEnTabla()).toEqual(['Laura Pérez']);
  });

  it('muestra el detalle con la cédula completa', async () => {
    const { user } = renderConDeps(<StaffPage />);
    await user.click(await screen.findByRole('button', { name: 'Ver detalle de Marco Polo' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Marco Polo' });
    expect(within(dialogo).getByText('1101111111')).toBeInTheDocument();
    expect(within(dialogo).getByText('En turno')).toBeInTheDocument();
  });

  it('crea un conductor: normaliza la entidad, nace disponible y no pide teléfono', async () => {
    const { user } = renderConDeps(<StaffPage />);
    await screen.findByText('Sara Ibarra');
    await user.click(screen.getByRole('button', { name: 'Nuevo conductor' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo conductor' });
    expect(within(dialogo).queryByLabelText('Teléfono')).not.toBeInTheDocument();

    await user.type(within(dialogo).getByLabelText('Nombre'), 'Ana');
    await user.type(within(dialogo).getByLabelText('Apellido'), 'Zapata');
    await user.type(within(dialogo).getByLabelText('Cédula'), '999');
    await user.type(within(dialogo).getByLabelText('Entidad'), ' ninguno ');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear conductor' }));

    expect(await screen.findByText('Conductor creado.')).toBeInTheDocument();
    const ana = within(fila('Ana Zapata'));
    expect(ana.getByText('NINGUNO')).toBeInTheDocument();
    expect(ana.getByText('Disponible')).toBeInTheDocument();
  });

  it('valida los campos obligatorios', async () => {
    const { user } = renderConDeps(<StaffPage />);
    await screen.findByText('Sara Ibarra');
    await user.click(screen.getByRole('button', { name: 'Nuevo conductor' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear conductor' }));
    for (const msg of ['El nombre es obligatorio', 'El apellido es obligatorio', 'La cédula es obligatorio', 'La entidad es obligatoria']) {
      expect(await within(dialogo).findByText(msg)).toBeInTheDocument();
    }
  });

  it('no permite eliminar a quien está en turno, y sí a quien está disponible', async () => {
    const { user } = renderConDeps(<StaffPage />);
    await screen.findByText('Sara Ibarra');
    expect(screen.getByRole('button', { name: 'Eliminar Marco Polo' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Eliminar Julián Rojas' }));
    await user.click(await screen.findByRole('button', { name: 'Eliminar conductor' }));
    expect(await screen.findByText('Conductor eliminado.')).toBeInTheDocument();
    expect(nombresEnTabla()).not.toContain('Julián Rojas');
  });

  it('editar no cambia el estado ni la ambulancia', async () => {
    const { user } = renderConDeps(<StaffPage />);
    await user.click(await screen.findByRole('button', { name: 'Editar Marco Polo' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Editar conductor' });
    expect(within(dialogo).getByText(/los gestiona la app móvil/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Nombre')).toHaveValue('Marco');

    await user.clear(within(dialogo).getByLabelText('Nombre'));
    await user.type(within(dialogo).getByLabelText('Nombre'), 'Marcos');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();

    const marcos = within(fila('Marcos Polo'));
    expect(marcos.getByText('En turno')).toBeInTheDocument();
    expect(marcos.getByText('TKV201')).toBeInTheDocument();
  });
});

describe('StaffPage · paramédicos', () => {
  async function irAParamedicos(user: ReturnType<typeof renderConDeps>['user']) {
    await screen.findByText('Sara Ibarra');
    await user.click(screen.getByRole('tab', { name: 'Paramédicos' }));
    await screen.findByText('Leo Messi');
  }

  it('cambia de pestaña y muestra teléfono enmascarado', async () => {
    const { user } = renderConDeps(<StaffPage />);
    await irAParamedicos(user);
    expect(screen.getByRole('tab', { name: 'Paramédicos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('columnheader', { name: 'Teléfono' })).toBeInTheDocument();
    expect(nombresEnTabla()).not.toContain('Sara Ibarra');
    const leo = within(fila('Leo Messi'));
    expect(leo.getAllByText(/^••••\d{4}$/)).toHaveLength(2); // cédula y teléfono, ambos enmascarados
    expect(leo.queryByText('327011111')).not.toBeInTheDocument();
    expect(leo.queryByText('1101111111')).not.toBeInTheDocument();
  });

  it('abre directamente en paramédicos con ?tipo=paramedico', async () => {
    renderConDeps(<StaffPage />, { ruta: '/personal?tipo=paramedico' });
    expect(await screen.findByText('Leo Messi')).toBeInTheDocument();
  });

  it('el teléfono es obligatorio al crear un paramédico', async () => {
    const { user } = renderConDeps(<StaffPage />);
    await irAParamedicos(user);
    await user.click(screen.getByRole('button', { name: 'Nuevo paramédico' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo paramédico' });
    await user.type(within(dialogo).getByLabelText('Nombre'), 'Ana');
    await user.type(within(dialogo).getByLabelText('Apellido'), 'Zapata');
    await user.type(within(dialogo).getByLabelText('Cédula'), '999');
    await user.type(within(dialogo).getByLabelText('Entidad'), 'x');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear paramédico' }));
    expect(await within(dialogo).findByText('El teléfono es obligatorio')).toBeInTheDocument();

    await user.type(within(dialogo).getByLabelText('Teléfono'), '3001234567');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear paramédico' }));
    expect(await screen.findByText('Paramédico creado.')).toBeInTheDocument();
    await waitFor(() => expect(nombresEnTabla()).toContain('Ana Zapata'));
  });
});
