import React, { useState, useEffect } from 'react';
import { Lock, Delete, AlertCircle, Fingerprint } from 'lucide-react';
import { UserProfile } from '../types/finance';
import { verifyPin, removePin, getPinStatus } from '../utils/pinSecurity';
import {
  getBiometricStatus,
  authenticateBiometric,
  removeBiometric,
} from '../utils/biometricSecurity';
import { calculateInitials } from '../utils/userProfileManager';

interface LockScreenProps {
  onUnlock: () => void;
  profile: UserProfile;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, profile }) => {
  const [digits, setDigits] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [shake, setShake] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);
  const [isAuthenticatingBio, setIsAuthenticatingBio] = useState(false);

  const pinStatus = (() => {
    try {
      return getPinStatus();
    } catch {
      return { hasPin: false, isEnabled: false };
    }
  })();

  const bioStatus = (() => {
    try {
      return getBiometricStatus();
    } catch {
      return { hasKey: false, isEnabled: false, isRegistered: false, type: 'none' as const };
    }
  })();

  const userName = profile?.name || 'JC';

  const handleBiometricUnlock = async () => {
    if (isAuthenticatingBio) return;
    setIsAuthenticatingBio(true);
    setErrorMsg('');
    try {
      const res = await authenticateBiometric(userName);
      if (res && res.success) {
        onUnlock();
      } else if (res && res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      console.warn('[LockScreen] Falha segura na biometria:', err);
      setErrorMsg('Biometria indisponível. Digite seu PIN de 4 dígitos abaixo.');
    } finally {
      setIsAuthenticatingBio(false);
    }
  };

  // Attempt biometric unlock on mount if biometrics is already registered and active
  useEffect(() => {
    if (bioStatus.hasKey && bioStatus.isEnabled) {
      const timer = setTimeout(() => {
        handleBiometricUnlock();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [bioStatus.hasKey, bioStatus.isEnabled]);

  const handleDigit = (digit: string) => {
    if (digits.length >= 4) return;
    setErrorMsg('');
    const nextDigits = digits + digit;
    setDigits(nextDigits);

    if (nextDigits.length === 4) {
      try {
        if (verifyPin(nextDigits)) {
          setTimeout(() => {
            onUnlock();
          }, 120);
        } else {
          setShake(true);
          setErrorMsg('Senha incorreta. Tente novamente.');
          setTimeout(() => {
            setDigits('');
            setShake(false);
          }, 500);
        }
      } catch (pinErr) {
        console.warn('[LockScreen] Erro seguro ao validar PIN:', pinErr);
        setErrorMsg('Erro na verificação. Tente novamente.');
        setDigits('');
      }
    }
  };

  const handleDelete = () => {
    setErrorMsg('');
    setDigits((prev) => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    setErrorMsg('');
    setDigits('');
  };

  const handleResetSecurity = () => {
    removePin();
    removeBiometric();
    onUnlock();
  };

  // Keyboard support for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        handleClearAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [digits]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-white p-4 select-none">
      <div className="w-full max-w-xs flex flex-col items-center space-y-5">
        {/* User avatar & lock/biometric badge */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border-2 border-teal-500 shadow-xl"
            style={{
              backgroundColor: profile.avatarUrl
                ? 'transparent'
                : profile.avatarColor || '#0d9488',
            }}
          >
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-white tracking-wider">
                {calculateInitials(profile.name)}
              </span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center text-slate-900 shadow-md">
            <Fingerprint className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        {/* Greeting & Prompt */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-white">
            {profile.name}
          </h2>
          <p className="text-xs text-slate-400">
            Digite sua senha ou use a digital para acessar
          </p>
        </div>

        {/* Biometric Quick Button (ALWAYS VISIBLE for fast fingerprint unlock) */}
        <button
          type="button"
          onClick={handleBiometricUnlock}
          disabled={isAuthenticatingBio}
          className="w-full py-2.5 px-4 bg-teal-500/20 hover:bg-teal-500/30 active:bg-teal-500/40 border border-teal-500/40 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-teal-300 transition-all active:scale-98 shadow-xs"
        >
          <Fingerprint className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            {isAuthenticatingBio
              ? 'Validando digital...'
              : 'Desbloquear com Biometria / Digital'}
          </span>
        </button>

        {/* 4 PIN Dots (sempre visíveis para feedback do teclado numérico) */}
        <div
          className={`flex items-center justify-center gap-4 py-1 ${
            shake ? 'animate-bounce' : ''
          }`}
        >
            {[0, 1, 2, 3].map((index) => {
              const isFilled = digits.length > index;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    isFilled
                      ? 'bg-teal-400 scale-110 shadow-lg shadow-teal-500/50'
                      : 'border-2 border-slate-600 bg-slate-800/80'
                  }`}
                />
              );
            })}
          </div>

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Numeric Keypad with BIOMETRIC BUTTON ALWAYS BESIDE ZERO */}
        <div className="grid grid-cols-3 gap-3 w-full pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-16 rounded-2xl bg-slate-800/90 hover:bg-slate-700/80 active:bg-teal-600 text-xl font-semibold text-white transition-all active:scale-95 shadow-xs flex items-center justify-center"
            >
              {num}
            </button>
          ))}

          {/* Row 4 Col 1: Limpar Tudo ('C') */}
          <button
            type="button"
            onClick={handleClearAll}
            title="Limpar todos os dígitos (C)"
            aria-label="Limpar todos os dígitos"
            className="h-16 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 active:bg-rose-500/30 text-slate-300 hover:text-white transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-xs cursor-pointer group"
          >
            <span className="text-xl font-bold tracking-tight text-slate-200 group-hover:text-white">C</span>
            <span className="text-[9px] font-semibold tracking-tight text-slate-400 group-hover:text-slate-300">Limpar</span>
          </button>

          {/* Row 4 Col 2: Number 0 */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-16 rounded-2xl bg-slate-800/90 hover:bg-slate-700/80 active:bg-teal-600 text-xl font-semibold text-white transition-all active:scale-95 shadow-xs flex items-center justify-center"
          >
            0
          </button>

          {/* Row 4 Col 3: Delete / Backspace */}
          <button
            type="button"
            onClick={handleDelete}
            title="Apagar dígito"
            aria-label="Apagar dígito"
            className="h-16 rounded-2xl bg-slate-800/50 hover:bg-slate-700/80 text-slate-300 transition-all active:scale-95 flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Forgot / Reset Security Option */}
        <div className="pt-1 text-center">
          {showForgotConfirm ? (
            <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-2 text-xs">
              <p className="text-slate-300">
                Deseja desativar o bloqueio de segurança e acessar o app?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgotConfirm(false)}
                  className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleResetSecurity}
                  className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-medium"
                >
                  Desativar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowForgotConfirm(true)}
              className="text-[11px] text-slate-400 hover:text-teal-400 transition-colors py-1"
            >
              Esqueci minha senha / Redefinir
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
