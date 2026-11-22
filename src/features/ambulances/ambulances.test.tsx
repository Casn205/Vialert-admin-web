import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderConDeps } from '@/test/render';
import AmbulancesPage from './pages/AmbulancesPage';

type Usuario = ReturnType<typeof renderConDeps>['user'];

const placasEnTabla = () =>
  screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0]!.textContent);
const fila = (placa: string) => screen.getByText(placa).closest('tr') as HTMLElement;

async function escribir(user: Usuario, contenedor: HTMLElement, etiqueta: string, texto: string) {
  await user.type(within(contenedor).getByLabelText(etiqueta), texto);
}

describe('AmbulancesPage', () => {
  it('lista las ambulancias por placa con su estado, su turno y las acciones que corresponden', async () => {
    renderConDeps(<AmbulancesPage />);
    await screen.findByText('TKV201');
    expect(placasEnTabla()).toEqual(['BGT772', 'HJKO1', 'MLN330', 'TKV201', 'UQR458', 'WZP119']);

    // Deshabilitada: se ofrece habilitar, no deshabilitar.
    expect(within(fila('BGT772')).getByText('Deshabilitada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Habilitar BGT772' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deshabilitar BGT772' })).not.toBeInTheDocument();
    // "Cerrar turno" solo para unidades en turno.
    expect(within(fila('TKV201')).getByText('En turno')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar turno de TKV201' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar turno de MLN330' })).not.toBeInTheDocument();
  });

  it('crea una ambulancia (normalizada) y avisa', async () => {
    const { user } = renderConDeps(<AmbulancesPage />);
    await screen.findByText('TKV201');
    await user.click(screen.getByRole('button', { name: 'Nueva ambulancia' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nueva ambulancia' });

    await escribir(user, dialogo, 'Correo', 'nueva@vialert.com');
    await escribir(user, dialogo, 'Contraseña', '12345678');
    await escribir(user, dialogo, 'Placa', '  xyz987  ');
    await escribir(user, dialogo, 'Código interno', 'AMB-07');
    await escribir(user, dialogo, 'Entidad', 'cruz roja');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear ambulancia' }));

    expect(await screen.findByText('Ambulancia creada.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const nueva = await screen.findByText('xyz987'); // sin espacios sobrantes
    expect(within(nueva.closest('tr') as HTMLElement).getByText('CRUZ ROJA')).toBeInTheDocument(); // en MAYÚSCULAS
  });

  it('crea una flota por lote y muestra el resultado de cada fila (un error no detiene las demás)', async () => {
    const { user } = renderConDeps(<AmbulancesPage />);
    await screen.findByText('TKV201');
    await user.click(screen.getByRole('button', { name: 'Crear flota' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Crear flota' });

    await escribir(user, dialogo, 'Entidad', 'cruz roja');
    await escribir(user, dialogo, 'Contraseña común', '12345678');
    await escribir(user, dialogo, 'Placa de la fila 1', 'AAA111');
    await escribir(user, dialogo, 'Código interno de la fila 1', 'F-01');
    await escribir(user, dialogo, 'Correo de la fila 1', 'f01@vialert.com');
    await user.click(within(dialogo).getByRole('button', { name: 'Agregar fila' }));
    await escribir(user, dialogo, 'Placa de la fila 2', 'BBB222');
    await escribir(user, dialogo, 'Código interno de la fila 2', 'F-02');
    await escribir(user, dialogo, 'Correo de la fila 2', 'amb-01@vialert.com'); // ya existe en el ejemplo
    await user.click(within(dialogo).getByRole('button', { name: 'Crear ambulancias' }));

    expect(await within(dialogo).findByText('Se crearon 1 de 2 ambulancias.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Ya existe una ambulancia con el correo amb-01@vialert.com.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Creada')).toBeInTheDocument();
    expect(within(dialogo).getByText('Con error')).toBeInTheDocument();

    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(placasEnTabla()).toContain('AAA111');
    expect(placasEnTabla()).not.toContain('BBB222');
  });

  it('cierra el turno colgado tras advertirlo y la unidad queda fuera de turno', async () => {
    const { user } = renderConDeps(<AmbulancesPage />);
    await user.click(await screen.findByRole('button', { name: 'Cerrar turno de WZP119' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Cerrar turno de WZP119' });
    expect(within(dialogo).getByText(/solo si la unidad lleva tiempo sin señal/)).toBeInTheDocument();
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar turno' }));

    expect(await screen.findByText('Turno cerrado.')).toBeInTheDocument();
    await waitFor(() => expect(within(fila('WZP119')).getByText('Fuera de turno')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Cerrar turno de WZP119' })).not.toBeInTheDocument();
  });

  it('muestra el aviso del conflicto (409) cuando la unidad tiene una alerta en curso', async () => {
    const { user } = renderConDeps(<AmbulancesPage />);
    await user.click(await screen.findByRole('button', { name: 'Cerrar turno de HJKO1' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Cerrar turno de HJKO1' });
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar turno' }));

    expect(await screen.findByText('La ambulancia tiene una alerta en curso.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cerrar turno de HJKO1' })).not.toBeInTheDocument());
    expect(within(fila('HJKO1')).getByText('En turno')).toBeInTheDocument(); // no cambió
  });
});
