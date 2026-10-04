import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, SlidersHorizontal, RotateCcw, User } from 'lucide-react';
import { formatMonthYearLabel, getCurrentMonthKey } from '../utils/dateUtils';
import { MonthSelectorModal } from './MonthSelectorModal';
import { UserProfile } from '../types/finance';

interface HeaderProps {
  currentMonthKey: string;
  profile: UserProfile;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectMonth: (monthKey: string) => void;
  onOpenBudgetModal: () => void;
  onOpenProfileModal: () => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMonthKey,
  profile,
  onPrevMonth,
  onNextMonth,
  onSelectMonth,
  onOpenBudgetModal,
  onOpenProfileModal,
  onResetData,
}) => {
  const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const formattedMonth = formatMonthYearLabel(currentMonthKey);
  const isActualMonth = currentMonthKey === getCurrentMonthKey();

  const handleReset = () => {
    if (showConfirmReset) {
      onResetData();
      setShowConfirmReset(false);
    } else {
      setShowConfirmReset(true);
      setTimeout(() => setShowConfirmReset(false), 4000);
    }
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase() || 'FP';
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100/80 px-4 pt-safe pb-2">
        {/* Top Brand row */}
        <div className="flex items-center justify-between h-11">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-teal-400 via-sky-400 to-indigo-300 flex items-center justify-center text-white text-xs font-bold shadow-xs">
              FP
            </div>
            <h1 className="font-semibold text-slate-800 text-sm tracking-tight">
              Finanças Pessoais
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenBudgetModal}
              title="Definir Orçamento do Mês"
              className="h-8 px-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden xs:inline">Orçamento</span>
            </button>

            {/* Profile Avatar Trigger Button */}
            <button
              onClick={onOpenProfileModal}
              title={`Perfil: ${profile.name} (${profile.login})`}
              className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 hover:border-slate-400 transition-all shadow-2xs active:scale-95"
              style={{ backgroundColor: profile.avatarUrl ? 'transparent' : profile.avatarColor || '#7dd3fc' }}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[11px] font-bold text-slate-800">
                  {getInitials(profile.name)}
                </span>
              )}
            </button>

            {/* Reset Data Button */}
            <button
              onClick={handleReset}
              title={showConfirmReset ? "Confirmar e redefinir dados padrão" : "Restaurar dados padrão"}
              aria-label="Restaurar dados de exemplo"
              className={`h-8 px-2 rounded-xl text-xs font-medium flex items-center gap-1 transition-all active:scale-95 ${
                showConfirmReset
                  ? 'bg-rose-100 text-rose-700 border border-rose-300'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${showConfirmReset ? 'animate-spin text-rose-600' : ''}`} />
              <span className="hidden xs:inline">{showConfirmReset ? 'Confirmar?' : 'Resetar'}</span>
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
