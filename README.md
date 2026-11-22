# ambulancias-web

Panel web de administración de Vialert (mapa en vivo, flota, personal, hospitales, alertas e indicadores).
Frontend en React + TypeScript. Comparte el proyecto Firebase con la app móvil y habla con `ambulancias-api` para las operaciones que requieren el Admin SDK.

> El plan completo está en [`docs/PLAN_MAESTRO.md`](docs/PLAN_MAESTRO.md). El avance, en [`docs/PROGRESO.md`](docs/PROGRESO.md).

## Requisitos

- Node.js 20 o superior (probado con 22) y npm.

## Puesta en marcha

```bash
npm install
cp .env.example .env      # ya viene con VITE_DATA_SOURCE=mock
npm run dev               # http://localhost:5173
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Revisa tipos y compila a `dist/` |
| `npm run typecheck` | Solo revisa tipos |
| `npm run lint` | ESLint, incluidas las reglas de frontera entre capas |
| `npm test` | Pruebas (Vitest) |

## Dos modos de datos (`VITE_DATA_SOURCE`)

**`mock` (por defecto):** todo funciona en memoria con datos de ejemplo, sin Firebase ni API. Las ambulancias se mueven en el mapa. Usuarios de prueba:

| Correo | Contraseña | Resultado |
|---|---|---|
| `admin@admin.com` | `admin123` | Entra al panel |
| `ambulancia@vialert.com` | `ambulancia123` | Se rechaza (rol `ambulancia`) |
| `sinrol@vialert.com` | `sinrol123` | Se rechaza (sin documento de rol) |

Los datos de ejemplo incluyen los casos límite que la web debe manejar: un turno colgado (en turno y sin señal), una ubicación de una unidad fuera de turno, una alerta anterior a la instrumentación, una alerta simulada y una unidad inactiva.

**`firebase`:** usa Firestore, Auth y `ambulancias-api`. Completa en `.env` las variables `VITE_FIREBASE_*` y `VITE_API_BASE_URL` (la validación las exige; mientras la API no exista, cualquier URL sirve, p. ej. `http://localhost:3000`). Con `VITE_USE_EMULATORS=true` apunta a los emuladores locales (Auth 9099, Firestore 8080).

> Prerrequisito: el administrador debe tener `roles/{uid}` con `{ rol: "admin" }`. La app móvil también lo reconoce por `admins/{uid}`, pero la web y las reglas de seguridad solo miran `roles`.

## Estructura

```
src/
├── app/             Entrada, rutas, menú, layout y cableado (build-deps.ts)
├── core/            Núcleo sin dependencias de UI ni de Firebase
│   ├── domain/      Entidades, enumeraciones, constantes, duraciones de alerta
│   ├── mappers/     Documento de Firestore → entidad (tolerantes a datos antiguos)
│   ├── schemas/     Validación de formularios (Zod)
│   ├── geo/         Distancia (Haversine) y cuadrícula de sectores
│   └── ports.ts     Interfaces de los repositorios y servicios
├── infrastructure/  Implementaciones de los puertos
│   ├── firebase/    Firestore y Auth (único lugar que importa `firebase/*`)
│   ├── api/         Cliente HTTP hacia ambulancias-api (único lugar con `fetch`)
│   └── mock/        Datos de ejemplo en memoria
├── features/        auth, live-map, alerts, ambulances, staff, hospitals, dashboard
├── shared-ui/       Componentes base (tabla, modal, confirmación, avisos…)
└── lib/             Variables de entorno, formato y contexto de dependencias
```

### Reglas de frontera (las verifica `npm run lint`)

1. Solo `infrastructure/firebase` importa `firebase/*`.
2. Solo `infrastructure/api` usa `fetch`.
3. `core` no importa `infrastructure`, `features`, `app`, `shared-ui` ni React.
4. Las `features` no importan `infrastructure`: obtienen los repositorios con `useDeps()`.
5. Una `feature` no importa de otra.

### Cómo se usa un repositorio desde una feature

```tsx
const { hospitales } = useDeps();
useEffect(() => hospitales.suscribir(setLista, setError), [hospitales]);
```

## Qué verificar con tu Firebase real

Esta entrega se probó con datos simulados (pruebas, tipos, lint y compilación). **El código de Firebase y de la API no se ha ejecutado contra servicios reales.** Con tu `.env` en modo `firebase`:

1. Inicia sesión con una cuenta que tenga `roles/{uid}.rol = "admin"`: debe entrar al panel.
2. Inicia sesión con una cuenta de ciudadano o ambulancia: debe cerrarse la sesión con el aviso "Tu cuenta no tiene permisos de administrador."
3. Abre la consola del navegador: no debe haber errores rojos al navegar por el menú.

Con el punto 1-B ya puedes probar contra tu Firebase la **lectura y escritura de hospitales y personal** (crea, edita y elimina un registro de prueba y revisa en la consola de Firestore que el documento tiene la misma forma que los que crea la app). Ambulancias llegan en 1-C; mapa y alertas, en la Fase 2.
