import { describe, expect, it } from 'vitest';
import { crearSeed } from '@/infrastructure/mock/seed';
import type { Alerta } from './alerta';
import {
  colorDePrioridad,
  esperaSeg,
  filtrarAlertas,
  FILTRO_ALERTAS_VACIO,
  ordenarPorUrgencia,
  rangoDeFechas,
  rangoUltimosDias,
  tiposDisponibles,
} from './alerta-vista';

const AHORA = new Date('2026-11-21T15:00:00Z');
const seed = crearSeed(AHORA);
const al = (id: string, p: Partial<Alerta>): Alerta => ({ ...seed.alertas[0]!, id, ...p });
const min = (m: number) => new Date(AHORA.getTime() - m * 60_000);

describe('ordenarPorUrgencia', () => {
  it('prioridad de crítica a baja, sin prioridad al final, y dentro de cada una la más antigua primero', () => {
    const lista = [
      al('baja', { prioridad: 'baja', createdAtServer: min(50) }),
      al('sin', { prioridad: null, createdAtServer: min(90) }),
      al('media-nueva', { prioridad: 'media', createdAtServer: min(2) }),
      al('critica-nueva', { prioridad: 'critica', createdAtServer: min(1) }),
      al('media-vieja', { prioridad: 'media', createdAtServer: min(30) }),
      al('critica-vieja', { prioridad: 'critica', createdAtServer: min(20) }),
    ];
    expect(ordenarPorUrgencia(lista).map((a) => a.id)).toEqual([
      'critica-vieja', 'critica-nueva', 'media-vieja', 'media-nueva', 'baja', 'sin',
    ]);
  });
  it('usa createdAt si no hay createdAtServer y no modifica la lista original', () => {
    const lista = [
      al('b', { createdAtServer: null, createdAt: min(5) }),
      al('a', { createdAtServer: null, createdAt: min(10) }),
      al('c', { createdAtServer: null, createdAt: null }),
    ];
    expect(ordenarPorUrgencia(lista).map((a) => a.id)).toEqual(['a', 'b', 'c']);
    expect(lista.map((a) => a.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('esperaSeg', () => {
  it('mide desde createdAtServer, no desde la hora del teléfono', () => {
    const a = al('x', { createdAtServer: min(10), createdAt: min(60) });
    expect(esperaSeg(a, AHORA)).toBe(600);
  });
  it('cae a createdAt, devuelve null sin fechas y nunca es negativa', () => {
    expect(esperaSeg(al('x', { createdAtServer: null, createdAt: min(2) }), AHORA)).toBe(120);
    expect(esperaSeg(al('x', { createdAtServer: null, createdAt: null }), AHORA)).toBeNull();
    expect(esperaSeg(al('x', { createdAtServer: new Date(AHORA.getTime() + 5000) }), AHORA)).toBe(0);
  });
});

describe('filtrarAlertas', () => {
  const lista = seed.alertas;
  it('excluye simuladas por defecto e incluye si se pide', () => {
    expect(filtrarAlertas(lista, FILTRO_ALERTAS_VACIO).map((a) => a.id)).not.toContain('al-7');
    expect(filtrarAlertas(lista, { ...FILTRO_ALERTAS_VACIO, incluirSimuladas: true }).map((a) => a.id)).toContain('al-7');
  });
  it('filtra por tipo, estado y prioridad (incluida "sin prioridad")', () => {
    expect(filtrarAlertas(lista, { ...FILTRO_ALERTAS_VACIO, tipo: 'Incendio' }).every((a) => a.type === 'Incendio')).toBe(true);
    expect(filtrarAlertas(lista, { ...FILTRO_ALERTAS_VACIO, estado: 'enProceso' }).map((a) => a.id)).toEqual(['al-2']);
    expect(filtrarAlertas(lista, { ...FILTRO_ALERTAS_VACIO, prioridad: 'sin' }).map((a) => a.id)).toEqual(['al-8']);
    expect(filtrarAlertas(lista, { ...FILTRO_ALERTAS_VACIO, prioridad: 'critica' }).map((a) => a.id)).toContain('al-1');
  });
});

describe('tiposDisponibles', () => {
  it('precarga los 4 conocidos y agrega los que aparecen en los datos, sin duplicar', () => {
    const t = tiposDisponibles([al('1', { type: 'Rescate' }), al('2', { type: 'Accidente' }), al('3', { type: ' Rescate ' }), al('4', { type: '' })]);
    expect(t).toEqual(['Accidente', 'Emergencia médica', 'Incendio', 'Otro', 'Rescate']);
  });
});

describe('rangos y colores', () => {
  it('rangoUltimosDias: 1 = desde las 00:00 de hoy; 7 = seis días antes', () => {
    const ahora = new Date(2026, 10, 21, 15, 30);
    expect(rangoUltimosDias(1, ahora).desde).toEqual(new Date(2026, 10, 21));
    expect(rangoUltimosDias(7, ahora).desde).toEqual(new Date(2026, 10, 15));
    expect(rangoUltimosDias(7, ahora).hasta).toBe(ahora);
  });
  it('rangoDeFechas cubre el último día completo y rechaza entradas inválidas', () => {
    const r = rangoDeFechas('2026-11-01', '2026-11-03')!;
    expect(r.desde).toEqual(new Date(2026, 10, 1));
    expect(r.hasta).toEqual(new Date(2026, 10, 3, 23, 59, 59, 999));
    expect(rangoDeFechas('2026-11-05', '2026-11-03')).toBeNull();
    expect(rangoDeFechas('', '2026-11-03')).toBeNull();
    expect(rangoDeFechas('hoy', 'mañana')).toBeNull();
  });
  it('cada prioridad tiene su color y "sin prioridad" es gris', () => {
    const colores = new Set([colorDePrioridad('critica'), colorDePrioridad('alta'), colorDePrioridad('media'), colorDePrioridad('baja'), colorDePrioridad(null)]);
    expect(colores.size).toBe(5);
  });
});
