import { describe, expect, it } from 'vitest';
import { duracionesDeAlerta, formatoDuracion } from './alerta-duraciones';
import type { Alerta } from './alerta';

const t = (hms: string) => new Date(`2026-11-19T${hms}Z`);

const vacia: Alerta = {
  id: 'a', type: 'Accidente', description: '', lat: 10.46, lng: -73.25,
  createdAt: null, createdAtServer: null, creadaPorUsuarioId: '', creadaPorUid: null,
  estado: 'atendida', ambulanciaAsignada: null, fotos: [], prioridad: null,
  tomadaAt: null, rutaIniciadaAt: null, llegadaAt: null, atendidaAt: null,
  trasladoIniciadoAt: null, trasladoFinalizadoAt: null,
  hospitalDestinoId: null, hospitalDestinoNombre: null, conductorId: null, paramedicoId: null,
  etaInicialSeg: null, distanciaInicialM: null, recalculos: 0, liberaciones: 0, simulada: false,
};

describe('duracionesDeAlerta: vector de prueba de la sección 8 del plan', () => {
  const a: Alerta = {
    ...vacia,
    createdAtServer: t('10:00:00'),
    tomadaAt: t('10:00:40'),
    rutaIniciadaAt: t('10:01:00'),
    llegadaAt: t('10:09:00'),
    atendidaAt: t('10:09:01'),
    trasladoIniciadoAt: t('10:10:30'),
    trasladoFinalizadoAt: t('10:25:00'),
    etaInicialSeg: 420,
  };

  it('da los valores esperados', () => {
    const d = duracionesDeAlerta(a);
    expect(d.asignacion).toBe(40);
    expect(d.respuesta).toBe(540);
    expect(d.viaje).toBe(480);
    expect(d.enEscena).toBe(90);
    expect(d.traslado).toBe(870);
    expect(d.cicloTotal).toBe(1500);
    expect(d.errorEta).toBeCloseTo(0.1429, 4);
  });

  it('sin traslado, el ciclo total termina en atendidaAt y no hay permanencia en escena', () => {
    const d = duracionesDeAlerta({ ...a, trasladoIniciadoAt: null, trasladoFinalizadoAt: null });
    expect(d.enEscena).toBeNull();
    expect(d.traslado).toBeNull();
    expect(d.cicloTotal).toBe(541);
  });

  it('sin createdAtServer no hay duraciones basadas en él', () => {
    const d = duracionesDeAlerta({ ...a, createdAtServer: null });
    expect([d.asignacion, d.respuesta, d.cicloTotal]).toEqual([null, null, null]);
    expect(d.viaje).toBe(480);
  });

  it('descarta duraciones negativas o mayores a 24 h', () => {
    expect(duracionesDeAlerta({ ...a, llegadaAt: t('09:00:00') }).respuesta).toBeNull();
    const dia = new Date(a.createdAtServer!.getTime() + 90_000_000);
    expect(duracionesDeAlerta({ ...a, tomadaAt: dia }).asignacion).toBeNull();
  });

  it('no calcula error de ETA sin etaInicialSeg válido', () => {
    expect(duracionesDeAlerta({ ...a, etaInicialSeg: null }).errorEta).toBeNull();
    expect(duracionesDeAlerta({ ...a, etaInicialSeg: 0 }).errorEta).toBeNull();
  });
});

describe('formatoDuracion', () => {
  it('formatea en español', () => {
    expect(formatoDuracion(null)).toBe('Sin dato');
    expect(formatoDuracion(45)).toBe('45 s');
    expect(formatoDuracion(500)).toBe('8 min 20 s');
    expect(formatoDuracion(600)).toBe('10 min');
    expect(formatoDuracion(3900)).toBe('1 h 5 min');
  });
});
