# Cambios de la Fase 2 (mapa en vivo y alertas)

Este paquete trae **solo los archivos nuevos o modificados** respecto a la entrega 1-B. Descomprímelo sobre la carpeta del proyecto y acepta reemplazar. **Cambia `package.json`: ejecuta `npm install`.**

```powershell
Expand-Archive .\cambios-fase-2.zip -DestinationPath C:\dev\ambulancias-web -Force
npm install
npm run typecheck; npm run lint; npm test
```

## Para ver el mapa
En `.env` define `VITE_GOOGLE_MAPS_API_KEY` y `VITE_GOOGLE_MAPS_MAP_ID` (Map ID de tipo **vectorial**, necesario para `AdvancedMarker` y el calor de deck.gl). Sin ellas el mapa muestra un aviso y el panel sigue funcionando.

## Archivos modificados (8)
`package.json`, `docs/PROGRESO.md`, `src/shared-ui/index.ts`, `src/features/hospitals/components/HospitalFormModal.tsx` (selector de coordenadas), `src/features/hospitals/hospitals.test.tsx` (2 pruebas), y las páginas `LiveMapPage`, `AlertsListPage`, `AlertDetailPage` (dejan de ser relleno).

## Qué probar con tu Google Maps
1. Marcadores de ambulancia girando según el rumbo y con el color correcto; pin de alertas por prioridad.
2. Calor histórico y cuadrícula de sectores al activar sus interruptores (fuera de lo que cubren las pruebas).
3. Clic en el mapa del formulario de hospitales rellena latitud y longitud.
4. Con Firebase real: una unidad `enTurno` sin señal muestra "Cerrar turno" (la API llega en 1-C).
