import { ESTADOS_OPERATIVOS, type Ambulancia } from '../domain/ambulancia';
import { aFecha } from './fecha';
import { advertir, booleano, texto, uno, type Doc } from './util';

/** `ambulancias/{uid}` → `Ambulancia`. Siempre devuelve un resultado (todo es opcional salvo el id). */
export function mapAmbulancia(id: string, d: Doc): Ambulancia {
  const estado = uno(d.estadoOperativo, ESTADOS_OPERATIVOS);
  if (!estado) advertir(`Ambulancia ${id}: estadoOperativo desconocido, se usa 'habilitada'`, d.estadoOperativo);

  const currentConductorId = texto(d.currentConductorId);
  const currentParamedicoId = texto(d.currentParamedicoId);

  return {
    id,
    email: texto(d.email) ?? '',
    placa: texto(d.placa) ?? '',
    codigoInterno: texto(d.codigoInterno) ?? '',
    entidadId: texto(d.entidadId) ?? '',
    estadoOperativo: estado ?? 'habilitada',
    currentConductorId,
    currentParamedicoId,
    currentAlertaId: texto(d.currentAlertaId),
    // Si el campo no existe (datos antiguos) se deduce del personal a bordo, como la app.
    enTurno: booleano(d.enTurno) ?? (currentConductorId !== null || currentParamedicoId !== null),
    turnoIniciadoAt: aFecha(d.turnoIniciadoAt),
    ultimoCambioEstadoAt: aFecha(d.ultimoCambioEstadoAt),
    createdAt: aFecha(d.createdAt),
  };
}
