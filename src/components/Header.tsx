import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Eye,
  EyeOff,
  Menu,
} from 'lucide-react';
import { formatMonthYearLabel, getCurrentMonthKey } from '../utils/dateUtils';
import { MonthSelectorModal } from './MonthSelectorModal';
import { UserProfile } from '../types/finance';
import { useCurrencyVisibility } from '../context/CurrencyVisibilityContext';
import { useAppTheme } from '../context/ThemeContext';

interface HeaderProps {
  currentMonthKey: string;
  profile?: UserProfile;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectMonth: (monthKey: string) => void;
  onOpenBudgetModal?: () => void;
  onOpenProfileModal?: () => void;
  onResetData?: () => void;
  isCloudConnected?: boolean;
  onOpenMenu?: () => void;
  isDriveConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentMonthKey,
  onPrevMonth,
  onNextMonth,
  onSelectMonth,
  onOpenMenu,
}) => {
  const { hideValues, toggleHideValues } = useCurrencyVisibility();
  const { theme } = useAppTheme();
  const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);

  const formattedMonth = formatMonthYearLabel(currentMonthKey);
  const isActualMonth = currentMonthKey === getCurrentMonthKey();

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100/80 px-4 pt-safe pb-2">
        {/* Top Brand & Action row */}
        <div className="flex items-center justify-between h-11 gap-2">
          {/* Brand Left with Retractable Menu Button (três listras) */}
          <div className="flex items-center gap-2 min-w-0">
            {onOpenMenu && (
              <button
                type="button"
                onClick={onOpenMenu}
                title="Abrir Menu Lateral"
                aria-label="Abrir Menu Lateral"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div
              className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${theme.badgeGradient} flex items-center justify-center ${theme.badgeTextColor} text-xs font-bold shadow-xs shrink-0`}
            >
              FP
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="font-semibold text-slate-800 text-sm tracking-tight truncate leading-tight">
                Finanças Pessoais
              </h1>
            </div>
          </div>

          {/* Action Tools Right (Toggle Hide/Show Values Button) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleHideValues}
              title={hideValues ? 'Exibir valores monetários' : 'Ocultar valores monetários (R$ •••••)'}
              aria-label={hideValues ? 'Exibir valores monetários' : 'Ocultar valores monetários'}
              className={`h-8 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                hideValues
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 bg-white'
              }`}
            >
              {hideValues ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="hidden xs:inline">Oculto</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="hidden xs:inline">Valores</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Month Navigation Control */}
        <div className="flex items-center justify-between mt-1 bg-slate-50/90 rounded-2xl p-1 border border-slate-100">
          <button
            onClick={onPrevMonth}
            aria-label="Mês Anterior"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white active:scale-95 transition-all min-h-[44px] min-w-[44px]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsMonthModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl hover:bg-white/80 transition-colors min-h-[44px]"
          >
            <Calendar className="w-4 h-4 text-teal-600" />
            <span className="font-semibold text-slate-800 text-sm capitalize">
              {formattedMonth}
            </span>
            {!isActualMonth && (
              <span className="text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-md font-medium">
                Ver Mês
              </span>
            )}
          </button>

          <button
            onClick={onNextMonth}
            aria-label="Próximo Mês"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white active:scale-95 transition-all min-h-[44px] min-w-[44px]"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      <MonthSelectorModal
        isOpen={isMonthModalOpen}
        onClose={() => setIsMonthModalOpen(false)}
        currentMonthKey={currentMonthKey}
        onSelectMonth={onSelectMonth}
      />
    </>
  );
};
