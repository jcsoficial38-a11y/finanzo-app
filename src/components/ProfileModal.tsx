import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  User,
  Camera,
  Mail,
  Check,
  Calendar,
  Receipt,
  Trash2,
  Upload,
  FileSpreadsheet,
  Lock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Palette,
  Fingerprint,
  Cloud,
  RefreshCw,
  LogOut,
  RotateCcw,
  Sliders,
  ChevronRight,
  ChevronDown,
  Database,
  Download,
  Sparkles,
  Info,
} from 'lucide-react';
import { UserProfile, Category, TrashTransaction } from '../types/finance';
import { PASTEL_COLORS } from '../data/initialData';
import { WhatsAppIcon } from './WhatsAppIcon';
import { CategoryIcon } from './CategoryIcon';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useAppTheme } from '../context/ThemeContext';
import { useCurrencyVisibility } from '../context/CurrencyVisibilityContext';
import { APP_THEMES, ThemeId } from '../utils/themeConfig';
import {
  getPinStatus,
  savePin,
  removePin,
  togglePinEnabled,
  PinStatus,
} from '../utils/pinSecurity';
import {
  getBiometricStatus,
  registerBiometric,
  authenticateBiometric,
  toggleBiometricEnabled,
  removeBiometric,
  BiometricStatus,
} from '../utils/biometricSecurity';
import {
  calculateInitials,
  saveStoredUserProfile,
} from '../utils/userProfileManager';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  totalTransactionsCount: number;
  currentBudget: number;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onExportCSV?: () => void;
  onExportBackup?: () => any;
  onImportBackup?: (file: File) => Promise<{ success: boolean; message: string; count?: number }>;
  onPinChange?: () => void;
  onClearTransactions?: () => void | Promise<void>;
  onResetAllData?: () => void | Promise<void>;
  authUser?: any;
  cloudSyncState?: 'idle' | 'syncing' | 'synced' | 'error';
  onLoginGoogle?: () => Promise<any> | void;
  onLogoutGoogle?: () => void;
  onSyncNow?: () => void;
  // Lixeira Local
  trashTransactions?: TrashTransaction[];
  categories?: Category[];
  onRestoreFromTrash?: (id: string) => void;
  onRestoreAllFromTrash?: () => void;
  onEmptyTrash?: () => void;
  onDeletePermanentlyFromTrash?: (id: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  totalTransactionsCount,
  currentBudget,
  onUpdateProfile,
  onExportCSV,
  onExportBackup,
  onImportBackup,
  onPinChange,
  onClearTransactions,
  onResetAllData,
  authUser,
  cloudSyncState = 'idle',
  onLoginGoogle,
  onLogoutGoogle,
  onSyncNow,
  trashTransactions = [],
  categories = [],
  onRestoreFromTrash,
  onRestoreAllFromTrash,
  onEmptyTrash,
  onDeletePermanentlyFromTrash,
}) => {
  const [name, setName] = useState(profile.name || '');
  const [login, setLogin] = useState(profile.login || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor || '#7dd3fc');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const { themeId, setTheme } = useAppTheme();
  const { formatMoney } = useCurrencyVisibility();

  // Mapeamento rápido de categorias para exibição de ícones e cores na lixeira
  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

  // Keep modal fields updated whenever profile changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setName(profile.name || '');
      setLogin(profile.login || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatarUrl || '');
      setAvatarColor(profile.avatarColor || '#7dd3fc');
    }
  }, [isOpen, profile]);

  // 4-Digit PIN Security State
  const [pinStatus, setPinStatus] = useState<PinStatus>(() => getPinStatus());
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirmInput, setPinConfirmInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [showPinDigits, setShowPinDigits] = useState(false);

  // Biometric Security (Passkey / WebAuthn) State
  const [bioStatus, setBioStatus] = useState<BiometricStatus>(() => getBiometricStatus());
  const [isRegisteringBio, setIsRegisteringBio] = useState(false);
  const [bioSuccess, setBioSuccess] = useState('');
  const [bioError, setBioError] = useState('');

  // Clear & Reset state & safety confirmation
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [showResetAllConfirmModal, setShowResetAllConfirmModal] = useState(false);
  const [showEmptyTrashConfirmModal, setShowEmptyTrashConfirmModal] = useState(false);
  const [clearSuccess, setClearSuccess] = useState('');
  const [trashSuccess, setTrashSuccess] = useState('');
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Exportar Backup Local Instantâneo (backup_financas_AAAA-MM-DD.json)
  const handleExportBackupClick = () => {
    if (onExportBackup) {
      const fileName = onExportBackup();
      setBackupFeedback({
        message: fileName ? `Arquivo ${fileName} baixado com sucesso!` : 'Backup baixado com sucesso!',
        isError: false,
      });
      setTimeout(() => setBackupFeedback(null), 4000);
    }
  };

  // Importar Backup Local Instantâneo (Restaura backup_app.json em 1 segundo)
  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      if (onImportBackup) {
        const res = await onImportBackup(file);
        setBackupFeedback({ message: res.message, isError: !res.success });
        if (res.success) {
          setTimeout(() => setBackupFeedback(null), 5000);
        }
      }
    } catch (err: any) {
      setBackupFeedback({
        message: `Erro ao importar: ${err?.message || 'Arquivo inválido'}`,
        isError: true,
      });
    } finally {
      setIsImporting(false);
      if (backupFileInputRef.current) {
        backupFileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmClearTransactions = async () => {
    if (onClearTransactions) {
      setIsClearing(true);
      try {
        await onClearTransactions();
        setShowClearConfirmModal(false);
        setClearSuccess('Histórico de transações zerado com sucesso!');
        setTimeout(() => setClearSuccess(''), 3500);
      } catch (err) {
        console.warn('Erro ao zerar transações:', err);
      } finally {
        setIsClearing(false);
      }
    }
  };

  const handleConfirmResetAll = async () => {
    if (onResetAllData) {
      setIsResettingAll(true);
      try {
        await onResetAllData();
        setShowResetAllConfirmModal(false);
        setClearSuccess('Reset Total concluído! Todos os dados foram limpos e o aplicativo retornou ao estado inicial.');
        setTimeout(() => setClearSuccess(''), 5000);
      } catch (err) {
        console.warn('Erro ao realizar Reset Total:', err);
      } finally {
        setIsResettingAll(false);
      }
    }
  };

  const handleConfirmEmptyTrash = () => {
    if (onEmptyTrash) {
      onEmptyTrash();
      setShowEmptyTrashConfirmModal(false);
      setTrashSuccess('Lixeira local esvaziada permanentemente!');
      setTimeout(() => setTrashSuccess(''), 3000);
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    if (!/^\d{4}$/.test(pinInput)) {
      setPinError('A senha deve conter exatamente 4 dígitos numéricos.');
      return;
    }

    if (pinInput !== pinConfirmInput) {
      setPinError('As senhas digitadas não coincidem.');
      return;
    }

    try {
      savePin(pinInput);
      setPinStatus(getPinStatus());
      setPinSuccess('PIN de 4 dígitos salvo com sucesso!');
      setPinInput('');
      setPinConfirmInput('');
      setIsEditingPin(false);
      onPinChange?.();
      setTimeout(() => setPinSuccess(''), 3000);
    } catch (err: any) {
      setPinError(err?.message || 'Erro ao salvar o PIN.');
    }
  };

  const handleTogglePin = () => {
    const nextState = !pinStatus.isEnabled;
    togglePinEnabled(nextState);
    setPinStatus(getPinStatus());
    onPinChange?.();
  };

  const handleRemovePin = () => {
    if (window.confirm('Tem certeza que deseja remover o PIN de 4 dígitos?')) {
      removePin();
      setPinStatus(getPinStatus());
      setIsEditingPin(false);
      setPinInput('');
      setPinConfirmInput('');
      setPinSuccess('PIN removido com sucesso.');
      onPinChange?.();
      setTimeout(() => setPinSuccess(''), 3000);
    }
  };

  const handleRegisterBiometric = async () => {
    setIsRegisteringBio(true);
    setBioError('');
    setBioSuccess('');
    try {
      const res = await registerBiometric(profile.name || 'Usuário');
      if (res.success) {
        setBioStatus(getBiometricStatus());
        setBioSuccess(res.message || 'Biometria ativada com sucesso!');
        onPinChange?.();
        setTimeout(() => setBioSuccess(''), 3500);
      } else {
        setBioError(res.error || 'Não foi possível registrar a biometria.');
      }
    } catch (err: any) {
      setBioError(err?.message || 'Falha ao registrar biometria.');
    } finally {
      setIsRegisteringBio(false);
    }
  };

  const handleToggleBiometric = () => {
    const nextState = !bioStatus.isEnabled;
    toggleBiometricEnabled(nextState);
    setBioStatus(getBiometricStatus());
    onPinChange?.();
  };

  const handleTestBiometric = async () => {
    setBioError('');
    setBioSuccess('');
    try {
      const res = await authenticateBiometric();
      if (res.success) {
        setBioSuccess('Biometria autenticada com sucesso! Digital reconhecida.');
        setTimeout(() => setBioSuccess(''), 3500);
      } else {
        setBioError(res.error || 'Não foi possível reconhecer a biometria.');
      }
    } catch (err: any) {
      setBioError(err?.message || 'Erro ao validar biometria.');
    }
  };

  const handleRemoveBiometric = () => {
    if (window.confirm('Deseja desativar e remover a chave biométrica deste dispositivo?')) {
      removeBiometric();
      setBioStatus(getBiometricStatus());
      setBioSuccess('Chave biométrica removida com sucesso.');
      onPinChange?.();
      setTimeout(() => setBioSuccess(''), 3000);
    }
  };

  const handleShareWhatsApp = () => {
    const appUrl = 'https://ais-pre-q2bojieezkwr2dwlsx4f6m-257052289611.us-east1.run.app';
    const message = `*Finanças Pessoais - Saldo Certo*\n\nControle suas despesas, receitas e orçamentos mensais de forma simples e rápida no seu celular!\n\nAcesse pelo link:\n${appUrl}`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...profile,
      name: name.trim(),
      login: login.trim(),
      bio: bio.trim(),
      avatarUrl,
      avatarColor,
    };

    saveStoredUserProfile(updated);
    onUpdateProfile(updated);

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  const getInitials = (fullName: string) => {
    return calculateInitials(fullName);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-2xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Perfil & Segurança</h3>
              <p className="text-[11px] text-slate-400">Nome, senha, biometria e dados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Menu Body - Lista Vertical Limpa e Organizada */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* SEÇÃO 1: FOTO E NOME DO USUÁRIO */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Foto e Nome do Usuário</h4>
                <p className="text-[11px] text-slate-500">Identificação visual e dados pessoais</p>
              </div>
            </div>

            {/* Avatar & Photo Picker */}
            <div className="flex flex-col items-center justify-center py-1">
              <div className="relative group">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-md relative"
                  style={{ backgroundColor: avatarUrl ? 'transparent' : avatarColor }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-slate-800 tracking-wider">
                      {getInitials(name)}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-slate-800 transition-transform active:scale-95 cursor-pointer"
                  title="Alterar Foto"
                  aria-label="Alterar Foto"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              <div className="flex items-center gap-3 mt-2 text-xs">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Enviar Foto</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remover</span>
                  </button>
                )}
              </div>

              {!avatarUrl && (
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 mr-1">Cor de fundo:</span>
                  {PASTEL_COLORS.slice(0, 6).map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setAvatarColor(c.hex)}
                      className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                        avatarColor === c.hex ? 'scale-125 ring-2 ring-slate-800' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Inputs: Nome, Login, Bio */}
            <div className="space-y-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-teal-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Login / E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-teal-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Meta ou Frase Financeira
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ex: Focado em economizar e investir"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-teal-500 transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!name.trim()}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
                  savedSuccess ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800 disabled:opacity-50'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{savedSuccess ? 'Perfil Salvo com Sucesso!' : 'Salvar Dados do Perfil'}</span>
              </button>
            </div>
          </div>

          {/* SEÇÃO 2: TEMAS E VISUAL */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                <Palette className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Temas e Visual</h4>
                <p className="text-[11px] text-slate-500">Personalize o estilo visual do app</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {(Object.values(APP_THEMES) as Array<(typeof APP_THEMES)[ThemeId]>).map((th) => {
                const isSelected = themeId === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setTheme(th.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-white border-slate-900 ring-2 ring-slate-900/15 shadow-xs'
                        : 'bg-white/80 hover:bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {th.swatchPreview.map((hex, idx) => (
                          <span
                            key={idx}
                            className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block shadow-2xs"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800 leading-tight">
                        {th.name}
                      </span>
                      <span className="block text-[10px] text-slate-400 leading-tight mt-0.5">
                        {th.subtitle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SEÇÃO 3: SEGURANÇA (SENHA DE 4 DÍGITOS & BIOMETRIA COM BOTÃO SALVAR PIN) */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Segurança & Acesso</h4>
                <p className="text-[11px] text-slate-500">Senha PIN de 4 dígitos e biometria digital</p>
              </div>
            </div>

            {/* Sub-item: PIN de 4 Dígitos */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-teal-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Senha de 4 Dígitos (PIN)</span>
                    <span className="text-[10px] text-slate-400 block">
                      {pinStatus.hasPin
                        ? pinStatus.isEnabled
                          ? 'Bloqueio ativo por senha'
                          : 'Senha salva, bloqueio pausado'
                        : 'Nenhuma senha configurada'}
                    </span>
                  </div>
                </div>

                {pinStatus.hasPin && !isEditingPin && (
                  <button
                    type="button"
                    onClick={handleTogglePin}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      pinStatus.isEnabled
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {pinStatus.isEnabled ? 'Ativado' : 'Pausado'}
                  </button>
                )}
              </div>

              {pinSuccess && (
                <div className="flex items-center gap-1.5 p-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{pinSuccess}</span>
                </div>
              )}

              {!isEditingPin ? (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  {pinStatus.hasPin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setPinError('');
                          setIsEditingPin(true);
                        }}
                        className="flex-1 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                        <span>Alterar PIN</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePin}
                        className="py-1.5 px-3 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold text-rose-600 transition-colors cursor-pointer"
                      >
                        Remover
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPinError('');
                        setIsEditingPin(true);
                      }}
                      className="w-full py-2 px-3 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl text-xs font-semibold text-teal-800 flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-teal-600" />
                      <span>Configurar Senha de 4 Dígitos</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>{pinStatus.hasPin ? 'Alterar Senha' : 'Nova Senha'}</span>
                    <button
                      type="button"
                      onClick={() => setShowPinDigits(!showPinDigits)}
                      className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {showPinDigits ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Ocultar</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Mostrar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Senha (4 dígitos)
                      </label>
                      <input
                        type={showPinDigits ? 'text' : 'password'}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={pinInput}
                        onChange={(e) =>
                          setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))
                        }
                        placeholder="••••"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-bold tracking-widest text-slate-800 focus:outline-hidden focus:border-teal-500 tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Confirmar Senha
                      </label>
                      <input
                        type={showPinDigits ? 'text' : 'password'}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={pinConfirmInput}
                        onChange={(e) =>
                          setPinConfirmInput(
                            e.target.value.replace(/\D/g, '').slice(0, 4)
                          )
                        }
                        placeholder="••••"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-bold tracking-widest text-slate-800 focus:outline-hidden focus:border-teal-500 tabular-nums"
                      />
                    </div>
                  </div>

                  {pinError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{pinError}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPin(false);
                        setPinInput('');
                        setPinConfirmInput('');
                        setPinError('');
                      }}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePin}
                      disabled={pinInput.length !== 4 || pinConfirmInput.length !== 4}
                      className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar PIN</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-item: Biometria / Digital */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-violet-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Biometria / Digital (Passkey)</span>
                    <span className="text-[10px] text-slate-400 block">
                      {bioStatus.hasKey
                        ? bioStatus.isEnabled
                          ? 'Desbloqueio por digital ativo'
                          : 'Biometria salva, bloqueio pausado'
                        : 'Desbloqueio com a digital do aparelho'}
                    </span>
                  </div>
                </div>

                {bioStatus.hasKey && (
                  <button
                    type="button"
                    onClick={handleToggleBiometric}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      bioStatus.isEnabled
                        ? 'bg-violet-600 text-white shadow-2xs'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {bioStatus.isEnabled ? 'Ativado' : 'Pausado'}
                  </button>
                )}
              </div>

              {bioSuccess && (
                <div className="flex items-center gap-1.5 p-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium border border-emerald-200 animate-in fade-in">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{bioSuccess}</span>
                </div>
              )}

              {bioError && (
                <div className="flex items-center gap-1.5 p-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium border border-rose-200 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{bioError}</span>
                </div>
              )}

              <div className="pt-1 border-t border-slate-100">
                {bioStatus.hasKey ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestBiometric}
                      className="flex-1 py-1.5 px-3 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl text-xs font-semibold text-violet-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Fingerprint className="w-3.5 h-3.5 text-violet-600" />
                      <span>Testar Digital</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveBiometric}
                      className="py-1.5 px-3 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold text-rose-600 transition-colors cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRegisterBiometric}
                    disabled={isRegisteringBio}
                    className="w-full py-2 px-3 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl text-xs font-semibold text-violet-800 flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-violet-600" />
                    <span>
                      {isRegisteringBio ? 'Registrando chave biométrica...' : 'Cadastrar / Ativar Biometria'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: BACKUP & DADOS LOCAIS */}
          <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Backup & Dados Locais</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-teal-100 text-teal-800 border border-teal-200/70">
                      100% Offline
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Armazenamento interno seguro no seu celular
                  </p>
                </div>
              </div>
            </div>

            {/* Input oculto para carregar arquivo de backup .json */}
            <input
              ref={backupFileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFileSelect}
            />

            {/* Feedback de sucesso ou erro no backup */}
            {backupFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 animate-in fade-in duration-150 ${
                  backupFeedback.isError
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {backupFeedback.isError ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span className="text-[11px] leading-snug">{backupFeedback.message}</span>
              </div>
            )}

            {/* Grid dos Botões Exportar e Importar Backup */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* a) BOTÃO EXPORTAR BACKUP */}
              <button
                type="button"
                onClick={handleExportBackupClick}
                className="p-3 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200/90 rounded-xl text-left transition-all shadow-2xs cursor-pointer group flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Download className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                    .json com data
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Exportar Backup</p>
                  <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                    Baixa o arquivo backup_financas_AAAA-MM-DD.json com todos os seus dados.
                  </p>
                </div>
              </button>

              {/* b) BOTÃO IMPORTAR BACKUP */}
              <button
                type="button"
                onClick={() => backupFileInputRef.current?.click()}
                disabled={isImporting}
                className="p-3 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200/90 rounded-xl text-left transition-all shadow-2xs cursor-pointer group flex flex-col justify-between gap-2.5 disabled:opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-4 h-4 text-sky-600" />
                  </div>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                    {isImporting ? 'Lendo...' : 'Restaurar'}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {isImporting ? 'Restaurando...' : 'Importar Backup'}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                    Selecione um arquivo de backup (.json) para restaurar o aplicativo em 1 segundo.
                  </p>
                </div>
              </button>
            </div>

            {/* c) BOTÃO ZERAR/RESETAR DADOS */}
            <div className="pt-1 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => setShowResetAllConfirmModal(true)}
                className="w-full py-2.5 px-3 bg-white hover:bg-rose-50 border border-rose-200/80 hover:border-rose-300 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Zerar / Resetar Dados (Começar do Zero)</span>
              </button>
            </div>
          </div>

          {/* SEÇÃO 5: LIXEIRA LOCAL (ARMAZENAMENTO INTERNO - PADRÃO ACCORDION / RETRÁTIL) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all">
            {/* Header Accordion Retrátil */}
            <button
              type="button"
              onClick={() => setIsTrashOpen((prev) => !prev)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <Trash2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>Lixeira Local</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-200/60">
                      {trashTransactions.length} {trashTransactions.length === 1 ? 'item' : 'itens'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Armazenamento interno do celular
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400">
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isTrashOpen ? 'rotate-180 text-amber-600' : 'text-slate-400'
                  }`}
                />
              </div>
            </button>

            {/* Conteúdo Retrátil da Lixeira (Expandido apenas ao clicar) */}
            {isTrashOpen && (
              <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/40">
                {trashSuccess && (
                  <div className="flex items-center gap-1.5 p-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium border border-emerald-200 animate-in fade-in">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{trashSuccess}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Lançamentos excluídos são preservados na memória local do aparelho, permitindo recuperação rápida sem perdas.
                  </p>

                  {trashTransactions.length > 0 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onRestoreAllFromTrash && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestoreAllFromTrash();
                          }}
                          title="Restaurar todos os itens da lixeira"
                          className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        >
                          <RotateCcw className="w-3 h-3 text-emerald-600" />
                          <span>Restaurar Todos</span>
                        </button>
                      )}
                      {onEmptyTrash && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEmptyTrashConfirmModal(true);
                          }}
                          title="Esvaziar lixeira permanentemente"
                          className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Esvaziar</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {trashTransactions.length === 0 ? (
                  <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-center space-y-1">
                    <p className="text-xs font-semibold text-slate-700">Lixeira vazia</p>
                    <p className="text-[10px] text-slate-400">
                      Nenhum lançamento foi excluído recentemente no aparelho.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5 divide-y divide-slate-100 bg-white rounded-xl border border-slate-200/80 p-2 shadow-2xs">
                    {trashTransactions.map((tx) => {
                      const cat = categoriesMap.get(tx.categoryId);
                      const isIncome = tx.kind === 'income';
                      const deletedDateStr = tx.deletedAt
                        ? new Date(tx.deletedAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '';

                      return (
                        <div
                          key={tx.id}
                          className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: cat?.color ? `${cat.color}25` : '#f1f5f9',
                              }}
                            >
                              <CategoryIcon name={cat?.iconName} className="w-3.5 h-3.5 text-slate-700" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate leading-tight">
                                {tx.name}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {cat?.name || 'Geral'} {deletedDateStr ? `• Excluído em ${deletedDateStr}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`font-bold tabular-nums text-xs ${
                                isIncome ? 'text-emerald-600' : 'text-slate-800'
                              }`}
                            >
                              {isIncome ? '+' : '-'} {formatMoney(tx.amount)}
                            </span>

                            <div className="flex items-center gap-1">
                              {onRestoreFromTrash && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onRestoreFromTrash(tx.id);
                                    setTrashSuccess(`"${tx.name}" restaurado com sucesso!`);
                                    setTimeout(() => setTrashSuccess(''), 2500);
                                  }}
                                  title="Restaurar este lançamento"
                                  className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeletePermanentlyFromTrash && (
                                <button
                                  type="button"
                                  onClick={() => onDeletePermanentlyFromTrash(tx.id)}
                                  title="Apagar definitivamente da memória"
                                  className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SEÇÃO 6: SUPORTE & OPÇÕES (CSV EXCLUSIVO, WHATSAPP, INFO & ZERAR HISTÓRICO) */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-2xs shrink-0">
                <Sliders className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Suporte & Opções</h4>
                <p className="text-[11px] text-slate-500">Relatórios, compartilhamento e manutenção</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/70 divide-y divide-slate-100 overflow-hidden">
              {/* Item: Exportar Relatório CSV (EXCLUSIVO NO PERFIL) */}
              {onExportCSV && (
                <div className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-800">Exportar Relatório CSV</h5>
                      <p className="text-[11px] text-slate-500 truncate">
                        Download da planilha com lançamentos do mês
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onExportCSV}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Baixar CSV</span>
                  </button>
                </div>
              )}

              {/* Item: Compartilhar no WhatsApp */}
              <div className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-800">Compartilhar Aplicativo</h5>
                    <p className="text-[11px] text-slate-500 truncate">
                      Envie o link do app para celular ou WhatsApp
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                  <span>WhatsApp</span>
                </button>
              </div>

              {/* Item: Informações da Conta */}
              <div className="p-3 space-y-1.5 bg-slate-50/40 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Membro desde:</span>
                  </span>
                  <span className="font-semibold text-slate-800">
                    {profile.joinedDate}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lançamentos salvos:</span>
                  </span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {totalTransactionsCount} transações
                  </span>
                </div>
              </div>

              {/* Item: Zerar Histórico de Transações */}
              <div className="p-3 flex items-center justify-between gap-3 hover:bg-rose-50/30 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-rose-950">Zerar Histórico</h5>
                    <p className="text-[11px] text-rose-700 truncate">
                      Apaga lançamentos locais e da nuvem (0 registros)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(true)}
                  className="px-3 py-1.5 bg-white hover:bg-rose-100/80 border border-rose-300 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Zerar</span>
                </button>
              </div>

              {/* Item: Reset Total / Limpar Todos os Dados */}
              <div className="p-3 flex items-center justify-between gap-3 bg-rose-50/60 hover:bg-rose-50/90 border-t border-rose-200/60 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <RotateCcw className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-rose-950">Reset Total / Limpar Todos os Dados</h5>
                    <p className="text-[11px] text-rose-700 leading-snug">
                      Apaga tudo e restaura o app limpo de fábrica (R$ 0,00)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetAllConfirmModal(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-98 border border-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-white" />
                  <span>Reset Total</span>
                </button>
              </div>
            </div>

            {clearSuccess && (
              <div className="flex items-center gap-1.5 p-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium border border-emerald-200 animate-in fade-in">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{clearSuccess}</span>
              </div>
            )}
          </div>

          {/* Botão Inferior Fechar */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Fechar Painel de Configurações
            </button>
          </div>
        </div>
      </div>

      {/* Modal Confirmação: Esvaziar Lixeira */}
      {showEmptyTrashConfirmModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-2xs">
              <Trash2 className="w-6 h-6 text-amber-600" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                Esvaziar Lixeira Local?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Tem certeza que deseja apagar permanentemente todos os <strong>{trashTransactions.length}</strong> itens da lixeira do celular?
              </p>
              <p className="text-[11px] text-slate-400">
                Esta ação não poderá ser desfeita.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowEmptyTrashConfirmModal(false)}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmEmptyTrash}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>Sim, Esvaziar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação: Zerar Histórico de Transações */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                Zerar Histórico de Transações?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Tem certeza que deseja apagar todas as transações? Seu aplicativo será redefinido para 0 registros.
              </p>
              <p className="text-[11px] text-slate-400">
                Suas configurações de perfil, foto, categorias e senhas serão preservadas.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearTransactions}
                disabled={isClearing}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>{isClearing ? 'Apagando...' : 'Sim, Apagar Tudo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação: Reset Total / Limpar Todos os Dados */}
      {showResetAllConfirmModal && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-rose-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center mx-auto shadow-md">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                Reset Total / Limpar Todos os Dados?
              </h3>
              <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 leading-relaxed font-semibold">
                Atenção: Esta ação apagará absolutamente todos os lançamentos, despesas fixas, variáveis, orçamentos e registros salvos no celular e no Firebase/Firestore.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Após a limpeza, o aplicativo retornará ao estado inicial de fábrica limpo, com <strong>R$ 0,00</strong> e sem nenhum lançamento cadastrado.
              </p>
              <p className="text-[11px] text-slate-400">
                Esta ação é definitiva e não poderá ser desfeita.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowResetAllConfirmModal(false)}
                disabled={isResettingAll}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetAll}
                disabled={isResettingAll}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 text-white ${isResettingAll ? 'animate-spin' : ''}`} />
                <span>{isResettingAll ? 'Resetando...' : 'Sim, Resetar Tudo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
