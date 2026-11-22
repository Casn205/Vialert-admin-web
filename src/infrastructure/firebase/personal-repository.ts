import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import type {
  CamposEditablesPersonal,
  NuevoPersonal,
  Personal,
  TipoPersonal,
} from '@/core/domain/personal';
import { mapPersonal } from '@/core/mappers/personal';
import type { OnError, PersonalRepository, Unsubscribe } from '@/core/ports';

const SUBCOLECCION: Record<TipoPersonal, string> = {
  conductor: 'conductores',
  paramedico: 'paramedicos',
};

/** `personal/{conductores|paramedicos}/items/{id}`, igual que la app. */
export class FirestorePersonalRepository implements PersonalRepository {
  constructor(private readonly db: Firestore) {}

  private items(tipo: TipoPersonal) {
    return collection(this.db, 'personal', SUBCOLECCION[tipo], 'items');
  }

  suscribir(tipo: TipoPersonal, cb: (p: Personal[]) => void, onError: OnError): Unsubscribe {
    return onSnapshot(
      this.items(tipo),
      (snap) => cb(snap.docs.map((d) => mapPersonal(tipo, d.id, d.data()))),
      onError,
    );
  }

  async crear(d: NuevoPersonal): Promise<string> {
    const id = crypto.randomUUID();
    // Misma forma que `ConductorModel/ParamedicoModel.toMap()` de la app.
    await setDoc(doc(this.items(d.tipo), id), {
      nombre: d.nombre,
      apellido: d.apellido,
      cedula: d.cedula,
      ...(d.tipo === 'paramedico' ? { telefono: d.telefono ?? '' } : {}),
      entidadId: d.entidadId,
      estado: 'disponible',
      ambulanciaId: null,
    });
    return id;
  }

  async actualizar(tipo: TipoPersonal, id: string, d: CamposEditablesPersonal): Promise<void> {
    // Solo campos editables; `estado` y `ambulanciaId` los gestiona la app.
    const { nombre, apellido, cedula, entidadId, telefono } = d;
    const datos = {
      ...(nombre !== undefined && { nombre }),
      ...(apellido !== undefined && { apellido }),
      ...(cedula !== undefined && { cedula }),
      ...(entidadId !== undefined && { entidadId }),
      ...(tipo === 'paramedico' && telefono !== undefined && telefono !== null && { telefono }),
    };
    await updateDoc(doc(this.items(tipo), id), datos);
  }

  async eliminar(tipo: TipoPersonal, id: string): Promise<void> {
    const ref = doc(this.items(tipo), id);
    await runTransaction(this.db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      if (snap.data().estado === 'ocupado') {
        throw new Error('No se puede eliminar: está asignado a una ambulancia en turno.');
      }
      tx.delete(ref);
    });
  }
}
