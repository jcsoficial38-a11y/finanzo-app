import React, { useState, useMemo } from 'react';
import {
  Search,
  Trash2,
  Calendar,
  Layers,
  ShoppingBag,
  CreditCard,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Download,
  Pencil,
  Repeat,
  Check,
} from 'lucide-react';
import { Transaction, Category } from '../types/finance';
import { formatCurrency } from '../utils/formatters';
import { formatFriendlyDate } from '../utils/dateUtils';
import { CategoryIcon } from './CategoryIcon';
import { useCurrencyVisibility } from '../context/CurrencyVisibilityContext';

interface TransactionsListProps {
  transactions: Transaction[];
  categories: Category[];
  onDeleteTransaction: (
    id: string,
    options?: {
      deleteAllInstallments?: boolean;
      deleteRecurringMode?: 'single' | 'future';
    }
  ) => void;
  onUpdateTransaction?: (
    id: string,
    updates: Partial<Transaction>,
    applyToFutureRecurring?: boolean
  ) => void;
  onOpenAddModal?: () => void;
  onExportCSV?: () => void;
  emptyMessage?: string;
  showSearch?: boolean;
}

type FilterKind = 'all' | 'income' | 'expense' | 'fixed' | 'variable' | 'installment';

export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  categories,
  onDeleteTransaction,
  onUpdateTransaction,
  onOpenAddModal,
  onExportCSV,
  emptyMessage,
  showSearch = true,
}) => {
  const { formatMoney, hideValues } = useCurrencyVisibility();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKind>('all');
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  // Edit Modal State
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmountStr, setEditAmountStr] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editApplyToFuture, setEditApplyToFuture] = useState(false);

  const categoriesMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Open edit modal with pre-filled fields
  const handleOpenEdit = (tx: Transaction) => {
    setEditTarget(tx);
    setEditName(tx.name);
    setEditAmountStr(String(tx.amount));
    setEditDate(tx.date);
    setEditCategoryId(tx.categoryId);
    setEditApplyToFuture(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !onUpdateTransaction) return;
    const parsedAmount = parseFloat(editAmountStr.replace(',', '.')) || 0;
    if (parsedAmount <= 0 || !editName.trim()) return;

    onUpdateTransaction(
      editTarget.id,
      {
        name: editName.trim(),
        amount: parsedAmount,
        date: editDate,
        categoryId: editCategoryId,
      },
      editApplyToFuture
    );

    setEditTarget(null);
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search match
      const cat = categoriesMap.get(tx.categoryId);
      const matchesSearch =
        tx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat && cat.name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Filter match
      if (activeFilter === 'income') return tx.kind === 'income';
      if (activeFilter === 'expense') return tx.kind === 'expense';
      if (activeFilter === 'fixed') return tx.expenseType === 'fixed';
      if (activeFilter === 'variable') return tx.expenseType === 'variable';
      if (activeFilter === 'installment') return tx.expenseType === 'installment';

      return true;
    });
  }, [transactions, searchQuery, activeFilter, categoriesMap]);

  const confirmDelete = (deleteAllInstallments: boolean) => {
    if (deleteTarget) {
      onDeleteTransaction(deleteTarget.id, { deleteAllInstallments });
      setDeleteTarget(null);
    }
  };

  const confirmDeleteRecurring = (mode: 'single' | 'future') => {
    if (deleteTarget) {
      onDeleteTransaction(deleteTarget.id, { deleteRecurringMode: mode });
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search & Filter Header */}
      <div className="bg-white p-3 rounded-3xl border border-slate-200/70 shadow-xs space-y-2.5">
        {/* Search input and Export CSV button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar lançamentos ou categorias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {onExportCSV && (
            <button
              onClick={onExportCSV}
              title="Exportar resumo e lançamentos do mês em CSV"
              className="h-8.5 px-2.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-slate-700 hover:text-teal-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden xs:inline">Exportar CSV</span>
            </button>
          )}
        </div>

        {/* Filter Horizontal Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({transactions.length})
          </button>
          <button
            onClick={() => setActiveFilter('income')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
              activeFilter === 'income'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Receitas
          </button>
          <button
            onClick={() => setActiveFilter('expense')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
              activeFilter === 'expense'
                ? 'bg-rose-500 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Despesas
          </button>
          <button
            onClick={() => setActiveFilter('fixed')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
              activeFilter === 'fixed'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
            }`}
          >
            Fixos
          </button>
          <button
            onClick={() => setActiveFilter('variable')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
              activeFilter === 'variable'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Variáveis
          </button>
          <button
            onClick={() => setActiveFilter('installment')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
              activeFilter === 'installment'
                ? 'bg-violet-600 text-white shadow-2xs'
                : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
            }`}
          >
            Parcelados
          </button>
        </div>
      </div>

      {/* Transaction List Feed */}
      {filteredTransactions.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white border border-slate-200/70 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-700">
              Nenhum lançamento encontrado
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {searchQuery
                ? 'Tente buscar com outros termos.'
                : 'Adicione sua primeira transação para este mês.'}
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filteredTransactions.map((tx) => {
            const cat = categoriesMap.get(tx.categoryId);
            const isIncome = tx.kind === 'income';

            return (
              <div
                key={tx.id}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors group"
              >
                {/* Left icon */}
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
                  style={{
                    backgroundColor: cat?.color ? `${cat.color}35` : '#f1f5f9',
                    color: '#334155',
                  }}
                >
                  <CategoryIcon
                    name={cat?.iconName}
                    className="w-5 h-5 text-slate-700"
                  />
                </div>

                {/* Middle details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-semibold text-slate-800 truncate">
                      {tx.name}
                    </h4>
                  </div>

                  {/* Clean unboxed metadata with bullet separators */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
                    <span className="font-medium text-slate-600 truncate">
                      {cat?.name || (isIncome ? 'Renda' : 'Despesa')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatFriendlyDate(tx.date)}</span>

                    {/* Expense type label */}
                    {!isIncome && (
                      <>
                        {tx.isRecurring && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-sky-700 inline-flex items-center gap-1">
                              <Repeat className="w-3 h-3 text-sky-600" />
                              <span>Fixo Recorrente</span>
                            </span>
                          </>
                        )}
                        {tx.expenseType && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-slate-500">
                              {tx.expenseType === 'fixed' && !tx.isRecurring && 'Fixo'}
                              {tx.expenseType === 'variable' && 'Variável'}
                              {tx.expenseType === 'installment' &&
                                `Parcela ${tx.installmentIndex}/${tx.installmentTotal}`}
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Right Amount & Edit / Delete Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="text-right mr-1">
                    <div
                      className={`text-xs sm:text-sm font-bold tabular-nums flex items-center justify-end gap-0.5 ${
                        isIncome ? 'text-emerald-600' : 'text-slate-800'
                      }`}
                    >
                      {hideValues ? (
                        <span>R$ •••••</span>
                      ) : (
                        <span>{isIncome ? '+' : '-'} {formatMoney(tx.amount)}</span>
                      )}
                    </div>
                  </div>

                  {onUpdateTransaction && (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(tx)}
                      title="Editar lançamento neste mês"
                      aria-label={`Editar ${tx.name}`}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => setDeleteTarget(tx)}
                    title="Excluir lançamento"
                    aria-label={`Excluir ${tx.name}`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Excluir Lançamento
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deseja excluir "{deleteTarget.name}" ({formatMoney(deleteTarget.amount)})?
                </p>
              </div>
            </div>

            {/* If it's a recurring fixed expense, allow deleting only this month or all future months */}
            {deleteTarget.recurringGroupId ? (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-slate-600">
                  Esta é uma <strong>despesa fixa recorrente</strong>. Como deseja excluir?
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => confirmDeleteRecurring('single')}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors text-center"
                  >
                    Excluir apenas deste mês
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDeleteRecurring('future')}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors text-center"
                  >
                    Excluir deste e de todos os meses futuros
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="w-full py-2 px-4 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-center"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : deleteTarget.installmentGroupId ? (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-slate-500">
                  Esta despesa é parcelada ({deleteTarget.installmentIndex} de{' '}
                  {deleteTarget.installmentTotal}). Como deseja proceder?
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => confirmDelete(false)}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors text-center"
                  >
                    Excluir apenas esta parcela ({deleteTarget.installmentIndex}/{deleteTarget.installmentTotal})
                  </button>
                  <button
                    onClick={() => confirmDelete(true)}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors text-center"
                  >
                    Excluir todas as parcelas deste parcelamento
                  </button>
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="w-full py-2.5 px-4 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => confirmDelete(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Editar Lançamento</h3>
                  <p className="text-[11px] text-slate-400">
                    {editTarget.recurringGroupId
                      ? 'Edite o valor para este mês de forma independente'
                      : 'Atualize os dados deste lançamento'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editAmountStr}
                  onChange={(e) => setEditAmountStr(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all tabular-nums"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Categoria
                  </label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all"
                  >
                    {categories
                      .filter((c) => c.type === editTarget.kind)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* If recurring expense, give option to update future months or only this month */}
              {editTarget.recurringGroupId && (
                <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-100 space-y-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editApplyToFuture}
                      onChange={(e) => setEditApplyToFuture(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 text-sky-600 rounded border-slate-300 accent-sky-600"
                    />
                    <div className="text-[11px] text-sky-900">
                      <span className="font-semibold block">
                        Aplicar este novo valor também nos próximos meses
                      </span>
                      <span className="text-[10px] text-sky-700">
                        Se desmarcado, altera o valor exclusivamente neste mês.
                      </span>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
