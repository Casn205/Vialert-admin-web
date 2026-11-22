import { NavLink } from 'react-router-dom';
import { NAV } from '../nav';

export function Sidebar() {
  return (
    <aside className="flex shrink-0 flex-col bg-lateral text-white md:min-h-screen md:w-60">
      <div className="px-5 py-4 md:py-6">
        <p className="text-lg font-semibold tracking-tight">Vialert</p>
        <p className="text-xs text-white/60">Panel de administración</p>
      </div>
      <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-0">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                isActive ? 'bg-white/15 font-medium text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {item.etiqueta}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
