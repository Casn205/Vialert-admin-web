import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { fechaCreacion, type Alerta } from '@/core/domain/alerta';
import { LIMITE_ALERTAS_DEFAULT } from '@/core/domain/constants';
import type { EventoAlerta } from '@/core/domain/evento';
import { mapAlerta } from '@/core/mappers/alerta';
import { mapEvento } from '@/core/mappers/evento';
import type { AlertaRepository, FiltroAlertasRango, OnError, Unsubscribe } from '@/core/ports';

const aAlertas = (docs: QueryDocumentSnapshot[]): Alerta[] =>
  docs.map((d) => mapAlerta(d.id, d.data())).filter((a): a is Alerta => a !== null);

export class FirestoreAlertaRepository implements AlertaRepository {
  constructor(private readonly db: Firestore) {}

  suscribirActivas(cb: (a: Alerta[]) => void, onError: OnError): Unsubscribe {
    const q = query(collection(this.db, 'alertas'), where('estado', 'in', ['activa', 'enProceso']));
    return onSnapshot(q, (snap) => cb(aAlertas(snap.docs)), onError);
  }

  async listarPorRango(f: FiltroAlertasRango): Promise<{ alertas: Alerta[]; truncado: boolean }> {
    const tope = f.limite ?? LIMITE_ALERTAS_DEFAULT;
    const col = collection(this.db, 'alertas');

    // Pedimos uno de más para saber si se alcanzó el límite.
    const principal = await getDocs(
      query(
        col,
        where('createdAtServer', '>=', Timestamp.fromDate(f.desde)),
        where('createdAtServer', '<=', Timestamp.fromDate(f.hasta)),
        orderBy('createdAtServer', 'desc'),
        limit(tope + 1),
      ),
    );
    let truncado = principal.docs.length > tope;
    const alertas = aAlertas(principal.docs.slice(0, tope));

    if (f.incluirLegado) {
      // Alertas antiguas sin `createdAtServer`: se buscan por `createdAt` (texto ISO, ordenable).
      const legado = await getDocs(
        query(
          col,
          where('createdAt', '>=', f.desde.toISOString()),
          where('createdAt', '<=', f.hasta.toISOString()),
          orderBy('createdAt', 'desc'),
          limit(tope + 1),
        ),
      );
      truncado = truncado || legado.docs.length > tope;
      const vistos = new Set(alertas.map((a) => a.id));
      for (const a of aAlertas(legado.docs.slice(0, tope))) {
        if (!vistos.has(a.id) && a.createdAtServer === null) alertas.push(a);
      }
      alertas.sort((a, b) => (fechaCreacion(b)?.getTime() ?? 0) - (fechaCreacion(a)?.getTime() ?? 0));
    }
    return { alertas, truncado };
  }

  async obtenerPorId(id: string): Promise<Alerta | null> {
    const snap = await getDoc(doc(this.db, 'alertas', id));
    return snap.exists() ? mapAlerta(snap.id, snap.data()) : null;
  }

  async listarEventos(alertaId: string): Promise<EventoAlerta[]> {
    const snap = await getDocs(
      query(collection(this.db, 'alertas', alertaId, 'eventos'), orderBy('ts', 'asc')),
    );
    return snap.docs.map((d) => mapEvento(d.id, d.data())).filter((e): e is EventoAlerta => e !== null);
  }
}
