import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Layers,
  ShoppingBag,
  CreditCard,
  Check,
  Sparkles,
  Repeat,
} from 'lucide-react';
import { Category, CategoryType, ExpenseType } from '../types/finance';
import { formatCurrency } from '../utils/formatters';
import { getTodayDateString, addMonthsToDate, formatShortMonthYearLabel } from '../utils/dateUtils';
import { CategoryIcon } from './CategoryIcon';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonthKey: string;
  incomeCategories: Category[];
  expenseCategories: Category[];
  onAddTransaction: (params: {
    name: string;
    amount: number;
    date: string;
    kind: CategoryType;
    categoryId: string;
    expenseType?: ExpenseType;
    isRecurring?: boolean;
    installmentsCount?: number;
    isTotalAmount?: boolean;
    notes?: string;
  }) => void;
  onOpenCategoriesManager: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  currentMonthKey,
  incomeCategories,
  expenseCategories,
  onAddTransaction,
  onOpenCategoriesManager,
}) => {
  const [kind, setKind] = useState<CategoryType>('expense');
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(() => {
    const today = getTodayDateString();
    // If today is in current month, use today; else use 1st of current month
    if (today.startsWith(currentMonthKey)) {
      return today;
    }
    return `${currentMonthKey}-01`;
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [expenseType, setExpenseType] = useState<ExpenseType>('variable');
  const [isRecurringFixed, setIsRecurringFixed] = useState<boolean>(true);
  const [installmentsCount, setInstallmentsCount] = useState<number | string>(3);
  const [isTotalAmount, setIsTotalAmount] = useState<boolean>(true);

  // Sync date when currentMonthKey changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const today = getTodayDateString();
      if (today.startsWith(currentMonthKey)) {
        setDate(today);
      } else {
        setDate(`${currentMonthKey}-01`);
      }
    }
  }, [isOpen, currentMonthKey]);

  // Set default category when kind or categories change
  useEffect(() => {
    const activeList = kind === 'income' ? incomeCategories : expenseCategories;
    if (activeList.length > 0 && !activeList.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(activeList[0].id);
    }
  }, [kind, incomeCategories, expenseCategories, selectedCategoryId]);

  if (!isOpen) return null;

  const currentCategories = kind === 'income' ? incomeCategories : expenseCategories;
  const parsedAmount = parseFloat(amountStr.replace(',', '.')) || 0;
  const parsedInstallments =
    typeof installmentsCount === 'number'
      ? Math.max(1, installmentsCount)
      : Math.max(1, parseInt(String(installmentsCount), 10) || 1);

  // Calculation for installments preview
  const singleInstallmentAmount =
    kind === 'expense' && expenseType === 'installment'
      ? isTotalAmount
        ? parsedAmount / parsedInstallments
        : parsedAmount
      : parsedAmount;

  const totalCalculatedAmount =
    kind === 'expense' && expenseType === 'installment'
      ? isTotalAmount
        ? parsedAmount
        : parsedAmount * parsedInstallments
      : parsedAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || parsedAmount <= 0 || !selectedCategoryId) return;

    onAddTransaction({
      name: name.trim(),
      amount: parsedAmount,
      date,
      kind,
      categoryId: selectedCategoryId,
      expenseType: kind === 'expense' ? expenseType : undefined,
      isRecurring: kind === 'expense' && expenseType === 'fixed' ? isRecurringFixed : false,
      installmentsCount:
        kind === 'expense' && expenseType === 'installment' ? parsedInstallments : 1,
      isTotalAmount,
    });

    // Reset form and close
    setName('');
    setAmountStr('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab bar */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Novo Lançamento</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 1. Kind Toggle: Receita vs Despesa */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setKind('income')}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                kind === 'income'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>Receita (Renda)</span>
            </button>
            <button
              type="button"
              onClick={() => setKind('expense')}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                kind === 'expense'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-rose-500" />
              <span>Gasto (Despesa)</span>
            </button>
          </div>

          {/* 2. Amount Input */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Valor {kind === 'expense' && expenseType === 'installment' && (isTotalAmount ? '(Valor Total)' : '(Por Parcela)')}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                required
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all tabular-nums"
                autoFocus
              />
            </div>
          </div>

          {/* 3. Name Input */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nome do Lançamento
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                kind === 'income'
                  ? 'Ex: Salário, Freelance, Rendimento'
                  : 'Ex: Supermercado, Aluguel, Farmácia'
              }
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all"
            />
          </div>

          {/* 4. Date Input */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Data
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* 5. Expense Type Selector (Fixo / Variável / Parcelado) - Only for Expenses */}
          {kind === 'expense' && (
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-medium text-slate-600">
                Tipo de Gasto
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseType('fixed');
                    setIsRecurringFixed(true);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                    expenseType === 'fixed'
                      ? 'bg-white text-sky-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-sky-600" />
                  <span>Despesa Fixa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseType('variable')}
                  className={`py-2 px-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                    expenseType === 'variable'
                      ? 'bg-white text-amber-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Variável</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseType('installment')}
                  className={`py-2 px-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                    expenseType === 'installment'
                      ? 'bg-white text-violet-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-violet-600" />
                  <span>Parcelado</span>
                </button>
              </div>

              {/* Recurring Fixed Expense Box */}
              {expenseType === 'fixed' && (
                <div className="p-3 bg-sky-50/90 rounded-2xl border border-sky-200/80 space-y-1.5 animate-in fade-in duration-150">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRecurringFixed}
                      onChange={(e) => setIsRecurringFixed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 accent-sky-600"
                    />
                    <div className="flex-1 text-xs">
                      <div className="font-bold text-sky-950 flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>Despesa Fixa Recorrente</span>
                        <span className="text-[10px] bg-sky-200/70 text-sky-800 px-1.5 py-0.2 rounded font-semibold">
                          Automático
                        </span>
                      </div>
                      <p className="text-[11px] text-sky-800/90 mt-1 leading-relaxed">
                        Esta despesa se repetirá automaticamente nos meses seguintes na visualização do aplicativo até que seja excluída. Você também poderá editar o valor ou excluir a despesa de forma independente em cada mês.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Installment Options Box */}
              {expenseType === 'installment' && (
                <div className="p-3.5 bg-violet-50/60 rounded-2xl border border-violet-100 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-violet-900">
                      Número de Parcelas
                    </span>
                    <div className="flex items-center gap-1">
                      {[2, 3, 6, 10, 12].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setInstallmentsCount(num)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            parsedInstallments === num
                              ? 'bg-violet-600 text-white shadow-2xs'
                              : 'bg-white text-violet-700 hover:bg-violet-100'
                          }`}
                        >
                          {num}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Number Input - Livre para digitar qualquer número */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(e.target.value)}
                      onBlur={() => {
                        const val = parseInt(String(installmentsCount), 10);
                        if (!val || val < 1) {
                          setInstallmentsCount(2);
                        }
                      }}
                      placeholder="Qtd"
                      className="w-24 px-3 py-1.5 bg-white border border-violet-200 rounded-xl text-xs font-bold text-violet-900 tabular-nums text-center focus:outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                    />
                    <span className="text-xs text-violet-800">
                      parcelas nos meses seguintes
                    </span>
                  </div>

                  {/* Toggle: Is amount total or per installment */}
                  <div className="flex items-center justify-between pt-1 border-t border-violet-100 text-xs">
                    <span className="text-violet-900 font-medium">
                      O valor digitado acima é:
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setIsTotalAmount(true)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${
                          isTotalAmount
                            ? 'bg-violet-600 text-white'
                            : 'bg-white/80 text-violet-700'
                        }`}
                      >
                        Total
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsTotalAmount(false)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${
                          !isTotalAmount
                            ? 'bg-violet-600 text-white'
                            : 'bg-white/80 text-violet-700'
                        }`}
                      >
                        Por Parcela
                      </button>
                    </div>
                  </div>

                  {/* Preview summary */}
                  {parsedAmount > 0 && (
                    <div className="p-2.5 bg-white rounded-xl text-[11px] text-violet-900 space-y-0.5">
                      <div className="font-semibold">
                        {parsedInstallments}x de {formatCurrency(singleInstallmentAmount)}
                      </div>
                      <div className="text-violet-700">
                        Total geral: {formatCurrency(totalCalculatedAmount)} · Repetido
                        automaticamente até{' '}
                        {formatShortMonthYearLabel(
                          addMonthsToDate(date, Math.max(0, parsedInstallments - 1)).monthKey
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 6. Category Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-600">
                Categoria de {kind === 'income' ? 'Renda' : 'Despesa'}
              </label>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCategoriesManager();
                }}
                className="text-[11px] text-teal-600 hover:text-teal-700 font-medium"
              >
                Gerenciar Categorias
              </button>
            </div>

            {currentCategories.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <p className="text-xs text-slate-500 mb-2">
                  Nenhuma categoria cadastrada.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCategoriesManager();
                  }}
                  className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg"
                >
                  Criar Categoria
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                {currentCategories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`p-2 rounded-xl text-left flex items-center gap-2 border transition-all ${
                        isSelected
                          ? 'border-slate-800 bg-slate-900 text-white shadow-2xs'
                          : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: isSelected ? '#ffffff25' : `${cat.color}45`,
                        }}
                      >
                        <CategoryIcon
                          name={cat.iconName}
                          className={`w-3.5 h-3.5 ${
                            isSelected ? 'text-white' : 'text-slate-700'
                          }`}
                        />
                      </span>
                      <span className="text-xs font-medium truncate flex-1">
                        {cat.name}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={parsedAmount <= 0 || !name.trim() || !selectedCategoryId}
              className="flex-1 py-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[44px] shadow-xs"
            >
              <Check className="w-4 h-4" />
              Salvar Lançamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
