import React, { useState, useEffect } from 'react';
import { Lock, Delete, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types/finance';
import { verifyPin, removePin } from '../utils/pinSecurity';

interface LockScreenProps {
  onUnlock: () => void;
  profile: UserProfile;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, profile }) => {
  const [digits, setDigits] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [shake, setShake] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);

  const handleDigit = (digit: string) => {
    if (digits.length >= 4) return;
    setErrorMsg('');
    const nextDigits = digits + digit;
    setDigits(nextDigits);

    if (nextDigits.length === 4) {
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
    }
  };

  const handleDelete = () => {
    setErrorMsg('');
    setDigits((prev) => prev.slice(0, -1));
  };

  const handleResetPin = () => {
    removePin();
    onUnlock();
  };

  // Keyboard support for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [digits]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-white p-4 select-none">
      <div className="w-full max-w-xs flex flex-col items-center space-y-6">
        {/* User avatar & lock indicator */}
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
              <span className="text-xl font-bold text-white">
                {profile.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center text-slate-900 shadow-md">
            <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </div>

        {/* Greeting & Prompt */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-white">
            {profile.name}
          </h2>
          <p className="text-xs text-slate-400">
            Digite sua senha de 4 dígitos para acessar
          </p>
        </div>

        {/* 4 PIN Dots */}
        <div
          className={`flex items-center justify-center gap-4 py-2 ${
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
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full pt-2">
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
          <div className="flex items-center justify-center">
            {/* Blank placeholder */}
          </div>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-16 rounded-2xl bg-slate-800/90 hover:bg-slate-700/80 active:bg-teal-600 text-xl font-semibold text-white transition-all active:scale-95 shadow-xs flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            title="Apagar"
            className="h-16 rounded-2xl bg-slate-800/50 hover:bg-slate-700/80 text-slate-300 transition-all active:scale-95 flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Forgot PIN / Reset option */}
        <div className="pt-2 text-center">
          {showForgotConfirm ? (
            <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-2 text-xs">
              <p className="text-slate-300">
                Deseja desativar a senha de 4 dígitos e acessar o app?
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
                  onClick={handleResetPin}
                  className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-medium"
                >
                  Redefinir
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowForgotConfirm(true)}
              className="text-[11px] text-slate-400 hover:text-teal-400 transition-colors py-1"
            >
              Esqueci minha senha
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
