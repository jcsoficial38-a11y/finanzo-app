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
  Download,
  Lock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  FolderArchive,
} from 'lucide-react';
import { UserProfile } from '../types/finance';
import { PASTEL_COLORS } from '../data/initialData';
import { WhatsAppIcon } from './WhatsAppIcon';
import {
  getPinStatus,
  savePin,
  removePin,
  togglePinEnabled,
  PinStatus,
} from '../utils/pinSecurity';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  totalTransactionsCount: number;
  currentBudget: number;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onExportCSV?: () => void;
  onPinChange?: () => void;
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
}) => {
  const [name, setName] = useState(profile.name);
  const [login, setLogin] = useState(profile.login);
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor || '#7dd3fc');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // 4-Digit PIN Security State
  const [pinStatus, setPinStatus] = useState<PinStatus>(() => getPinStatus());
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirmInput, setPinConfirmInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [showPinDigits, setShowPinDigits] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

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

  const handleShareWhatsApp = () => {
    const appUrl = 'https://ais-pre-q2bojieezkwr2dwlsx4f6m-257052289611.us-east1.run.app';
    const message = `*Finanças Pessoais - Saldo Certo*\n\nControle suas despesas, receitas e orçamentos mensais de forma simples e rápida no seu celular!\n\nAcesse pelo link:\n${appUrl}`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleDownloadZip = () => {
    setIsDownloadingZip(true);
    const link = document.createElement('a');
    link.href = '/projeto-financas.zip';
    link.download = 'projeto-financas-saldo-certo.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      setIsDownloadingZip(false);
    }, 2000);
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
          setAvatarUrl(reader.result);
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onUpdateProfile({
      name: name.trim(),
      login: login.trim(),
      bio: bio.trim(),
      avatarUrl,
      avatarColor,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  // User initials for fallback avatar
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase() || 'FP';
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

          {/* Section: Baixar Arquivo ZIP do Projeto */}
          <div className="p-3.5 bg-sky-50/70 rounded-2xl border border-sky-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-2xs">
                  <FolderArchive className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-sky-950">
                    Baixar Código do Projeto (.ZIP)
                  </h4>
                  <p className="text-[11px] text-sky-700">
                    Arquivo .zip com todo o código-fonte completo
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                .ZIP
              </span>
            </div>

            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isDownloadingZip}
              className="w-full py-2.5 px-3 bg-sky-600 hover:bg-sky-700 active:scale-98 disabled:opacity-75 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Download className="w-4 h-4 text-white" />
              <span>
                {isDownloadingZip
                  ? 'Baixando Arquivo ZIP...'
                  : 'Baixar Arquivo ZIP do Projeto'}
              </span>
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
    </div>
  );
};
