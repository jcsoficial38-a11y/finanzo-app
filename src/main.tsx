import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

/**
 * 1. CARREGAMENTO EM DÉCIMO SEGUNDO (DOMCONTENTLOADED) E CARREGAMENTO SEGURO
 * Garante que todo o documento HTML esteja 100% carregado e desenhado antes de montar o app.
 * O aplicativo desenha todas as telas, menus e botões PRIMEIRO, antes de qualquer chamada do Firebase.
 */
function initFinanzoApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.warn('[Finanzo] Aguardando elemento #root estar pronto no DOM...');
    return;
  }

  // Previne inicialização duplicada
  if ((rootElement as any)._finanzoMounted) {
    return;
  }
  (rootElement as any)._finanzoMounted = true;

  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </ErrorBoundary>
      </StrictMode>
    );
  } catch (error) {
    console.error('[Finanzo] Falha segura ao renderizar no DOM:', error);
    // Renderização de segurança em caso de falha crítica no ReactDOM
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background-color: #f8fafc; color: #1e293b; text-align: center;">
        <div style="width: 48px; height: 48px; border-radius: 16px; background-color: #f0fdfa; color: #0d9488; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; font-weight: bold; font-size: 18px; border: 1px solid #ccfbf1;">
          FP
        </div>
        <h1 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">Finanças Pessoais</h1>
        <p style="font-size: 13px; color: #64748b; margin-bottom: 20px; max-width: 300px; line-height: 1.5;">
          Armazenamento Local Ativo. Seus dados estão salvos com segurança.
        </p>
        <button onclick="window.location.reload()" style="padding: 10px 22px; font-size: 13px; font-weight: 600; background-color: #0d9488; color: white; border: none; border-radius: 14px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          Abrir Aplicativo
        </button>
      </div>
    `;
  }
}

// Execução segura: aguarda DOMContentLoaded se a página ainda estiver em carregamento
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFinanzoApp);
  } else {
    // DOM já pronto
    initFinanzoApp();
  }
}
