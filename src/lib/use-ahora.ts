import { useEffect, useState } from 'react';

/** La hora actual, refrescada cada `cadaMs`: hace que "sin señal" y los tiempos de espera cambien sin datos nuevos. */
export function useAhora(cadaMs = 10_000): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), cadaMs);
    return () => clearInterval(t);
  }, [cadaMs]);
  return ahora;
}
