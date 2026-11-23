import { ApiError, errorDeRed, errorDeRespuesta, errorDeSesion } from '@/lib/api-errors';

export interface ApiRequest {
  url: string;
  init: RequestInit;
}

export type ApiNext = (request: ApiRequest) => Promise<Response>;
export type ApiInterceptor = (request: ApiRequest, next: ApiNext) => Promise<Response>;

const REINTENTOS_GET = 2;
const ESPERA_INICIAL_MS = 100;

export function interceptorToken(obtenerToken: () => Promise<string>): ApiInterceptor {
  return async (request, next) => {
    let token: string;
    try {
      token = await obtenerToken();
    } catch {
      throw errorDeSesion();
    }

    const headers = new Headers(request.init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return next({ ...request, init: { ...request.init, headers } });
  };
}

export function interceptorReintentos(): ApiInterceptor {
  return async (request, next) => {
    if ((request.init.method ?? 'GET').toUpperCase() !== 'GET') return next(request);

    let reintentos = 0;
    for (;;) {
      try {
        return await next(request);
      } catch (error) {
        const status = error instanceof ApiError ? error.status : -1;
        const reintentable = status === 0 || (status >= 500 && status <= 599);
        if (!reintentable || reintentos >= REINTENTOS_GET) throw error;

        await new Promise((resolve) => setTimeout(resolve, ESPERA_INICIAL_MS * 2 ** reintentos));
        reintentos += 1;
      }
    }
  };
}

export function interceptorMapeoErrores(): ApiInterceptor {
  return async (request, next) => {
    let response: Response;
    try {
      response = await next(request);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw errorDeRed();
    }

    if (!response.ok) throw await errorDeRespuesta(response);
    return response;
  };
}

export function encadenarInterceptors(interceptors: readonly ApiInterceptor[], terminal: ApiNext): ApiNext {
  return interceptors.reduceRight<ApiNext>((next, interceptor) => (request) => interceptor(request, next), terminal);
}
