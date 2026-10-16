import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  SlidersHorizontal,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatMonthYearLabel, getCurrentMonthKey } from '../utils/dateUtils';
import { MonthSelectorModal } from './MonthSelectorModal';
import { UserProfile } from '../types/finance';
import { useCurrencyVisibility } from '../context/CurrencyVisibilityContext';
import { useAppTheme } from '../context/ThemeContext';

interface HeaderProps {
  currentMonthKey: string;
  profile: UserProfile;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectMonth: (monthKey: string) => void;
  onOpenBudgetModal: () => void;
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

  const formattedMonth = formatMonthYearLabel(currentMonthKey);
  const isActualMonth = currentMonthKey === getCurrentMonthKey();

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase() || 'FP';
  };

  // 3. PERFIL E FOTO SEGUROS:
  // Recupera a foto e o nome do perfil do 'localStorage' após o carregamento seguro da página
  const [cachedName, setCachedName] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('userName') : null;
    } catch {
      return null;
    }
  });
  const [cachedPhoto, setCachedPhoto] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('userPhoto') : null;
    } catch {
      return null;
    }
  });
  const [imgFailed, setImgFailed] = useState(false);

  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedName = localStorage.getItem('userName');
        const storedPhoto = localStorage.getItem('userPhoto');
        if (storedName) setCachedName(storedName);
        if (storedPhoto) setCachedPhoto(storedPhoto);
      }
    } catch (e) {
      console.warn('[Finanzo Header] Leitura segura do localStorage:', e);
    }
  }, []);

  const displayName =
    (profile?.name && profile.name !== 'Usuário')
      ? profile.name
      : cachedName || profile?.name || 'Usuário';

  const displayPhoto = !imgFailed
    ? profile?.avatarUrl || cachedPhoto || ''
    : '';

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100/80 px-4 pt-safe pb-2">
        {/* Top Brand row */}
        <div className="flex items-center justify-between h-11">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${theme.badgeGradient} flex items-center justify-center ${theme.badgeTextColor} text-xs font-bold shadow-xs`}
            >
              FP
            </div>
            <h1 className="font-semibold text-slate-800 text-sm tracking-tight">
              Finanças Pessoais
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
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

            <button
              onClick={onOpenBudgetModal}
              title="Definir Orçamento do Mês"
              className="h-8 px-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden xs:inline">Orçamento</span>
            </button>

            {/* Profile Avatar & Name Trigger Button */}
            <div className="relative">
              <button
                onClick={onOpenProfileModal}
                title={`Perfil: ${displayName} (${profile.login})${isCloudConnected ? ' • Sincronizado na Nuvem' : ''}`}
                className="flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full border border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all shadow-2xs active:scale-95 cursor-pointer max-w-[130px] sm:max-w-[180px]"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-slate-100"
                  style={{ backgroundColor: displayPhoto ? 'transparent' : profile.avatarColor || '#7dd3fc' }}
                >
                  {displayPhoto ? (
                    <img
                      src={displayPhoto}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setImgFailed(true)}
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-800">
                      {getInitials(displayName)}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate tracking-tight">
                  {displayName}
                </span>
              </button>
              {isCloudConnected && (
                <span
                  title="Sincronizado na Nuvem (Firestore)"
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-2xs"
                />
              )}
            </div>
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
