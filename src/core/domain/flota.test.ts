import { describe, expect, it } from 'vitest';
import { crearSeed } from '@/infrastructure/mock/seed';
import type { Ambulancia } from './ambulancia';
import {
  construirUnidades,
  contarPanel,
  disponiblesEnArea,
  estaSinSenal,
  estadoOperativoDe,
  esVisible,
  textoPersonal,
} from './flota';
import type { Ubicacion } from './ubicacion';

const AHORA = new Date('2026-11-21T15:00:00Z');
const hace = (seg: number) => new Date(AHORA.getTime() - seg * 1000);

const ubic = (p: Partial<Ubicacion> = {}): Ubicacion => ({
  ambulanciaId: 'a1',
  lat: 10.4631,
  lng: -73.2532,
  rumbo: null,
  velocidadKmh: null,
  precisionM: null,
  estadoOperativo: 'habilitada',
  alertaId: null,
  appVersion: null,
  actualizadoAt: AHORA,
  ...p,
});
const amb = (p: Partial<Ambulancia> = {}): Ambulancia => ({
  id: 'a1',
  email: 'a@x.co',
  placa: 'AAA111',
  codigoInterno: 'AMB-1',
  entidadId: 'X',
  estadoOperativo: 'enRuta',
  currentConductorId: null,
  currentParamedicoId: null,
  currentAlertaId: null,
  enTurno: true,
  turnoIniciadoAt: null,
  ultimoCambioEstadoAt: null,
  createdAt: null,
  ...p,
});
const entrada = (u: Ubicacion[], a: Ambulancia[]) => ({ ubicaciones: u, ambulancias: a, conductores: [], paramedicos: [], ahora: AHORA });

describe('estaSinSenal', () => {
  it('usa el umbral de 90 s (el límite exacto aún tiene señal)', () => {
    expect(estaSinSenal(ubic({ actualizadoAt: hace(90) }), AHORA)).toBe(false);
    expect(estaSinSenal(ubic({ actualizadoAt: hace(91) }), AHORA)).toBe(true);
    expect(estaSinSenal(ubic({ actualizadoAt: hace(30) }), AHORA)).toBe(false);
  });
  it('actualizadoAt nulo (escritura pendiente) cuenta como "ahora"', () => {
    expect(estaSinSenal(ubic({ actualizadoAt: null }), AHORA)).toBe(false);
  });
  it('respeta un umbral distinto', () => {
    expect(estaSinSenal(ubic({ actualizadoAt: hace(40) }), AHORA, 30)).toBe(true);
  });
});

describe('esVisible', () => {
  it('oculta solo si la ambulancia existe y enTurno es false', () => {
    expect(esVisible(amb({ enTurno: false }))).toBe(false);
    expect(esVisible(amb({ enTurno: true }))).toBe(true);
    expect(esVisible(null)).toBe(true);
  });
});

describe('estadoOperativoDe', () => {
  it('traduce el estado de la ubicación', () => {
    expect(estadoOperativoDe(ubic({ estadoOperativo: 'habilitada' }), null)).toBe('disponible');
    expect(estadoOperativoDe(ubic({ estadoOperativo: 'enRuta' }), null)).toBe('atendiendo');
    expect(estadoOperativoDe(ubic({ estadoOperativo: 'enRutaHospital' }), null)).toBe('traslado');
  });
  it('sin estado en la ubicación, lo deduce de la alerta en curso y no del estado ambiguo de la ambulancia', () => {
    // La app deja `enRuta` en la ambulancia al iniciar turno aunque esté libre: no debe contar como "atendiendo".
    expect(estadoOperativoDe(ubic({ estadoOperativo: null }), amb({ estadoOperativo: 'enRuta' }))).toBe('disponible');
    expect(estadoOperativoDe(ubic({ estadoOperativo: null, alertaId: 'x' }), null)).toBe('atendiendo');
    expect(estadoOperativoDe(ubic({ estadoOperativo: null }), amb({ currentAlertaId: 'x' }))).toBe('atendiendo');
    expect(estadoOperativoDe(ubic({ estadoOperativo: null }), amb({ currentAlertaId: 'x', estadoOperativo: 'enRutaHospital' }))).toBe('traslado');
  });
});

describe('construirUnidades', () => {
  it('oculta ubicaciones de ambulancias fuera de turno y muestra las que no tienen documento', () => {
    const u = construirUnidades(
      entrada(
        [ubic({ ambulanciaId: 'a1' }), ubic({ ambulanciaId: 'a2' }), ubic({ ambulanciaId: 'a3' })],
        [amb({ id: 'a1' }), amb({ id: 'a2', enTurno: false })],
      ),
    );
    expect(u.map((x) => x.id)).toEqual(['a1', 'a3']);
    expect(u[1]!.ambulancia).toBeNull();
  });
  it('sin señal pisa el color operativo y marca turno colgado solo si está en turno', () => {
    const [colgada, sinDoc, viva] = construirUnidades(
      entrada(
        [
          ubic({ ambulanciaId: 'a1', estadoOperativo: 'enRuta', actualizadoAt: hace(700) }),
          ubic({ ambulanciaId: 'a2', actualizadoAt: hace(700) }),
          ubic({ ambulanciaId: 'a3', actualizadoAt: hace(5) }),
        ],
        [amb({ id: 'a1' }), amb({ id: 'a3' })],
      ),
    ) as [ReturnType<typeof construirUnidades>[number], ...ReturnType<typeof construirUnidades>];
    expect(colgada.estado).toBe('sinSenal');
    expect(colgada.operativo).toBe('atendiendo');
    expect(colgada.turnoColgado).toBe(true);
    expect(sinDoc!.sinSenal).toBe(true);
    expect(sinDoc!.turnoColgado).toBe(false); // sin documento no se sabe que esté en turno
    expect(viva!.turnoColgado).toBe(false);
  });
  it('un reloj que avanza hace que el estado cambie sin datos nuevos', () => {
    const e = entrada([ubic({ actualizadoAt: hace(60) })], [amb()]);
    expect(construirUnidades(e)[0]!.estado).toBe('disponible');
    expect(construirUnidades({ ...e, ahora: new Date(AHORA.getTime() + 60_000) })[0]!.estado).toBe('sinSenal');
  });
  it('con la semilla de ejemplo: oculta AMB-05, deja AMB-04 colgada y cubre los 4 estados', () => {
    const s = crearSeed(AHORA);
    const u = construirUnidades({ ...s, ahora: AHORA });
    expect(u.map((x) => x.id).sort()).toEqual(['amb-1', 'amb-2', 'amb-3', 'amb-4']);
    expect(u.map((x) => x.estado).sort()).toEqual(['atendiendo', 'disponible', 'sinSenal', 'traslado']);
    expect(u.find((x) => x.id === 'amb-4')!.turnoColgado).toBe(true);
    expect(textoPersonal(u.find((x) => x.id === 'amb-1')!)).toBe('Marco Polo · Leo Messi');
  });
});

describe('contarPanel y disponiblesEnArea', () => {
  const s = crearSeed(AHORA);
  const unidades = construirUnidades({ ...s, ahora: AHORA });

  it('cuenta alertas y unidades', () => {
    expect(contarPanel(unidades, s.alertas.filter((a) => a.estado !== 'atendida'))).toEqual({
      alertasActivas: 2,
      alertasEnProceso: 1,
      disponibles: 1,
      atendiendo: 1,
      traslado: 1,
      sinSenal: 1,
    });
  });
  it('lista solo unidades libres y con señal, por distancia', () => {
    const centro = { lat: 10.4631, lng: -73.2532 };
    const r = disponiblesEnArea(unidades, centro, 3);
    expect(r.map((x) => x.unidad.id)).toEqual(['amb-1']);
    expect(r[0]!.distanciaKm).toBeGreaterThan(0.5);
    expect(disponiblesEnArea(unidades, centro, 0.1)).toEqual([]);
  });
  it('ordena de más cerca a más lejos y respeta el radio', () => {
    const libres = [
      ubic({ ambulanciaId: 'lejos', lat: 10.4631 + 0.02 }),
      ubic({ ambulanciaId: 'cerca', lat: 10.4631 + 0.004 }),
      ubic({ ambulanciaId: 'fuera', lat: 10.4631 + 0.2 }),
      ubic({ ambulanciaId: 'ocupada', lat: 10.4631 + 0.001, estadoOperativo: 'enRuta' }),
    ];
    const u = construirUnidades(entrada(libres, []));
    expect(disponiblesEnArea(u, { lat: 10.4631, lng: -73.2532 }, 3).map((x) => x.unidad.id)).toEqual(['cerca', 'lejos']);
    expect(disponiblesEnArea(u, { lat: 10.4631, lng: -73.2532 }, 1).map((x) => x.unidad.id)).toEqual(['cerca']);
  });
});
