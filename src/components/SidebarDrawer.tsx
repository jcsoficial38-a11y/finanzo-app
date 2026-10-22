import React from 'react';
import {
  X,
  Home,
  ListOrdered,
  PieChart,
  Tags,
  User,
  Sliders,
  Cloud,
  CheckCircle2,
  RefreshCw,
  LogOut,
  WifiOff,
  Shield,
  Settings,
} from 'lucide-react';
import { ActiveTab, UserProfile } from '../types/finance';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useAppTheme } from '../context/ThemeContext';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  profile: UserProfile;
  authUser: any;
  driveSyncState: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  lastDriveSyncTime: Date | null;
  onLoginGoogle: () => Promise<any> | void;
  onLogoutGoogle: () => void;
  onSyncDriveNow: () => Promise<boolean> | void;
  onOpenProfileModal: () => void;
  onOpenBudgetModal: () => void;
  onOpenCategoryModal: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onChangeTab,
  profile,
  authUser,
  driveSyncState,
  lastDriveSyncTime,
  onLoginGoogle,
  onLogoutGoogle,
  onSyncDriveNow,
  onOpenProfileModal,
  onOpenBudgetModal,
  onOpenCategoryModal,
}) => {
  const { theme } = useAppTheme();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const displayName = authUser?.displayName || profile.name || 'Meu Perfil';
  const displayEmail = authUser?.email || profile.login || 'Modo Offline (Local)';
  const displayAvatarUrl = authUser?.photoURL || profile.avatarUrl || '';
  const displayInitials = (displayName || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0])
    .join('')
    .toUpperCase() || 'U';

  if (!isOpen) return null;

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await onLoginGoogle();
    } catch (err) {
      console.warn('[SidebarDrawer] Erro ao autenticar:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncDriveNow();
    } finally {
      setIsSyncing(false);
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

          {/* CABEÇALHO DO PERFIL & GOOGLE DRIVE INTEGRADO */}
          <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-3.5 space-y-3 shadow-2xs">
            {/* Top User Info Row */}
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
                  {authUser && (
                    <span
                      title="Conectado ao Google Drive"
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-2xs"
                    >
                      <Cloud className="w-2 h-2 text-white" />
                    </span>
                  )}
                </div>

                {/* Name & Login / Email */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                      {displayName}
                    </p>
                    {authUser ? (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200/80 shrink-0">
                        Drive Ativo
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-slate-200 text-slate-700 shrink-0">
                        Offline
                      </span>
                    )}
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
                title="Editar dados do perfil"
                className="p-1.5 rounded-xl hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* SEÇÃO GOOGLE DRIVE: AUTENTICADO OU OFFLINE */}
            {authUser ? (
              <div className="pt-2.5 border-t border-slate-200/70 space-y-2.5">
                {/* Status da Sincronização */}
                <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                  <span className="flex items-center gap-1.5">
                    {driveSyncState === 'syncing' || isSyncing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-teal-600 animate-spin shrink-0" />
                        <span className="text-teal-700 font-semibold text-[10px]">
                          Salvando no Drive...
                        </span>
                      </>
                    ) : driveSyncState === 'offline' ? (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-amber-700 font-medium text-[10px]">
                          Offline (salvo no aparelho)
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-emerald-700 font-medium text-[10px]">
                          Backup Sincronizado
                        </span>
                      </>
                    )}
                  </span>

                  {lastDriveSyncTime && (
                    <span className="text-[9px] text-slate-400 font-medium shrink-0">
                      {lastDriveSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Ações Rápidas: Sincronizar e Sair */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex-1 py-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sincronizar</span>
                  </button>

                  <button
                    type="button"
                    onClick={onLogoutGoogle}
                    className="py-1.5 px-2.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="Desconectar do Google Drive"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2.5 border-t border-slate-200/70 space-y-2">
                <div className="flex items-start gap-2">
                  <Cloud className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-600 leading-snug">
                    Conecte sua conta Google para salvar seus lançamentos em segundo plano na nuvem do Google Drive.
                  </p>
                </div>

                <GoogleSignInButton
                  onClick={handleLogin}
                  isLoading={isLoggingIn}
                  className="w-full py-2 shadow-2xs text-xs"
                />

                <p className="text-[9px] text-slate-400 text-center">
                  100% offline disponível • Seus dados continuam no seu aparelho
                </p>
              </div>
            )}
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
              Seguro
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
