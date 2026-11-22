const fechaHora = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

export function formatoFechaHora(d: Date | null): string {
  return d ? fechaHora.format(d) : 'Sin dato';
}

/** "hace 12 s", "hace 5 min", "hace 2 h", "hace 3 d". */
export function haceCuanto(d: Date | null, ahora: Date = new Date()): string {
  if (!d) return 'Sin dato';
  const s = Math.max(0, Math.round((ahora.getTime() - d.getTime()) / 1000));
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86_400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86_400)} d`;
}

/** "1112345678" → "••••5678". */
export function enmascarar(valor: string, visibles = 4): string {
  if (valor.length <= visibles) return valor;
  return `${'•'.repeat(4)}${valor.slice(-visibles)}`;
}
