import { describe, expect, it, vi } from 'vitest';
import { mapAlerta } from './alerta';
import { mapAmbulancia } from './ambulancia';
import { mapEvento } from './evento';
import { aFecha } from './fecha';
import { mapHospital } from './hospital';
import { mapPersonal } from './personal';
import { mapRol } from './rol';
import { mapUbicacion } from './ubicacion';

vi.spyOn(console, 'warn').mockImplementation(() => {});

const ts = (iso: string) => ({ toDate: () => new Date(iso) });

describe('aFecha', () => {
  it('lee un Timestamp (objeto con toDate)', () => {
    expect(aFecha(ts('2026-10-03T21:16:47Z'))?.toISOString()).toBe('2026-10-03T21:16:47.000Z');
  });
  it('lee texto ISO', () => {
    expect(aFecha('2026-11-19T10:00:00.000Z')?.toISOString()).toBe('2026-11-19T10:00:00.000Z');
  });
  it('interpreta "YYYY-MM-DD" como fecha LOCAL, no UTC', () => {
    const d = aFecha('2025-11-20')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2025, 10, 20]);
    expect([d.getHours(), d.getMinutes()]).toEqual([0, 0]);
  });
  it('devuelve null con valores vacíos o inválidos', () => {
    expect(aFecha(null)).toBeNull();
    expect(aFecha(undefined)).toBeNull();
    expect(aFecha('no es fecha')).toBeNull();
    expect(aFecha(42)).toBeNull();
    expect(aFecha({})).toBeNull();
  });
});

describe('mapAlerta', () => {
  const base = { type: 'Accidente', description: 'x', lat: 10.46, lng: -73.25, estado: 'activa' };

  it('mapea una alerta instrumentada completa', () => {
    const a = mapAlerta('a1', {
      ...base,
      createdAt: '2026-11-19T10:00:00.000Z',
      createdAtServer: ts('2026-11-19T10:00:02Z'),
      creadaPorUid: 'u1',
      prioridad: 'alta',
      fotos: ['https://x/0.jpg', 3, 'https://x/1.jpg'],
      etaInicialSeg: 420,
      recalculos: 2,
      liberaciones: 1,
      simulada: true,
    })!;
    expect(a.createdAtServer?.toISOString()).toBe('2026-11-19T10:00:02.000Z');
    expect(a.prioridad).toBe('alta');
    expect(a.fotos).toEqual(['https://x/0.jpg', 'https://x/1.jpg']);
    expect(a.etaInicialSeg).toBe(420);
    expect([a.recalculos, a.liberaciones, a.simulada]).toEqual([2, 1, true]);
  });

  it('tolera alertas antiguas: ausente = sin dato (null), contadores en 0', () => {
    const a = mapAlerta('viejo', base)!;
    expect(a.createdAtServer).toBeNull();
    expect(a.tomadaAt).toBeNull();
    expect(a.prioridad).toBeNull();
    expect(a.etaInicialSeg).toBeNull();
    expect(a.recalculos).toBe(0);
    expect(a.simulada).toBe(false);
    expect(a.fotos).toEqual([]);
  });

  it('usa "activa" si el estado es desconocido y descarta prioridades inválidas', () => {
    const a = mapAlerta('a', { ...base, estado: 'rara', prioridad: 'urgentisima' })!;
    expect(a.estado).toBe('activa');
    expect(a.prioridad).toBeNull();
  });

  it('descarta el documento sin coordenadas válidas', () => {
    expect(mapAlerta('a', { ...base, lat: undefined })).toBeNull();
    expect(mapAlerta('a', { ...base, lat: 120 })).toBeNull();
    expect(mapAlerta('a', { ...base, lng: 'x' })).toBeNull();
  });
});

describe('mapAmbulancia', () => {
  it('deduce enTurno del personal a bordo cuando el campo no existe', () => {
    expect(mapAmbulancia('a', { currentConductorId: 'c1' }).enTurno).toBe(true);
    expect(mapAmbulancia('a', { currentConductorId: null, currentParamedicoId: null }).enTurno).toBe(false);
  });
  it('respeta enTurno explícito', () => {
    expect(mapAmbulancia('a', { enTurno: false, currentConductorId: 'c1' }).enTurno).toBe(false);
  });
  it('mapea un documento antiguo incompleto', () => {
    const a = mapAmbulancia('u1', {
      codigoInterno: 'jumdbjq',
      createdAt: ts('2026-10-04T02:16:47Z'),
      email: 'ambulancia2@vialert.com',
      entidadId: 'HOSPITAL DEL SUR',
      estadoOperativo: 'habilitada',
      placa: 'HJKO1',
    });
    expect(a).toMatchObject({ id: 'u1', placa: 'HJKO1', enTurno: false, currentAlertaId: null });
    expect(a.createdAt?.toISOString()).toBe('2026-10-04T02:16:47.000Z');
    expect(a.turnoIniciadoAt).toBeNull();
  });
  it('usa "habilitada" si el estado es desconocido', () => {
    expect(mapAmbulancia('a', { estadoOperativo: 'x' }).estadoOperativo).toBe('habilitada');
  });
});

describe('mapUbicacion', () => {
  it('mapea una ubicación y trata actualizadoAt pendiente como null', () => {
    const u = mapUbicacion('amb1', {
      lat: 10.46,
      lng: -73.25,
      rumbo: 90,
      estadoOperativo: 'enRuta',
      alertaId: 'a1',
      appVersion: '1.2.0+5',
      actualizadoAt: null,
    })!;
    expect(u).toMatchObject({ ambulanciaId: 'amb1', rumbo: 90, estadoOperativo: 'enRuta', alertaId: 'a1' });
    expect(u.actualizadoAt).toBeNull();
    expect(u.velocidadKmh).toBeNull();
  });
  it('descarta sin coordenadas y limpia estados desconocidos', () => {
    expect(mapUbicacion('a', { lat: 1 })).toBeNull();
    expect(mapUbicacion('a', { lat: 1, lng: 1, estadoOperativo: 'inactiva' })!.estadoOperativo).toBeNull();
  });
});

describe('mapHospital', () => {
  it('mapea y descarta sin coordenadas', () => {
    expect(mapHospital('h1', { nombre: 'CLINICA SANTA ISABEL', lat: 10.4623, lng: -73.2512 })).toEqual({
      id: 'h1',
      nombre: 'CLINICA SANTA ISABEL',
      lat: 10.4623,
      lng: -73.2512,
    });
    expect(mapHospital('h2', { nombre: 'x' })).toBeNull();
  });
});

describe('mapPersonal', () => {
  it('mapea un conductor sin teléfono', () => {
    const p = mapPersonal('conductor', 'c1', {
      ambulanciaId: 'qLfiqXgIMSRCx4vCJCV895pEXWQ2',
      apellido: 'Polo',
      cedula: '1112345678',
      entidadId: '1',
      estado: 'ocupado',
      nombre: 'Marco',
    });
    expect(p).toMatchObject({ tipo: 'conductor', estado: 'ocupado', telefono: null, entidadId: '1' });
  });
  it('mapea un paramédico con teléfono y datos libres', () => {
    const p = mapPersonal('paramedico', 'p1', {
      ambulanciaId: null,
      apellido: 'messi',
      cedula: '8292928381',
      entidadId: 'ninguno',
      estado: 'disponible',
      nombre: 'leo',
      telefono: '327383819',
    });
    expect(p).toMatchObject({ tipo: 'paramedico', ambulanciaId: null, telefono: '327383819' });
  });
});

describe('mapEvento y mapRol', () => {
  it('ignora tipos de evento desconocidos', () => {
    expect(mapEvento('e1', { tipo: 'inventado', ts: ts('2026-11-19T10:00:00Z') })).toBeNull();
  });
  it('mapea un evento con meta', () => {
    const e = mapEvento('e1', { tipo: 'llegada', ts: ts('2026-11-19T10:09:00Z'), ambulanciaId: 'a', meta: { origen: 'manual' } })!;
    expect(e).toMatchObject({ tipo: 'llegada', ambulanciaId: 'a', meta: { origen: 'manual' } });
  });
  it('resuelve el rol o null', () => {
    expect(mapRol({ rol: 'admin' })).toBe('admin');
    expect(mapRol({ rol: 'otro' })).toBeNull();
    expect(mapRol(undefined)).toBeNull();
  });
});
