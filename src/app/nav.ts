export interface ItemNav {
  to: string;
  etiqueta: string;
}

/** Menú lateral. Para agregar una sección: una línea aquí y su ruta en `router.tsx`. */
export const NAV: readonly ItemNav[] = [
  { to: '/mapa', etiqueta: 'Mapa en vivo' },
  { to: '/alertas', etiqueta: 'Alertas' },
  { to: '/ambulancias', etiqueta: 'Ambulancias' },
  { to: '/personal', etiqueta: 'Personal' },
  { to: '/hospitales', etiqueta: 'Hospitales' },
  { to: '/dashboard', etiqueta: 'Indicadores' },
];

/** Título de la sección según la ruta actual (para la barra superior). */
export function tituloDe(pathname: string): string {
  const item = NAV.find((n) => pathname === n.to || pathname.startsWith(`${n.to}/`));
  return item?.etiqueta ?? 'Panel de administración';
}
