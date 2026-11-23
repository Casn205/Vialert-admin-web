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

export function errorDeSesion(): ApiError {
  return new ApiError(401, 'UNAUTHENTICATED', 'Tu sesión expiró. Vuelve a iniciar sesión.');
}

export function errorDeRed(): ApiError {
  return new ApiError(0, 'RED', 'No se pudo conectar con el servidor. Revisa tu conexión.');
}

export async function errorDeRespuesta(res: Response): Promise<ApiError> {
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

/**
 * `true` si el error viene de la API con estado 409 (`CONFLICT`: p. ej. "la ambulancia está en turno").
 * Se detecta por `status` para no importar `infrastructure/` desde las features.
 */
export function esConflicto(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'status' in e && (e as { status: unknown }).status === 409;
}
