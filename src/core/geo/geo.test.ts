import { describe, expect, it } from 'vitest';
import { distanciaKm, distanciaM, dentroDelRadio, limitesDe } from './geo-utils';
import { agruparEnCeldas, topCeldas } from './grid';

const centro = { lat: 10.4631, lng: -73.2532 };

describe('distancia (Haversine)', () => {
  it('es 0 para el mismo punto', () => {
    expect(distanciaM(centro, centro)).toBe(0);
  });
  it('0.01° de latitud ≈ 1,11 km', () => {
    expect(distanciaKm(centro, { lat: centro.lat + 0.01, lng: centro.lng })).toBeCloseTo(1.11, 1);
  });
  it('es simétrica', () => {
    const b = { lat: 10.5, lng: -73.2 };
    expect(distanciaM(centro, b)).toBeCloseTo(distanciaM(b, centro), 6);
  });
});

describe('limitesDe y dentroDelRadio', () => {
  it('calcula el rectángulo que contiene a los puntos', () => {
    expect(limitesDe([{ lat: 1, lng: 5 }, { lat: 3, lng: 2 }, { lat: 2, lng: 9 }])).toEqual({
      sur: 1,
      norte: 3,
      oeste: 2,
      este: 9,
    });
    expect(limitesDe([])).toBeNull();
  });
  it('filtra por radio y ordena por cercanía', () => {
    const items = [
      { id: 'lejos', ...{ lat: centro.lat + 0.1, lng: centro.lng } },
      { id: 'medio', ...{ lat: centro.lat + 0.02, lng: centro.lng } },
      { id: 'cerca', ...{ lat: centro.lat + 0.005, lng: centro.lng } },
    ];
    const r = dentroDelRadio(items, (i) => i, centro, 3);
    expect(r.map((x) => x.item.id)).toEqual(['cerca', 'medio']);
  });
});

describe('agruparEnCeldas', () => {
  it('agrupa puntos cercanos en la misma celda y separa los lejanos', () => {
    const celdas = agruparEnCeldas([
      { lat: 10.4631, lng: -73.2532 },
      { lat: 10.46312, lng: -73.25322 },
      { lat: 10.5631, lng: -73.2532 },
    ]);
    expect(celdas).toHaveLength(2);
    expect(celdas[0]!.conteo).toBe(2);
    expect(celdas[1]!.conteo).toBe(1);
  });
  it('las celdas miden ~500 m de lado y contienen su punto', () => {
    const p = { lat: 10.4631, lng: -73.2532 };
    const [c] = agruparEnCeldas([p]);
    const lado = distanciaM(
      { lat: c!.limites.sur, lng: c!.limites.oeste },
      { lat: c!.limites.norte, lng: c!.limites.oeste },
    );
    expect(lado).toBeGreaterThan(480);
    expect(lado).toBeLessThan(520);
    expect(p.lat).toBeGreaterThanOrEqual(c!.limites.sur);
    expect(p.lat).toBeLessThan(c!.limites.norte);
    expect(p.lng).toBeGreaterThanOrEqual(c!.limites.oeste);
    expect(p.lng).toBeLessThan(c!.limites.este);
  });
  it('es estable: la misma zona da el mismo id sin importar el resto de datos', () => {
    const a = agruparEnCeldas([centro])[0]!.id;
    const b = agruparEnCeldas([{ lat: 11, lng: -74 }, centro]).find((c) => c.conteo === 1 && c.id === a);
    expect(b).toBeDefined();
  });
  it('ordena de mayor a menor y topCeldas recorta', () => {
    const pts = [
      ...Array(3).fill({ lat: 10.4631, lng: -73.2532 }),
      ...Array(5).fill({ lat: 10.5, lng: -73.2 }),
      { lat: 10.6, lng: -73.1 },
    ];
    const celdas = agruparEnCeldas(pts);
    expect(celdas.map((c) => c.conteo)).toEqual([5, 3, 1]);
    expect(topCeldas(celdas, 2)).toHaveLength(2);
  });
  it('sin puntos devuelve lista vacía', () => {
    expect(agruparEnCeldas([])).toEqual([]);
  });
});
