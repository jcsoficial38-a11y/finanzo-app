import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Camera,
  Mail,
  Check,
  Sparkles,
  Calendar,
  Wallet,
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
} from 'lucide-react';
import { UserProfile } from '../types/finance';
import { PASTEL_COLORS } from '../data/initialData';
import { WhatsAppIcon } from './WhatsAppIcon';
import { useAppTheme } from '../context/ThemeContext';
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
  onPinChange?: () => void;
  onClearTransactions?: () => void;
  authUser?: any;
  cloudSyncState?: 'idle' | 'syncing' | 'synced' | 'error';
  onLoginGoogle?: () => Promise<any> | void;
  onLogoutGoogle?: () => void;
  onSyncNow?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  totalTransactionsCount,
  currentBudget,
  onUpdateProfile,
  onExportCSV,
  onPinChange,
  onClearTransactions,
  authUser,
  cloudSyncState = 'idle',
  onLoginGoogle,
  onLogoutGoogle,
  onSyncNow,
}) => {
  const [name, setName] = useState(profile.name || 'JC');
  const [login, setLogin] = useState(profile.login || '@jc');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor || '#7dd3fc');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [googleLoginError, setGoogleLoginError] = useState<string | null>(null);

  const { themeId, setTheme } = useAppTheme();

  // Função oficial de Login Google 1-Clique sem travamento
  const handleLoginGoogleClick = async () => {
    setGoogleLoginError(null);
    setIsLoggingIn(true);
    try {
      if (onLoginGoogle) {
        await onLoginGoogle();
      }
    } catch (err: any) {
      console.warn('[ProfileModal] Aviso/Erro seguro no login Google:', err);
      const code = err?.code || '';
      let msg = 'Não foi possível conectar com o Google no momento. Tente novamente.';
      if (code === 'auth/network-request-failed') {
        msg = 'Falha de conexão com a internet. Verifique sua rede e tente novamente.';
      } else if (code === 'auth/popup-blocked') {
        msg = 'O pop-up de login foi bloqueado pelo seu navegador. Redirecionando...';
      } else if (code === 'auth/popup-closed-by-user') {
        msg = 'A janela do Google foi fechada antes de concluir.';
      } else if (err?.message) {
        msg = err.message;
      }
      setGoogleLoginError(msg);
    } finally {
      // Garante que o botão NUNCA fique travado ou desativado
      setIsLoggingIn(false);
    }
  };

  // Keep modal fields updated whenever profile changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setName(profile.name || 'JC');
      setLogin(profile.login || '@jc');
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

  // Clear Transactions state & safety confirmation
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [clearSuccess, setClearSuccess] = useState('');

  const handleConfirmClearTransactions = () => {
    if (onClearTransactions) {
      onClearTransactions();
      setShowClearConfirmModal(false);
      setClearSuccess('Histórico de transações zerado com sucesso!');
      setTimeout(() => setClearSuccess(''), 3500);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
      setPinSuccess('Senha de 4 dígitos salva com sucesso!');
      setPinInput('');
      setPinConfirmInput('');
      setIsEditingPin(false);
      onPinChange?.();
      setTimeout(() => setPinSuccess(''), 3000);
    } catch (err: any) {
      setPinError(err?.message || 'Erro ao salvar a senha.');
    }
  };

  const handleTogglePin = () => {
    const nextState = !pinStatus.isEnabled;
    togglePinEnabled(nextState);
    setPinStatus(getPinStatus());
    onPinChange?.();
  };

  const handleRemovePin = () => {
    if (window.confirm('Tem certeza que deseja remover a senha de 4 dígitos?')) {
      removePin();
      setPinStatus(getPinStatus());
      setIsEditingPin(false);
      setPinInput('');
      setPinConfirmInput('');
      setPinSuccess('Senha removida com sucesso.');
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
      // Validate file size (< 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Por favor, selecione uma imagem de até 2MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const photoResult = reader.result;
          setAvatarUrl(photoResult);
          const updated: UserProfile = {
            ...profile,
            name: name.trim() || profile.name || 'JC',
            login: login.trim() || profile.login || '@jc',
            bio: bio.trim(),
            avatarUrl: photoResult,
            avatarColor,
          };
          saveStoredUserProfile(updated);
          onUpdateProfile(updated);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    const updated: UserProfile = {
      ...profile,
      name: name.trim() || profile.name || 'JC',
      login: login.trim() || profile.login || '@jc',
      bio: bio.trim(),
      avatarUrl: '',
      avatarColor,
    };
    saveStoredUserProfile(updated);
    onUpdateProfile(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

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

  // User initials for fallback avatar
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
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Perfil do Usuário</h3>
              <p className="text-[11px] text-slate-400">Edite sua foto, nome e login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Avatar Upload Area */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative group">
              {/* Photo or Initials Avatar */}
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

              {/* Upload trigger overlay button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-slate-800 transition-transform active:scale-95"
                title="Alterar Foto"
                aria-label="Alterar Foto"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Photo Action Links */}
            <div className="flex items-center gap-3 mt-2 text-xs">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>Enviar Foto</span>
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remover</span>
                </button>
              )}
            </div>

            {/* Pastel Background Colors for Initial Avatar */}
            {!avatarUrl && (
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 mr-1">Cor de fundo:</span>
                {PASTEL_COLORS.slice(0, 6).map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setAvatarColor(c.hex)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      avatarColor === c.hex ? 'scale-125 ring-2 ring-slate-800' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Field 1: Nome */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Field 2: Login / E-mail */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Login / E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="exemplo@email.com ou usuario"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Field 3: Bio / Meta Financeira */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Frase ou Meta Financeira
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ex: Focado em economizar e investir"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all"
            />
          </div>

          {/* Section: Personalização de Tema e Cores */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-2xs">
                <Palette className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  Tema & Cores do Aplicativo
                </h4>
                <p className="text-[11px] text-slate-500">
                  Alterne entre Azul, Verde, Preto, Amarelo com Preto, etc.
                </p>
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

          {/* Section: Senha de 4 Dígitos (Bloqueio de Segurança) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Senha de 4 Dígitos
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {pinStatus.hasPin
                      ? pinStatus.isEnabled
                        ? 'Bloqueio por senha ativo'
                        : 'Senha salva, mas bloqueio pausado'
                      : 'Proteja seu app com senha numérica'}
                  </p>
                </div>
              </div>

              {pinStatus.hasPin && !isEditingPin && (
                <button
                  type="button"
                  onClick={handleTogglePin}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
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
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                {pinStatus.hasPin ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPinError('');
                        setIsEditingPin(true);
                      }}
                      className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                      <span>Alterar Senha</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePin}
                      className="py-2 px-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold text-rose-600 transition-colors"
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
                    className="w-full py-2 px-3 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-200 rounded-xl text-xs font-semibold text-teal-800 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Lock className="w-3.5 h-3.5 text-teal-600" />
                    <span>Configurar Senha de 4 Dígitos</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 pt-2 border-t border-slate-200/60">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>{pinStatus.hasPin ? 'Alterar Senha' : 'Nova Senha'}</span>
                  <button
                    type="button"
                    onClick={() => setShowPinDigits(!showPinDigits)}
                    className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[11px]"
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
                      Senha (4 números)
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
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-center text-sm font-bold tracking-widest text-slate-800 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 tabular-nums"
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
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-center text-sm font-bold tracking-widest text-slate-800 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 tabular-nums"
                    />
                  </div>
                </div>

                {pinError && (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPin(false);
                      setPinInput('');
                      setPinConfirmInput('');
                      setPinError('');
                    }}
                    className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePin}
                    disabled={pinInput.length !== 4 || pinConfirmInput.length !== 4}
                    className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
                  >
                    Salvar Senha
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section: Cadastrar/Ativar Biometria (Passkey / WebAuthn) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Cadastrar/Ativar Biometria
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {bioStatus.hasKey
                      ? bioStatus.isEnabled
                        ? 'Desbloqueio por digital ativo'
                        : 'Biometria salva, mas bloqueio pausado'
                      : 'Proteja seu app com a digital do celular (Passkey)'}
                  </p>
                </div>
              </div>

              {bioStatus.hasKey && (
                <button
                  type="button"
                  onClick={handleToggleBiometric}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
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

            <div className="pt-1 border-t border-slate-200/60">
              {bioStatus.hasKey ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestBiometric}
                    className="flex-1 py-2 px-3 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-200 rounded-xl text-xs font-semibold text-violet-800 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-violet-600" />
                    <span>Testar Biometria</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveBiometric}
                    className="py-2 px-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold text-rose-600 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRegisterBiometric}
                  disabled={isRegisteringBio}
                  className="w-full py-2 px-3 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-200 rounded-xl text-xs font-semibold text-violet-800 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Fingerprint className="w-3.5 h-3.5 text-violet-600" />
                  <span>
                    {isRegisteringBio
                      ? 'Registrando chave biométrica...'
                      : 'Cadastrar/Ativar Biometria'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Section: Banco de Dados na Nuvem (Firebase Firestore) */}
          <div className="p-3.5 bg-sky-50/70 rounded-2xl border border-sky-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <Cloud className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                    <span>Banco de Dados na Nuvem</span>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md ${
                        authUser
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {authUser ? 'Sincronizado Online' : 'Armazenamento Local'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-sky-700 leading-tight">
                    {authUser
                      ? `Conectado como ${authUser.displayName || authUser.email}`
                      : 'Sincronize com o Firestore para acessar de qualquer celular ou PC'}
                  </p>
                </div>
              </div>
            </div>

            {authUser ? (
              <div className="space-y-2 pt-1 border-t border-sky-200/60">
                <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white/90 p-2 rounded-xl border border-sky-100">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Status na Nuvem:</span>
                  </span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>
                      {cloudSyncState === 'syncing'
                        ? 'Sincronizando...'
                        : 'Firestore Conectado'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onSyncNow}
                    disabled={cloudSyncState === 'syncing'}
                    className="flex-1 py-2 px-3 bg-white hover:bg-sky-100/70 active:bg-sky-100 border border-sky-200 text-sky-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-sky-600 ${
                        cloudSyncState === 'syncing' ? 'animate-spin' : ''
                      }`}
                    />
                    <span>
                      {cloudSyncState === 'syncing'
                        ? 'Sincronizando...'
                        : 'Sincronizar Agora'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onLogoutGoogle}
                    className="py-2 px-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Desconectar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2 border-t border-sky-200/60">
                <p className="text-[11px] text-sky-900 leading-relaxed">
                  Conecte sua conta do Google com apenas <strong>1 clique</strong> para salvar todas as suas despesas, receitas, saldos e metas diretamente na nuvem.
                </p>

                {/* 1. Botão Oficial Google (1-Clique, try/catch/finally e nunca trava) */}
                <button
                  type="button"
                  onClick={handleLoginGoogleClick}
                  disabled={false}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 active:scale-98 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
                >
                  {isLoggingIn ? (
                    <RefreshCw className="w-4 h-4 text-sky-600 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span className="text-slate-700 font-semibold text-xs">
                    {isLoggingIn ? 'Conectando ao Google...' : 'Entrar com o Google'}
                  </span>
                </button>

                {/* 2. Banner de Aviso Amigável em Caso de Falha de Rede ou Autenticação */}
                {googleLoginError && (
                  <div className="p-3 bg-amber-50/90 text-amber-900 rounded-xl text-xs font-medium border border-amber-200/80 flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-amber-950">{googleLoginError}</p>
                      <p className="text-[11px] text-amber-800 mt-1">
                        Seus lançamentos locais permanecem preservados. Você pode tentar novamente a qualquer momento clicando no botão acima.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-sky-800/80 pt-0.5">
                  <Cloud className="w-3 h-3 text-sky-600 shrink-0" />
                  <span>Sincronização contínua com Firestore vinculada ao seu Google UID.</span>
                </div>
              </div>
            )}
          </div>

          {/* Section: Compartilhar Aplicativo no WhatsApp */}
          <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                  <WhatsAppIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">
                    Compartilhar no WhatsApp
                  </h4>
                  <p className="text-[11px] text-emerald-700">
                    Envie o aplicativo para abrir direto no celular
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <WhatsAppIcon className="w-4 h-4 text-white" />
              <span>Compartilhar Aplicativo no WhatsApp</span>
            </button>
          </div>

          {/* User Account Info Cards */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
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

            {onExportCSV && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700 block">Exportar Relatório</span>
                  <span className="text-[11px] text-slate-400">Resumo e transações do mês</span>
                </div>
                <button
                  type="button"
                  onClick={onExportCSV}
                  className="px-2.5 py-1.5 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-slate-700 hover:text-teal-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                  <span>Baixar CSV</span>
                </button>
              </div>
            )}
          </div>

          {/* Section: Zerar Histórico de Transações / Limpar Dados Salvos */}
          <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-200/80 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <Trash2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-950">
                    Zerar Histórico de Transações
                  </h4>
                  <p className="text-[11px] text-rose-700 leading-tight">
                    Limpa todos os lançamentos ({totalTransactionsCount} {totalTransactionsCount === 1 ? 'transação' : 'transações'}), mantendo seu perfil e senhas
                  </p>
                </div>
              </div>
            </div>

            {clearSuccess && (
              <div className="flex items-center gap-1.5 p-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium border border-emerald-200 animate-in fade-in">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{clearSuccess}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowClearConfirmModal(true)}
              className="w-full py-2.5 px-3 bg-white hover:bg-rose-100/70 active:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs hover:border-rose-300 active:scale-98"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Zerar Histórico de Transações</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className={`flex-1 py-3 text-xs font-semibold text-white rounded-xl transition-all flex items-center justify-center gap-1.5 min-h-[44px] shadow-xs ${
                savedSuccess
                  ? 'bg-emerald-600'
                  : 'bg-slate-900 hover:bg-slate-800 disabled:opacity-50'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{savedSuccess ? 'Salvo com Sucesso!' : 'Salvar Perfil'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Pop-up Modal de Confirmação de Segurança */}
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
                Tem certeza que deseja apagar todas as transações? Esta ação não pode ser desfeita.
              </p>
              <p className="text-[11px] text-slate-400">
                Suas configurações básicas de perfil, categorias e senha/biometria serão mantidas normalmente.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors min-h-[42px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearTransactions}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs min-h-[42px]"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>Sim, Apagar Tudo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
