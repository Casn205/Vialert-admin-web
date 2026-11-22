import type { EstadoAlerta, Prioridad } from '@/core/domain/alerta';
import type { EstadoUnidad } from '@/core/domain/flota';
import type { TonoBadge } from './Badge';

export const tonoEstadoAlerta = (e: EstadoAlerta): TonoBadge => (e === 'activa' ? 'critico' : e === 'enProceso' ? 'aviso' : 'ok');

export const tonoPrioridad = (p: Prioridad | null): TonoBadge =>
  p === 'critica' ? 'critico' : p === 'alta' ? 'aviso' : p === 'media' ? 'info' : p === 'baja' ? 'ok' : 'neutro';

export const tonoEstadoUnidad = (e: EstadoUnidad): TonoBadge =>
  e === 'disponible' ? 'ok' : e === 'atendiendo' ? 'critico' : e === 'traslado' ? 'aviso' : 'sinSenal';
