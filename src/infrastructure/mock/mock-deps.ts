import type { Deps } from '@/core/ports';
import { InMemoryAlertaRepository, InMemoryAmbulanciaRepository, InMemoryHospitalRepository, InMemoryPersonalRepository, InMemoryUbicacionRepository } from './in-memory-repositories';
import { MockAuthService } from './mock-auth';
import { MockKpiRepository } from './mock-kpi';
import { crearSeed } from './seed';
import { Store } from './store';

export interface OpcionesMock {
  /** Simula el movimiento de las unidades en el mapa. Default: true. */
  movimiento?: boolean;
  ahora?: Date;
}

/** Cablea todo en memoria con datos de ejemplo: no necesita Firebase ni API. */
export function createMockDeps(opts: OpcionesMock = {}): Deps {
  const seed = crearSeed(opts.ahora);
  const alertas = new Store(seed.alertas);
  const ambulancias = new Store(seed.ambulancias);
  const ubicaciones = new Store(seed.ubicaciones);
  const conductores = new Store(seed.conductores);
  const paramedicos = new Store(seed.paramedicos);
  const hospitales = new Store(seed.hospitales);

  return {
    fuente: 'mock',
    auth: new MockAuthService(),
    alertas: new InMemoryAlertaRepository(alertas, seed.eventos),
    ubicaciones: new InMemoryUbicacionRepository(ubicaciones, opts.movimiento ?? true),
    ambulancias: new InMemoryAmbulanciaRepository(ambulancias, ubicaciones, conductores, paramedicos),
    hospitales: new InMemoryHospitalRepository(hospitales),
    personal: new InMemoryPersonalRepository(conductores, paramedicos),
    kpis: new MockKpiRepository(alertas),
  };
}
