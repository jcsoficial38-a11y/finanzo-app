import React from 'react';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Layers,
  ShoppingBag,
  CreditCard,
  Edit2,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { MonthSummary } from '../types/finance';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface SummaryCardsProps {
  summary: MonthSummary;
  onEditBudget: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  onEditBudget,
}) => {
  const {
    budget,
    totalIncome,
    totalFixed,
    totalVariable,
    totalInstallment,
    totalExpenses,
    remainingBudget,
    netBalance,
  } = summary;

  // Percentage of budget used
  const budgetUsagePercent = budget > 0 ? (totalExpenses / budget) * 100 : 0;
  const isOverBudget = remainingBudget < 0;

  return (
    <div className="space-y-3">
      {/* 1. Card Principal: Orçamento Geral do Mês (Definido por mim) */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-white via-slate-50 to-teal-50/40 border border-slate-200/70 shadow-xs relative overflow-hidden">
        {/* Soft background decor */}
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-teal-100/30 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700">
                Orçamento Geral do Mês
              </span>
              <span className="text-[10px] text-teal-700 bg-teal-50/90 border border-teal-200/70 px-1.5 py-0.5 rounded-md font-medium">
                Definido por mim
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums">
              {formatCurrency(budget)}
            </div>
          </div>

          <button
            onClick={onEditBudget}
            className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200/70 transition-colors shadow-2xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600" />
            <span>Ajustar</span>
          </button>
        </div>

        {/* Budget Progress Bar */}
        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Gasto Total: <strong className="text-slate-800 tabular-nums">{formatCurrency(totalExpenses)}</strong>
            </span>
            <span
              className={`font-semibold tabular-nums ${
                isOverBudget ? 'text-rose-600' : 'text-slate-600'
              }`}
            >
              {formatPercent(budgetUsagePercent)} utilizado
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                budgetUsagePercent > 100
                  ? 'bg-rose-500'
                  : budgetUsagePercent > 80
                  ? 'bg-amber-400'
                  : 'bg-teal-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(3, budgetUsagePercent))}%` }}
            />
          </div>
        </div>

        {/* Footer: Saldo Restante & Saldo Real */}
        <div className="mt-3 pt-3 border-t border-slate-100/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Saldo Restante:</span>
            <span
              className={`font-bold tabular-nums ${
                isOverBudget ? 'text-rose-600' : 'text-teal-700'
              }`}
            >
              {formatCurrency(remainingBudget)}
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            {isOverBudget ? (
              <span className="text-rose-500 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Limite excedido
              </span>
            ) : (
              <span className="text-teal-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Dentro do limite
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Side-by-side: Saldo Restante do Orçamento & Gasto Total Geral */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Saldo Restante (Orçamento menos Gasto Total) */}
        <div
          className={`p-3.5 rounded-2xl bg-white border shadow-2xs ${
            isOverBudget ? 'border-rose-200' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1">
            <Wallet className="w-3.5 h-3.5 text-teal-600" />
            <span className="truncate">Saldo Restante</span>
          </div>
          <div
            className={`text-lg sm:text-xl font-bold tabular-nums truncate ${
              isOverBudget ? 'text-rose-600' : 'text-teal-700'
            }`}
          >
            {formatCurrency(remainingBudget)}
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            Orçamento menos Gasto
          </span>
        </div>

        {/* Gasto Total Geral (Soma de todos os gastos) */}
        <div className="p-3.5 rounded-2xl bg-white border border-rose-100/80 shadow-2xs">
          <div className="flex items-center gap-1 text-xs font-medium text-rose-800 mb-1">
            <ArrowUpCircle className="w-3.5 h-3.5 text-rose-500" />
            <span className="truncate">Gasto Total Geral</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums truncate">
            {formatCurrency(totalExpenses)}
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            Soma de todos os gastos
          </span>
        </div>
      </div>

      {/* 3. Total de Receitas (Rendas) */}
      <div className="p-3.5 rounded-2xl bg-white border border-emerald-100/80 shadow-2xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 mb-0.5">
            <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
            <span>Total de Receitas (Rendas)</span>
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(totalIncome)}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-500 block">Saldo Real</span>
          <span
            className={`text-xs font-semibold tabular-nums ${
              netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {netBalance >= 0 ? '+' : ''}
            {formatCurrency(netBalance)}
          </span>
        </div>
      </div>

      {/* 4. Three-way Expense Breakdown Cards (Fixos, Variáveis, Parcelados) */}
      <div className="grid grid-cols-3 gap-2">
        {/* Total de Gastos Fixos */}
        <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-100/80">
          <div className="flex items-center gap-1 text-[11px] font-medium text-sky-800 mb-1 truncate">
            <Layers className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="truncate">Gastos Fixos</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 tabular-nums truncate">
            {formatCurrency(totalFixed)}
          </div>
          <span className="text-[10px] text-sky-700/70 block truncate">
            Aluguel, contas...
          </span>
        </div>

        {/* Total de Gastos Variáveis */}
        <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100/80">
          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-800 mb-1 truncate">
            <ShoppingBag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">Gastos Variáveis</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 tabular-nums truncate">
            {formatCurrency(totalVariable)}
          </div>
          <span className="text-[10px] text-amber-700/70 block truncate">
            Mercado, lazer...
          </span>
        </div>

        {/* Total de Gastos Parcelados */}
        <div className="p-3 rounded-2xl bg-violet-50/60 border border-violet-100/80">
          <div className="flex items-center gap-1 text-[11px] font-medium text-violet-800 mb-1 truncate">
            <CreditCard className="w-3.5 h-3.5 text-violet-600 shrink-0" />
            <span className="truncate">Parcelados</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 tabular-nums truncate">
            {formatCurrency(totalInstallment)}
          </div>
          <span className="text-[10px] text-violet-700/70 block truncate">
            Cartão & compras
          </span>
        </div>
      </div>
    </div>
  );
};
