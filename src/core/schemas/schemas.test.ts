import { describe, expect, it } from 'vitest';
import { loteSchema, nuevaAmbulanciaSchema } from './ambulancia';
import { hospitalSchema } from './hospital';
import { personalSchema } from './personal';

describe('hospitalSchema', () => {
  it('acepta coordenadas válidas y recorta el nombre', () => {
    const r = hospitalSchema.parse({ nombre: '  Clínica  ', lat: 10.46, lng: -73.25 });
    expect(r.nombre).toBe('Clínica');
  });
  it('rechaza nombre vacío y coordenadas fuera de rango', () => {
    expect(hospitalSchema.safeParse({ nombre: ' ', lat: 10, lng: 10 }).success).toBe(false);
    expect(hospitalSchema.safeParse({ nombre: 'x', lat: 91, lng: 10 }).success).toBe(false);
    expect(hospitalSchema.safeParse({ nombre: 'x', lat: 10, lng: -181 }).success).toBe(false);
  });
});

describe('personalSchema', () => {
  const base = { nombre: 'Leo', apellido: 'Messi', cedula: '829', entidadId: ' ninguno ' };
  it('normaliza la entidad (recorte + MAYÚSCULAS) como la app', () => {
    expect(personalSchema.parse({ tipo: 'conductor', ...base }).entidadId).toBe('NINGUNO');
  });
  it('exige teléfono solo a paramédicos', () => {
    expect(personalSchema.safeParse({ tipo: 'conductor', ...base }).success).toBe(true);
    expect(personalSchema.safeParse({ tipo: 'paramedico', ...base }).success).toBe(false);
    expect(personalSchema.safeParse({ tipo: 'paramedico', ...base, telefono: '327' }).success).toBe(true);
  });
});

describe('ambulancia', () => {
  const unidad = { placa: ' HJKO1 ', codigoInterno: 'c1', email: 'a@vialert.com' };
  it('replica las reglas del builder: normaliza y exige email con @', () => {
    const r = nuevaAmbulanciaSchema.parse({ ...unidad, password: '12345678', entidadId: 'hospital del sur' });
    expect(r.placa).toBe('HJKO1');
    expect(r.entidadId).toBe('HOSPITAL DEL SUR');
    expect(nuevaAmbulanciaSchema.safeParse({ ...unidad, email: 'sin-arroba', password: '12345678', entidadId: 'x' }).success).toBe(false);
  });
  it('exige contraseña de al menos 8 caracteres', () => {
    expect(nuevaAmbulanciaSchema.safeParse({ ...unidad, password: '1234567', entidadId: 'x' }).success).toBe(false);
  });
  it('el lote exige entre 1 y 50 filas', () => {
    const lote = { entidadId: 'x', estadoOperativo: 'habilitada', password: '12345678' };
    expect(loteSchema.safeParse({ ...lote, filas: [] }).success).toBe(false);
    expect(loteSchema.safeParse({ ...lote, filas: [unidad] }).success).toBe(true);
    expect(loteSchema.safeParse({ ...lote, filas: Array(51).fill(unidad) }).success).toBe(false);
  });
});
