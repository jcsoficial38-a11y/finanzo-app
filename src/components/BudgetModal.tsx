import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  Check,
  Sparkles,
  TrendingDown,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { formatMonthYearLabel } from '../utils/dateUtils';
import { Category, MonthSummary, Transaction } from '../types/finance';
import { CategoryIcon } from './CategoryIcon';
import { useCurrencyVisibility } from '../context/CurrencyVisibilityContext';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudget: number;
  currentMonthKey: string;
  summary: MonthSummary;
  expenseCategories: Category[];
  transactions: Transaction[];
  categoryBudgets: Record<string, number>;
  onSaveBudget: (monthKey: string, amount: number, setAsDefault: boolean) => void;
  onSaveCategoryBudget: (categoryId: string, amount: number) => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  currentBudget,
  currentMonthKey,
  summary,
  expenseCategories,
  transactions,
  categoryBudgets,
  onSaveBudget,
  onSaveCategoryBudget,
}) => {
  const { formatMoney, hideValues } = useCurrencyVisibility();
  const [activeTab, setActiveTab] = useState<'general' | 'categories'>('general');
  const [amountStr, setAmountStr] = useState(() => currentBudget.toFixed(2));
  const [applyToAll, setApplyToAll] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catAmountStr, setCatAmountStr] = useState('');

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amountStr.replace(',', '.')) || 0;
  const monthLabel = formatMonthYearLabel(currentMonthKey);

  // Quick preset shortcuts
  const PRESETS = [2500, 3500, 4500, 6000, 8000];

  // Quick adjustment buttons
  const adjustAmount = (delta: number) => {
    const next = Math.max(0, parsedAmount + delta);
    setAmountStr(next.toFixed(2));
  };

  const handleApplyPreset = (value: number) => {
    setAmountStr(value.toFixed(2));
  };

  // Real-time calculation based on typed value
  const simulatedRemaining = parsedAmount - summary.totalExpenses;
  const simulatedUsagePercent = parsedAmount > 0 ? (summary.totalExpenses / parsedAmount) * 100 : 0;
  const isSimulatedOverBudget = simulatedRemaining < 0;

  // Days in month calculation for daily recommended budget
  const [yearStr, monthStr] = currentMonthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const currentDay = isCurrentMonth ? today.getDate() : 1;
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);
  const dailyBudgetRemaining = simulatedRemaining > 0 ? simulatedRemaining / daysRemaining : 0;

  const handleSubmitGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNaN(parsedAmount) && parsedAmount >= 0) {
      onSaveBudget(currentMonthKey, parsedAmount, applyToAll);
      onClose();
    }
  };

  // Expenses grouped by category in current month
  const categoryExpensesMap = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind === 'expense') {
      const cur = categoryExpensesMap.get(t.categoryId) || 0;
      categoryExpensesMap.set(t.categoryId, cur + t.amount);
    }
  }

  const handleSaveCatBudget = (catId: string) => {
    const parsed = parseFloat(catAmountStr.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      onSaveCategoryBudget(catId, parsed);
    }
    setEditingCatId(null);
    setCatAmountStr('');
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
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Orçamento Mensal</h3>
              <p className="text-[11px] text-slate-400 capitalize">{monthLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs: Orçamento Geral vs Metas por Categoria */}
        <div className="p-4 pb-0 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'general'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600" />
              <span>Orçamento Geral</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'categories'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <span>Metas por Categoria</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Orçamento Geral */}
        {activeTab === 'general' && (
          <form
            onSubmit={handleSubmitGeneral}
            className="flex-1 overflow-y-auto p-5 space-y-4"
          >
            {/* Value Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Definir Orçamento Geral do Mês (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-bold text-slate-900 focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all tabular-nums"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Quick Increment / Decrement Buttons */}
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => adjustAmount(-500)}
                className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors"
              >
                - R$ 500
              </button>
              <button
                type="button"
                onClick={() => adjustAmount(-100)}
                className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors"
              >
                - R$ 100
              </button>
              <button
                type="button"
                onClick={() => adjustAmount(100)}
                className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors"
              >
                + R$ 100
              </button>
              <button
                type="button"
                onClick={() => adjustAmount(500)}
                className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors"
              >
                + R$ 500
              </button>
            </div>

            {/* Preset shortcuts */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
                Valores sugeridos:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleApplyPreset(val)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                      parsedAmount === val
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {hideValues ? 'R$ •••••' : formatCurrency(val)}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Simulation Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-500">Gasto Total Atual:</span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {formatMoney(summary.totalExpenses)}
                </span>
              </div>

              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-500">Saldo Restante Previsto:</span>
                <span
                  className={`font-bold tabular-nums ${
                    isSimulatedOverBudget ? 'text-rose-600' : 'text-teal-700'
                  }`}
                >
                  {formatMoney(simulatedRemaining)}
                </span>
              </div>

              {/* Progress */}
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isSimulatedOverBudget
                      ? 'bg-rose-500'
                      : simulatedUsagePercent > 80
                      ? 'bg-amber-400'
                      : 'bg-teal-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(2, simulatedUsagePercent))}%`,
                  }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                <span>{formatPercent(simulatedUsagePercent)} comprometido</span>
                {simulatedRemaining > 0 && (
                  <span>
                    ~{formatMoney(dailyBudgetRemaining)}/dia nos {daysRemaining} dias restantes
                  </span>
                )}
              </div>
            </div>

            {/* Checkbox: Save as default for all months */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 py-1">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <span>Usar este valor como padrão para todos os meses</span>
            </label>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[44px] shadow-xs"
              >
                <Check className="w-4 h-4" />
                Salvar Orçamento
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Metas por Categoria de Despesa */}
        {activeTab === 'categories' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div className="flex items-center gap-2 p-3 bg-teal-50/70 rounded-2xl border border-teal-100 text-xs text-teal-900">
              <Info className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                Defina limites de gastos para cada categoria para controlar melhor suas despesas.
              </span>
            </div>

            <div className="space-y-2">
              {expenseCategories.map((cat) => {
                const spent = categoryExpensesMap.get(cat.id) || 0;
                const limit = categoryBudgets[cat.id] || 0;
                const isEditing = editingCatId === cat.id;
                const usage = limit > 0 ? (spent / limit) * 100 : 0;
                const isOver = limit > 0 && spent > limit;

                return (
                  <div
                    key={cat.id}
                    className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cat.color}40` }}
                        >
                          <CategoryIcon
                            name={cat.iconName}
                            className="w-4 h-4 text-slate-800"
                          />
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-800 truncate block">
                            {cat.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Gasto: {formatMoney(spent)}
                          </span>
                        </div>
                      </div>

                      {/* Right limit control */}
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="10"
                            min="0"
                            value={catAmountStr}
                            onChange={(e) => setCatAmountStr(e.target.value)}
                            placeholder="Meta R$"
                            className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 tabular-nums text-right"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCatBudget(cat.id)}
                            className="p-1 text-teal-600 hover:bg-teal-50 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setCatAmountStr(limit > 0 ? limit.toString() : '');
                          }}
                          className="text-right hover:opacity-80 transition-opacity"
                        >
                          <span className="text-xs font-bold text-slate-800 tabular-nums block">
                            {limit > 0 ? formatMoney(limit) : 'Definir Meta'}
                          </span>
                          <span className="text-[10px] text-teal-600 font-medium">
                            {limit > 0 ? 'Editar' : '+ Definir'}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Progress bar if limit > 0 */}
                    {limit > 0 && (
                      <div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOver
                                ? 'bg-rose-500'
                                : usage > 80
                                ? 'bg-amber-400'
                                : 'bg-teal-500'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(4, usage))}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                          <span>{formatPercent(usage)} da meta</span>
                          <span className={isOver ? 'text-rose-500 font-semibold' : ''}>
                            {isOver
                              ? `Excedeu em ${formatMoney(spent - limit)}`
                              : `Resta ${formatMoney(limit - spent)}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs mt-2"
            >
              Concluído
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
