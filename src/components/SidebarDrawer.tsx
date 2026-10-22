import React, { useRef, useState } from 'react';
import {
  X,
  Home,
  ListOrdered,
  PieChart,
  Tags,
  User,
  Sliders,
  Database,
  Download,
  Upload,
  Shield,
  Settings,
  Check,
  AlertCircle,
} from 'lucide-react';
import { ActiveTab, UserProfile } from '../types/finance';
import { useAppTheme } from '../context/ThemeContext';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  profile: UserProfile;
  onOpenProfileModal: () => void;
  onOpenBudgetModal: () => void;
  onOpenCategoryModal: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => Promise<{ success: boolean; message: string; count?: number }>;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onChangeTab,
  profile,
  onOpenProfileModal,
  onOpenBudgetModal,
  onOpenCategoryModal,
  onExportBackup,
  onImportBackup,
}) => {
  const { theme } = useAppTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drawerFeedback, setDrawerFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const displayName = profile.name || 'JC';
  const displayEmail = profile.login || '@jc';
  const displayAvatarUrl = profile.avatarUrl || '';
  const displayInitials = (displayName || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0])
    .join('')
    .toUpperCase() || 'U';

  if (!isOpen) return null;

  const handleExport = () => {
    if (onExportBackup) {
      onExportBackup();
      setDrawerFeedback({ message: 'Backup backup_app.json baixado!', isError: false });
      setTimeout(() => setDrawerFeedback(null), 3000);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      if (onImportBackup) {
        const res = await onImportBackup(file);
        setDrawerFeedback({ message: res.message, isError: !res.success });
        if (res.success) {
          setTimeout(() => setDrawerFeedback(null), 4000);
        }
      }
    } catch (err: any) {
      setDrawerFeedback({
        message: `Erro: ${err?.message || 'Arquivo inválido'}`,
        isError: true,
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleNavClick = (tab: ActiveTab) => {
    onChangeTab(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Retractable Drawer Panel (from left) */}
      <div className="relative w-full max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-250 z-10 border-r border-slate-200/80">
        <div className="p-4 space-y-4">
          {/* Header Drawer */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${theme.badgeGradient} flex items-center justify-center ${theme.badgeTextColor} text-xs font-bold shadow-xs shrink-0`}
              >
                FP
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-sm tracking-tight leading-tight">
                  Finanças Pessoais
                </h2>
                <p className="text-[10px] text-slate-400">Controle Inteligente</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CABEÇALHO DO PERFIL (100% OFFLINE / LOCAL) */}
          <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-3.5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar Circular */}
                <div className="relative shrink-0">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-xs"
                    style={{
                      backgroundColor: displayAvatarUrl ? 'transparent' : (profile.avatarColor || '#7dd3fc'),
                    }}
                  >
                    {displayAvatarUrl ? (
                      <img
                        src={displayAvatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-800 tracking-tight">
                        {displayInitials}
                      </span>
                    )}
                  </div>
                </div>

                {/* Name & Login */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                      {displayName}
                    </p>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200/80 shrink-0">
                      Offline
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {displayEmail}
                  </p>
                </div>
              </div>

              {/* Botão de abrir modal de Perfil */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenProfileModal();
                }}
                title="Configurações & Perfil"
                className="p-1.5 rounded-xl hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CARD DE BACKUP & DADOS LOCAIS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Backup & Dados Locais
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Armazenamento interno seguro
                  </p>
                </div>
              </div>
            </div>

            {/* Input oculto para importação */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
            />

            {/* Feedback inline */}
            {drawerFeedback && (
              <div
                className={`p-2 rounded-xl text-[10px] font-medium border flex items-center gap-1.5 animate-in fade-in ${
                  drawerFeedback.isError
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {drawerFeedback.isError ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                <span>{drawerFeedback.message}</span>
              </div>
            )}

            {/* Botões Exportar e Importar */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="py-2 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Baixar backup_app.json"
              >
                <Download className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Exportar</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="py-2 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
                title="Restaurar backup_app.json"
              >
                <Upload className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>{isImporting ? 'Lendo...' : 'Importar'}</span>
              </button>
            </div>
          </div>

          {/* NAVIGATION LINKS */}
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Navegação
            </p>

            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-teal-50 text-teal-800 font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Home className="w-4 h-4 text-teal-600" />
              <span>Início (Resumos)</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('history')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-teal-50 text-teal-800 font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ListOrdered className="w-4 h-4 text-teal-600" />
              <span>Histórico de Lançamentos</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('charts')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'charts'
                  ? 'bg-teal-50 text-teal-800 font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <PieChart className="w-4 h-4 text-teal-600" />
              <span>Gráficos & Gastos</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('categories')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-teal-50 text-teal-800 font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Tags className="w-4 h-4 text-teal-600" />
              <span>Gerenciar Categorias</span>
            </button>
          </div>

          {/* CONFIGURAÇÕES E MODAIS */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Ajustes Rápidos
            </p>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenProfileModal();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <User className="w-4 h-4 text-slate-500" />
              <span>Perfil & Segurança</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBudgetModal();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-slate-500" />
              <span>Metas & Orçamento</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Finanzo v2.0 • Offline-First</span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <Shield className="w-3 h-3" />
              100% Local
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
