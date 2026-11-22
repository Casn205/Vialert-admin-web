# Cambios del punto 1-B (hospitales y personal)

Este paquete trae **solo los archivos nuevos o modificados** respecto a la entrega 1-A. Descomprímelo sobre la carpeta del proyecto y acepta reemplazar los existentes. **No cambia `package.json`: no hace falta `npm install`.**

```powershell
Expand-Archive .\cambios-1b.zip -DestinationPath C:\dev\ambulancias-web -Force
npm run typecheck; npm run lint; npm test
```

## Archivos nuevos (12)

| Archivo | Para qué |
|---|---|
| `src/lib/use-suscripcion.ts` | Hook que se suscribe a un repositorio en vivo y se desuscribe al desmontar |
| `src/lib/use-suscripcion.test.tsx` | Pruebas del hook |
| `src/test/render.tsx` | Ayuda para probar páginas con datos simulados |
| `src/features/hospitals/hooks/useHospitales.ts` | Lista en vivo y operaciones de escritura |
| `src/features/hospitals/components/HospitalFormModal.tsx` | Formulario crear/editar |
| `src/features/hospitals/hospitals.test.tsx` | 8 pruebas |
| `src/features/staff/hooks/usePersonal.ts` | Personal en vivo, operaciones y búsqueda de placas |
| `src/features/staff/components/PersonalSeccion.tsx` | Lista y gestión de un tipo de personal |
| `src/features/staff/components/PersonalFormModal.tsx` | Formulario crear/editar |
| `src/features/staff/components/PersonalDetalleModal.tsx` | Detalle con cédula y teléfono completos |
| `src/features/staff/staff.test.tsx` | 11 pruebas |
| `docs/CAMBIOS-1B.md` | Este archivo |

## Archivos reemplazados (4)

| Archivo | Qué cambió |
|---|---|
| `src/features/hospitals/pages/HospitalsPage.tsx` | De página de relleno a la página real |
| `src/features/staff/pages/StaffPage.tsx` | De página de relleno a la página real (pestañas) |
| `docs/PROGRESO.md` | Casillas del 1-B y supuestos |
| `README.md` | Texto de verificación actualizado |

No se tocaron `router.tsx`, `ports.ts`, el cableado ni los repositorios.

## Qué probar con tu Firebase

Con `VITE_DATA_SOURCE=firebase`:

1. **Hospitales:** crea uno, edítalo y elimínalo. En la consola de Firestore, el documento de `hospitales/{id}` debe tener exactamente `nombre`, `lat` y `lng`.
2. **Personal:** crea un conductor y un paramédico. Los documentos en `personal/conductores/items/{id}` y `personal/paramedicos/items/{id}` deben tener `nombre`, `apellido`, `cedula`, `entidadId` (en mayúsculas), `estado: "disponible"` y `ambulanciaId: null`; el paramédico, además, `telefono`.
3. **Compatibilidad con la app móvil:** el personal creado desde la web debe aparecer en la app al iniciar turno una ambulancia.
4. **Eliminar:** un conductor `ocupado` (en turno) debe aparecer con el botón deshabilitado.
5. La consola del navegador no debe mostrar errores rojos.
