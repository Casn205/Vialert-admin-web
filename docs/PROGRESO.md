# Progreso

## Fase 1 · Base y gestión de datos

### 1-A. Fundaciones del frontend: entregado

- [x] Scaffold Vite + TypeScript estricto + ESLint con reglas de frontera + Vitest + Tailwind; `.env.example` y `lib/env.ts` (Zod).
- [x] `core/domain/*` completo y `alerta-duraciones.ts`.
- [x] `core/mappers/*` completo, con pruebas (3 formatos de fecha, defaults, documentos antiguos, descarte sin `lat/lng`, `enTurno` deducido).
- [x] `core/ports.ts` con todos los puertos; `core/geo/*` (Haversine y `agruparEnCeldas`) con pruebas.
- [x] Esquemas de formularios (`core/schemas/*`) con pruebas.
- [x] Implementaciones Firebase de los repositorios y de `AuthService`; `ApiClient` y `HttpKpiRepository`; el repositorio de ambulancias con sus comandos HTTP.
- [x] Implementaciones en memoria (`infrastructure/mock`) con datos de ejemplo y movimiento simulado.
- [x] Cableado completo (`build-deps.ts`, `lib/deps-context.tsx`), `router.tsx` con todas las rutas, `nav.ts` y layout.
- [x] Feature `auth` (login, `RequireAdmin`, cierre de sesión) con pruebas; `shared-ui` base.

**Verificación:** `typecheck`, `lint`, `test` (80) y `build` en verde. El lint falla si una feature importa `firebase/*`, `infrastructure` u otra feature (comprobado).
**Pendiente de tu lado:** probar el login real con tu Firebase (ver README).

### 1-B. Hospitales y personal: entregado

- [x] Feature `hospitals` completa: lista ordenada con búsqueda, crear, editar, eliminar con confirmación, estado vacío, errores y avisos.
- [x] Feature `staff` completa: pestañas Conductores / Paramédicos (`?tipo=paramedico` abre directo en la segunda), búsqueda por nombre o cédula, crear, editar, detalle y eliminar.
- [x] Cédula y teléfono enmascarados en las tablas y completos en el detalle.
- [x] `estado` y `ambulanciaId` solo lectura; eliminar bloqueado (botón deshabilitado y también rechazado por el repositorio) si el personal está `ocupado`.
- [x] Formularios con las validaciones de `core/schemas` (entidad en MAYÚSCULAS, teléfono obligatorio solo en paramédicos).
- [x] 23 pruebas nuevas (103 en total).

**Verificación:** `typecheck`, `lint`, `test` y `build` en verde. Probado con datos simulados; **la escritura real en Firestore (formas de los documentos y transacción de eliminar) falta por comprobar con tu Firebase.**
### 1-C. API base, ambulancias y feature web: pendiente

## Fase 2 · Operación en vivo: entregado

- [x] Feature `live-map`: mapa de Google (`AdvancedMarker`), 5 capas con interruptor (ambulancias, alertas activas, hospitales, calor con deck.gl, sectores en cuadrícula), panel lateral (contadores, alertas por prioridad y antigüedad, disponibles por radio, unidades, top 5 de sectores), ocultar `!enTurno`, sin señal (90 s, redibujo cada 10 s), turno colgado con "Cerrar turno", store de filtros (Zustand).
- [x] Feature `alerts`: lista con filtros y paginación en cliente, detalle con mapa pequeño, galería de fotos, línea de tiempo y duraciones (`duracionesDeAlerta`).
- [x] Selector de coordenadas con clic en el mapa en el formulario de hospitales (pendiente de 1-B).
- [x] Lógica pura con pruebas en `core/domain/flota.ts` y `core/domain/alerta-vista.ts`.

**Verificación:** `typecheck`, `lint`, `test` (167) y `build` en verde. **No probado con Google Maps real** (sin clave en el entorno de desarrollo): el dibujo del mapa, el calor de deck.gl y los rectángulos de sectores quedan por comprobar a ojo con tu clave y Map ID vectorial.
## Fase 3 · Analítica: pendiente
## Fase 4 · Seguridad: pendiente
## Fase 5 · Despliegue en AWS: no se ejecuta ahora

---

## Supuestos y desviaciones del plan (Fase 2)

- **Sin clave o Map ID:** el mapa muestra un aviso y el panel sigue funcionando.
- **Alertas antiguas** (`incluirLegado`): apagado por defecto, con interruptor en los filtros del mapa y de la lista.
- **Simuladas:** excluidas por defecto en el mapa y en la lista; con interruptor.
- **Unidad con ubicación pero sin documento en `ambulancias`:** se muestra con la insignia "Sin datos de la unidad"; no se marca como turno colgado (no se sabe si está de turno).
- **Estado de la unidad:** se usa `estadoOperativo` de la ubicación; si falta, se deduce de si hay alerta en curso (el de `ambulancias` es ambiguo).
- **Orden de alertas del panel:** prioridad (crítica → baja, sin prioridad al final) y, dentro, la más antigua primero.
- **"Cerrar turno":** visible solo si `enTurno` y sin señal. En mock se simula en memoria; en Firebase llama a la API (1-C).
- **Disponibles en el área:** cuenta unidades `habilitada` con señal, incluidas las que no tienen documento de ambulancia.
- **Archivos fuera del plan:** `core/domain/flota.ts`, `core/domain/alerta-vista.ts`, `lib/use-carga.ts`, `lib/use-ahora.ts`, `lib/use-alertas-rango.ts`, `shared-ui/map/*`, `shared-ui/tonos.ts`, `src/google-maps.d.ts`.
- **Modificados de fases anteriores:** `shared-ui/index.ts` (exporta mapa y tonos), `HospitalFormModal.tsx` (selector, anunciado en 1-B), `hospitals.test.tsx` (2 pruebas nuevas), `package.json`.
- **Mock:** las unidades se mueven, pero ninguna cambia de color sola (no hay transición libre → atendiendo). El color cambia en mock solo cuando una unidad pierde señal.
- **Dependencias nuevas:** `@vis.gl/react-google-maps`, `@deck.gl/{core,layers,aggregation-layers,google-maps}`, `zustand`, `@types/google.maps` (dev). No se instaló `date-fns` (no hizo falta).

## Supuestos y desviaciones del plan (1-B)

- **Archivo nuevo fuera del plan:** `lib/use-suscripcion.ts` (hook que encapsula suscribirse/desuscribirse a un repositorio en vivo) y `src/test/render.tsx` (ayuda para las pruebas de páginas).
- **Selector de coordenadas en el mapa (hospitales):** se difiere a la Fase 2, porque aún no están instaladas las librerías del mapa. Por ahora son campos numéricos con una nota. La Fase 2 hará un cambio pequeño en `HospitalFormModal.tsx`.
- **Formulario de personal:** crear y editar usan el mismo esquema (`personalSchema`); `personalEdicionSchema` queda sin uso por ahora.
- **Edición de teléfono:** solo se guarda para paramédicos.
- **Normalización de la entidad:** se aplica también al editar (la app móvil no normaliza el personal, el plan sí).
- **Búsqueda:** filtros en el cliente, sin consultas adicionales.

## Supuestos y desviaciones del plan (1-A)

- **Cableado:** `useDeps` y `DepsProvider` viven en `lib/deps-context.tsx` (no en `app/deps.tsx`) para que las features puedan usarlos sin importar la capa `app`. `app/build-deps.ts` decide la implementación y las carga bajo demanda (el modo `mock` no descarga Firebase y viceversa).
- **Puertos:** todos en un solo archivo, `core/ports.ts`, que incluye la interfaz `Deps`.
- **Errores de autenticación:** `AuthError` está en `core/domain/rol.ts`; `FirebaseAuthService` traduce los códigos de Firebase a mensajes en español.
- **Páginas de relleno:** un solo componente genérico (`PlaceholderPage`) usado por 7 páginas de una línea que cada fase reemplazará. El router no cambia.
- **Archivos no listados en el plan:** `mappers/util.ts`, `mappers/rol.ts`, `lib/format.ts`, `shared-ui/Button.tsx`, `shared-ui/styles.ts`.
- **Versiones:** se instalaron las últimas disponibles (React 19, React Router 7, Firebase 13, Vite 8, TypeScript 6, Zod 4, Vitest 5, Tailwind 4). Quedan fijadas en `package-lock.json`.
- **Tipografía:** Public Sans, autoalojada con `@fontsource-variable` (sin pedir fuentes a Google en tiempo de ejecución).
- **Dependencias aún no instaladas** (se añaden con su fase): mapa (`@vis.gl/react-google-maps`, deck.gl), gráficas (Recharts), estado de filtros (Zustand), fechas (date-fns).
- **Eliminar personal** usa una transacción de Firestore para rechazar a quien esté `ocupado`.
- **Consulta por rango** pide un documento de más para saber si el resultado se truncó.
