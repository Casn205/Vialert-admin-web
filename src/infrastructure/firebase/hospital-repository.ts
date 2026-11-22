import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import type { Hospital, NuevoHospital } from '@/core/domain/hospital';
import { mapHospital } from '@/core/mappers/hospital';
import type { HospitalRepository, OnError, Unsubscribe } from '@/core/ports';

export class FirestoreHospitalRepository implements HospitalRepository {
  constructor(private readonly db: Firestore) {}

  suscribir(cb: (h: Hospital[]) => void, onError: OnError): Unsubscribe {
    return onSnapshot(
      collection(this.db, 'hospitales'),
      (snap) => cb(snap.docs.map((d) => mapHospital(d.id, d.data())).filter((h): h is Hospital => h !== null)),
      onError,
    );
  }

  async crear(d: NuevoHospital): Promise<string> {
    const id = crypto.randomUUID();
    // Misma forma que `HospitalModel.toMap()` de la app: { nombre, lat, lng }.
    await setDoc(doc(this.db, 'hospitales', id), { nombre: d.nombre, lat: d.lat, lng: d.lng });
    return id;
  }

  async actualizar(id: string, d: Partial<NuevoHospital>): Promise<void> {
    await updateDoc(doc(this.db, 'hospitales', id), { ...d });
  }

  async eliminar(id: string): Promise<void> {
    await deleteDoc(doc(this.db, 'hospitales', id));
  }
}
