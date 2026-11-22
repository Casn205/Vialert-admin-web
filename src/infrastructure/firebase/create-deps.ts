import type { Deps } from '@/core/ports';
import type { Env } from '@/lib/env';
import { ApiClient } from '../api/api-client';
import { HttpKpiRepository } from '../api/kpi-repository';
import { crearFirebase } from './app';
import { FirestoreAlertaRepository } from './alerta-repository';
import { FirestoreAmbulanciaRepository } from './ambulancia-repository';
import { FirebaseAuthService } from './auth-service';
import { FirestoreHospitalRepository } from './hospital-repository';
import { FirestorePersonalRepository } from './personal-repository';
import { FirestoreUbicacionRepository } from './ubicacion-repository';

/** Cablea todas las implementaciones reales (Firestore + API). */
export function createFirebaseDeps(env: Env): Deps {
  const { auth, db } = crearFirebase(env);
  const authService = new FirebaseAuthService(auth, db);
  const api = new ApiClient(env.VITE_API_BASE_URL!, () => authService.obtenerIdToken());
  return {
    fuente: 'firebase',
    auth: authService,
    alertas: new FirestoreAlertaRepository(db),
    ubicaciones: new FirestoreUbicacionRepository(db),
    ambulancias: new FirestoreAmbulanciaRepository(db, api),
    hospitales: new FirestoreHospitalRepository(db),
    personal: new FirestorePersonalRepository(db),
    kpis: new HttpKpiRepository(api),
  };
}
