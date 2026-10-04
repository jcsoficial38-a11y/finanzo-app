import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { ALL_MONTHS, getCurrentMonthKey } from '../utils/dateUtils';

interface MonthSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonthKey: string;
  onSelectMonth: (monthKey: string) => void;
}

export const MonthSelectorModal: React.FC<MonthSelectorModalProps> = ({
  isOpen,
  onClose,
  currentMonthKey,
  onSelectMonth,
}) => {
  const [selectedYear, setSelectedYear] = useState(() => {
    return parseInt(currentMonthKey.split('-')[0], 10);
  });

  if (!isOpen) return null;

  const currentSelectedMonth = parseInt(currentMonthKey.split('-')[1], 10);
  const currentActualMonthKey = getCurrentMonthKey();
  const [actualYearStr, actualMonthStr] = currentActualMonthKey.split('-');
  const actualYear = parseInt(actualYearStr, 10);
  const actualMonth = parseInt(actualMonthStr, 10);

  const years = [
    selectedYear - 2,
    selectedYear - 1,
    selectedYear,
    selectedYear + 1,
    selectedYear + 2,
  ];

  const handleMonthClick = (monthNumber: number) => {
    const formattedMonth = String(monthNumber).padStart(2, '0');
    onSelectMonth(`${selectedYear}-${formattedMonth}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab bar */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-800 text-base">Selecionar Mês</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Year Selector */}
        <div className="flex items-center justify-between py-3 px-1">
          <button
            onClick={() => setSelectedYear((y) => y - 1)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ← {selectedYear - 1}
          </button>
          <span className="text-base font-bold text-slate-800 tabular-nums">
            {selectedYear}
          </span>
          <button
            onClick={() => setSelectedYear((y) => y + 1)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {selectedYear + 1} →
          </button>
        </div>

        {/* Months Grid */}
        <div className="grid grid-cols-3 gap-2 py-2">
          {ALL_MONTHS.map((m) => {
            const isSelected =
              selectedYear === parseInt(currentMonthKey.split('-')[0], 10) &&
              m.number === currentSelectedMonth;
            const isCurrentMonth =
              selectedYear === actualYear && m.number === actualMonth;

            return (
              <button
                key={m.number}
                onClick={() => handleMonthClick(m.number)}
                className={`py-3 px-2 rounded-xl text-xs font-medium transition-all text-center relative ${
                  isSelected
                    ? 'bg-slate-800 text-white font-semibold shadow-xs'
                    : isCurrentMonth
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>{m.name}</div>
                {isCurrentMonth && !isSelected && (
                  <span className="block text-[10px] text-teal-600 font-normal">
                    Atual
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick jump to current month */}
        <button
          onClick={() => {
            onSelectMonth(getCurrentMonthKey());
            onClose();
          }}
          className="w-full mt-3 py-2.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          Ir para o mês atual ({ALL_MONTHS[actualMonth - 1]?.shortName}/{actualYear})
        </button>
      </div>
    </div>
  );
};
