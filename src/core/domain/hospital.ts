export interface Hospital {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
}

export type NuevoHospital = Omit<Hospital, 'id'>;
