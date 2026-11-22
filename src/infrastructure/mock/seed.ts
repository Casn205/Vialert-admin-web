import type { Alerta } from '@/core/domain/alerta';
import type { Ambulancia } from '@/core/domain/ambulancia';
import type { EventoAlerta } from '@/core/domain/evento';
import type { Hospital } from '@/core/domain/hospital';
import type { Personal } from '@/core/domain/personal';
import type { Ubicacion } from '@/core/domain/ubicacion';

export interface Seed {
  ambulancias: Ambulancia[];
  ubicaciones: Ubicacion[];
  alertas: Alerta[];
  eventos: Record<string, EventoAlerta[]>;
  hospitales: Hospital[];
  conductores: Personal[];
  paramedicos: Personal[];
}

const FOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#d9e0e6"/><text x="160" y="105" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#51606c">Foto de ejemplo</text></svg>',
  );

const C = { lat: 10.4631, lng: -73.2532 }; // centro del mapa de la app

/** Datos de ejemplo con tiempos relativos a `ahora`. Cubre los casos límite que la web debe manejar. */
export function crearSeed(ahora: Date = new Date()): Seed {
  const hace = (min: number, seg = 0) => new Date(ahora.getTime() - (min * 60 + seg) * 1000);
  const mas = (d: Date, seg: number) => new Date(d.getTime() + seg * 1000);

  const amb = (p: Partial<Ambulancia> & Pick<Ambulancia, 'id' | 'placa' | 'codigoInterno'>): Ambulancia => ({
    email: `${p.codigoInterno.toLowerCase()}@vialert.com`,
    entidadId: 'HOSPITAL DEL SUR',
    estadoOperativo: 'habilitada',
    currentConductorId: null,
    currentParamedicoId: null,
    currentAlertaId: null,
    enTurno: false,
    turnoIniciadoAt: null,
    ultimoCambioEstadoAt: hace(600),
    createdAt: hace(60 * 24 * 40),
    ...p,
  });

  const ambulancias: Ambulancia[] = [
    // Libre y de turno (la app deja estadoOperativo en 'enRuta' al iniciar turno).
    amb({ id: 'amb-1', placa: 'TKV201', codigoInterno: 'AMB-01', estadoOperativo: 'enRuta', enTurno: true, currentConductorId: 'c-1', currentParamedicoId: 'p-1', turnoIniciadoAt: hace(95) }),
    // Atendiendo la alerta al-2.
    amb({ id: 'amb-2', placa: 'HJKO1', codigoInterno: 'AMB-02', estadoOperativo: 'enRuta', enTurno: true, currentConductorId: 'c-2', currentParamedicoId: 'p-2', currentAlertaId: 'al-2', turnoIniciadoAt: hace(120) }),
    // Trasladando a hospital (al-3).
    amb({ id: 'amb-3', placa: 'UQR458', codigoInterno: 'AMB-03', estadoOperativo: 'enRutaHospital', enTurno: true, currentConductorId: 'c-3', currentParamedicoId: 'p-3', currentAlertaId: 'al-3', turnoIniciadoAt: hace(200) }),
    // Turno colgado: en turno, pero la app dejó de publicar hace 12 min.
    amb({ id: 'amb-4', placa: 'WZP119', codigoInterno: 'AMB-04', estadoOperativo: 'enRuta', enTurno: true, currentConductorId: 'c-4', currentParamedicoId: 'p-4', turnoIniciadoAt: hace(300) }),
    // Fuera de turno, pero con un documento de ubicación viejo (no debe verse en el mapa).
    amb({ id: 'amb-5', placa: 'MLN330', codigoInterno: 'AMB-05' }),
    amb({ id: 'amb-6', placa: 'BGT772', codigoInterno: 'AMB-06', estadoOperativo: 'inactiva', entidadId: 'CRUZ ROJA' }),
  ];

  const ub = (id: string, dLat: number, dLng: number, p: Partial<Ubicacion>): Ubicacion => ({
    ambulanciaId: id,
    lat: C.lat + dLat,
    lng: C.lng + dLng,
    rumbo: 90,
    velocidadKmh: 0,
    precisionM: 8,
    estadoOperativo: 'habilitada',
    alertaId: null,
    appVersion: '1.4.0+12',
    actualizadoAt: ahora,
    ...p,
  });

  const ubicaciones: Ubicacion[] = [
    ub('amb-1', 0.006, -0.004, { velocidadKmh: 3 }),
    ub('amb-2', -0.004, 0.007, { estadoOperativo: 'enRuta', alertaId: 'al-2', velocidadKmh: 42, rumbo: 200 }),
    ub('amb-3', 0.012, 0.003, { estadoOperativo: 'enRutaHospital', alertaId: 'al-3', velocidadKmh: 35, rumbo: 320, appVersion: '1.3.2+9' }),
    ub('amb-4', -0.009, -0.011, { actualizadoAt: hace(12), appVersion: '1.3.2+9' }),
    ub('amb-5', 0.02, 0.02, { actualizadoAt: hace(60 * 30) }),
  ];

  const hospitales: Hospital[] = [
    { id: 'h-1', nombre: 'CLINICA SANTA ISABEL', lat: 10.462299929418908, lng: -73.25119759887457 },
    { id: 'h-2', nombre: 'HOSPITAL CENTRAL (EJEMPLO)', lat: 10.4741, lng: -73.2455 },
    { id: 'h-3', nombre: 'CLINICA NORTE (EJEMPLO)', lat: 10.4802, lng: -73.2588 },
  ];

  const per = (tipo: 'conductor' | 'paramedico', n: number, nombre: string, apellido: string, ambulanciaId: string | null): Personal => ({
    id: `${tipo === 'conductor' ? 'c' : 'p'}-${n}`,
    tipo,
    nombre,
    apellido,
    cedula: `${1100000000 + n * 1111111}`,
    entidadId: ambulanciaId ? 'HOSPITAL DEL SUR' : 'NINGUNO',
    estado: ambulanciaId ? 'ocupado' : 'disponible',
    ambulanciaId,
    telefono: tipo === 'paramedico' ? `32${7000000 + n * 11111}` : null,
  });

  const conductores = [
    per('conductor', 1, 'Marco', 'Polo', 'amb-1'),
    per('conductor', 2, 'Laura', 'Pérez', 'amb-2'),
    per('conductor', 3, 'Andrés', 'Mejía', 'amb-3'),
    per('conductor', 4, 'Sara', 'Ibarra', 'amb-4'),
    per('conductor', 5, 'Julián', 'Rojas', null),
  ];
  const paramedicos = [
    per('paramedico', 1, 'Leo', 'Messi', 'amb-1'),
    per('paramedico', 2, 'Camila', 'Duarte', 'amb-2'),
    per('paramedico', 3, 'Iván', 'Torres', 'amb-3'),
    per('paramedico', 4, 'Paula', 'Vega', 'amb-4'),
    per('paramedico', 5, 'Diego', 'Santos', null),
  ];

  const base = (id: string, type: string, dLat: number, dLng: number, creada: Date, p: Partial<Alerta>): Alerta => ({
    id,
    type,
    description: 'Reporte de ejemplo',
    lat: C.lat + dLat,
    lng: C.lng + dLng,
    createdAt: mas(creada, -3),
    createdAtServer: creada,
    creadaPorUsuarioId: 'Ma Pérez',
    creadaPorUid: 'u-1',
    estado: 'activa',
    ambulanciaAsignada: null,
    fotos: [],
    prioridad: 'media',
    tomadaAt: null,
    rutaIniciadaAt: null,
    llegadaAt: null,
    atendidaAt: null,
    trasladoIniciadoAt: null,
    trasladoFinalizadoAt: null,
    hospitalDestinoId: null,
    hospitalDestinoNombre: null,
    conductorId: null,
    paramedicoId: null,
    etaInicialSeg: null,
    distanciaInicialM: null,
    recalculos: 0,
    liberaciones: 0,
    simulada: false,
    ...p,
  });

  /** Alerta atendida de punta a punta con tiempos coherentes. */
  const completa = (id: string, minAtras: number, ambulanciaId: string, n: number, p: Partial<Alerta> = {}): Alerta => {
    const t0 = hace(minAtras);
    const tomada = mas(t0, 30 + n * 5);
    const ruta = mas(tomada, 20);
    const eta = 360 + n * 30;
    const llegada = mas(ruta, eta + (n % 2 ? 40 : -30));
    const trasIni = mas(llegada, 80 + n * 10);
    const trasFin = mas(trasIni, 700 + n * 40);
    return base(id, ['Accidente', 'Emergencia médica', 'Incendio'][n % 3]!, ((n % 5) - 2) * 0.004, ((n % 4) - 2) * 0.005, t0, {
      estado: 'atendida',
      ambulanciaAsignada: ambulanciaId,
      prioridad: (['critica', 'alta', 'media', 'baja'] as const)[n % 4]!,
      tomadaAt: tomada,
      rutaIniciadaAt: ruta,
      llegadaAt: llegada,
      atendidaAt: mas(llegada, 1),
      trasladoIniciadoAt: trasIni,
      trasladoFinalizadoAt: trasFin,
      hospitalDestinoId: 'h-1',
      hospitalDestinoNombre: 'CLINICA SANTA ISABEL',
      conductorId: `c-${(n % 4) + 1}`,
      paramedicoId: `p-${(n % 4) + 1}`,
      etaInicialSeg: eta,
      recalculos: n % 3,
      ...p,
    });
  };

  const t2 = hace(11);
  const t3 = hace(25);

  const alertas: Alerta[] = [
    base('al-1', 'Accidente', 0.003, 0.002, hace(4), { prioridad: 'critica', description: 'Choque entre dos vehículos' }),
    base('al-2', 'Emergencia médica', -0.006, 0.009, t2, {
      estado: 'enProceso', prioridad: 'alta', ambulanciaAsignada: 'amb-2', tomadaAt: mas(t2, 35), rutaIniciadaAt: mas(t2, 60),
      conductorId: 'c-2', paramedicoId: 'p-2', etaInicialSeg: 480, distanciaInicialM: 3200,
    }),
    base('al-3', 'Accidente', 0.01, 0.001, t3, {
      estado: 'atendida', prioridad: 'media', ambulanciaAsignada: 'amb-3', tomadaAt: mas(t3, 30), rutaIniciadaAt: mas(t3, 50),
      llegadaAt: mas(t3, 420), atendidaAt: mas(t3, 421), trasladoIniciadoAt: mas(t3, 520), hospitalDestinoId: 'h-2',
      hospitalDestinoNombre: 'HOSPITAL CENTRAL (EJEMPLO)', conductorId: 'c-3', paramedicoId: 'p-3', etaInicialSeg: 380, fotos: [FOTO],
    }),
    base('al-4', 'Incendio', -0.008, -0.006, hace(40), { prioridad: 'baja', liberaciones: 1, description: 'Humo en un lote baldío' }),
    completa('al-5', 60 * 3, 'amb-1', 1, { fotos: [FOTO, FOTO] }),
    completa('al-6', 60 * 8, 'amb-2', 2),
    completa('al-7', 60 * 26, 'amb-3', 3, { simulada: true }),
    // Alerta antigua, anterior a la instrumentación: sin createdAtServer, hitos ni prioridad.
    base('al-8', 'Accidente', 0.002, -0.009, hace(60 * 24 * 20), {
      createdAtServer: null, createdAt: hace(60 * 24 * 20), prioridad: null, estado: 'atendida', ambulanciaAsignada: 'amb-1', description: 'Alerta anterior a la instrumentación',
    }),
  ];

  const ev = (alertaId: string, n: number, tipo: EventoAlerta['tipo'], ts: Date | null, meta: Record<string, unknown> = {}, ambulanciaId: string | null = null): EventoAlerta => ({
    id: `${alertaId}-e${n}`, tipo, ts, ambulanciaId, meta,
  });

  const eventosDe = (a: Alerta): EventoAlerta[] => {
    const out: EventoAlerta[] = [ev(a.id, 0, 'creada', a.createdAtServer, { prioridad: a.prioridad })];
    let i = 1;
    const amb = a.ambulanciaAsignada;
    if (a.tomadaAt) out.push(ev(a.id, i++, 'tomada', a.tomadaAt, {}, amb));
    if (a.rutaIniciadaAt) out.push(ev(a.id, i++, 'ruta_iniciada', a.rutaIniciadaAt, {}, amb));
    if (a.llegadaAt) out.push(ev(a.id, i++, 'llegada', a.llegadaAt, { origen: a.recalculos % 2 ? 'manual' : 'temporizador' }, amb));
    if (a.atendidaAt) out.push(ev(a.id, i++, 'atendida', a.atendidaAt, {}, amb));
    if (a.trasladoIniciadoAt) out.push(ev(a.id, i++, 'traslado_iniciado', a.trasladoIniciadoAt, { hospitalId: a.hospitalDestinoId }, amb));
    if (a.trasladoFinalizadoAt) out.push(ev(a.id, i, 'traslado_finalizado', a.trasladoFinalizadoAt, { origen: 'manual' }, amb));
    return out;
  };

  const eventos: Record<string, EventoAlerta[]> = Object.fromEntries(
    alertas.filter((a) => a.createdAtServer !== null).map((a) => [a.id, eventosDe(a)]),
  );

  return { ambulancias, ubicaciones, alertas, eventos, hospitales, conductores, paramedicos };
}
