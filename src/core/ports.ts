/**
 * Puertos: lo que la UI necesita del mundo exterior. Las implementaciones viven en
 * `infrastructure/` (Firebase, API HTTP, datos simulados). Solo interfaces y tipos.
 */
import type { Alerta } from './domain/alerta';
import type {
  Ambulancia,
  CamposEditablesAmbulancia,
  NuevaAmbulancia,
  NuevoLote,
  ResultadoFila,
} from './domain/ambulancia';
import type { EventoAlerta } from './domain/evento';
import type { Hospital, NuevoHospital } from './domain/hospital';
import type { FiltroKpi, KpiRankingItem, KpiResumen, KpiSerie } from './domain/kpi';
import type {
  CamposEditablesPersonal,
  NuevoPersonal,
  Personal,
  TipoPersonal,
} from './domain/personal';
import type { AuthUser, RolUsuario } from './domain/rol';
import type { Ubicacion } from './domain/ubicacion';

export type Unsubscribe = () => void;
export type OnError = (e: Error) => void;

export interface RangoFechas {
  desde: Date;
  hasta: Date;
}

export interface FiltroAlertasRango extends RangoFechas {
  /** Además de `createdAtServer`, busca alertas antiguas por `createdAt` (ISO). */
  incluirLegado?: boolean;
  /** Default: `LIMITE_ALERTAS_DEFAULT`. */
  limite?: number;
}

export interface AlertaRepository {
  /** Alertas en estado `activa` o `enProceso`, en vivo. */
  suscribirActivas(cb: (a: Alerta[]) => void, onError: OnError): Unsubscribe;
  /** Alertas por rango de `createdAtServer`, más recientes primero. `truncado` si se alcanzó el límite. */
  listarPorRango(f: FiltroAlertasRango): Promise<{ alertas: Alerta[]; truncado: boolean }>;
  obtenerPorId(id: string): Promise<Alerta | null>;
  /** Línea de tiempo de una alerta, `ts` ascendente. */
  listarEventos(alertaId: string): Promise<EventoAlerta[]>;
}

export interface UbicacionRepository {
  suscribir(cb: (u: Ubicacion[]) => void, onError: OnError): Unsubscribe;
}

/** Lecturas desde Firestore; todos los comandos pasan por la API (Admin SDK). */
export interface AmbulanciaRepository {
  suscribir(cb: (a: Ambulancia[]) => void, onError: OnError): Unsubscribe;
  crear(d: NuevaAmbulancia & { password: string }): Promise<Ambulancia>;
  crearLote(d: NuevoLote): Promise<ResultadoFila[]>;
  actualizar(id: string, d: CamposEditablesAmbulancia): Promise<void>;
  deshabilitar(id: string): Promise<void>;
  habilitar(id: string): Promise<void>;
  resetearPassword(id: string, password: string): Promise<void>;
  /** Para turnos colgados. Falla (409) si la unidad tiene una alerta en curso. */
  cerrarTurno(id: string): Promise<void>;
}

export interface HospitalRepository {
  suscribir(cb: (h: Hospital[]) => void, onError: OnError): Unsubscribe;
  /** Devuelve el id nuevo (UUID, como la app). */
  crear(d: NuevoHospital): Promise<string>;
  actualizar(id: string, d: Partial<NuevoHospital>): Promise<void>;
  eliminar(id: string): Promise<void>;
}

export interface PersonalRepository {
  suscribir(tipo: TipoPersonal, cb: (p: Personal[]) => void, onError: OnError): Unsubscribe;
  /** Nace `disponible` y sin ambulancia. Devuelve el id nuevo (UUID, como la app). */
  crear(d: NuevoPersonal): Promise<string>;
  /** Nunca modifica `estado` ni `ambulanciaId`. */
  actualizar(tipo: TipoPersonal, id: string, d: CamposEditablesPersonal): Promise<void>;
  /** Rechaza si el personal está `ocupado`. */
  eliminar(tipo: TipoPersonal, id: string): Promise<void>;
}

export interface KpiRepository {
  resumen(f: FiltroKpi): Promise<KpiResumen>;
  series(f: FiltroKpi & { granularidad: 'dia' | 'hora' }): Promise<KpiSerie[]>;
  ranking(
    f: FiltroKpi & { por: 'ambulancia' | 'conductor' | 'paramedico' | 'hospital' },
  ): Promise<KpiRankingItem[]>;
  descargarAlertasCsv(f: FiltroKpi): Promise<Blob>;
}

export interface AuthService {
  onAuthChange(cb: (u: AuthUser | null) => void): Unsubscribe;
  /** Lanza `AuthError` con un mensaje ya en español. */
  login(email: string, password: string): Promise<AuthUser>;
  logout(): Promise<void>;
  /** Lee `roles/{uid}`. `null` si no existe o el rol es desconocido. */
  obtenerRol(uid: string): Promise<RolUsuario | null>;
  obtenerIdToken(): Promise<string>;
}

/** Todo lo que la aplicación inyecta a las features (ver `app/deps.tsx`). */
export interface Deps {
  /** Para mostrar la insignia "Datos simulados". */
  fuente: 'mock' | 'firebase';
  auth: AuthService;
  alertas: AlertaRepository;
  ubicaciones: UbicacionRepository;
  ambulancias: AmbulanciaRepository;
  hospitales: HospitalRepository;
  personal: PersonalRepository;
  kpis: KpiRepository;
}
