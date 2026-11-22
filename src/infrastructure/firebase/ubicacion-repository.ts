import { collection, onSnapshot, type Firestore } from 'firebase/firestore';
import { mapUbicacion } from '@/core/mappers/ubicacion';
import type { OnError, UbicacionRepository, Unsubscribe } from '@/core/ports';
import type { Ubicacion } from '@/core/domain/ubicacion';

export class FirestoreUbicacionRepository implements UbicacionRepository {
  constructor(private readonly db: Firestore) {}

  suscribir(cb: (u: Ubicacion[]) => void, onError: OnError): Unsubscribe {
    return onSnapshot(
      collection(this.db, 'ubicaciones'),
      (snap) => cb(snap.docs.map((d) => mapUbicacion(d.id, d.data())).filter((u): u is Ubicacion => u !== null)),
      onError,
    );
  }
}
