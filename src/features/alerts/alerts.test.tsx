import { screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Alerta } from '@/core/domain/alerta';
import { createMockDeps } from '@/infrastructure/mock/mock-deps';
import { crearSeed } from '@/infrastructure/mock/seed';
import { renderConDeps } from '@/test/render';
import AlertDetailPage from './pages/AlertDetailPage';
import AlertsListPage from './pages/AlertsListPage';

const filasDeLaTabla = () => screen.getAllByRole('row').slice(1);
const textoFilas = () => filasDeLaTabla().map((r) => r.textContent ?? '');

async function abrirLista(deps = createMockDeps({ movimiento: false })) {
  const r = renderConDeps(<AlertsListPage />, { deps });
  await waitFor(() => expect(screen.getByText(/^\d+ alertas?$/)).toBeInTheDocument());
  return r;
}

function abrirDetalle(id: string, deps = createMockDeps({ movimiento: false })) {
  return renderConDeps(
    <Routes>
      <Route path="/alertas/:id" element={<AlertDetailPage />} />
    </Routes>,
    { deps, ruta: `/alertas/${id}` },
  );
}

describe('AlertsListPage', () => {
  it('lista las alertas de los últimos 7 días, sin las simuladas ni las antiguas, de más reciente a más antigua', async () => {
    await abrirLista();
    expect(screen.getByText('6 alertas')).toBeInTheDocument(); // 8 en total − 1 simulada − 1 antigua sin hora del servidor
    const filas = textoFilas();
    expect(filas[0]).toContain('Accidente'); // al-1, la de hace 4 min
    expect(filas[0]).toContain('Crítica');
    expect(filas.some((f) => f.includes('Simulada'))).toBe(false);
  });

  it('el botón de orden invierte la lista', async () => {
    const { user } = await abrirLista();
    const primera = textoFilas()[0];
    await user.click(screen.getByRole('button', { name: /Ordenar por fecha/ }));
    expect(textoFilas()[0]).not.toBe(primera);
    expect(textoFilas().at(-1)).toBe(primera);
  });

  it('filtra por estado, tipo y prioridad (incluida "sin prioridad")', async () => {
    const { user } = await abrirLista();
    await user.selectOptions(screen.getByLabelText('Estado'), 'enProceso');
    expect(screen.getByText('1 alerta')).toBeInTheDocument();
    expect(textoFilas()[0]).toContain('Emergencia médica');
    await user.selectOptions(screen.getByLabelText('Estado'), '');

    await user.selectOptions(screen.getByLabelText('Tipo'), 'Incendio');
    expect(textoFilas().every((f) => f.includes('Incendio'))).toBe(true);
    await user.selectOptions(screen.getByLabelText('Tipo'), '');

    await user.selectOptions(screen.getByLabelText('Prioridad'), 'critica');
    expect(screen.getByText('1 alerta')).toBeInTheDocument();
  });

  it('las opciones de tipo incluyen los 4 conocidos y los que aparecen en los datos', async () => {
    const seed = crearSeed();
    const deps = createMockDeps({ movimiento: false });
    const rara: Alerta = { ...seed.alertas[0]!, id: 'x', type: 'Rescate animal' };
    deps.alertas.listarPorRango = vi.fn().mockResolvedValue({ alertas: [rara], truncado: false });
    await abrirLista(deps);
    const opciones = within(screen.getByLabelText('Tipo')).getAllByRole('option').map((o) => o.textContent);
    expect(opciones).toEqual(['Todos', 'Accidente', 'Emergencia médica', 'Incendio', 'Otro', 'Rescate animal']);
  });

  it('"incluir simuladas" suma la alerta de prueba', async () => {
    const { user } = await abrirLista();
    await user.click(screen.getByLabelText('Incluir alertas simuladas'));
    expect(screen.getByText('7 alertas')).toBeInTheDocument();
    expect(textoFilas().some((f) => f.includes('Simulada'))).toBe(true);
  });

  it('las alertas antiguas (sin createdAtServer) solo aparecen si se pide y el rango las cubre', async () => {
    const { user } = await abrirLista();
    await user.selectOptions(screen.getByLabelText('Rango'), '30');
    await user.click(screen.getByLabelText(/Incluir alertas antiguas/));
    await waitFor(() => expect(screen.getByText('7 alertas')).toBeInTheDocument());
    const antigua = filasDeLaTabla().find((f) => f.textContent?.includes('Alerta anterior'))!;
    expect(antigua).toHaveTextContent('Hora del teléfono');
    expect(antigua).toHaveTextContent('Sin prioridad');
    expect(antigua).toHaveTextContent('Sin dato'); // sin tiempos
  });

  it('muestra la respuesta calculada con las duraciones del dominio', async () => {
    await abrirLista();
    const fila = filasDeLaTabla().find((f) => f.textContent?.includes('Accidente') && f.textContent.includes('Media'))!;
    expect(fila).toHaveTextContent('7 min'); // al-3: llegada a 420 s
  });

  it('un rango personalizado inválido avisa y no lista nada', async () => {
    const { user } = await abrirLista();
    await user.selectOptions(screen.getByLabelText('Rango'), 'personalizado');
    const desde = screen.getByLabelText('Desde');
    await user.clear(desde);
    await user.type(desde, '2026-12-31');
    // max={hasta} no impide escribir: el esquema lo valida
    expect(await screen.findByRole('alert')).toHaveTextContent('El rango no es válido');
    expect(screen.getByText('No hay alertas con estos filtros.')).toBeInTheDocument();
  });

  it('avisa si el resultado se truncó', async () => {
    const deps = createMockDeps({ movimiento: false });
    const base = (await deps.alertas.listarPorRango({ desde: new Date(0), hasta: new Date(9e12) })).alertas;
    deps.alertas.listarPorRango = vi.fn().mockResolvedValue({ alertas: base, truncado: true });
    await abrirLista(deps);
    expect(screen.getByRole('status')).toHaveTextContent('Hay más alertas en este rango');
  });

  it('pagina de 25 en 25 y vuelve a la primera página al filtrar', async () => {
    const seed = crearSeed();
    const muchas: Alerta[] = Array.from({ length: 60 }, (_, i) => ({
      ...seed.alertas[0]!,
      id: `m-${i}`,
      createdAtServer: new Date(Date.now() - i * 60_000),
      type: i % 2 ? 'Incendio' : 'Accidente',
    }));
    const deps = createMockDeps({ movimiento: false });
    deps.alertas.listarPorRango = vi.fn().mockResolvedValue({ alertas: muchas, truncado: false });
    const { user } = await abrirLista(deps);
    expect(filasDeLaTabla()).toHaveLength(25);
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Página 3 de 3')).toBeInTheDocument();
    expect(filasDeLaTabla()).toHaveLength(10);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Tipo'), 'Incendio');
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  });

  it('cada fila enlaza a su detalle', async () => {
    await abrirLista();
    const enlaces = screen.getAllByRole('link', { name: /Ver detalle/ });
    expect(enlaces[0]!.getAttribute('href')).toMatch(/^\/alertas\/al-/);
  });
});

describe('AlertDetailPage', () => {
  it('muestra datos, duraciones del vector de la sección 8, personal, hospital y fotos', async () => {
    abrirDetalle('al-5');
    expect(await screen.findByRole('heading', { level: 1, name: 'Emergencia médica' })).toBeInTheDocument();
    const dur = within(screen.getByRole('region', { name: 'Duraciones' }));
    expect(dur.getByText('Asignación').nextSibling).toHaveTextContent('35 s'); // tomada a 30 + 5·1 s
    expect(dur.getByText('Viaje').nextSibling).toHaveTextContent('7 min 10 s'); // ETA 390 s + 40 s
    expect(dur.getByText('Error del ETA inicial').nextSibling).toHaveTextContent('+10,3 %');
    const atencion = within(screen.getByRole('region', { name: 'Atención' }));
    expect(await atencion.findByText('TKV201')).toBeInTheDocument(); // placa de amb-1
    expect(atencion.getByText('CLINICA SANTA ISABEL')).toBeInTheDocument();
    expect(atencion.getByText('Laura Pérez')).toBeInTheDocument();
    expect(atencion.getByText('Camila Duarte')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /Foto \d de la alerta/ })).toHaveLength(2);
  });

  it('con el vector de prueba del plan (sección 8) las duraciones salen exactas', async () => {
    const seed = crearSeed();
    const t = (hms: string) => new Date(`2026-11-20T${hms}-05:00`);
    const vector: Alerta = {
      ...seed.alertas[0]!,
      id: 'vector',
      createdAtServer: t('10:00:00'),
      tomadaAt: t('10:00:40'),
      rutaIniciadaAt: t('10:01:00'),
      llegadaAt: t('10:09:00'),
      atendidaAt: t('10:09:01'),
      trasladoIniciadoAt: t('10:10:30'),
      trasladoFinalizadoAt: t('10:25:00'),
      etaInicialSeg: 420,
    };
    const deps = createMockDeps({ movimiento: false });
    deps.alertas.obtenerPorId = vi.fn().mockResolvedValue(vector);
    abrirDetalle('vector', deps);
    const dur = within(await screen.findByRole('region', { name: 'Duraciones' }));
    const valor = (e: string) => dur.getByText(e).nextSibling?.textContent;
    expect(valor('Asignación')).toBe('40 s');
    expect(valor('Respuesta')).toBe('9 min');
    expect(valor('Viaje')).toBe('8 min');
    expect(valor('Permanencia en escena')).toBe('1 min 30 s');
    expect(valor('Traslado')).toBe('14 min 30 s');
    expect(valor('Ciclo total')).toBe('25 min');
    expect(valor('Error del ETA inicial')).toBe('+14,3 %');
  });

  it('la línea de tiempo lista los eventos en orden con su hora y el origen de la llegada', async () => {
    abrirDetalle('al-5');
    const linea = within(await screen.findByRole('region', { name: 'Línea de tiempo' }));
    const items = await linea.findAllByRole('listitem');
    expect(items.map((i) => i.querySelector('p')!.textContent)).toEqual([
      'Alerta creada',
      'Tomada por una ambulancia',
      'Ruta iniciada',
      'Llegada al lugar',
      'Marcada como atendida',
      'Traslado iniciado',
      'Traslado finalizado',
    ]);
    expect(items[3]).toHaveTextContent(/Registrada (por temporizador|manualmente)/);
    expect(items[6]).toHaveTextContent('Registrada manualmente');
    expect(items[1]).toHaveTextContent('Unidad: TKV201');
    expect(items[1]).toHaveTextContent(/\+35 s desde la creación/);
    expect(items[2]).not.toHaveTextContent('Registrada');
  });

  it('una alerta antigua dice "Sin dato", sin duraciones ni eventos', async () => {
    abrirDetalle('al-8');
    expect(await screen.findByText(/anterior a la medición de tiempos: no tiene hora del servidor/)).toBeInTheDocument();
    expect(await screen.findByText(/no tiene eventos registrados/)).toBeInTheDocument();
    const datos = within(screen.getByRole('region', { name: 'Datos de la alerta' }));
    expect(datos.getByText('Creada (hora del servidor)').nextSibling).toHaveTextContent('Sin dato');
    expect(screen.getByText('El ciudadano no adjuntó fotos.')).toBeInTheDocument();
    expect(screen.getByText('Sin prioridad')).toBeInTheDocument();
  });

  it('una alerta activa sin atender no inventa datos de la atención', async () => {
    abrirDetalle('al-1');
    const atencion = within(await screen.findByRole('region', { name: 'Atención' }));
    expect(atencion.getAllByText('Sin dato')).toHaveLength(4);
    const dur = within(screen.getByRole('region', { name: 'Duraciones' }));
    expect(dur.getAllByText('Sin dato').length).toBe(7);
  });

  it('un identificador inexistente muestra "Alerta no encontrada"', async () => {
    abrirDetalle('no-existe');
    expect(await screen.findByText('Alerta no encontrada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a las alertas/ })).toHaveAttribute('href', '/alertas');
  });

  it('si falla la carga, ofrece reintentar', async () => {
    const deps = createMockDeps({ movimiento: false });
    deps.alertas.obtenerPorId = vi.fn().mockRejectedValueOnce(new Error('sin conexión')).mockResolvedValue(null);
    const { user } = abrirDetalle('al-1', deps);
    expect(await screen.findByText('sin conexión')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Alerta no encontrada')).toBeInTheDocument();
  });

  it('el personal o la unidad que ya no existen se muestran como "(eliminado)"', async () => {
    const seed = crearSeed();
    const deps = createMockDeps({ movimiento: false });
    deps.alertas.obtenerPorId = vi.fn().mockResolvedValue({ ...seed.alertas[0]!, ambulanciaAsignada: 'fantasma', conductorId: 'c-99', paramedicoId: null });
    abrirDetalle('al-1', deps);
    const atencion = within(await screen.findByRole('region', { name: 'Atención' }));
    await waitFor(() => expect(atencion.getAllByText('(eliminado)')).toHaveLength(2));
  });

  it('con una foto, al hacer clic se amplía', async () => {
    const { user } = abrirDetalle('al-3');
    await user.click(await screen.findByRole('button', { name: 'Ampliar la foto 1' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByAltText('Foto 1 de la alerta, ampliada')).toBeInTheDocument();
  });
});
