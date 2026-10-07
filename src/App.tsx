import React, { useState } from 'react';
import { useFinanceStorage } from './hooks/useFinanceStorage';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { ChartsView } from './components/ChartsView';
import { TransactionsList } from './components/TransactionsList';
import { BottomNav } from './components/BottomNav';
import { AddTransactionModal } from './components/AddTransactionModal';
import { BudgetModal } from './components/BudgetModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { CategoryManagerView } from './components/CategoryManagerView';
import { ProfileModal } from './components/ProfileModal';
import { LockScreen } from './components/LockScreen';
import { getPinStatus } from './utils/pinSecurity';
import { ActiveTab } from './types/finance';
import { formatCurrency } from './utils/formatters';
import { exportMonthToCSV } from './utils/csvExport';
import { CurrencyVisibilityProvider } from './context/CurrencyVisibilityContext';
import { Plus, ArrowRight, PieChart, Sparkles, UserCheck, FileSpreadsheet, Calendar, Layers } from 'lucide-react';

export default function App() {
  const {
    currentMonthKey,
    setCurrentMonthKey,
    goToPreviousMonth,
    goToNextMonth,
    incomeCategories,
    expenseCategories,
    transactions,
    currentMonthTransactions,
    currentMonthBudget,
    budgets,
    defaultBudget,
    categoryBudgets,
    userProfile,
    updateUserProfile,
    setMonthBudget,
    setCategoryBudget,
    monthSummary,
    addCategory,
    deleteCategory,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    resetToInitialData,
    restoreFromBackup,
  } = useFinanceStorage();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [historyScope, setHistoryScope] = useState<'currentMonth' | 'allMonths'>('currentMonth');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // 4-Digit PIN Lock State
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const status = getPinStatus();
    return status.isEnabled && status.hasPin;
  });

  // Combine income and expense categories for lookup
  const allCategories = [...incomeCategories, ...expenseCategories];

  const handleExportCSV = () => {
    exportMonthToCSV(
      currentMonthTransactions,
      allCategories,
      monthSummary,
      currentMonthKey
    );
  };

  return (
    <CurrencyVisibilityProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      {/* Centered Mobile Container */}
      <div className="w-full max-w-md mx-auto bg-slate-50 flex-1 flex flex-col min-h-screen pb-24 shadow-xs sm:border-x sm:border-slate-200/60">
        {/* Fixed / Sticky Top Header with Month Navigation */}
        <Header
          currentMonthKey={currentMonthKey}
          profile={userProfile}
          onPrevMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          onSelectMonth={(key) => setCurrentMonthKey(key)}
          onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onResetData={resetToInitialData}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 space-y-4">
          {/* TAB 1: Início (Dashboard / Resumos) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Resumos Visuais Principais */}
              <SummaryCards
                summary={monthSummary}
                onEditBudget={() => setIsBudgetModalOpen(true)}
              />

              {/* Quick Charts Snapshot */}
              <div className="p-4 rounded-3xl bg-white border border-slate-200/70 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                      <PieChart className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-xs">
                        Visão Geral de Gastos
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Distribuição por categorias
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('charts')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                  >
                    <span>Ver Gráficos</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Compact Donut / preview */}
                <ChartsView
                  transactions={currentMonthTransactions}
                  categories={expenseCategories}
                  summary={monthSummary}
                />
              </div>

              {/* Quick Recent Transactions Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-slate-700">
                    Últimos Lançamentos do Mês
                  </h3>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver Histórico Completo ({currentMonthTransactions.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <TransactionsList
                  transactions={currentMonthTransactions}
                  defaultPageSize={5}
                  categories={allCategories}
                  onDeleteTransaction={deleteTransaction}
                  onUpdateTransaction={updateTransaction}
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  onExportCSV={handleExportCSV}
                />
              </div>
            </div>
          )}

          {/* TAB 2: Histórico Completo */}
          {activeTab === 'history' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="px-1 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Histórico de Lançamentos
                  </h2>
                  <p className="text-xs text-slate-500">
                    {historyScope === 'currentMonth'
                      ? 'Lançamentos registrados para o mês selecionado'
                      : 'Todos os lançamentos salvos no aplicativo'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleExportCSV}
                    title="Exportar resumo e lançamentos em CSV"
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-teal-50 hover:border-teal-200 text-slate-700 hover:text-teal-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors active:scale-95 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                    <span className="hidden sm:inline">Exportar CSV</span>
                  </button>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo</span>
                  </button>
                </div>
              </div>

              {/* Scope Switcher: Mês Selecionado vs Todos os Lançamentos */}
              <div className="grid grid-cols-2 p-1 bg-slate-200/80 rounded-2xl gap-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setHistoryScope('currentMonth')}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    historyScope === 'currentMonth'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>Mês Atual ({currentMonthTransactions.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryScope('allMonths')}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    historyScope === 'allMonths'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Todos os Registros ({transactions.length})</span>
                </button>
              </div>

              <TransactionsList
                transactions={historyScope === 'currentMonth' ? currentMonthTransactions : transactions}
                categories={allCategories}
                onDeleteTransaction={deleteTransaction}
                onUpdateTransaction={updateTransaction}
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onExportCSV={handleExportCSV}
                defaultPageSize={10}
              />
            </div>
          )}

          {/* TAB 3: Gráficos Visuais */}
          {activeTab === 'charts' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="px-1">
                <h2 className="text-base font-bold text-slate-900">
                  Gráficos & Análises
                </h2>
                <p className="text-xs text-slate-500">
                  Acompanhe visualmente para onde está indo o seu dinheiro
                </p>
              </div>

              <ChartsView
                transactions={currentMonthTransactions}
                categories={expenseCategories}
                summary={monthSummary}
              />
            </div>
          )}

          {/* TAB 4: Gerenciamento de Categorias */}
          {activeTab === 'categories' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="px-1">
                <h2 className="text-base font-bold text-slate-900">
                  Gerenciar Categorias
                </h2>
                <p className="text-xs text-slate-500">
                  Cadastre e organize suas categorias de Rendas e Despesas
                </p>
              </div>

              <CategoryManagerView
                incomeCategories={incomeCategories}
                expenseCategories={expenseCategories}
                transactions={transactions}
                onAddCategory={addCategory}
                onDeleteCategory={deleteCategory}
              />
            </div>
          )}
        </main>
      </div>

      {/* Bottom Navigation with Action Button "+" */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        currentMonthKey={currentMonthKey}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
        onAddTransaction={addTransaction}
        onOpenCategoriesManager={() => setIsCategoryModalOpen(true)}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        currentBudget={currentMonthBudget}
        currentMonthKey={currentMonthKey}
        summary={monthSummary}
        expenseCategories={expenseCategories}
        transactions={currentMonthTransactions}
        categoryBudgets={categoryBudgets}
        onSaveBudget={setMonthBudget}
        onSaveCategoryBudget={setCategoryBudget}
      />

      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
        transactions={transactions}
        onAddCategory={addCategory}
        onDeleteCategory={deleteCategory}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={userProfile}
        totalTransactionsCount={transactions.length}
        currentBudget={currentMonthBudget}
        onUpdateProfile={updateUserProfile}
        onExportCSV={handleExportCSV}
        onPinChange={() => {
          const status = getPinStatus();
          if (!status.isEnabled || !status.hasPin) {
            setIsLocked(false);
          }
        }}
      />

      {/* 4-Digit PIN Lock Screen overlay when app is locked */}
      {isLocked && (
        <LockScreen
          profile={userProfile}
          onUnlock={() => setIsLocked(false)}
        />
      )}
    </div>
  </CurrencyVisibilityProvider>
  );
}
