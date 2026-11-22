# Plan maestro: Panel web de administración (ambulancias y alertas)

> Documento autocontenido para agentes de IA que implementan el proyecto.
> Versión 2: ajustada al código real de la app (`lib/` completo revisado) y con patrones de diseño reducidos a los necesarios.
> Idioma del producto y de los textos de UI: español.

---

## 0. Cómo usar este documento (leer primero)

**Rol de cada parte.** El *orquestador* (humano + Claude) definió este plan. Tú eres el *agente implementador*: ejecutas **un punto de control a la vez** (sección 9). Este documento es tu única fuente de contexto.

**Protocolo de trabajo**
1. Lee las secciones 1 a 6 completas y luego tu punto de control (9) y las secciones funcionales que cite (7, 8).
2. **No inventes** colecciones, campos, endpoints ni valores. Si algo falta y no tiene valor por defecto en la sección 12, anótalo en `docs/PREGUNTAS.md` y sigue con la opción más conservadora.
3. **Principio de simplicidad.** Usa funciones y componentes simples. Solo se aplica un patrón de diseño si resuelve un problema concreto de este documento (catálogo en la sección 4). Si crees que otro patrón hace falta, justifícalo en una línea en `docs/PROGRESO.md` antes de añadirlo.
4. Respeta las reglas de dependencia de la sección 4.1 (se verifican con lint).
5. Escribe cada archivo **completo desde el primer punto de control en que se necesita**. Los archivos compartidos (dominio, mappers, puertos, repositorios, router) se entregan completos en el punto 1-A para que las fases posteriores solo **agreguen** archivos. No modifiques archivos de fases anteriores salvo los de la sección 10.
6. Cada punto de control termina con: código + pruebas + `docs/PROGRESO.md` actualizado (casillas de la sección 9) + lista breve de supuestos.
7. **Definición de hecho:** `typecheck`, lint y pruebas en verde; funciona con `VITE_DATA_SOURCE=mock` sin conexión a Firebase; cumple los criterios de aceptación del punto.

**Convenciones**
- Entidades y campos de dominio en **español**, idénticos a Firestore (`Alerta`, `estadoOperativo`). Elementos técnicos en **inglés** (`Repository`, `Mapper`). Archivos en `kebab-case`, componentes en `PascalCase`.
- TypeScript `strict`, sin `any` (usar `unknown` + Zod).
- Textos de UI en español.

---

## 1. Producto

Ampliación para el **administrador** de una app móvil de gestión de ambulancias y alertas. Se construye una **web** (React) con un **backend** (Node) que permite:

1. **Mapa en vivo:** ubicación de ambulancias y alertas en tiempo real; sectores con más alertas (calor y cuadrícula); ambulancias disponibles en un área; información relevante.
2. **Gestión de datos** que hoy se hace en la app de administración: ambulancias (incluida la creación **por lotes de flota**), conductores, paramédicos y hospitales.
3. **Alertas:** listado, detalle, fotos y línea de tiempo.
4. **Dashboard de KPIs** y reportes exportables.

Solo administradores (`roles/{uid}.rol == 'admin'`). La web **comparte el mismo proyecto Firebase** que la app: no hay datos duplicados.

Fuera de alcance v1: crear/editar alertas desde la web, eliminar ambulancias, disponibilidad histórica de flota, notificaciones push, permisos por entidad.

---

## 2. Sistema existente (app móvil Flutter, "Vialert")

Stack: Flutter, Firebase Auth, Cloud Firestore, Firebase Storage, Google Maps, Google Directions. La app tiene tres roles con pantallas distintas: `usuario` (ciudadano), `ambulancia` y `admin`.

### 2.1 Colecciones de Firestore

Las fechas pueden venir como `Timestamp`, texto ISO-8601 o texto solo-fecha (`"2025-11-20"`). Usar siempre el mapper de fechas (4.4). Los ids de alertas, personal y hospitales son **UUID v4** generados por la app.

**`alertas/{alertaId}`**

| Campo | Tipo | Notas |
|---|---|---|
| `type` | string | Texto libre. La app hoy ofrece: `Accidente`, `Emergencia médica`, `Incendio`, `Otro`. Pueden existir otros valores antiguos |
| `description` | string | "Sin descripción" si el ciudadano no escribe |
| `lat`, `lng` | number | |
| `createdAt` | string ISO UTC | Hora del **teléfono**. No usar para medir tiempos |
| `creadaPorUsuarioId` | string | Nombre completo del creador (nombre histórico) |
| `creadaPorUid` | string? | Ausente en alertas antiguas |
| `estado` | `'activa' \| 'enProceso' \| 'atendida'` | |
| `ambulanciaAsignada` | string? | uid de la ambulancia |
| `fotos` | string[] | URLs de Storage (`alertas/{id}/{0..2}.jpg`), máx. 3 |
| `createdAtServer` | Timestamp? | **Base de todos los tiempos** |
| `prioridad` | `'critica' \| 'alta' \| 'media' \| 'baja'`? | La app la pide siempre (default `media`); ausente en alertas antiguas |
| `tomadaAt`, `rutaIniciadaAt`, `llegadaAt`, `atendidaAt`, `trasladoIniciadoAt`, `trasladoFinalizadoAt` | Timestamp? | Hitos (hora del servidor) |
| `hospitalDestinoId`, `hospitalDestinoNombre` | string? | |
| `conductorId`, `paramedicoId` | string? | Personal a bordo, copiado al tomar la alerta |
| `etaInicialSeg`, `distanciaInicialM` | number? | De la ruta real de Google Directions; **no se escribe `etaInicialSeg` si se usó el ETA de respaldo** |
| `recalculos` | number | Default 0; recálculos de ruta por desvío hacia la alerta |
| `liberaciones` | number | Default 0; veces que la alerta volvió a la cola |
| `simulada` | boolean | Ausente = false. La app la pone en `true` en compilaciones de prueba **o cuando la atención usó el contador de respaldo** (sin ruta real). **Excluir de KPIs por defecto** |

Subcolección **`alertas/{alertaId}/eventos/{eventoId}`**: `{ tipo, ts (Timestamp), ambulanciaId?, meta (map) }`, solo agregar. Tipos: `creada, tomada, liberada, ruta_iniciada, recalculo, llegada, atendida, traslado_propuesto, traslado_iniciado, traslado_rechazado, traslado_finalizado`. En `llegada` y `traslado_finalizado`, `meta.origen` es `'temporizador'` o `'manual'`. Tipos desconocidos se ignoran.

**`ambulancias/{uid}`** (id = uid de Firebase Auth)

| Campo | Notas |
|---|---|
| `email`, `placa`, `codigoInterno` | strings |
| `entidadId` | Texto libre en MAYÚSCULAS (ej. `"HOSPITAL DEL SUR"`). **No** referencia a `hospitales` |
| `estadoOperativo` | `'habilitada' \| 'enRuta' \| 'enRutaHospital' \| 'inactiva'`. **Ambiguo:** al iniciar turno la app lo pone en `enRuta` aunque esté libre |
| `currentConductorId`, `currentParamedicoId`, `currentAlertaId` | string \| null |
| `enTurno` | boolean?; si falta: `currentConductorId != null \|\| currentParamedicoId != null` |
| `turnoIniciadoAt`, `ultimoCambioEstadoAt` | Timestamp? |
| `createdAt` | Timestamp (no está en el modelo Dart, pero se escribe al crear) |

**`ubicaciones/{ambulanciaId}`** (un doc por ambulancia; **se borra al terminar el turno**): `lat`, `lng`, `rumbo?`, `velocidadKmh?`, `precisionM?`, `estadoOperativo?` (`'habilitada' | 'enRuta' | 'enRutaHospital'`, deducido de la atención en curso: **fiable para el mapa**), `alertaId` (string|null), `appVersion?`, `actualizadoAt` (Timestamp del servidor, el *latido*).
**Frecuencia de publicación (código de la app):** cada **5 s** mientras atiende una alerta y cada **30 s** estando de turno y libre. Si el GPS falla, reintenta cada 30 s.

**`personal/conductores/items/{id}`** y **`personal/paramedicos/items/{id}`**: `nombre, apellido, cedula, entidadId` (texto libre; hay datos como `"1"`, `"ninguno"`), `estado` (`'disponible' | 'ocupado'`), `ambulanciaId` (string|null). Paramédicos además `telefono`.

**`hospitales/{id}`**: `nombre`, `lat`, `lng`.

**`usuarios/{uid}`** (ciudadanos): `nombre, apellido, cedula, telefono, email, rol ('usuario'), createdAt`.

**`roles/{uid}`**: `{ rol: 'usuario' | 'ambulancia' | 'admin', createdAt }`. **Fuente de verdad del rol para reglas y web.**

**`admins/{uid}`**: `{ nombre, email, createdAt (texto) }`. **El id es el uid.** La app resuelve el rol probando en orden `roles` → `usuarios` → `ambulancias` → `admins` (la mera existencia de `admins/{uid}` hace admin a esa cuenta). Por eso **un administrador puede existir solo en `admins` y no tener `roles/{uid}`**. La web y las reglas solo miran `roles/{uid}`.

### 2.2 Flujos de escritura de la app (invariantes que la web no debe romper)

- **Crear ambulancia (admin):** crea el usuario en Auth con una segunda instancia de Firebase (no cierra la sesión del admin); batch `ambulancias/{uid}` (+`createdAt` servidor) y `roles/{uid}` `{rol:'ambulancia'}`; si falla, borra el usuario de Auth. **Crear flota:** la pantalla "Crear Flota" define una plantilla (entidad + estado inicial `habilitada`/`inactiva` + **contraseña común**) y una lista de filas `{placa, codigoInterno, email}`; procesa en secuencia y un error en una fila no detiene las demás.
- **Crear conductor/paramédico (admin):** `guardarPersonal` con id UUID, `estado:'disponible'`, `ambulanciaId:null`.
- **Hospitales (admin):** crear/editar/eliminar con `nombre`, `lat`, `lng`.
- **Inicio de turno (rol ambulancia):** `reservar` cada miembro (transacción: solo si `estado=='disponible'`) y luego transacción `asignarPersonalAAmbulancia`: `current*`, `estadoOperativo:'enRuta'`, `enTurno:true`, `turnoIniciadoAt`; personal → `ocupado` + `ambulanciaId`.
- **Fin de turno (rol ambulancia, al "Cerrar sesión" o desde su perfil):** transacción `liberarPersonalYResetAmbulancia`: limpia `current*`, `estadoOperativo:'habilitada'`, `enTurno:false`, borra `turnoIniciadoAt`, **borra `ubicaciones/{id}`**, libera al personal. **Es lo único que libera al personal:** si la app se cierra a la fuerza, la unidad queda `enTurno`, el personal `ocupado` y la ubicación deja de actualizarse (turno "colgado").
- **Tomar alerta (ambulancia):** transacción: alerta → `enProceso`, `ambulanciaAsignada`, `tomadaAt`, copia `conductorId/paramedicoId`; ambulancia `currentAlertaId`; evento `tomada`.
- **Liberar alerta:** vuelve a `activa`, `ambulanciaAsignada:null`, `liberaciones+1`, borra `tomadaAt, rutaIniciadaAt, etaInicialSeg, distanciaInicialM, conductorId, paramedicoId` (`recalculos` se conserva).
- **Atención:** `ruta_iniciada` (con `etaInicialSeg`) → **`llegada` y `atendida` se escriben casi a la vez** (la llegada se declara por temporizador al agotarse el ETA o manualmente; **no por GPS**) → la app propone el hospital más cercano → `traslado_iniciado` / `traslado_rechazado` → `traslado_finalizado`. El estado `atendida` se fija **en la llegada**, no al terminar el traslado.
- **Crear alerta (ciudadano):** `createdAtServer`, evento `creada`; fotos se suben aparte a Storage y luego se agregan a `fotos`.
- **Modo de respaldo:** si Firestore responde `permission-denied` al escribir los campos nuevos (instrumentación), la app **repite la operación sin ellos** y sigue funcionando. Consecuencia: **unas reglas mal escritas harían que los KPI dejen de registrarse sin que la app falle.**

**Consecuencia para la web:** `estado` y `ambulanciaId` del personal, y `current*`/`enTurno`/`estadoOperativo` de las ambulancias los gestiona la app. En la web son **solo lectura**, con una excepción: la acción administrativa "cerrar turno" (6.1).

### 2.3 Particularidades de los datos (ser tolerante)

- Datos antiguos incompletos: campo ausente = **"sin dato"**, nunca cero.
- `AmbulanciaBuilder` normaliza: `trim()` en todo y `entidadId` en MAYÚSCULAS. Obligatorios: placa, código interno, entidad y email (debe contener `@`). Estados válidos al crear: `habilitada`, `enRuta`, `inactiva`. El personal **no** pasa por ese builder.
- La pantalla temporal de la app `AdminFlotaVivoScreen` ya hace lo básico del mapa: **oculta las ubicaciones de ambulancias con `enTurno == false`** (aunque quede un documento viejo), marca "sin señal" a los 60 s y colorea: verde = habilitada, rojo = enRuta, naranja = enRutaHospital, violeta = sin señal. La web replica estas reglas.
- Centro por defecto del mapa que usa la app: `lat 10.4631, lng -73.2532`.
- Zona horaria de operación: UTC-5 (`America/Bogota`).

### 2.4 Quién ejecuta qué (insumo de la Fase 4)

| Rol | Lee | Escribe |
|---|---|---|
| **Ciudadano** | `alertas` (hoy **toda** la colección), `ambulancias` (stream general), su `usuarios` y `roles` | `alertas` (crea la suya y agrega `fotos`), `alertas/*/eventos` tipo `creada`, Storage `alertas/{id}/*`, su `usuarios` y su `roles` (rol `usuario`) |
| **Ambulancia** | `alertas`, `ambulancias`, `hospitales`, personal disponibles, su `roles` | `alertas` (tomar, liberar, hitos, `estado: atendida`, recálculos), `alertas/*/eventos`, su doc en `ambulancias` (estado, `current*`, turno), **`personal`** (reservar/liberar: `estado`, `ambulanciaId`), `ubicaciones/{su uid}` (crear/actualizar/borrar) |
| **Admin (app)** | `ubicaciones`, `ambulancias`, `hospitales`, todo lo anterior | `ambulancias/{uid}` + `roles/{uid}` (crear ambulancia), `personal` (crear), `hospitales` (crear/editar/eliminar) |
| **Admin (web)** | Todo lo anterior | Hospitales y personal (directo); ambulancias y roles vía **API** |

Fuentes: `lib/services/firestore_service.dart`, `lib/domain/repositories/personal_repository_base.dart` y pantallas de `lib/ui/{usuario,ambulancia,admin}`.

### 2.5 Reglas de seguridad actuales

`firestore.rules` solo define reglas nuevas para `alertas/*/eventos` y `ubicaciones`, y un **comodín de modo de prueba** (`allow read, write: if request.time < 2027-12-17`) **que no exige autenticación** y anula todo lo demás. `esAdmin()` mira `roles/{uid}.rol == 'admin'`. `storage.rules`: cualquier autenticado lee/escribe `alertas/{alertaId}/*`.
**Se desarrolla contra esta base, pero no se publica la web hasta cerrar la Fase 4.**

**Prerrequisito manual (orquestador):** comprobar en la consola que cada admin tiene `roles/{uid}` con `rol: "admin"`. Si solo existe `admins/{uid}`, crear ese documento (o ejecutar el script de la Fase 4) antes de probar el login de la web.

---

## 3. Arquitectura

### 3.1 Dos repositorios independientes

| Repo | Contenido | Despliegue futuro |
|---|---|---|
| `ambulancias-web` | Frontend React | S3 + CloudFront (o Amplify) |
| `ambulancias-api` | Backend Node | Contenedor (App Runner/ECS) o Lambda |

No hay paquete compartido:

| Elemento | Solución |
|---|---|
| Tipos de documentos y mapper de fechas | Se escriben en **ambos** repos (pequeños) y deben ser equivalentes |
| Fórmulas de KPI | **Solo en la API** |
| Duraciones de una alerta (detalle) | Función pura en la web (`duracionesDeAlerta`), validada con el vector de la sección 8 |
| Sectorización (cuadrícula) | **Solo en la web** |

### 3.2 Reparto de responsabilidades

| Operación | Quién |
|---|---|
| Mapa en vivo, alertas, ubicaciones (lectura en tiempo real) | Web → Firestore directo (`onSnapshot`) |
| CRUD de hospitales y personal | Web → Firestore directo |
| Crear (uno o lote), editar, deshabilitar/habilitar, resetear contraseña y cerrar turno de ambulancias | Web → **API** → Admin SDK |
| KPIs y reportes | Web → **API** |

La API es necesaria para ambulancias porque el SDK de cliente no puede deshabilitar cuentas, cambiar contraseñas de otros ni garantizar el rollback, y para que la contraseña no pase por el navegador.

### 3.3 Stack

**Web:** React + Vite + TypeScript, React Router, TanStack Query (datos de servidor), Zustand (solo filtros/estado de UI del mapa), Firebase JS SDK modular, `@vis.gl/react-google-maps` (mapa y `AdvancedMarker`), **deck.gl** (`@deck.gl/google-maps` + `@deck.gl/aggregation-layers`) para el calor, Zod + react-hook-form, Tailwind CSS, Recharts, date-fns, Vitest + Testing Library.

> La `HeatmapLayer` de Google Maps (librería `visualization`) **está eliminada desde mayo de 2026**: no usarla. Tampoco `google.maps.Marker` (deprecado): usar `AdvancedMarker`, que requiere un **Map ID**.

**API:** Node LTS + TypeScript, **Fastify** (con `@fastify/autoload` y `@fastify/cors`), Zod, `firebase-admin`, pino, Vitest (`fastify.inject`). Sin dependencias de un proveedor cloud concreto: `app.ts` exporta `buildApp()` separado de `server.ts`.

### 3.4 Requisitos para desplegar limpio en AWS (después)

Configuración solo por variables de entorno; API sin estado con `Dockerfile` y `GET /health`; CORS por `CORS_ORIGINS`; credenciales de Firebase Admin por `FIREBASE_SERVICE_ACCOUNT_JSON` (o `GOOGLE_APPLICATION_CREDENTIALS`) leídas solo en `config/firebase.ts`.

---

## 4. Patrones de diseño: solo los necesarios

### 4.1 Reglas de dependencia (web)

```
features/*  ──usan──▶  core/ports.ts (interfaces)  ◀──implementan──  infrastructure/*
                         core/domain, core/mappers, core/geo
```
Reglas (ESLint `no-restricted-imports`):
1. **Solo `infrastructure/firebase/**` importa `firebase/*`.**
2. **Solo `infrastructure/api/**` hace llamadas HTTP.**
3. `core/**` no importa de `infrastructure/**`, `features/**`, React ni UI.
4. `features/**` no importa de `infrastructure/**`: obtiene repositorios con `useDeps()`.
5. Una feature no importa de otra; lo común va a `core/` o `shared-ui/`.

API: `routes → service → acceso a Firebase`; **solo `ambulances.store.ts` y `kpis/load-alertas.ts` importan `firebase-admin`** (a través de `config/firebase.ts`).

### 4.2 Catálogo: qué se usa y qué no

| Patrón | ¿Se usa? | Dónde / decisión |
|---|---|---|
| **Repository** | **Sí** | Una interfaz por entidad en `core/ports.ts`, con implementación Firebase y otra en memoria (mock). Justificación: aísla Firestore/HTTP de la UI, permite `VITE_DATA_SOURCE=mock` y pruebas sin Firebase |
| **Mapper** | **Sí** | Funciones puras documento → entidad. Justificación: los datos son heterogéneos (3 formatos de fecha, campos ausentes) |
| **Observer** | Nativo | `onSnapshot` dentro de repositorios, expuesto por hooks. **No se crean clases** |
| **Inyección de dependencias** | **Mínima** | Un `Context` de React con los repositorios (web) y un parámetro `deps` en `buildApp()` (API) para pruebas |
| **Middleware** | Nativo | Hooks `preHandler` de Fastify: verificar token → exigir admin → validar con Zod |
| Factory / Builder / Prototype | **No** | La app los usa para personal y flota; en la web bastan un `switch` por tipo, un esquema Zod (normaliza `trim` y MAYÚSCULAS) y un arreglo de filas |
| Strategy / Registry | **No** | Las capas del mapa son componentes con interruptores; el menú es un arreglo constante; los KPI son funciones puras |
| Facade / Gateway / Adapter | **No** | Un `ApiClient` simple (`fetch` + token) usado por los repositorios que necesitan la API |
| Capas completas Controller/Service/Repository | **No** | Rutas + servicio; el acceso a Firebase se aísla solo donde hay Admin SDK |
| Container/Presentational | **No** como regla | Hooks para datos y componentes para UI, sin formalizar |

**Cuándo añadir un patrón:** cuando haya dos o más implementaciones reales que intercambiar, o un `if/switch` que se repita en 3+ sitios. No por anticipación.

### 4.3 Puertos (contratos; implementar tal cual en `core/ports.ts`)

```ts
export type Unsubscribe = () => void;
type OnError = (e: Error) => void;
export interface RangoFechas { desde: Date; hasta: Date }

export interface AlertaRepository {
  suscribirActivas(cb: (a: Alerta[]) => void, onError: OnError): Unsubscribe; // estado in ['activa','enProceso']
  listarPorRango(f: RangoFechas & { incluirLegado?: boolean; limite?: number }): Promise<{ alertas: Alerta[]; truncado: boolean }>;
  obtenerPorId(id: string): Promise<Alerta | null>;
  listarEventos(alertaId: string): Promise<EventoAlerta[]>; // ts asc
}
export interface UbicacionRepository {
  suscribir(cb: (u: Ubicacion[]) => void, onError: OnError): Unsubscribe;
}
export interface AmbulanciaRepository {                                  // lecturas: Firestore; comandos: API
  suscribir(cb: (a: Ambulancia[]) => void, onError: OnError): Unsubscribe;
  crear(d: NuevaAmbulancia & { password: string }): Promise<Ambulancia>;
  crearLote(d: { entidadId: string; estadoOperativo: 'habilitada' | 'inactiva'; password: string;
                 filas: { placa: string; codigoInterno: string; email: string }[] }): Promise<ResultadoFila[]>;
  actualizar(id: string, d: Partial<Pick<Ambulancia, 'placa' | 'codigoInterno' | 'entidadId'>>): Promise<void>;
  deshabilitar(id: string): Promise<void>;
  habilitar(id: string): Promise<void>;
  resetearPassword(id: string, password: string): Promise<void>;
  cerrarTurno(id: string): Promise<void>;
}
export interface HospitalRepository {
  suscribir(cb: (h: Hospital[]) => void, onError: OnError): Unsubscribe;
  crear(d: NuevoHospital): Promise<string>;                  // id = crypto.randomUUID()
  actualizar(id: string, d: Partial<NuevoHospital>): Promise<void>;
  eliminar(id: string): Promise<void>;
}
export type TipoPersonal = 'conductor' | 'paramedico';
export interface PersonalRepository {
  suscribir(tipo: TipoPersonal, cb: (p: Personal[]) => void, onError: OnError): Unsubscribe;
  crear(d: NuevoPersonal): Promise<string>;                  // UUID; estado 'disponible', ambulanciaId null; el tipo decide la subcolección
  actualizar(tipo: TipoPersonal, id: string, d: CamposEditablesPersonal): Promise<void>; // nunca estado/ambulanciaId
  eliminar(tipo: TipoPersonal, id: string): Promise<void>;  // rechaza si estado === 'ocupado'
}
export interface KpiRepository {
  resumen(f: FiltroKpi): Promise<KpiResumen>;
  series(f: FiltroKpi & { granularidad: 'dia' | 'hora' }): Promise<KpiSerie[]>;
  ranking(f: FiltroKpi & { por: 'ambulancia' | 'conductor' | 'paramedico' | 'hospital' }): Promise<KpiRankingItem[]>;
  descargarAlertasCsv(f: FiltroKpi): Promise<Blob>;
}
export interface AuthService {
  onAuthChange(cb: (u: AuthUser | null) => void): Unsubscribe;
  login(email: string, password: string): Promise<AuthUser>;
  logout(): Promise<void>;
  obtenerRol(uid: string): Promise<RolUsuario | null>;       // lee roles/{uid}
  obtenerIdToken(): Promise<string>;
}
```

### 4.4 Mapper de fechas (idéntico en web y API)

```ts
const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
export function aFecha(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    const m = SOLO_FECHA.exec(v);
    // "YYYY-MM-DD" se interpreta como fecha LOCAL (como la app Dart), no UTC
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const t = v as { toDate?: () => Date };       // Timestamp (cliente o admin)
  return typeof t.toDate === 'function' ? t.toDate() : null;
}
```
Reglas de todos los mappers: tolerantes (defaults como la app: `estado ?? 'activa'`, `recalculos ?? 0`, `enTurno` deducido), nunca lanzan por un campo opcional ausente; si faltan `lat`/`lng` válidos se **descarta el documento** con una advertencia; valores de enumeración desconocidos usan el default y avisan.

### 4.5 Esqueleto de inyección (lo único que "decide" implementaciones)

```tsx
// app/deps.tsx
export function buildDeps(env: Env): Deps {
  if (env.VITE_DATA_SOURCE === 'mock') return buildMockDeps();
  const api = new ApiClient(env.VITE_API_BASE_URL, () => auth.obtenerIdToken());
  return { auth, alertas: new FirestoreAlertaRepository(db), ubicaciones: new FirestoreUbicacionRepository(db),
           ambulancias: new FirestoreAmbulanciaRepository(db, api), hospitales: new FirestoreHospitalRepository(db),
           personal: new FirestorePersonalRepository(db), kpis: new HttpKpiRepository(api) };
}
// hook de datos en vivo (sin clases, sin patrón extra)
export function useUbicaciones() {
  const { ubicaciones } = useDeps();
  const [data, setData] = useState<Ubicacion[]>([]); const [error, setError] = useState<Error | null>(null);
  useEffect(() => ubicaciones.suscribir(setData, setError), [ubicaciones]);
  return { data, error };
}
```

---

## 5. Estructura de carpetas

### 5.1 `ambulancias-web`

```
ambulancias-web/
├── .env.example  eslint.config.js  index.html  vite.config.ts  tsconfig.json  package.json
├── docs/ (PROGRESO.md, PREGUNTAS.md)
└── src/
    ├── app/        main.tsx  App.tsx  router.tsx  deps.tsx  nav.ts  layout/(AppShell, Sidebar, Topbar)
    ├── core/
    │   ├── domain/     alerta.ts ambulancia.ts ubicacion.ts hospital.ts personal.ts evento.ts rol.ts kpi.ts
    │   │               constants.ts alerta-duraciones.ts
    │   ├── ports.ts                      # interfaces de 4.3
    │   ├── mappers/    fecha.ts alerta.ts ambulancia.ts ubicacion.ts hospital.ts personal.ts evento.ts
    │   ├── schemas/    hospital.ts personal.ts ambulancia.ts (Zod de formularios, con trim/MAYÚSCULAS)
    │   └── geo/        geo-utils.ts (haversine, límites)  grid.ts (celdas)
    ├── infrastructure/
    │   ├── firebase/   app.ts auth-service.ts alerta-repository.ts ubicacion-repository.ts
    │   │               ambulancia-repository.ts hospital-repository.ts personal-repository.ts
    │   ├── api/        api-client.ts  kpi-repository.ts
    │   └── mock/       seed.ts  in-memory-*.ts  mock-deps.ts
    ├── features/       (cada una con pages/ components/ hooks/)
    │   ├── auth/  live-map/ (+ store/map-filters.ts)  alerts/  ambulances/  staff/  hospitals/  dashboard/
    ├── shared-ui/      DataTable Modal ConfirmDialog FormField Badge EmptyState Spinner Toast
    ├── lib/            env.ts (valida variables con Zod)  format.ts
    └── test/
```

### 5.2 `ambulancias-api`

```
ambulancias-api/
├── .env.example  Dockerfile  package.json  tsconfig.json  eslint.config.js
├── docs/ (PROGRESO.md, PREGUNTAS.md)
├── fixtures/kpi/                     # vectores de prueba (sección 8)
├── firebase/                         # (Fase 4) reglas + pruebas con emulador
├── scripts/                          # (Fase 4) migrate-admin-roles.ts
└── src/
    ├── app.ts  server.ts             # buildApp({ firebase }) / listen
    ├── config/   env.ts  firebase.ts
    ├── plugins/  auth.ts (verifyToken + requireAdmin)  errors.ts
    ├── domain/   tipos.ts  fecha.ts  mappers.ts
    └── modules/                      # autoload: cada carpeta con un *.routes.ts
        ├── health/
        ├── ambulances/  ambulances.routes.ts  ambulances.service.ts  ambulances.store.ts  dto.ts
        ├── kpis/        kpis.routes.ts  load-alertas.ts  calculators.ts  stats.ts
        └── reports/     reports.routes.ts  csv.ts
```

---

## 6. Contratos

### 6.1 API REST

Base `/api/v1`. Todas las rutas (excepto `/health`) exigen `Authorization: Bearer <Firebase ID token>` y `roles/{uid}.rol === 'admin'` (cachear el rol ≤ 60 s). Validación con Zod. Fechas ISO-8601 UTC. **Error:** `{ "error": { "code", "message", "details"? } }` con códigos `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `VALIDATION_ERROR` 400, `NOT_FOUND` 404, `CONFLICT` 409, `INTERNAL` 500.

| Método y ruta | Cuerpo / query | Comportamiento |
|---|---|---|
| `GET /health` | | `{ status: 'ok' }`, público |
| `POST /ambulancias` | `{ email, password (≥8), placa, codigoInterno, entidadId }` | Normaliza (`trim`, `entidadId` en MAYÚSCULAS, email con `@`). Crea usuario Auth → batch `ambulancias/{uid}` (`estadoOperativo:'habilitada'`, `enTurno:false`, `current*` en `null`, `createdAt` servidor) + `roles/{uid}` `{rol:'ambulancia'}`. Si falla, borra el usuario Auth. 201. 409 si el email ya existe |
| `POST /ambulancias/lote` | `{ entidadId, estadoOperativo ('habilitada'\|'inactiva'), password, filas: [{placa, codigoInterno, email}] }` (máx. 50) | Equivale a "Crear Flota" de la app: procesa **en secuencia**, un error no detiene las demás. Si `estadoOperativo='inactiva'`, crea el usuario Auth **deshabilitado**. 200 `{ resultados: [{ fila, ok, id?, error? }] }` |
| `PATCH /ambulancias/:id` | `{ placa?, codigoInterno?, entidadId? }` | Mismas normalizaciones. 404 si no existe |
| `POST /ambulancias/:id/deshabilitar` | | **409** si `enTurno` o `currentAlertaId != null`. Deshabilita Auth y pone `estadoOperativo:'inactiva'`, `ultimoCambioEstadoAt` |
| `POST /ambulancias/:id/habilitar` | | Habilita Auth, `estadoOperativo:'habilitada'`, `ultimoCambioEstadoAt` |
| `POST /ambulancias/:id/password` | `{ password (≥8) }` | `updateUser` + revoca tokens de refresco |
| `POST /ambulancias/:id/cerrar-turno` | | Para **turnos colgados**. Replica `liberarPersonalYResetAmbulancia` en una transacción: limpia `current*`, `estadoOperativo:'habilitada'`, `enTurno:false`, borra `turnoIniciadoAt`, `ultimoCambioEstadoAt` servidor, **borra `ubicaciones/{id}`** y deja al personal `disponible` con `ambulanciaId:null`. **409** si `currentAlertaId != null`. (Si la app sigue viva, republicará su ubicación: la UI advierte "úsalo solo si la unidad lleva tiempo sin señal") |
| `GET /kpis/resumen` | `desde, hasta, tipo?, prioridad?, ambulanciaId?, incluirSimuladas?=false` | `KpiResumen` |
| `GET /kpis/series` | igual + `granularidad=dia\|hora` | `KpiSerie[]`: `{ bucket, total, atendidas, respuestaMediaSeg\|null }`; buckets en `TZ_OPERACION` |
| `GET /kpis/ranking` | igual + `por=ambulancia\|conductor\|paramedico\|hospital` | `KpiRankingItem[]`: `{ id, etiqueta, atendidas, respuestaMediaSeg\|null, enEscenaMediaSeg\|null }`; hospital: `{ id, etiqueta, traslados, trasladoMedioSeg }` |
| `GET /reportes/alertas.csv` | mismos filtros | CSV UTF-8 con BOM, una fila por alerta + duraciones |

Toda acción de `/ambulancias/*` escribe `auditoria/{id}`: `{ uid, accion, objetivoId, ts }` (solo la API escribe esa colección).

```ts
interface Estadistica { n: number; media: number | null; mediana: number | null; p90: number | null } // segundos
interface KpiResumen {
  rango: { desde: string; hasta: string };
  totalAlertas: number;
  porEstado: Record<EstadoAlerta, number>;
  tiempos: { asignacion: Estadistica; respuesta: Estadistica; viaje: Estadistica;
             enEscena: Estadistica; traslado: Estadistica; cicloTotal: Estadistica };
  precisionEta: { n: number; errorRelativoMedio: number | null };
  cumplimientoRespuesta: { umbralSeg: number; n: number; porcentaje: number | null };
  operacion: { liberaciones: number; recalculosPromedio: number | null; alertasConFotos: number };
  descartadas: { simuladas: number; sinDato: Record<string, number>; anomalias: number };
}
```

### 6.2 Consultas a Firestore desde la web

| Necesidad | Consulta |
|---|---|
| Alertas en vivo | `alertas` where `estado` in `['activa','enProceso']` |
| Alertas por rango | `alertas` where `createdAtServer` ≥ desde y ≤ hasta, orderBy `createdAtServer` desc, `limit` (default 2000). Otros filtros (tipo, prioridad, estado) **en memoria** para no exigir índices compuestos. Si `truncado`, avisar en la UI |
| Alertas antiguas (opcional) | Segunda consulta por `createdAt` (ISO) en el rango, combinada sin duplicados por `id` |
| Ubicaciones, ambulancias, hospitales, personal | Colección completa (volumen pequeño) |
| Eventos de una alerta | `alertas/{id}/eventos` orderBy `ts` asc |

No se requieren índices compuestos en v1; `firestore.indexes.json` queda vacío salvo que un punto de control demuestre lo contrario.

---

## 7. Especificación funcional

### 7.1 Autenticación y rutas
- Login con email/contraseña. Tras autenticar, leer `roles/{uid}`; si `rol !== 'admin'`: cerrar sesión y mostrar "No tienes permisos de administrador". (Usuarios `usuario` y `ambulancia` **sí** pueden autenticarse en Firebase; la web debe rechazarlos.)
- `RequireAdmin` protege todo salvo `/login`. Rutas: `/login`, `/` (→ `/mapa`), `/mapa`, `/alertas`, `/alertas/:id`, `/ambulancias`, `/personal`, `/hospitales`, `/dashboard`.

### 7.2 Mapa en vivo (`/mapa`)
- **Capas con interruptor:** ambulancias, alertas activas, hospitales, calor histórico, sectores (cuadrícula). Son componentes normales (no registro de estrategias).
- **Ambulancias** (desde `ubicaciones` cruzadas con `ambulancias`):
  - **Ocultar** la ubicación si su ambulancia existe y `enTurno === false` (documento viejo).
  - Color por `estadoOperativo` de la ubicación, igual que la app: verde = habilitada ("Disponible"), rojo = enRuta ("Atendiendo alerta"), naranja = enRutaHospital ("Traslado a hospital").
  - **Sin señal** (violeta) si `ahora − actualizadoAt > UBICACION_SIN_SENAL_SEG` (90 s; la app publica cada 5 s en atención y cada 30 s libre). `actualizadoAt` nulo = "ahora". Redibujar cada 10 s para que el estado cambie sin datos nuevos.
  - **Turno posiblemente colgado:** `enTurno && sin señal` → insignia "Sin señal en turno" y acceso a la acción "Cerrar turno" (6.1) desde el detalle.
  - Rotar el icono según `rumbo`. Al seleccionar: placa, código interno, entidad, personal a bordo (nombres vía `ambulancias` + `personal`), velocidad, alerta asignada, última actualización y **versión de la app** (`appVersion`, para saber qué unidades faltan por actualizar).
- **Alertas activas** (`suscribirActivas`): marcador distinto al de ambulancias (pin); color por prioridad (crítica rojo, alta naranja, media amarillo, baja verde; sin prioridad gris); tooltip con tipo, descripción y **tiempo de espera** (`ahora − (createdAtServer ?? createdAt)`).
- **Panel lateral:** contadores (alertas activas, en proceso, disponibles, atendiendo, en traslado, sin señal); lista de alertas por prioridad y antigüedad; **"Ambulancias disponibles en el área"**: centro = alerta seleccionada (o centro del mapa), radio 1/3/5 km (default 3), unidades `habilitada` y con señal, ordenadas por distancia (Haversine) con placa, código y personal; **"Sectores con más alertas"**: top 5 celdas del rango elegido (default últimos 30 días).
- **Calor y sectores:** usan alertas históricas (`listarPorRango`) con filtros (rango, tipo, prioridad, `incluirSimuladas`). Calor: deck.gl `HeatmapLayer` vía `GoogleMapsOverlay`. Sectores: función `agruparEnCeldas(alertas, SECTOR_CELDA_M)` y rectángulos coloreados por conteo con su número.
- Centro inicial: `MAP_CENTRO_DEFAULT` (sección 11); encuadrar automáticamente a las unidades al abrir.

### 7.3 Alertas
- Tabla con filtros (rango, estado, tipo —opciones construidas con los datos, precargando los 4 conocidos—, prioridad, simuladas), orden por fecha, paginación en cliente.
- Detalle: datos, mapa pequeño, **galería de fotos** (solo lectura), **línea de tiempo** de `eventos` (mostrando `meta.origen` en llegada y traslado), duraciones con `duracionesDeAlerta()`, personal y hospital. "Sin dato" donde falte.

### 7.4 Hospitales, personal, ambulancias
- **Hospitales:** CRUD. `nombre` obligatorio; `lat` ∈ [−90, 90], `lng` ∈ [−180, 180]; elegir coordenadas con clic en el mapa además de los campos numéricos. Confirmar antes de eliminar.
- **Personal:** pestañas Conductores / Paramédicos. `nombre`, `apellido`, `cedula` obligatorios; `entidadId` (`trim` + MAYÚSCULAS); `telefono` obligatorio solo en paramédicos. `estado` y `ambulanciaId` visibles y **no editables**. Eliminar bloqueado si `ocupado`. Cédula y teléfono enmascarados en tablas (`••••5678`), completos en el detalle.
- **Ambulancias:** tabla (placa, código, entidad, estado, en turno, personal a bordo, último cambio). Acciones: crear una, **crear flota por lote** (formulario: entidad, estado inicial, contraseña común y filas editables placa/código/email, con opción de pegar filas desde una hoja de cálculo; al terminar mostrar el resultado por fila y conservar en el formulario solo las que fallaron), editar (placa, código, entidad), deshabilitar/habilitar, resetear contraseña, cerrar turno (solo visible si `enTurno`, con aviso). Sin eliminar en v1. Toda mutación va por la API.
- Las validaciones replican las del `AmbulanciaBuilder` de la app (Zod): placa, código, entidad y email obligatorios, email con `@`.

### 7.5 Dashboard
Filtros: rango (hoy, 7 días, 30 días, personalizado), tipo, prioridad, simuladas. Tarjetas: total, respuesta (mediana y p90), cumplimiento del umbral, permanencia en escena, traslado, liberaciones. Gráficas: alertas por día y hora, por tipo, prioridad y estado. Rankings: ambulancias, conductores, paramédicos, hospitales. Top sectores (en la web con `agruparEnCeldas`). Disponibilidad de flota **instantánea** (desde streams en vivo). Exportar CSV. Avisos fijos: "Las alertas anteriores a la instrumentación no incluyen tiempos" y "La llegada puede declararse por temporizador, no por GPS: el tiempo de respuesta es una referencia".

---

## 8. Definición de KPIs (la API es la fuente de verdad)

**Alcance:** alertas con `createdAtServer` en el rango; se excluyen `simulada === true` salvo `incluirSimuladas=true`. Las alertas sin `createdAtServer` no entran en ningún KPI.

**Duración válida:** ambos instantes presentes y `0 ≤ diferencia ≤ MAX_DURACION_SEG` (86 400). Si falta un instante: `descartadas.sinDato[clave]`; si es negativa o excesiva: `descartadas.anomalias`. Los promedios usan solo duraciones válidas (`n` lo indica).

| KPI | Fórmula | Nota |
|---|---|---|
| Asignación | `tomadaAt − createdAtServer` | Incluye cola tras liberaciones (`tomadaAt` se reescribe al tomar de nuevo) |
| Respuesta | `llegadaAt − createdAtServer` | **La llegada la declara la app por temporizador o manualmente, no por GPS** |
| Viaje | `llegadaAt − rutaIniciadaAt` | |
| Permanencia en escena | `trasladoIniciadoAt − llegadaAt` | Solo alertas con traslado. **No** usar `atendidaAt − llegadaAt`: la app escribe ambos casi al mismo instante |
| Traslado | `trasladoFinalizadoAt − trasladoIniciadoAt` | |
| Ciclo total | `(trasladoFinalizadoAt ?? atendidaAt) − createdAtServer` | |
| Precisión ETA | `(viaje − etaInicialSeg) / etaInicialSeg` con `etaInicialSeg > 0` | Promedio del error relativo |
| Cumplimiento | % de respuestas válidas ≤ `KPI_UMBRAL_RESPUESTA_SEG` | |
| Operación | suma de `liberaciones`; promedio de `recalculos`; cantidad con `fotos.length > 0` | |

**Estadística:** media, mediana y p90 (*nearest-rank*), en segundos enteros; `null` si `n = 0`.
**Rankings:** por `ambulanciaAsignada`, `conductorId`, `paramedicoId` (solo `atendida`) y hospital por `hospitalDestinoId` (traslados finalizados). Etiquetas desde `ambulancias`, `personal`, `hospitales`; si el id no existe: `"(eliminado)"`.

**Vector de prueba obligatorio** (API y `duracionesDeAlerta`):

| Campo | Valor |
|---|---|
| createdAtServer | 10:00:00 |
| tomadaAt | 10:00:40 |
| rutaIniciadaAt | 10:01:00 |
| llegadaAt | 10:09:00 |
| atendidaAt | 10:09:01 |
| trasladoIniciadoAt | 10:10:30 |
| trasladoFinalizadoAt | 10:25:00 |
| etaInicialSeg | 420 |

Esperado: asignación **40 s**, respuesta **540 s**, viaje **480 s**, permanencia en escena **90 s**, traslado **870 s**, ciclo total **1500 s**, error ETA **0,1429** (≈ +14,3 %).

---

## 9. Fases y puntos de control

Marcar `[x]` en `docs/PROGRESO.md` al terminar cada casilla.

### Fase 1: Base y gestión de datos

**1-A. Fundaciones del frontend** (se escribe lo que luego solo se consume)
- [ ] Scaffold Vite + TS strict + ESLint con reglas de 4.1 + Vitest + Tailwind; `.env.example` y `lib/env.ts` (Zod).
- [ ] `core/domain/*` completo (entidades, enumeraciones, `constants.ts`, `alerta-duraciones.ts`) y `core/mappers/*` completo, con pruebas (3 formatos de fecha, defaults, documentos antiguos, descarte sin `lat/lng`, `enTurno` deducido).
- [ ] `core/ports.ts` con **todos** los puertos de 4.3; `core/geo/*` (haversine, `agruparEnCeldas`) con pruebas.
- [ ] Implementaciones Firebase de los repositorios y de `AuthService`; `ApiClient` y `HttpKpiRepository`; el repositorio de ambulancias ya con sus comandos HTTP (contra los contratos de 6.1; la API real llega en 1-C).
- [ ] Implementaciones en memoria (`mock/`) con `seed.ts` (≥ 5 ambulancias —alguna con turno colgado—, 3 hospitales, ≥ 8 alertas en distintos estados con coordenadas cercanas) y movimiento simulado de ubicaciones.
- [ ] `deps.tsx` **completo**, `router.tsx` con **todas** las rutas (páginas vacías `EmptyState` donde aún no hay feature), `nav.ts`, `AppShell/Sidebar/Topbar`.
- [ ] Feature `auth` (login, `RequireAdmin`, logout) con pruebas; `shared-ui` base.
- *Aceptación:* con `mock` se navega por todo el menú; con `firebase`, el login rechaza a un usuario sin `roles/{uid}.rol == 'admin'`; el lint falla si una feature importa `firebase/*`.

**1-B. Hospitales y personal**
- [ ] Features `hospitals` y `staff` completas (páginas, formularios Zod, hooks).
- *Aceptación:* CRUD funcional en mock y Firebase; no se elimina personal `ocupado`; `estado`/`ambulanciaId` no editables; los documentos creados son idénticos en forma a los que crea la app.

**1-C. API base, ambulancias y feature web**
- [ ] `ambulancias-api`: scaffold, `config/*`, `plugins/{auth,errors}`, autoload, `health`, módulo `ambulances` completo (crear, lote, editar, deshabilitar/habilitar, password, cerrar-turno, auditoría), `Dockerfile`, pruebas con `inject` y Firebase falso (incluye rollback, 409, lote con errores parciales y cerrar-turno).
- [ ] Feature web `ambulances` (tabla, formulario individual, **crear flota por lote**, acciones, manejo de `CONFLICT`).
- *Aceptación:* crear ambulancia deja Auth + `ambulancias/{uid}` + `roles/{uid}` consistentes; un fallo del batch no deja usuario Auth huérfano; un no admin recibe 403; el lote reporta el resultado de cada fila.

### Fase 2: Operación en vivo
- [ ] Feature `live-map` completa (mapa, 5 capas con interruptor, panel, ocultar `!enTurno`, sin señal, turno colgado, store de filtros).
- [ ] Feature `alerts` (lista, detalle, galería, línea de tiempo, duraciones).
- *Aceptación:* con mock las unidades se mueven y cambian de color; calor y cuadrícula responden a los filtros; el panel lista disponibles por distancia; una unidad `enTurno` sin señal muestra "Cerrar turno".

### Fase 3: Analítica
- [ ] API: `kpis` (funciones puras en `calculators.ts` y `stats.ts`, carga paginada de alertas en `load-alertas.ts`) y `reports` (CSV). Pruebas con el vector de la sección 8 y casos de borde (sin datos, anomalías, simuladas).
- [ ] Web: feature `dashboard` completa y exportación CSV.
- *Aceptación:* el vector da exactamente los valores esperados; el dashboard muestra "sin dato" donde `n = 0`.

### Fase 4: Seguridad
- [ ] Reglas de Firestore y Storage (sección 10) en `ambulancias-api/firebase/` con **pruebas en el emulador** (`@firebase/rules-unit-testing`) que cubran **cada fila de la tabla 2.4**.
- [ ] `scripts/migrate-admin-roles.ts`: crea `roles/{uid}` `{rol:'admin'}` para cada `admins/{uid}` (por defecto `--dry-run`).
- [ ] Lista de regresión contra la app móvil, **incluyendo verificar que las alertas nuevas conservan `createdAtServer` y los hitos** (el modo de respaldo ocultaría un fallo).
- *Aceptación:* ningún flujo de la app ni de la web falla en el emulador; lo no autorizado se rechaza; las pruebas confirman que la escritura "completa" (con campos de instrumentación) es aceptada.

### Fase 5: Despliegue en AWS (no se ejecuta ahora)
Web en S3 + CloudFront; API en App Runner/ECS o Lambda + API Gateway; secretos en Secrets Manager; tareas programadas con EventBridge; CI/CD. Añadir el dominio a los dominios autorizados de Firebase Auth y restringir la API key de Maps a ese dominio.

---

## 10. Seguridad, privacidad y archivos que se vuelven a tocar

**Requisitos de reglas (Fase 4), derivados de la tabla 2.4**
- `roles/{uid}`: lectura propia o admin; el cliente solo puede **crear el suyo con `rol == 'usuario'`**; `rol == 'ambulancia'` lo crea el admin (la app lo hace desde la sesión del admin); sin actualizaciones por clientes comunes. **`admin` solo se asigna por consola o Admin SDK**; si no, cualquier usuario podría ascenderse.
- `usuarios/{uid}`: el dueño lee/escribe sin poder cambiar `rol`; admin lee.
- `alertas`: crea el ciudadano (`creadaPorUid == auth.uid`); actualiza la ambulancia que la toma/atiende y el creador solo para `fotos`; lectura por admin y ambulancias. **Hoy los ciudadanos leen toda la colección** (`streamAlertas`); restringirlo exige el cambio de app de la sección 13.
- `ambulancias`: lectura autenticada; creación solo admin; actualización por admin o por la propia ambulancia (sus campos operativos).
- `personal`: lectura por admin y ambulancias; creación solo admin; actualización de `estado/ambulanciaId` por ambulancias (reservar/liberar) y admin.
- `hospitales`: lectura autenticada; escritura solo admin.
- `ubicaciones` y `alertas/*/eventos`: ya escritas; mantener. `auditoria`: sin acceso desde clientes.
- Storage `alertas/{alertaId}/*`: escritura solo del creador de la alerta, con límite de tamaño y `image/*`; lectura autenticada.
- Datos personales (cédula, teléfono): visibles solo para admin; no registrarlos en logs.

**Archivos que pueden volver a tocarse fuera de su fase**

| Archivo | Motivo |
|---|---|
| `package.json` (ambos repos) | Dependencias de cada fase |
| `firestore.indexes.json` | Solo si una consulta nueva lo exige |
| `core/domain/constants.ts` | Ajustar umbrales con datos reales |
| `nav.ts` | Solo si cambia el menú |
| Formularios de CRUD | Solo si se activa filtro por entidad |

---

## 11. Configuración y calidad

**Web (`.env.example`):** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`, `VITE_API_BASE_URL`, `VITE_DATA_SOURCE` (`firebase`|`mock`), `VITE_USE_EMULATORS` (`true`|`false`).

**API (`.env.example`):** `PORT`, `NODE_ENV`, `LOG_LEVEL`, `CORS_ORIGINS` (lista por comas), `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON` (o `GOOGLE_APPLICATION_CREDENTIALS`), `TZ_OPERACION` (default `America/Bogota`), `KPI_UMBRAL_RESPUESTA_SEG` (default 600).

**Constantes (`core/domain/constants.ts` y equivalente en la API):** `UBICACION_SIN_SENAL_SEG = 90`, `SECTOR_CELDA_M = 500`, `RADIO_AREA_KM_DEFAULT = 3`, `MAX_DURACION_SEG = 86400`, `LIMITE_ALERTAS_DEFAULT = 2000`, `MAP_CENTRO_DEFAULT = { lat: 10.4631, lng: -73.2532 }`, `TIPOS_ALERTA_CONOCIDOS = ['Accidente','Emergencia médica','Incendio','Otro']`.

**Calidad:** pruebas obligatorias en mappers, cálculos de KPI, agrupación en celdas, haversine, guard de rutas, esquemas de formularios y servicios/rutas de la API. Ninguna prueba requiere Firebase real (mocks; las reglas con emulador). Scripts: `dev`, `build`, `typecheck`, `lint`, `test`. Escritorio primero, responsivo hasta tablet; accesibilidad básica.

---

## 12. Decisiones abiertas y valores por defecto

Si no hay respuesta del orquestador, usar el valor por defecto sin bloquearse.

| # | Tema | Por defecto |
|---|---|---|
| 1 | ¿Administradores por entidad? | El admin ve todo (`entidadId` solo como columna y filtro opcional en tablas) |
| 2 | Umbral de "sin señal" | 90 s (la app publica cada 30 s libre / 5 s en atención) |
| 3 | Valores de `type` | Texto libre; filtros con los 4 conocidos más los presentes en datos |
| 4 | `prioridad` ausente | "Sin prioridad" |
| 5 | Umbral de cumplimiento de respuesta | 600 s |
| 6 | Sectores | Cuadrícula de 500 m; polígonos de barrios/comunas (GeoJSON) como extensión futura |
| 7 | Dónde viven las reglas | Se entregan en `ambulancias-api/firebase/`; el orquestador las integra al repositorio que las despliega |
| 8 | Contraseña de ambulancias | La define el admin (≥ 8 caracteres), igual que hoy |
| 9 | Eliminar ambulancias | No en v1 (solo deshabilitar) para conservar historial |
| 10 | Disponibilidad histórica de flota | No disponible (la app no guarda historial de turnos); solo instantánea |
| 11 | Id de documentos nuevos (personal, hospitales) | `crypto.randomUUID()`, como la app |
| 12 | KPI en tiempo real vs. precalculados | En tiempo real desde la API con lectura paginada; precalcular solo si el volumen lo exige |
| 13 | Pantalla temporal `AdminFlotaVivoScreen` de la app | Se elimina cuando la web esté en uso (la web la reemplaza) |

---

## 13. Cambios recomendados en la app móvil (pequeños y opcionales)

Se hacen en el repo Flutter, fuera de este proyecto. Ninguno bloquea las Fases 1 a 3.

1. **Registrar el origen de la llegada como campo de la alerta** (por ejemplo `llegadaOrigen: 'manual' | 'temporizador'` dentro de `campos` del hito `llegada`). Hoy solo está en el evento `meta.origen`; con el campo, el dashboard podría separar llegadas reales de las de temporizador sin leer eventos.
2. **Que el ciudadano consulte solo sus alertas** (`where('creadaPorUid', isEqualTo: uid)`) en lugar de `streamAlertas()` completo. Necesario antes de la Fase 4 para poder restringir la lectura de `alertas`.
3. **Retirar `AdminFlotaVivoScreen`** cuando la web cubra el mapa en vivo.

---

## 14. Glosario

- **Alerta:** emergencia reportada por un ciudadano desde la app.
- **Ambulancia:** unidad con cuenta propia en Firebase Auth (el uid es el id del documento).
- **Turno:** periodo con personal asignado (`enTurno: true`); la ubicación solo existe durante el turno.
- **Turno colgado:** unidad `enTurno` cuya app se cerró sin liberar al personal; deja de publicar ubicación.
- **Latido:** `actualizadoAt` de `ubicaciones`; indica si la unidad sigue enviando posición.
- **Instrumentación:** campos de tiempo y eventos agregados a la app para medir KPIs.
- **Simulada:** alerta de prueba o atendida con ETA de respaldo; se excluye de KPIs por defecto.
- **Sector:** celda de la cuadrícula (o polígono en el futuro) para agrupar alertas por zona.
