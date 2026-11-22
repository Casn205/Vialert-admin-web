/** Cliente HTTP mínimo hacia `ambulancias-api`. Único lugar de la web que habla HTTP. */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  get esConflicto(): boolean {
    return this.status === 409;
  }
}

type Query = Record<string, string | number | boolean | Date | undefined>;

export class ApiClient {
  private readonly base: string;

  constructor(
    baseUrl: string,
    private readonly getToken: () => Promise<string>,
    private readonly fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
  ) {
    this.base = `${baseUrl.replace(/\/+$/, '')}/api/v1`;
  }

  get<T>(path: string, query?: Query): Promise<T> {
    return this.request<T>('GET', path, { query });
  }
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }
  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body });
  }

  async blob(path: string, query?: Query): Promise<Blob> {
    const res = await this.enviar('GET', path, { query });
    return res.blob();
  }

  private async request<T>(method: string, path: string, opts: { body?: unknown; query?: Query }): Promise<T> {
    const res = await this.enviar(method, path, opts);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private async enviar(method: string, path: string, opts: { body?: unknown; query?: Query }): Promise<Response> {
    let token: string;
    try {
      token = await this.getToken();
    } catch {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Tu sesión expiró. Vuelve a iniciar sesión.');
    }

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.base}${path}${consulta(opts.query)}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    } catch {
      throw new ApiError(0, 'RED', 'No se pudo conectar con el servidor. Revisa tu conexión.');
    }

    if (!res.ok) throw await errorDe(res);
    return res;
  }
}

function consulta(q?: Query): string {
  if (!q) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined) continue;
    p.set(k, v instanceof Date ? v.toISOString() : String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function errorDe(res: Response): Promise<ApiError> {
  try {
    const j = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } };
    return new ApiError(
      res.status,
      j.error?.code ?? 'INTERNAL',
      j.error?.message ?? `Error ${res.status} del servidor`,
      j.error?.details,
    );
  } catch {
    return new ApiError(res.status, 'INTERNAL', `Error ${res.status} del servidor`);
  }
}
