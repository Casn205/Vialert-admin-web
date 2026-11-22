import type { Unsubscribe } from '@/core/ports';

/** Estado en memoria observable. Solo para el modo `mock` y las pruebas. */
export class Store<T> {
  private valor: T;
  private readonly suscriptores = new Set<(v: T) => void>();

  constructor(inicial: T) {
    this.valor = inicial;
  }
  get(): T {
    return this.valor;
  }
  set(nuevo: T): void {
    this.valor = nuevo;
    for (const cb of [...this.suscriptores]) cb(nuevo);
  }
  update(fn: (actual: T) => T): void {
    this.set(fn(this.valor));
  }
  /** Llama a `cb` enseguida con el valor actual y en cada cambio. */
  subscribe(cb: (v: T) => void): Unsubscribe {
    this.suscriptores.add(cb);
    cb(this.valor);
    return () => {
      this.suscriptores.delete(cb);
    };
  }
  get cantidadSuscriptores(): number {
    return this.suscriptores.size;
  }
}
