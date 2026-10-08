export type ThemeId = 'blue' | 'green' | 'black' | 'yellow-black' | 'purple' | 'rose';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  subtitle: string;
  primaryHex: string;
  badgeGradient: string;
  badgeTextColor: string;
  activeNavClass: string;
  fabGradient: string;
  primaryButtonClass: string;
  cardHighlightBorder: string;
  ringClass: string;
  accentBgLight: string;
  accentText: string;
  swatchPreview: string[];
}

export const APP_THEMES: Record<ThemeId, ThemeConfig> = {
  blue: {
    id: 'blue',
    name: 'Azul Moderno',
    subtitle: 'Clássico, confiável e profissional',
    primaryHex: '#0284c7',
    badgeGradient: 'from-teal-400 via-sky-400 to-indigo-400',
    badgeTextColor: 'text-white',
    activeNavClass: 'text-sky-600',
    fabGradient: 'from-slate-900 via-slate-800 to-sky-900',
    primaryButtonClass: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20',
    cardHighlightBorder: 'border-sky-200/80',
    ringClass: 'ring-sky-500',
    accentBgLight: 'bg-sky-50 text-sky-800 border-sky-200',
    accentText: 'text-sky-600',
    swatchPreview: ['#0284c7', '#38bdf8', '#0d9488'],
  },
  green: {
    id: 'green',
    name: 'Verde Esmeralda',
    subtitle: 'Finanças, prosperidade e equilíbrio',
    primaryHex: '#059669',
    badgeGradient: 'from-emerald-400 via-teal-400 to-green-500',
    badgeTextColor: 'text-white',
    activeNavClass: 'text-emerald-600',
    fabGradient: 'from-emerald-950 via-emerald-900 to-teal-800',
    primaryButtonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
    cardHighlightBorder: 'border-emerald-200/80',
    ringClass: 'ring-emerald-500',
    accentBgLight: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    accentText: 'text-emerald-600',
    swatchPreview: ['#059669', '#34d399', '#10b981'],
  },
  black: {
    id: 'black',
    name: 'Preto Minimalista',
    subtitle: 'Visual elegante, grafite e sofisticado',
    primaryHex: '#0f172a',
    badgeGradient: 'from-slate-700 via-slate-800 to-slate-950',
    badgeTextColor: 'text-white',
    activeNavClass: 'text-slate-900',
    fabGradient: 'from-black via-slate-900 to-slate-800',
    primaryButtonClass: 'bg-slate-900 hover:bg-black text-white shadow-slate-900/25',
    cardHighlightBorder: 'border-slate-300',
    ringClass: 'ring-slate-900',
    accentBgLight: 'bg-slate-100 text-slate-900 border-slate-300',
    accentText: 'text-slate-900',
    swatchPreview: ['#0f172a', '#334155', '#64748b'],
  },
  'yellow-black': {
    id: 'yellow-black',
    name: 'Amarelo com Preto',
    subtitle: 'Alto contraste marcante, ouro & carbono',
    primaryHex: '#eab308',
    badgeGradient: 'from-amber-400 via-yellow-500 to-slate-900',
    badgeTextColor: 'text-slate-950',
    activeNavClass: 'text-amber-600',
    fabGradient: 'from-slate-950 via-slate-900 to-amber-600',
    primaryButtonClass: 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold shadow-amber-400/20',
    cardHighlightBorder: 'border-amber-300/80',
    ringClass: 'ring-amber-400',
    accentBgLight: 'bg-amber-50 text-amber-900 border-amber-300',
    accentText: 'text-amber-600',
    swatchPreview: ['#facc15', '#0f172a', '#eab308'],
  },
  purple: {
    id: 'purple',
    name: 'Roxo & Lavanda',
    subtitle: 'Fintech moderna, criatividade e inovação',
    primaryHex: '#7c3aed',
    badgeGradient: 'from-purple-400 via-violet-400 to-indigo-500',
    badgeTextColor: 'text-white',
    activeNavClass: 'text-violet-600',
    fabGradient: 'from-purple-950 via-violet-900 to-indigo-900',
    primaryButtonClass: 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20',
    cardHighlightBorder: 'border-violet-200/80',
    ringClass: 'ring-violet-500',
    accentBgLight: 'bg-violet-50 text-violet-800 border-violet-200',
    accentText: 'text-violet-600',
    swatchPreview: ['#7c3aed', '#a855f7', '#6366f1'],
  },
  rose: {
    id: 'rose',
    name: 'Rosa Suave',
    subtitle: 'Calmo, acolhedor e contemporâneo',
    primaryHex: '#e11d48',
    badgeGradient: 'from-pink-400 via-rose-400 to-orange-400',
    badgeTextColor: 'text-white',
    activeNavClass: 'text-rose-600',
    fabGradient: 'from-slate-950 via-slate-900 to-rose-900',
    primaryButtonClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
    cardHighlightBorder: 'border-rose-200/80',
    ringClass: 'ring-rose-500',
    accentBgLight: 'bg-rose-50 text-rose-800 border-rose-200',
    accentText: 'text-rose-600',
    swatchPreview: ['#e11d48', '#fb7185', '#fda4af'],
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'blue';

export function getThemeConfig(id?: string): ThemeConfig {
  if (id && id in APP_THEMES) {
    return APP_THEMES[id as ThemeId];
  }
  return APP_THEMES[DEFAULT_THEME_ID];
}
