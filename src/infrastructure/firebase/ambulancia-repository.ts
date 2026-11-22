import { collection, onSnapshot, type Firestore } from 'firebase/firestore';
import type {
  Ambulancia,
  CamposEditablesAmbulancia,
  NuevaAmbulancia,
  NuevoLote,
  ResultadoFila,
} from '@/core/domain/ambulancia';
import { mapAmbulancia } from '@/core/mappers/ambulancia';
import type { AmbulanciaRepository, OnError, Unsubscribe } from '@/core/ports';
import type { ApiClient } from '../api/api-client';

/** Lecturas en vivo desde Firestore; todos los comandos van a la API (Admin SDK). */
export class FirestoreAmbulanciaRepository implements AmbulanciaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly api: ApiClient,
  ) {}

  suscribir(cb: (a: Ambulancia[]) => void, onError: OnError): Unsubscribe {
    return onSnapshot(
      collection(this.db, 'ambulancias'),
      (snap) => cb(snap.docs.map((d) => mapAmbulancia(d.id, d.data()))),
      onError,
    );
  }

  async crear(d: NuevaAmbulancia & { password: string }): Promise<Ambulancia> {
    const r = await this.api.post<Record<string, unknown> & { id: string }>('/ambulancias', d);
    return mapAmbulancia(r.id, r);
  }

  async crearLote(d: NuevoLote): Promise<ResultadoFila[]> {
    const r = await this.api.post<{ resultados: ResultadoFila[] }>('/ambulancias/lote', d);
    return r.resultados;
  }

  async actualizar(id: string, d: CamposEditablesAmbulancia): Promise<void> {
    await this.api.patch(`/ambulancias/${encodeURIComponent(id)}`, d);
  }
  async deshabilitar(id: string): Promise<void> {
    await this.api.post(`/ambulancias/${encodeURIComponent(id)}/deshabilitar`);
  }
  async habilitar(id: string): Promise<void> {
    await this.api.post(`/ambulancias/${encodeURIComponent(id)}/habilitar`);
  }
  async resetearPassword(id: string, password: string): Promise<void> {
    await this.api.post(`/ambulancias/${encodeURIComponent(id)}/password`, { password });
  }
  async cerrarTurno(id: string): Promise<void> {
    await this.api.post(`/ambulancias/${encodeURIComponent(id)}/cerrar-turno`);
  }
}
