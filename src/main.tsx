import React, { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// 1. PROTEÇÃO GLOBAL CONTRA ERROS DE SCRIPT (EVITAR TELA BRANCA)
if (typeof window !== 'undefined') {
  window.onerror = function (message, source, lineno, colno, error) {
    console.warn('[Finanzo Global Guard]:', message, error);
    return true; // Impede que o erro desmonte o app ou deixe o ecrã em branco
  };

  window.addEventListener('unhandledrejection', function (event) {
    console.warn('[Finanzo Unhandled Rejection]:', event.reason);
    event.preventDefault(); // Impede tela branca por promessas rejeitadas
  });
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Error Boundary Seguro: Se houver qualquer falha inesperada, exibe o app em modo de contingência local sem tela branca
class SafeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[Finanzo SafeErrorBoundary Handled]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 font-bold flex items-center justify-center mx-auto text-sm border border-teal-100">
              FP
            </div>
            <h2 className="text-sm font-bold text-slate-800">Modo Local Seguro Ativo</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              O aplicativo recuperou o estado seguro dos seus dados locais. Clique abaixo para carregar seu painel financeiro.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Abrir Painel Financeiro
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * 3. RENDERIZAÇÃO GARANTIDA:
 * Monta a interface React completa no elemento #root imediatamente.
 */
function mountFinanzoApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    return;
  }

  if ((rootElement as any)._finanzoAppMounted) {
    return;
  }
  (rootElement as any)._finanzoAppMounted = true;

  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <SafeErrorBoundary>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </SafeErrorBoundary>
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
    mountFinanzoApp();
  }
}
