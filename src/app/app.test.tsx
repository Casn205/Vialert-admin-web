import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMockDeps } from '@/infrastructure/mock/mock-deps';
import { AppProviders } from './AppProviders';
import { rutas } from './router';

function montar(ruta = '/') {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  const deps = createMockDeps({ movimiento: false });
  render(
    <AppProviders deps={deps}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { router, user: userEvent.setup() };
}

async function iniciarSesion(user: ReturnType<typeof userEvent.setup>, email: string, password: string) {
  // La página de login se carga bajo demanda (lazy): con la suite completa puede tardar más de 1 s.
  await user.type(await screen.findByLabelText('Correo', {}, { timeout: 5000 }), email);
  await user.type(screen.getByLabelText('Contraseña'), password);
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
}

beforeEach(() => sessionStorage.clear());

describe('acceso y rutas protegidas', () => {
  it('sin sesión, una ruta protegida redirige al login', async () => {
    const { router } = montar('/hospitales');
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('valida que los campos no estén vacíos', async () => {
    const { user } = montar('/login');
    await user.click(await screen.findByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText('Escribe tu correo')).toBeInTheDocument();
    expect(screen.getByText('Escribe tu contraseña')).toBeInTheDocument();
  });

  it('con credenciales incorrectas muestra el error en español', async () => {
    const { user } = montar('/login');
    await iniciarSesion(user, 'admin@admin.com', 'mala-clave');
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
  });

  it('un administrador entra, vuelve a la ruta que pedía y ve el menú', async () => {
    const { user, router } = montar('/hospitales');
    await iniciarSesion(user, 'admin@admin.com', 'admin123');
    expect(await screen.findByRole('heading', { name: 'Hospitales' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/hospitales');
    const menu = screen.getByRole('navigation', { name: 'Secciones' });
    for (const t of ['Mapa en vivo', 'Alertas', 'Ambulancias', 'Personal', 'Hospitales', 'Indicadores']) {
      expect(menu).toHaveTextContent(t);
    }
    expect(screen.getByText('Datos simulados', { selector: 'span' })).toBeInTheDocument();
  });

  it('un usuario autenticado sin rol de admin es rechazado y se le avisa', async () => {
    const { user, router } = montar('/mapa');
    await iniciarSesion(user, 'ambulancia@vialert.com', 'ambulancia123');
    expect(await screen.findByText('Tu cuenta no tiene permisos de administrador.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('un usuario sin documento de rol también es rechazado', async () => {
    const { user } = montar('/mapa');
    await iniciarSesion(user, 'sinrol@vialert.com', 'sinrol123');
    expect(await screen.findByText('Tu cuenta no tiene permisos de administrador.')).toBeInTheDocument();
  });
});

describe('navegación del panel', () => {
  it('la raíz lleva al mapa y el menú navega a cada sección', async () => {
    const { user, router } = montar('/');
    await iniciarSesion(user, 'admin@admin.com', 'admin123');
    expect(await screen.findByRole('heading', { name: 'Mapa en vivo' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/mapa');

    const destinos: [string, string][] = [
      ['Alertas', '/alertas'],
      ['Ambulancias', '/ambulancias'],
      ['Personal', '/personal'],
      ['Indicadores', '/dashboard'],
    ];
    for (const [etiqueta, ruta] of destinos) {
      await user.click(screen.getByRole('link', { name: etiqueta }));
      await waitFor(() => expect(router.state.location.pathname).toBe(ruta));
      expect(await screen.findByRole('heading', { name: etiqueta })).toBeInTheDocument();
    }
  });

  it('una dirección desconocida muestra "Página no encontrada"', async () => {
    const { user } = montar('/no-existe');
    await iniciarSesion(user, 'admin@admin.com', 'admin123');
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument();
  });

  it('cerrar sesión devuelve al login', async () => {
    const { user, router } = montar('/mapa');
    await iniciarSesion(user, 'admin@admin.com', 'admin123');
    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });
});
