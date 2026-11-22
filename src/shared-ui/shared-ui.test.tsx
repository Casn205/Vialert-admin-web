import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog, DataTable, FormField, Modal, ToastProvider, useToast } from '.';

describe('DataTable', () => {
  const columnas = [
    { encabezado: 'Placa', celda: (f: { placa: string }) => f.placa },
    { encabezado: 'Estado', celda: (f: { placa: string }) => `estado de ${f.placa}` },
  ];

  it('muestra filas y encabezados', () => {
    render(<DataTable columnas={columnas} filas={[{ placa: 'A1' }, { placa: 'B2' }]} clave={(f) => f.placa} />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Placa', 'Estado']);
    expect(screen.getByText('estado de B2')).toBeInTheDocument();
  });
  it('muestra el mensaje cuando no hay filas', () => {
    render(<DataTable columnas={columnas} filas={[]} clave={(f) => f.placa} vacio="Sin ambulancias." />);
    expect(screen.getByText('Sin ambulancias.')).toBeInTheDocument();
  });
  it('avisa al hacer clic en una fila', async () => {
    const onFila = vi.fn();
    render(<DataTable columnas={columnas} filas={[{ placa: 'A1' }]} clave={(f) => f.placa} onFila={onFila} />);
    await userEvent.click(screen.getByText('A1'));
    expect(onFila).toHaveBeenCalledWith({ placa: 'A1' });
  });
});

describe('FormField', () => {
  it('enlaza la etiqueta con el control y anuncia el error', () => {
    render(
      <FormField htmlFor="nombre" label="Nombre" error="El nombre es obligatorio">
        <input id="nombre" />
      </FormField>,
    );
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('El nombre es obligatorio');
  });
});

describe('Modal y ConfirmDialog', () => {
  it('Modal muestra el contenido solo cuando está abierto', () => {
    const { rerender } = render(<Modal abierto={false} onCerrar={() => {}} titulo="Detalle">contenido</Modal>);
    expect(screen.queryByText('contenido')).not.toBeInTheDocument();
    rerender(<Modal abierto onCerrar={() => {}} titulo="Detalle">contenido</Modal>);
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });

  it('ConfirmDialog confirma y cancela', async () => {
    const onConfirmar = vi.fn().mockResolvedValue(undefined);
    const onCancelar = vi.fn();
    render(
      <ConfirmDialog abierto titulo="Eliminar hospital" mensaje="Esta acción no se puede deshacer." confirmar="Eliminar hospital" peligro onConfirmar={onConfirmar} onCancelar={onCancelar} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar hospital' }));
    await waitFor(() => expect(onConfirmar).toHaveBeenCalledOnce());
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalledOnce();
  });
});

describe('Toast', () => {
  function Disparador() {
    const { mostrar } = useToast();
    return <button onClick={() => mostrar('ok', 'Hospital guardado')}>guardar</button>;
  }
  it('muestra el aviso y se puede cerrar', async () => {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText('guardar'));
    expect(screen.getByRole('status')).toHaveTextContent('Hospital guardado');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByText('Hospital guardado')).not.toBeInTheDocument();
  });
});
