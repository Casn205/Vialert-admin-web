import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Alerta } from '@/core/domain/alerta';
import type { UnidadVista } from '@/core/domain/flota';
import type { Hospital } from '@/core/domain/hospital';
import type { Celda } from '@/core/geo/grid';
import { ESTRATEGIAS_CAPA_MAPA, type ContextoCapaMapa } from './components/capa-mapa-strategies';
import { CAPAS, type CapaId } from './store/map-filters';

// Componentes de dibujo de mentira: muestran qué datos recibió cada capa, sin cargar Google Maps ni deck.gl.
vi.mock('./components/Marcadores', () => ({
  MarcadoresUnidades: (p: { unidades: readonly unknown[]; seleccionada: string | null; onElegir: (id: string) => void }) => (
    <button data-testid="dibujo-unidades" data-n={p.unidades.length} data-sel={p.seleccionada ?? ''} onClick={() => p.onElegir('u-1')} />
  ),
  MarcadoresAlertas: (p: { alertas: readonly unknown[]; seleccionada: string | null; onElegir: (id: string) => void }) => (
    <button data-testid="dibujo-alertas" data-n={p.alertas.length} data-sel={p.seleccionada ?? ''} onClick={() => p.onElegir('a-1')} />
  ),
  MarcadoresHospitales: (p: { hospitales: readonly unknown[] }) => <div data-testid="dibujo-hospitales" data-n={p.hospitales.length} />,
}));
vi.mock('./components/CapasHistoricas', () => ({
  CapaCalor: (p: { alertas: readonly unknown[] }) => <div data-testid="dibujo-calor" data-n={p.alertas.length} />,
  CapaSectores: (p: { celdas: readonly unknown[] }) => <div data-testid="dibujo-sectores" data-n={p.celdas.length} />,
}));

/** Cantidades distintas por colección para comprobar que cada capa recibe la suya. */
function contexto(): ContextoCapaMapa {
  const varios = <T,>(n: number) => Array.from({ length: n }, (_, i) => ({ id: `x-${i}` }) as unknown as T);
  return {
    unidades: varios<UnidadVista>(1),
    alertas: varios<Alerta>(2),
    hospitales: varios<Hospital>(3),
    historicas: varios<Alerta>(4),
    celdas: varios<Celda>(5),
    ahora: new Date('2026-01-01T12:00:00Z'),
    alertaId: 'a-sel',
    unidadId: 'u-sel',
    seleccionarAlerta: vi.fn(),
    seleccionarUnidad: vi.fn(),
  };
}

function dibujar(id: CapaId, ctx: ContextoCapaMapa = contexto()) {
  const estrategia = ESTRATEGIAS_CAPA_MAPA.find((e) => e.id === id);
  if (!estrategia) throw new Error(`Sin estrategia para la capa ${id}`);
  const { Componente } = estrategia;
  render(<Componente {...ctx} />);
  return ctx;
}

describe('Estrategias de capas del mapa', () => {
  it('hay exactamente una estrategia por cada capa del panel de controles', () => {
    const ids = ESTRATEGIAS_CAPA_MAPA.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(CAPAS.map((c) => c.id).sort());
  });

  it('dibuja las capas históricas debajo y las ambulancias encima', () => {
    expect(ESTRATEGIAS_CAPA_MAPA.map((e) => e.id)).toEqual(['calor', 'sectores', 'hospitales', 'alertas', 'ambulancias']);
  });

  it.each([
    ['ambulancias', 'dibujo-unidades', '1'],
    ['alertas', 'dibujo-alertas', '2'],
    ['hospitales', 'dibujo-hospitales', '3'],
    ['calor', 'dibujo-calor', '4'],
    ['sectores', 'dibujo-sectores', '5'],
  ] as const)('la capa %s dibuja %s con sus propios datos', (id, testId, n) => {
    dibujar(id);
    expect(screen.getByTestId(testId)).toHaveAttribute('data-n', n);
  });

  it('ambulancias marca la unidad seleccionada y avisa al elegir otra', () => {
    const ctx = dibujar('ambulancias');
    const dibujo = screen.getByTestId('dibujo-unidades');
    expect(dibujo).toHaveAttribute('data-sel', 'u-sel');
    fireEvent.click(dibujo);
    expect(ctx.seleccionarUnidad).toHaveBeenCalledWith('u-1');
    expect(ctx.seleccionarAlerta).not.toHaveBeenCalled();
  });

  it('alertas marca la alerta seleccionada y avisa al elegir otra', () => {
    const ctx = dibujar('alertas');
    const dibujo = screen.getByTestId('dibujo-alertas');
    expect(dibujo).toHaveAttribute('data-sel', 'a-sel');
    fireEvent.click(dibujo);
    expect(ctx.seleccionarAlerta).toHaveBeenCalledWith('a-1');
    expect(ctx.seleccionarUnidad).not.toHaveBeenCalled();
  });
});
