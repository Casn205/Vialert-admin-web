import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mensajeDe, useSuscripcion, type Suscribir } from './use-suscripcion';

function falsa() {
  const off = vi.fn();
  let dato: (d: number[]) => void = () => {};
  let fallo: (e: Error) => void = () => {};
  const suscribir: Suscribir<number[]> = (cb, onError) => {
    dato = cb;
    fallo = onError;
    return off;
  };
  return { suscribir, off, emitir: (d: number[]) => dato(d), fallar: (e: Error) => fallo(e) };
}

describe('useSuscripcion', () => {
  it('empieza cargando, entrega datos y se desuscribe al desmontar', () => {
    const f = falsa();
    const { result, unmount } = renderHook(() => useSuscripcion(f.suscribir));
    expect(result.current).toMatchObject({ cargando: true, datos: null, error: null });
    act(() => f.emitir([1, 2]));
    expect(result.current).toMatchObject({ cargando: false, datos: [1, 2] });
    unmount();
    expect(f.off).toHaveBeenCalledOnce();
  });

  it('informa el error y conserva el último dato', () => {
    const f = falsa();
    const { result } = renderHook(() => useSuscripcion(f.suscribir));
    act(() => f.emitir([1]));
    act(() => f.fallar(new Error('sin permiso')));
    expect(result.current.error?.message).toBe('sin permiso');
    expect(result.current.datos).toEqual([1]);
  });

  it('un error antes del primer dato deja de estar "cargando"', () => {
    const f = falsa();
    const { result } = renderHook(() => useSuscripcion(f.suscribir));
    act(() => f.fallar(new Error('x')));
    expect(result.current.cargando).toBe(false);
  });
});

describe('mensajeDe', () => {
  it('usa el mensaje del Error o el valor por defecto', () => {
    expect(mensajeDe(new Error('hola'))).toBe('hola');
    expect(mensajeDe('texto suelto')).toBe('Ocurrió un error inesperado.');
    expect(mensajeDe(null, 'otro')).toBe('otro');
  });
});
