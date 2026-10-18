import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatMonthYearLabel, getCurrentMonthKey } from '../utils/dateUtils';
import { MonthSelectorModal } from './MonthSelectorModal';
import { UserProfile } from '../types/finance';
import { useCurrencyVisibility } from '../context/CurrencyVisibilityContext';
import { useAppTheme } from '../context/ThemeContext';
import { useUserProfile } from '../hooks/useUserProfile';

interface HeaderProps {
  currentMonthKey: string;
  profile: UserProfile;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectMonth: (monthKey: string) => void;
  onOpenBudgetModal?: () => void;
  onOpenProfileModal: () => void;
  onResetData?: () => void;
  isCloudConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentMonthKey,
  profile,
  onPrevMonth,
  onNextMonth,
  onSelectMonth,
  onOpenBudgetModal,
  onOpenProfileModal,
  isCloudConnected,
}) => {
  const { hideValues, toggleHideValues } = useCurrencyVisibility();
  const { theme } = useAppTheme();
  const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);

  // Centralized hook reading directly from localStorage and reactive to any updates
  const {
    name,
    initials,
    avatarUrl,
    avatarColor,
    login,
  } = useUserProfile(profile);

  const formattedMonth = formatMonthYearLabel(currentMonthKey);
  const isActualMonth = currentMonthKey === getCurrentMonthKey();

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100/80 px-4 pt-safe pb-2">
        {/* Top Brand & Profile row */}
        <div className="flex items-center justify-between h-11 gap-2">
          {/* Brand Left */}
          <div className="flex items-center gap-2 min-w-0">
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

          {/* Action Tools & User Profile Right */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Toggle Hide/Show Values Button */}
            <button
              type="button"
              onClick={toggleHideValues}
              title={hideValues ? 'Exibir valores monetários' : 'Ocultar valores monetários (R$ •••••)'}
              aria-label={hideValues ? 'Exibir valores monetários' : 'Ocultar valores monetários'}
              className={`h-8 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                hideValues
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 bg-white'
              }`}
            >
              {hideValues ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="hidden sm:inline">Oculto</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="hidden sm:inline">Valores</span>
                </>
              )}
            </button>

            {/* Profile Avatar & Name Trigger Button */}
            <button
              type="button"
              onClick={onOpenProfileModal}
              title={`Perfil: ${name} (${login})${isCloudConnected ? ' • Sincronizado na Nuvem' : ''}`}
              aria-label={`Abrir perfil de ${name}`}
              className="flex items-center gap-1.5 p-1 rounded-2xl hover:bg-slate-100/90 active:bg-slate-200/70 border border-slate-200/80 transition-all shadow-2xs active:scale-95 cursor-pointer bg-white group"
            >
              <div className="relative shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 shadow-2xs"
                  style={{
                    backgroundColor: avatarUrl ? 'transparent' : (avatarColor || '#7dd3fc'),
                  }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[11px] font-bold text-slate-800 tracking-tight">
                      {initials}
                    </span>
                  )}
                </div>
                {isCloudConnected && (
                  <span
                    title="Sincronizado na Nuvem (Firestore)"
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-2xs"
                  />
                )}
              </div>

              {/* Real user name in the main header */}
              <div className="hidden xs:flex flex-col text-left pr-1 leading-tight max-w-[85px] sm:max-w-[120px]">
                <span className="text-[11px] font-bold text-slate-800 truncate">
                  {name}
                </span>
                <span className="text-[9px] text-slate-400 truncate">
                  {login}
                </span>
              </div>
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
