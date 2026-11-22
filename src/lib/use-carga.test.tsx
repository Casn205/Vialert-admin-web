import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCarga } from './use-carga';

describe('useCarga', () => {
  it('pasa de cargando a datos', async () => {
    const { result } = renderHook(() => useCarga(async () => 42, 'a'));
    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.datos).toBe(42));
    expect(result.current.cargando).toBe(false);
  });

  it('informa el error', async () => {
    const { result } = renderHook(() => useCarga(async () => { throw new Error('falló'); }, 'a'));
    await waitFor(() => expect(result.current.error?.message).toBe('falló'));
    expect(result.current.cargando).toBe(false);
  });

  it('repite la consulta al cambiar la clave y descarta la respuesta vieja', async () => {
    let resolverLenta: (v: string) => void = () => {};
    const cargar = vi.fn((clave: string) => (clave === 'lenta' ? new Promise<string>((r) => (resolverLenta = r)) : Promise.resolve(clave)));
    const { result, rerender } = renderHook(({ k }) => useCarga(() => cargar(k), k), { initialProps: { k: 'lenta' } });
    rerender({ k: 'rapida' });
    await waitFor(() => expect(result.current.datos).toBe('rapida'));
    await act(async () => resolverLenta('lenta')); // llega tarde: no debe pisar el resultado vigente
    expect(result.current.datos).toBe('rapida');
    expect(cargar).toHaveBeenCalledTimes(2);
  });

  it('con la misma clave no repite aunque cambie la función; recargar sí', async () => {
    const cargar = vi.fn(async () => 1);
    const { result, rerender } = renderHook(() => useCarga(() => cargar(), 'k'));
    await waitFor(() => expect(result.current.datos).toBe(1));
    rerender();
    expect(cargar).toHaveBeenCalledTimes(1);
    act(() => result.current.recargar());
    await waitFor(() => expect(cargar).toHaveBeenCalledTimes(2));
  });
});
