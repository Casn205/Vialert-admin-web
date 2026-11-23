import '@fontsource-variable/public-sans';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AppProviders } from './AppProviders';
import { createDeps } from './create-deps';

function mostrarError(mensaje: string) {
  const root = document.getElementById('root')!;
  root.innerHTML = '';
  const pre = document.createElement('pre');
  pre.style.cssText = 'margin:2rem;white-space:pre-wrap;font:14px system-ui;color:#c8372d';
  pre.textContent = mensaje;
  root.appendChild(pre);
}

createDeps()
  .then((deps) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <AppProviders deps={deps}>
          <App />
        </AppProviders>
      </StrictMode>,
    );
  })
  .catch((e: unknown) => mostrarError(e instanceof Error ? e.message : String(e)));
