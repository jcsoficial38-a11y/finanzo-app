import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Finanzo ErrorBoundary] Erro capturado no ciclo de renderização:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-teal-100 selection:text-teal-900 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-slate-200/80 shadow-lg text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Armazenamento Local Seguro Ativo
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                O aplicativo protegeu suas finanças contra falhas. Todos os seus dados permanecem salvos com segurança no seu dispositivo.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recarregar em Modo Local</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
