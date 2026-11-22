# Cambios del punto 1-C (web)

Este paquete trae **solo los archivos nuevos o modificados** de `ambulancias-web`. Descomprímelo sobre la carpeta del proyecto. **No cambia `package.json`: no hace falta `npm install` en la web.**

```powershell
Expand-Archive .\cambios-1c-web.zip -DestinationPath C:\dev\ambulancias-web -Force
npm run typecheck; npm run lint; npm test
```

La API va en un repo aparte: `ambulancias-api.zip` (ver su `README.md`).

## Archivos nuevos (8)

| Archivo | Para qué |
|---|---|
| `src/lib/api-errors.ts` | `esConflicto(e)`: detecta el 409 sin importar `infrastructure/` |
| `src/features/ambulances/hooks/useAmbulancias.ts` | Lista en vivo (por placa) y comandos |
| `src/features/ambulances/components/AmbulanciaFormModal.tsx` | Crear / editar una ambulancia |
| `src/features/ambulances/components/CrearFlotaModal.tsx` | Crear flota por lote, con resultado por fila |
| `src/features/ambulances/components/PasswordModal.tsx` | Cambiar la contraseña de una unidad |
| `src/features/ambulances/ambulances.test.tsx` | 5 pruebas esenciales |
| `docs/CAMBIOS-1C.md` | Este archivo |

## Archivos reemplazados (3)

| Archivo | Qué cambió |
|---|---|
| `src/features/ambulances/pages/AmbulancesPage.tsx` | De página de relleno a la página real |
| `docs/PROGRESO.md` | Casillas del 1-C y supuestos |
| `docs/PREGUNTAS.md` | Remite a las preguntas del backend |

## Qué probar con tu Firebase

1. Levanta la API (`npm run dev` en `ambulancias-api`, con `FIREBASE_PROJECT_ID` y las credenciales de Admin SDK) y pon en la web `VITE_DATA_SOURCE=firebase` y `VITE_API_BASE_URL=http://localhost:3000`.
2. Tu usuario debe tener `roles/{uid}` con `rol: "admin"`; con otro usuario la API responde 403.
3. **Crear ambulancia:** deben quedar el usuario en Authentication, `ambulancias/{uid}` y `roles/{uid}` con `rol: "ambulancia"`, y un documento en `auditoria`. Inicia sesión con esa cuenta en la app móvil.
4. **Crear flota:** incluye una fila con un correo ya existente: esa fila falla y las demás se crean.
5. **Deshabilitar** una unidad libre: su cuenta queda deshabilitada y no puede iniciar sesión en la app. Si está en turno, debe avisar del conflicto.
6. **Cerrar turno** de una unidad con turno colgado: queda `enTurno: false`, desaparece su documento de `ubicaciones` y su personal vuelve a `disponible`. Con una alerta en curso, debe avisar del conflicto.
7. La consola del navegador no debe mostrar errores rojos ni errores de CORS (`CORS_ORIGINS` de la API debe incluir el origen de la web).
