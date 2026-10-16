import React, { useState, useMemo } from 'react';
import { PieChart as PieIcon, BarChart3, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { Transaction, Category, MonthSummary } from '../types/finance';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { useCurrencyVisibility } from '../context/CurrencyVisibilityContext';
import { CategoryIcon } from './CategoryIcon';

interface ChartsViewProps {
  transactions: Transaction[];
  categories: Category[];
  summary: MonthSummary;
  compact?: boolean;
}

interface CategorySlice {
  categoryId: string;
  categoryName: string;
  color: string;
  iconName: string;
  total: number;
  percentage: number;
  startAngle: number;
  endAngle: number;
}

export const ChartsView: React.FC<ChartsViewProps> = ({
  transactions,
  categories,
  summary,
}) => {
  const { formatMoney } = useCurrencyVisibility();
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);

  // Group expenses by category memoized for instant 60fps rendering
  const { slices, totalExpenses } = useMemo(() => {
    const expenseTransactions = transactions.filter((t) => t.kind === 'expense');
    const categoryTotalsMap = new Map<string, number>();
    let total = 0;

    for (const t of expenseTransactions) {
      const current = categoryTotalsMap.get(t.categoryId) || 0;
      categoryTotalsMap.set(t.categoryId, current + t.amount);
      total += t.amount;
    }

    const builtSlices: CategorySlice[] = [];
    let accumulatedAngle = 0;

    const sortedCategoryIds = Array.from(categoryTotalsMap.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    for (const [catId, amount] of sortedCategoryIds) {
      const cat = categories.find((c) => c.id === catId);
      const percentage = total > 0 ? (amount / total) * 100 : 0;
      const sliceAngle = total > 0 ? (amount / total) * 360 : 0;

      builtSlices.push({
        categoryId: catId,
        categoryName: cat?.name || 'Outros',
        color: cat?.color || '#cbd5e1',
        iconName: cat?.iconName || 'Tag',
        total: amount,
        percentage,
        startAngle: accumulatedAngle,
        endAngle: accumulatedAngle + sliceAngle,
      });

      accumulatedAngle += sliceAngle;
    }

    return { slices: builtSlices, totalExpenses: total };
  }, [transactions, categories]);

  // Helpers for SVG Arc drawing
  const getCoordinatesForPercent = (angleInDegrees: number, radius: number, cx: number, cy: number) => {
    // 0 degrees is top (-90 offset)
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + radius * Math.cos(angleInRadians),
      y: cy + radius * Math.sin(angleInRadians),
    };
  };

  const describeDonutArc = (
    cx: number,
    cy: number,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number
  ) => {
    // Clamping to avoid 360 degree full circle glitch in SVG paths
    const diff = endAngle - startAngle;
    const safeEnd = diff >= 359.99 ? startAngle + 359.99 : endAngle;

    const startOuter = getCoordinatesForPercent(startAngle, outerRadius, cx, cy);
    const endOuter = getCoordinatesForPercent(safeEnd, outerRadius, cx, cy);
    const startInner = getCoordinatesForPercent(safeEnd, innerRadius, cx, cy);
    const endInner = getCoordinatesForPercent(startAngle, innerRadius, cx, cy);

    const largeArcFlag = diff > 180 ? 1 : 0;

    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
      `L ${startInner.x} ${startInner.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
      'Z',
    ].join(' ');
  };

  // Income vs Expense comparison calculations
  const { totalIncome, totalFixed, totalVariable, totalInstallment } = summary;
  const maxBarValue = Math.max(totalIncome, totalExpenses, 1);
  const incomeBarPercent = (totalIncome / maxBarValue) * 100;
  const expenseBarPercent = (totalExpenses / maxBarValue) * 100;

  const balanceDiff = totalIncome - totalExpenses;
  const isSurplus = balanceDiff >= 0;

  // Selected slice detail
  const currentHoveredSlice =
    activeCategoryIndex !== null ? slices[activeCategoryIndex] : null;

  return (
    <div className="space-y-4">
      {/* SECTION 1: Donut Chart - Despesas por Categoria */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/70 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">
                Despesas por Categoria
              </h3>
              <p className="text-[11px] text-slate-400">
                Divisão proporcional dos seus gastos
              </p>
            </div>
          </div>
        </div>

        {totalExpenses === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <PieIcon className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
            <p className="text-xs">Nenhum gasto registrado neste mês.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* SVG Donut */}
            <div className="flex flex-col items-center justify-center relative py-1">
              <svg
                width="200"
                height="200"
                viewBox="0 0 200 200"
                className="overflow-visible select-none"
              >
                {slices.map((slice, idx) => {
                  const isHovered = activeCategoryIndex === idx;
                  const outerR = isHovered ? 86 : 80;
                  const innerR = isHovered ? 52 : 54;
                  const pathD = describeDonutArc(
                    100,
                    100,
                    innerR,
                    outerR,
                    slice.startAngle,
                    slice.endAngle
                  );

                  return (
                    <path
                      key={slice.categoryId}
                      d={pathD}
                      fill={slice.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="cursor-pointer transition-all duration-200 hover:opacity-90"
                      onClick={() =>
                        setActiveCategoryIndex(
                          activeCategoryIndex === idx ? null : idx
                        )
                      }
                    />
                  );
                })}

                {/* Center text in donut */}
                <circle cx="100" cy="100" r="50" fill="#ffffff" />
              </svg>

              {/* Center overlay labels */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                {currentHoveredSlice ? (
                  <>
                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
                      {currentHoveredSlice.categoryName}
                    </span>
                    <span className="text-xs font-bold text-slate-800 tabular-nums">
                      {formatMoney(currentHoveredSlice.total)}
                    </span>
                    <span className="text-[10px] font-semibold text-teal-600">
                      {formatPercent(currentHoveredSlice.percentage)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Gasto Total
                    </span>
                    <span className="text-xs font-bold text-slate-800 tabular-nums">
                      {formatMoney(totalExpenses)}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {slices.length} {slices.length === 1 ? 'categoria' : 'categorias'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Category breakdown rows / legend */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              {slices.map((slice, idx) => {
                const isSelected = activeCategoryIndex === idx;
                return (
                  <button
                    key={slice.categoryId}
                    onClick={() =>
                      setActiveCategoryIndex(isSelected ? null : idx)
                    }
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors text-left ${
                      isSelected
                        ? 'bg-slate-100/90'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: slice.color }}
                      />
                      <CategoryIcon
                        name={slice.iconName}
                        className="w-3.5 h-3.5 text-slate-500 shrink-0"
                      />
                      <span className="text-xs font-medium text-slate-700 truncate">
                        {slice.categoryName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-xs font-semibold text-slate-800 tabular-nums">
                        {formatMoney(slice.total)}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 tabular-nums w-11 text-right">
                        {formatPercent(slice.percentage)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Comparativo Renda vs Gasto Total Geral */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/70 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">
                Renda vs Gasto Total
              </h3>
              <p className="text-[11px] text-slate-400">
                Balanço comparativo deste mês
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-xl ${
              isSurplus
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                : 'bg-rose-50 text-rose-600 border border-rose-200/70'
            }`}
          >
            {isSurplus ? (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Superávit</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                <span>Déficit</span>
              </>
            )}
          </div>
        </div>

        {/* Visual Comparative Bars */}
        <div className="space-y-3">
          {/* Income Bar */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-medium text-emerald-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                Total Receitas (Renda)
              </span>
              <span className="font-bold text-slate-900 tabular-nums">
                {formatMoney(totalIncome)}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(4, incomeBarPercent)}%` }}
              />
            </div>
          </div>

          {/* Expense Bar */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-medium text-rose-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                Gasto Total Geral
              </span>
              <span className="font-bold text-slate-900 tabular-nums">
                {formatMoney(totalExpenses)}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(4, expenseBarPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Summary sentence */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Diferença Líquida:</span>
          <span
            className={`font-bold tabular-nums text-sm ${
              isSurplus ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {isSurplus ? '+' : ''}
            {formatMoney(balanceDiff)}
          </span>
        </div>
      </div>

      {/* SECTION 3: Distribuição por Tipo de Gasto (Fixos, Variáveis, Parcelados) */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/70 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">
              Composição das Despesas
            </h3>
            <p className="text-[11px] text-slate-400">
              Proporção entre fixos, variáveis e parcelados
            </p>
          </div>
        </div>

        {totalExpenses === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">
            Sem despesas registradas.
          </p>
        ) : (
          <div>
            {/* Multi-segment progress bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex mb-3">
              {totalFixed > 0 && (
                <div
                  style={{ width: `${(totalFixed / totalExpenses) * 100}%` }}
                  className="bg-sky-400 h-full transition-all"
                  title={`Fixos: ${formatPercent((totalFixed / totalExpenses) * 100)}`}
                />
              )}
              {totalVariable > 0 && (
                <div
                  style={{ width: `${(totalVariable / totalExpenses) * 100}%` }}
                  className="bg-amber-400 h-full transition-all"
                  title={`Variáveis: ${formatPercent((totalVariable / totalExpenses) * 100)}`}
                />
              )}
              {totalInstallment > 0 && (
                <div
                  style={{ width: `${(totalInstallment / totalExpenses) * 100}%` }}
                  className="bg-violet-400 h-full transition-all"
                  title={`Parcelados: ${formatPercent((totalInstallment / totalExpenses) * 100)}`}
                />
              )}
            </div>

            {/* Type indicators */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-sky-50/70 border border-sky-100">
                <span className="text-[10px] text-sky-800 font-medium block">
                  Fixos ({formatPercent(totalExpenses ? (totalFixed / totalExpenses) * 100 : 0)})
                </span>
                <span className="font-bold text-slate-800 tabular-nums text-xs">
                  {formatMoney(totalFixed)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                <span className="text-[10px] text-amber-800 font-medium block">
                  Variáveis ({formatPercent(totalExpenses ? (totalVariable / totalExpenses) * 100 : 0)})
                </span>
                <span className="font-bold text-slate-800 tabular-nums text-xs">
                  {formatMoney(totalVariable)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-violet-50/70 border border-violet-100">
                <span className="text-[10px] text-violet-800 font-medium block">
                  Parcelados ({formatPercent(totalExpenses ? (totalInstallment / totalExpenses) * 100 : 0)})
                </span>
                <span className="font-bold text-slate-800 tabular-nums text-xs">
                  {formatMoney(totalInstallment)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
