import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from './api-client';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function cliente(fetchImpl: typeof fetch, token: () => Promise<string> = async () => 'tok') {
  return new ApiClient('http://api.test/', token, fetchImpl);
}

describe('ApiClient', () => {
  it('antepone /api/v1, envía el token y serializa el cuerpo', async () => {
    const f = vi.fn(async () => json(200, { ok: true }));
    await cliente(f as unknown as typeof fetch).post('/ambulancias', { a: 1 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test/api/v1/ambulancias');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(init.body).toBe('{"a":1}');
  });

  it('arma la query con fechas ISO y omite los undefined', async () => {
    const f = vi.fn(async () => json(200, {}));
    await cliente(f as unknown as typeof fetch).get('/kpis/resumen', {
      desde: new Date('2026-11-01T00:00:00Z'), tipo: undefined, incluirSimuladas: false,
    });
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe(
      'http://api.test/api/v1/kpis/resumen?desde=2026-11-01T00%3A00%3A00.000Z&incluirSimuladas=false',
    );
  });

  it('traduce el formato de error de la API', async () => {
    const f = async () => json(409, { error: { code: 'CONFLICT', message: 'Ya existe', details: { x: 1 } } });
    const e = await cliente(f as unknown as typeof fetch).post('/x').catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 409, code: 'CONFLICT', message: 'Ya existe', esConflicto: true });
  });

  it('maneja errores sin cuerpo JSON', async () => {
    const f = async () => new Response('boom', { status: 502 });
    await expect(cliente(f as unknown as typeof fetch).post('/x')).rejects.toMatchObject({ status: 502, code: 'INTERNAL' });
  });

  it('informa fallo de red y sesión expirada en español', async () => {
    const red = async () => { throw new TypeError('fetch failed'); };
    await expect(cliente(red as unknown as typeof fetch).post('/x')).rejects.toMatchObject({ code: 'RED' });
    const sinToken = cliente((async () => json(200, {})) as unknown as typeof fetch, async () => { throw new Error('x'); });
    await expect(sinToken.get('/x')).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });

  it('reintenta GET hasta dos veces ante respuestas 5xx', async () => {
    vi.useFakeTimers();
    try {
      let llamadas = 0;
      const f = async () => {
        llamadas += 1;
        return llamadas < 3 ? json(503, {}) : json(200, { ok: true });
      };
      const solicitud = cliente(f as unknown as typeof fetch).get<{ ok: boolean }>('/x');
      await vi.runAllTimersAsync();
      await expect(solicitud).resolves.toEqual({ ok: true });
      expect(llamadas).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('no reintenta POST ante errores transitorios', async () => {
    const f = vi.fn(async () => json(503, {}));
    await expect(cliente(f as unknown as typeof fetch).post('/x')).rejects.toMatchObject({ status: 503 });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('reintenta fallos de red en GET hasta el límite configurado', async () => {
    vi.useFakeTimers();
    try {
      const f = vi.fn(async () => {
        throw new TypeError('fetch failed');
      });
      const solicitud = cliente(f as unknown as typeof fetch).get('/x');
      await vi.runAllTimersAsync();
      await expect(solicitud).rejects.toMatchObject({ status: 0, code: 'RED' });
      expect(f).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('descarga archivos como Blob', async () => {
    const f = async () => new Response('a,b', { status: 200 });
    const b = await cliente(f as unknown as typeof fetch).blob('/reportes/alertas.csv');
    expect(await b.text()).toBe('a,b');
  });
});
