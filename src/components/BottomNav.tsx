import React from 'react';
import { Home, ListOrdered, PieChart, Tags, Plus } from 'lucide-react';
import { ActiveTab } from '../types/finance';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenAddModal,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 pb-safe shadow-lg">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between relative">
        {/* Tab 1: Início (Resumos) */}
        <button
          onClick={() => onChangeTab('dashboard')}
          aria-label="Início"
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] transition-colors ${
            activeTab === 'dashboard'
              ? 'text-teal-700 font-semibold'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Home className="w-5 h-5" strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 tracking-tight">Início</span>
        </button>

        {/* Tab 2: Histórico */}
        <button
          onClick={() => onChangeTab('history')}
          aria-label="Histórico"
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] transition-colors ${
            activeTab === 'history'
              ? 'text-teal-700 font-semibold'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <ListOrdered className="w-5 h-5" strokeWidth={activeTab === 'history' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 tracking-tight">Histórico</span>
        </button>

        {/* Central Floating Action Button: + */}
        <div className="flex-1 flex items-center justify-center -mt-5">
          <button
            onClick={onOpenAddModal}
            aria-label="Adicionar Transação"
            className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all min-h-[48px] min-w-[48px]"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Gráficos */}
        <button
          onClick={() => onChangeTab('charts')}
          aria-label="Gráficos"
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] transition-colors ${
            activeTab === 'charts'
              ? 'text-teal-700 font-semibold'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <PieChart className="w-5 h-5" strokeWidth={activeTab === 'charts' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 tracking-tight">Gráficos</span>
        </button>

        {/* Tab 4: Categorias */}
        <button
          onClick={() => onChangeTab('categories')}
          aria-label="Categorias"
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] transition-colors ${
            activeTab === 'categories'
              ? 'text-teal-700 font-semibold'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Tags className="w-5 h-5" strokeWidth={activeTab === 'categories' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 tracking-tight">Categorias</span>
        </button>
      </div>
    </nav>
  );
};
