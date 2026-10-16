import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// Proteção global silenciosa: evita que exceções não tratadas travem o runtime
if (typeof window !== 'undefined') {
  window.onerror = function (message, source, lineno, colno, error) {
    console.warn('[Finanzo Runtime]:', message, error);
    return true;
  };

  window.addEventListener('unhandledrejection', function (event) {
    console.warn('[Finanzo Promise]:', event.reason);
    event.preventDefault();
  });
}

/**
 * RENDERIZAÇÃO DIRETA DO PAINEL PRINCIPAL:
 * O aplicativo inicializa diretamente como 'ativo/carregado',
 * renderizando a interface completa (menu, painel financeiro, gráficos e transações)
 * imediatamente na abertura, sem telas ou botões intermediários.
 */
function mountAppDirectly() {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  if ((rootElement as any)._finanzoAppMounted) return;
  (rootElement as any)._finanzoAppMounted = true;

  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </StrictMode>
    );
  } catch (err) {
    console.error('[Finanzo] Erro na montagem inicial:', err);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAppDirectly);
  } else {
    mountAppDirectly();
  }
}
