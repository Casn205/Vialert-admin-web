import { LIMITE_ALERTAS_DEFAULT } from '@/core/domain/constants';
import { fechaCreacion, type Alerta } from '@/core/domain/alerta';
import type {
  Ambulancia,
  CamposEditablesAmbulancia,
  NuevaAmbulancia,
  NuevoLote,
  ResultadoFila,
} from '@/core/domain/ambulancia';
import type { EventoAlerta } from '@/core/domain/evento';
import type { Hospital, NuevoHospital } from '@/core/domain/hospital';
import type {
  CamposEditablesPersonal,
  NuevoPersonal,
  Personal,
  TipoPersonal,
} from '@/core/domain/personal';
import type { Ubicacion } from '@/core/domain/ubicacion';
import type {
  AlertaRepository,
  AmbulanciaRepository,
  FiltroAlertasRango,
  HospitalRepository,
  OnError,
  PersonalRepository,
  UbicacionRepository,
  Unsubscribe,
} from '@/core/ports';
import { ApiError } from '../api/api-client';
import { Store } from './store';

const uuid = () => crypto.randomUUID();

export class InMemoryAlertaRepository implements AlertaRepository {
  constructor(
    private readonly alertas: Store<Alerta[]>,
    private readonly eventos: Record<string, EventoAlerta[]>,
  ) {}

  suscribirActivas(cb: (a: Alerta[]) => void): Unsubscribe {
    return this.alertas.subscribe((l) => cb(l.filter((a) => a.estado === 'activa' || a.estado === 'enProceso')));
  }

  async listarPorRango(f: FiltroAlertasRango): Promise<{ alertas: Alerta[]; truncado: boolean }> {
    const tope = f.limite ?? LIMITE_ALERTAS_DEFAULT;
    const dentro = (d: Date | null) => d !== null && d >= f.desde && d <= f.hasta;
    const lista = this.alertas
      .get()
      .filter((a) => dentro(a.createdAtServer) || (f.incluirLegado === true && a.createdAtServer === null && dentro(a.createdAt)))
      .sort((a, b) => (fechaCreacion(b)?.getTime() ?? 0) - (fechaCreacion(a)?.getTime() ?? 0));
    return { alertas: lista.slice(0, tope), truncado: lista.length > tope };
  }

  async obtenerPorId(id: string): Promise<Alerta | null> {
    return this.alertas.get().find((a) => a.id === id) ?? null;
  }

  async listarEventos(alertaId: string): Promise<EventoAlerta[]> {
    return [...(this.eventos[alertaId] ?? [])].sort((a, b) => (a.ts?.getTime() ?? 0) - (b.ts?.getTime() ?? 0));
  }
}

/** Publica las ubicaciones y, mientras haya suscriptores, simula el movimiento de las unidades con señal. */
export class InMemoryUbicacionRepository implements UbicacionRepository {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly ubicaciones: Store<Ubicacion[]>,
    private readonly movimiento: boolean,
    private readonly ahora: () => Date = () => new Date(),
  ) {}

  suscribir(cb: (u: Ubicacion[]) => void, _onError?: OnError): Unsubscribe {
    const off = this.ubicaciones.subscribe(cb);
    if (this.movimiento && !this.timer) this.timer = setInterval(() => this.mover(), 2000);
    return () => {
      off();
      if (this.timer && this.ubicaciones.cantidadSuscriptores === 0) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
  }

  private mover(): void {
    const ahora = this.ahora();
    this.ubicaciones.update((lista) =>
      lista.map((u) => {
        // Las unidades "sin señal" (latido viejo) no se mueven ni actualizan.
        if (!u.actualizadoAt || ahora.getTime() - u.actualizadoAt.getTime() > 60_000) return u;
        const paso = u.estadoOperativo === 'habilitada' ? 0.00008 : 0.0003;
        const ang = ((u.rumbo ?? 0) + (Math.random() * 40 - 20) + 360) % 360;
        const rad = (ang * Math.PI) / 180;
        return {
          ...u,
          lat: u.lat + Math.cos(rad) * paso,
          lng: u.lng + Math.sin(rad) * paso,
          rumbo: Math.round(ang),
          velocidadKmh: u.estadoOperativo === 'habilitada' ? 4 : 30 + Math.round(Math.random() * 20),
          actualizadoAt: ahora,
        };
      }),
    );
  }
}

const conflicto = (msg: string) => new ApiError(409, 'CONFLICT', msg);

/** Imita los comandos de la API (mismas reglas y errores que el contrato 6.1 del plan). */
export class InMemoryAmbulanciaRepository implements AmbulanciaRepository {
  constructor(
    private readonly ambulancias: Store<Ambulancia[]>,
    private readonly ubicaciones: Store<Ubicacion[]>,
    private readonly conductores: Store<Personal[]>,
    private readonly paramedicos: Store<Personal[]>,
  ) {}

  suscribir(cb: (a: Ambulancia[]) => void): Unsubscribe {
    return this.ambulancias.subscribe(cb);
  }

  private nueva(d: NuevaAmbulancia, estado: 'habilitada' | 'inactiva'): Ambulancia {
    const email = d.email.trim();
    if (this.ambulancias.get().some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      throw conflicto(`Ya existe una ambulancia con el correo ${email}.`);
    }
    const a: Ambulancia = {
      id: `amb-${uuid().slice(0, 8)}`,
      email,
      placa: d.placa.trim(),
      codigoInterno: d.codigoInterno.trim(),
      entidadId: d.entidadId.trim().toUpperCase(),
      estadoOperativo: estado,
      currentConductorId: null,
      currentParamedicoId: null,
      currentAlertaId: null,
      enTurno: false,
      turnoIniciadoAt: null,
      ultimoCambioEstadoAt: null,
      createdAt: new Date(),
    };
    this.ambulancias.update((l) => [...l, a]);
    return a;
  }

  async crear(d: NuevaAmbulancia & { password: string }): Promise<Ambulancia> {
    return this.nueva(d, 'habilitada');
  }

  async crearLote(d: NuevoLote): Promise<ResultadoFila[]> {
    return d.filas.map((f, fila): ResultadoFila => {
      try {
        const a = this.nueva({ ...f, entidadId: d.entidadId }, d.estadoOperativo);
        return { fila, ok: true, id: a.id };
      } catch (e) {
        return { fila, ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
      }
    });
  }

  private cambiar(id: string, fn: (a: Ambulancia) => Ambulancia): void {
    if (!this.ambulancias.get().some((a) => a.id === id)) throw new ApiError(404, 'NOT_FOUND', 'La ambulancia no existe.');
    this.ambulancias.update((l) => l.map((a) => (a.id === id ? fn(a) : a)));
  }

  private obtener(id: string): Ambulancia {
    const a = this.ambulancias.get().find((x) => x.id === id);
    if (!a) throw new ApiError(404, 'NOT_FOUND', 'La ambulancia no existe.');
    return a;
  }

  async actualizar(id: string, d: CamposEditablesAmbulancia): Promise<void> {
    this.cambiar(id, (a) => ({
      ...a,
      ...(d.placa !== undefined && { placa: d.placa.trim() }),
      ...(d.codigoInterno !== undefined && { codigoInterno: d.codigoInterno.trim() }),
      ...(d.entidadId !== undefined && { entidadId: d.entidadId.trim().toUpperCase() }),
    }));
  }

  async deshabilitar(id: string): Promise<void> {
    const a = this.obtener(id);
    if (a.enTurno || a.currentAlertaId) throw conflicto('La ambulancia está en turno o atendiendo una alerta.');
    this.cambiar(id, (x) => ({ ...x, estadoOperativo: 'inactiva', ultimoCambioEstadoAt: new Date() }));
  }

  async habilitar(id: string): Promise<void> {
    this.cambiar(id, (x) => ({ ...x, estadoOperativo: 'habilitada', ultimoCambioEstadoAt: new Date() }));
  }

  async resetearPassword(id: string, password: string): Promise<void> {
    this.obtener(id);
    if (password.length < 8) throw new ApiError(400, 'VALIDATION_ERROR', 'La contraseña debe tener al menos 8 caracteres.');
  }

  async cerrarTurno(id: string): Promise<void> {
    const a = this.obtener(id);
    if (a.currentAlertaId) throw conflicto('La ambulancia tiene una alerta en curso.');
    this.cambiar(id, (x) => ({
      ...x,
      currentConductorId: null,
      currentParamedicoId: null,
      estadoOperativo: 'habilitada',
      enTurno: false,
      turnoIniciadoAt: null,
      ultimoCambioEstadoAt: new Date(),
    }));
    this.ubicaciones.update((l) => l.filter((u) => u.ambulanciaId !== id));
    const liberar = (l: Personal[]) =>
      l.map((p) => (p.ambulanciaId === id ? { ...p, estado: 'disponible' as const, ambulanciaId: null } : p));
    this.conductores.update(liberar);
    this.paramedicos.update(liberar);
  }
}

export class InMemoryHospitalRepository implements HospitalRepository {
  constructor(private readonly hospitales: Store<Hospital[]>) {}

  suscribir(cb: (h: Hospital[]) => void): Unsubscribe {
    return this.hospitales.subscribe(cb);
  }
  async crear(d: NuevoHospital): Promise<string> {
    const id = uuid();
    this.hospitales.update((l) => [...l, { id, ...d }]);
    return id;
  }
  async actualizar(id: string, d: Partial<NuevoHospital>): Promise<void> {
    this.hospitales.update((l) => l.map((h) => (h.id === id ? { ...h, ...d } : h)));
  }
  async eliminar(id: string): Promise<void> {
    this.hospitales.update((l) => l.filter((h) => h.id !== id));
  }
}

export class InMemoryPersonalRepository implements PersonalRepository {
  constructor(
    private readonly conductores: Store<Personal[]>,
    private readonly paramedicos: Store<Personal[]>,
  ) {}

  private store(tipo: TipoPersonal): Store<Personal[]> {
    return tipo === 'conductor' ? this.conductores : this.paramedicos;
  }

  suscribir(tipo: TipoPersonal, cb: (p: Personal[]) => void): Unsubscribe {
    return this.store(tipo).subscribe(cb);
  }
  async crear(d: NuevoPersonal): Promise<string> {
    const id = uuid();
    const p: Personal = {
      id,
      tipo: d.tipo,
      nombre: d.nombre,
      apellido: d.apellido,
      cedula: d.cedula,
      entidadId: d.entidadId,
      estado: 'disponible',
      ambulanciaId: null,
      telefono: d.tipo === 'paramedico' ? (d.telefono ?? '') : null,
    };
    this.store(d.tipo).update((l) => [...l, p]);
    return id;
  }
  async actualizar(tipo: TipoPersonal, id: string, d: CamposEditablesPersonal): Promise<void> {
    const { nombre, apellido, cedula, entidadId, telefono } = d;
    this.store(tipo).update((l) =>
      l.map((p) =>
        p.id === id
          ? {
              ...p,
              ...(nombre !== undefined && { nombre }),
              ...(apellido !== undefined && { apellido }),
              ...(cedula !== undefined && { cedula }),
              ...(entidadId !== undefined && { entidadId }),
              ...(tipo === 'paramedico' && telefono !== undefined && { telefono }),
            }
          : p,
      ),
    );
  }
  async eliminar(tipo: TipoPersonal, id: string): Promise<void> {
    const p = this.store(tipo).get().find((x) => x.id === id);
    if (p?.estado === 'ocupado') {
      throw new Error('No se puede eliminar: está asignado a una ambulancia en turno.');
    }
    this.store(tipo).update((l) => l.filter((x) => x.id !== id));
  }
}
