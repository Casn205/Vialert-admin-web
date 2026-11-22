const horaConSegundos = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'America/Bogota',
});

/** "10:09:01" (hora de Colombia). */
export const formatoHoraSeg = (d: Date | null): string => (d ? horaConSegundos.format(d) : 'Sin hora');

/** 0,1429 → "+14,3 %". Se arma a mano: el formato de porcentaje de `Intl` cambia entre navegadores y versiones. */
export function formatoPorcentaje(n: number | null): string {
  if (n === null) return 'Sin dato';
  const texto = Math.abs(n * 100).toFixed(1).replace('.', ',');
  const signo = Math.round(n * 1000) === 0 ? '' : n > 0 ? '+' : '−';
  return `${signo}${texto} %`;
}

/** 3200 → "3,2 km". */
export const formatoDistancia = (m: number | null): string => (m === null ? 'Sin dato' : `${(m / 1000).toFixed(1).replace('.', ',')} km`);
