import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

/**
 * 1. ORDEM DE CARREGAMENTO SEGURO (MUITO IMPORTANTE):
 * - Envolve a inicialização da interface no evento 'DOMContentLoaded'.
 * - A estrutura do app, HTML, menus e botões são desenhados e exibidos PRIMEIRO.
 * - O Firebase inicializa silenciosamente em segundo plano, sem travar a tela principal.
 */
function mountFinanzoApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.warn('[Finanzo] Elemento #root ainda não disponível.');
    return;
  }

  // Previne renderizações duplicadas
  if ((rootElement as any)._finanzoAppMounted) {
    return;
  }
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
    console.error('[Finanzo] Erro ao renderizar árvore React:', err);
  }
}

// Execução segura: aguarda DOMContentLoaded se a página ainda estiver carregando
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountFinanzoApp);
  } else {
    // DOM já está pronto
    mountFinanzoApp();
  }
}
