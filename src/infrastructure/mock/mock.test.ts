import { describe, expect, it } from 'vitest';
import type { Ambulancia } from '@/core/domain/ambulancia';
import type { Alerta } from '@/core/domain/alerta';
import type { Personal } from '@/core/domain/personal';
import type { Ubicacion } from '@/core/domain/ubicacion';
import { ApiError } from '../api/api-client';
import { estadistica } from './mock-kpi';
import { createMockDeps } from './mock-deps';
import { crearSeed } from './seed';

const AHORA = new Date('2026-11-20T15:00:00Z');
const deps = () => createMockDeps({ movimiento: false, ahora: AHORA });
const primero = <T>(sub: (cb: (x: T) => void) => () => void): T => {
  let v!: T;
  sub((x) => (v = x))();
  return v;
};

describe('seed', () => {
  const s = crearSeed(AHORA);
  it('cubre los casos límite que la web debe manejar', () => {
    expect(s.ambulancias.some((a) => a.enTurno && s.ubicaciones.find((u) => u.ambulanciaId === a.id)?.actualizadoAt && AHORA.getTime() - s.ubicaciones.find((u) => u.ambulanciaId === a.id)!.actualizadoAt!.getTime() > 600_000)).toBe(true); // turno colgado
    expect(s.ubicaciones.some((u) => s.ambulancias.find((a) => a.id === u.ambulanciaId)?.enTurno === false)).toBe(true); // ubicación de unidad fuera de turno
    expect(s.alertas.some((a) => a.createdAtServer === null)).toBe(true); // alerta antigua
    expect(s.alertas.some((a) => a.simulada)).toBe(true);
    expect(new Set(s.alertas.map((a) => a.estado))).toEqual(new Set(['activa', 'enProceso', 'atendida']));
  });
});

describe('InMemoryAlertaRepository', () => {
  it('suscribirActivas solo entrega activa y enProceso', () => {
    const activas = primero<Alerta[]>((cb) => deps().alertas.suscribirActivas(cb, () => {}));
    expect(activas.length).toBeGreaterThan(0);
    expect(activas.every((a) => a.estado !== 'atendida')).toBe(true);
  });
  it('listarPorRango excluye alertas antiguas salvo incluirLegado', async () => {
    const d = deps();
    const rango = { desde: new Date(AHORA.getTime() - 40 * 86_400_000), hasta: AHORA };
    const sin = await d.alertas.listarPorRango(rango);
    const con = await d.alertas.listarPorRango({ ...rango, incluirLegado: true });
    expect(sin.alertas.some((a) => a.createdAtServer === null)).toBe(false);
    expect(con.alertas.some((a) => a.createdAtServer === null)).toBe(true);
    expect(sin.truncado).toBe(false);
  });
  it('respeta el límite e informa truncado', async () => {
    const r = await deps().alertas.listarPorRango({ desde: new Date(0), hasta: AHORA, limite: 2 });
    expect(r.alertas).toHaveLength(2);
    expect(r.truncado).toBe(true);
  });
  it('lista eventos en orden cronológico', async () => {
    const ev = await deps().alertas.listarEventos('al-2');
    expect(ev[0]?.tipo).toBe('creada');
    expect(ev.map((e) => e.ts!.getTime())).toEqual([...ev.map((e) => e.ts!.getTime())].sort((a, b) => a - b));
  });
});

describe('InMemoryAmbulanciaRepository (imita la API)', () => {
  const nueva = { email: 'nueva@vialert.com', password: '12345678', placa: 'ABC123', codigoInterno: 'AMB-99', entidadId: 'hospital del sur' };

  it('crear normaliza y rechaza correo duplicado con 409', async () => {
    const d = deps();
    const a = await d.ambulancias.crear(nueva);
    expect(a.entidadId).toBe('HOSPITAL DEL SUR');
    await expect(d.ambulancias.crear(nueva)).rejects.toMatchObject({ status: 409 });
  });

  it('crearLote informa fila por fila y un error no detiene las demás', async () => {
    const d = deps();
    const r = await d.ambulancias.crearLote({
      entidadId: 'X', estadoOperativo: 'inactiva', password: '12345678',
      filas: [
        { placa: 'A1', codigoInterno: 'C1', email: 'a@x.com' },
        { placa: 'A2', codigoInterno: 'C2', email: 'a@x.com' }, // duplicado
        { placa: 'A3', codigoInterno: 'C3', email: 'c@x.com' },
      ],
    });
    expect(r.map((x) => x.ok)).toEqual([true, false, true]);
    expect(r[1]?.error).toMatch(/Ya existe/);
  });

  it('deshabilitar falla con 409 si está en turno', async () => {
    await expect(deps().ambulancias.deshabilitar('amb-1')).rejects.toBeInstanceOf(ApiError);
    await expect(deps().ambulancias.deshabilitar('amb-5')).resolves.toBeUndefined();
  });

  it('cerrarTurno libera personal, borra la ubicación y resetea la unidad', async () => {
    const d = deps();
    await d.ambulancias.cerrarTurno('amb-4'); // turno colgado
    const amb = primero<Ambulancia[]>((cb) => d.ambulancias.suscribir(cb, () => {})).find((a) => a.id === 'amb-4')!;
    expect(amb).toMatchObject({ enTurno: false, estadoOperativo: 'habilitada', currentConductorId: null });
    expect(primero<Ubicacion[]>((cb) => d.ubicaciones.suscribir(cb, () => {})).some((u) => u.ambulanciaId === 'amb-4')).toBe(false);
    const c = primero<Personal[]>((cb) => d.personal.suscribir('conductor', cb, () => {})).find((p) => p.id === 'c-4')!;
    expect(c).toMatchObject({ estado: 'disponible', ambulanciaId: null });
  });

  it('cerrarTurno falla con 409 si hay una alerta en curso', async () => {
    await expect(deps().ambulancias.cerrarTurno('amb-2')).rejects.toMatchObject({ status: 409 });
  });
});

describe('InMemoryPersonalRepository', () => {
  it('crea personal disponible y sin ambulancia', async () => {
    const d = deps();
    const id = await d.personal.crear({ tipo: 'paramedico', nombre: 'Ana', apellido: 'Gil', cedula: '1', entidadId: 'X', telefono: '300' });
    const p = primero<Personal[]>((cb) => d.personal.suscribir('paramedico', cb, () => {})).find((x) => x.id === id)!;
    expect(p).toMatchObject({ estado: 'disponible', ambulanciaId: null, telefono: '300' });
  });
  it('no elimina personal ocupado', async () => {
    const d = deps();
    await expect(d.personal.eliminar('conductor', 'c-1')).rejects.toThrow(/asignado/);
    await expect(d.personal.eliminar('conductor', 'c-5')).resolves.toBeUndefined();
  });
  it('actualizar no toca estado ni ambulanciaId', async () => {
    const d = deps();
    await d.personal.actualizar('conductor', 'c-1', { nombre: 'Nuevo' });
    const p = primero<Personal[]>((cb) => d.personal.suscribir('conductor', cb, () => {})).find((x) => x.id === 'c-1')!;
    expect(p).toMatchObject({ nombre: 'Nuevo', estado: 'ocupado', ambulanciaId: 'amb-1' });
  });
});

describe('KPIs simulados', () => {
  it('estadistica usa nearest-rank y null sin datos', () => {
    expect(estadistica([])).toEqual({ n: 0, media: null, mediana: null, p90: null });
    expect(estadistica([null, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100])).toEqual({ n: 10, media: 55, mediana: 50, p90: 90 });
  });
  it('el resumen excluye simuladas y alertas sin createdAtServer', async () => {
    const r = await deps().kpis.resumen({ desde: new Date(0), hasta: AHORA });
    expect(r.totalAlertas).toBe(6);
    expect(r.descartadas.simuladas).toBe(1);
    expect(r.descartadas.sinDato.createdAtServer).toBe(1);
    expect(r.tiempos.respuesta.n).toBeGreaterThan(0);
  });
});
