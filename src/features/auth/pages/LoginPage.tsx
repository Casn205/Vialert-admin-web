import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { AuthError } from '@/core/domain/rol';
import { useDeps } from '@/lib/deps-context';
import { Button, FormField, Spinner, campoClase } from '@/shared-ui';
import { useSession } from '../hooks/useSession';

const esquema = z.object({
  email: z.string().trim().min(1, 'Escribe tu correo'),
  password: z.string().min(1, 'Escribe tu contraseña'),
});
type Datos = z.infer<typeof esquema>;

/** Cuadrícula de sectores: la misma idea que usa el mapa para mostrar dónde hay más alertas. */
function CuadriculaSectores() {
  const intensidad: Record<string, number> = { '3-2': 0.9, '3-3': 0.55, '4-2': 0.4, '2-5': 0.7, '5-4': 0.3, '1-1': 0.25 };
  return (
    <svg viewBox="0 0 320 240" role="img" aria-label="Cuadrícula de sectores con celdas de distinta intensidad" className="w-full max-w-md">
      {Array.from({ length: 6 }, (_, f) =>
        Array.from({ length: 8 }, (_, c) => {
          const k = intensidad[`${f}-${c}`];
          return (
            <rect
              key={`${f}-${c}`}
              x={c * 40 + 2}
              y={f * 40 + 2}
              width={36}
              height={36}
              rx={3}
              fill={k ? '#e8604f' : '#ffffff'}
              fillOpacity={k ?? 0.06}
            />
          );
        }),
      )}
      <circle cx={164} cy={142} r={6} fill="#7fd3c4" />
      <circle cx={164} cy={142} r={13} fill="none" stroke="#7fd3c4" strokeOpacity={0.5} />
    </svg>
  );
}

export default function LoginPage() {
  const { estado, aviso, login } = useSession();
  const { fuente } = useDeps();
  const ubicacion = useLocation();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Datos>({ resolver: zodResolver(esquema) });

  const desde = (ubicacion.state as { desde?: string } | null)?.desde ?? '/';
  if (estado === 'admin') return <Navigate to={desde} replace />;

  async function enviar(d: Datos) {
    setError(null);
    try {
      await login(d.email, d.password);
    } catch (e) {
      setError(e instanceof AuthError ? e.message : 'No se pudo iniciar sesión. Inténtalo de nuevo.');
    }
  }

  const mensaje = error ?? aviso;
  const verificando = estado === 'cargando';

  return (
    <div className="grid min-h-screen md:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between bg-lateral p-10 text-white md:flex">
        <p className="text-lg font-semibold tracking-tight">Vialert</p>
        <div className="space-y-8">
          <CuadriculaSectores />
          <div className="max-w-md space-y-2">
            <h1 className="text-3xl font-semibold leading-tight">Dónde están las ambulancias y dónde se necesitan</h1>
            <p className="text-white/70">Seguimiento en vivo, administración de la flota e indicadores de respuesta.</p>
          </div>
        </div>
        <p className="text-sm text-white/50">Panel de administración</p>
      </section>

      <main className="flex items-center justify-center p-6">
        <form onSubmit={handleSubmit(enviar)} noValidate className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="text-2xl font-semibold">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-tinta-suave">Solo para administradores.</p>
          </div>

          {mensaje && (
            <p role="alert" className="rounded-md border border-critico/30 bg-critico/10 px-3 py-2 text-sm text-critico">
              {mensaje}
            </p>
          )}

          <FormField htmlFor="email" label="Correo" error={errors.email?.message}>
            <input id="email" type="email" autoComplete="username" aria-invalid={!!errors.email} className={campoClase} {...register('email')} />
          </FormField>
          <FormField htmlFor="password" label="Contraseña" error={errors.password?.message}>
            <input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} className={campoClase} {...register('password')} />
          </FormField>

          <Button type="submit" className="w-full" cargando={isSubmitting || verificando}>
            Iniciar sesión
          </Button>
          {verificando && !isSubmitting && <Spinner etiqueta="Verificando acceso" />}

          {fuente === 'mock' && (
            <p className="rounded-md bg-fondo px-3 py-2 text-xs text-tinta-suave">
              Datos simulados. Entra con <strong>admin@admin.com</strong> y la contraseña <strong>admin123</strong>.
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
