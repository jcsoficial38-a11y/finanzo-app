import { UserProfile } from '../types/finance';
import {
  PERSISTENT_STORAGE_KEYS,
  getMasterSnapshot,
  saveToIndexedDB,
  saveMasterSnapshot,
} from './persistentDatabase';
import { auth, syncUserDataToCloud } from '../services/firebase';

export const USER_PROFILE_STORAGE_KEYS = [
  PERSISTENT_STORAGE_KEYS.USER_PROFILE, // 'finanzo_user_profile_v1'
  'user_profile',
  'userProfile',
  'profile',
  'finanzo_user_profile',
];

export const PROFILE_UPDATE_EVENT = 'finanzo_user_profile_updated';

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'JC',
  login: '@jc',
  avatarUrl: '',
  avatarColor: '#7dd3fc',
  bio: '',
  joinedDate: 'Setembro 2026',
};

/**
 * Calculates correct 2-letter uppercase initials from full name or falls back to 'JC'
 * Examples:
 * - "Julio Cesar" -> "JC"
 * - "JC" -> "JC"
 * - "Julio" -> "JU"
 * - "Usuário" -> "JC" (replaces generic placeholder with real initials)
 */
export function calculateInitials(name?: string, fallback = 'JC'): string {
  if (!name || typeof name !== 'string') return fallback;
  const clean = name.trim();
  if (!clean || clean.toLowerCase() === 'usuário' || clean.toLowerCase() === 'usuario') {
    return fallback;
  }

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0][0];
    const last = parts[parts.length - 1][0];
    return (first + last).toUpperCase();
  }

  return clean.slice(0, 2).toUpperCase() || fallback;
}

/**
 * Read the current profile directly from localStorage, checking all known keys
 * and prioritizing customized real user data over default generic "Usuário".
 */
export function getStoredUserProfile(): UserProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_PROFILE;
  }

  // 1. Look for custom user profile in localStorage across candidate keys
  for (const key of USER_PROFILE_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const isRealName =
            parsed.name &&
            typeof parsed.name === 'string' &&
            parsed.name.trim().length > 0 &&
            parsed.name.trim().toLowerCase() !== 'usuário' &&
            parsed.name.trim().toLowerCase() !== 'usuario';

          const hasPhoto = typeof parsed.avatarUrl === 'string' && parsed.avatarUrl.trim().length > 0;

          if (isRealName || hasPhoto) {
            return {
              name: parsed.name?.trim() || 'JC',
              login: parsed.login?.trim() || '@jc',
              avatarUrl: parsed.avatarUrl || '',
              avatarColor: parsed.avatarColor || '#7dd3fc',
              bio: parsed.bio || '',
              joinedDate: parsed.joinedDate || 'Setembro 2026',
              themeColor: parsed.themeColor,
            };
          }
        }
      }
    } catch {
      // Continue searching next key
    }
  }

  // 2. Check master snapshot for real name/photo
  try {
    const master = getMasterSnapshot();
    if (master?.userProfile) {
      const p = master.userProfile;
      const isRealName =
        p.name &&
        p.name.trim().toLowerCase() !== 'usuário' &&
        p.name.trim().toLowerCase() !== 'usuario';
      const hasPhoto = typeof p.avatarUrl === 'string' && p.avatarUrl.trim().length > 0;

      if (isRealName || hasPhoto) {
        return p;
      }
    }
  } catch {
    // Continue
  }

  // 3. Check Firebase Auth current user if signed in
  try {
    const firebaseUser = auth?.currentUser;
    if (firebaseUser) {
      const authName = firebaseUser.displayName?.trim();
      const authPhoto = firebaseUser.photoURL || '';
      const authLogin = firebaseUser.email ? `@${firebaseUser.email.split('@')[0]}` : '@jc';

      if (authName || authPhoto) {
        return {
          name: authName || 'JC',
          login: authLogin,
          avatarUrl: authPhoto,
          avatarColor: '#7dd3fc',
          bio: '',
          joinedDate: 'Setembro 2026',
        };
      }
    }
  } catch {
    // Continue
  }

  // 4. Return any stored profile or default
  for (const key of USER_PROFILE_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.name) {
          const finalName =
            parsed.name.trim().toLowerCase() === 'usuário' || parsed.name.trim().toLowerCase() === 'usuario'
              ? 'JC'
              : parsed.name.trim();

          return {
            name: finalName,
            login: parsed.login || '@jc',
            avatarUrl: parsed.avatarUrl || '',
            avatarColor: parsed.avatarColor || '#7dd3fc',
            bio: parsed.bio || '',
            joinedDate: parsed.joinedDate || 'Setembro 2026',
          };
        }
      }
    } catch {
      // Continue
    }
  }

  return DEFAULT_USER_PROFILE;
}

/**
 * Persists the user profile synchronously to all storage keys, IndexedDB,
 * dispatches the update event, and triggers background cloud sync.
 */
export function saveStoredUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;

  const sanitized: UserProfile = {
    ...profile,
    name: profile.name.trim() || 'JC',
    login: profile.login.trim() || '@jc',
    avatarUrl: profile.avatarUrl || '',
    avatarColor: profile.avatarColor || '#7dd3fc',
    bio: profile.bio || '',
    joinedDate: profile.joinedDate || 'Setembro 2026',
  };

  const serialized = JSON.stringify(sanitized);

  // 1. Synchronously save to all standard keys
  for (const key of USER_PROFILE_STORAGE_KEYS) {
    try {
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.warn(`[FinanzoProfile] Falha ao gravar chave ${key}:`, e);
    }
  }

  // Direct specific items for ultra-fast lookup
  try {
    localStorage.setItem('finanzo_user_name', sanitized.name);
    if (sanitized.avatarUrl) {
      localStorage.setItem('finanzo_user_avatar', sanitized.avatarUrl);
    } else {
      localStorage.removeItem('finanzo_user_avatar');
    }
  } catch {}

  // 2. Asynchronously mirror into IndexedDB
  saveToIndexedDB(PERSISTENT_STORAGE_KEYS.USER_PROFILE, sanitized).catch(() => {});

  // 3. Update master snapshot
  try {
    const master = getMasterSnapshot();
    if (master) {
      saveMasterSnapshot({
        ...master,
        userProfile: sanitized,
        savedAt: Date.now(),
      });
    }
  } catch {}

  // 4. Dispatch custom event so every component (Header, ProfileModal, LockScreen) updates instantly
  try {
    window.dispatchEvent(
      new CustomEvent(PROFILE_UPDATE_EVENT, {
        detail: sanitized,
      })
    );
  } catch {}

  // 5. If user is logged in to Firebase Firestore, trigger cloud sync
  try {
    const firebaseUser = auth?.currentUser;
    if (firebaseUser) {
      const master = getMasterSnapshot();
      if (master) {
        syncUserDataToCloud(firebaseUser.uid, {
          transactions: master.transactions || [],
          incomeCategories: master.incomeCategories || [],
          expenseCategories: master.expenseCategories || [],
          budgets: master.budgets || {},
          defaultBudget: master.defaultBudget || 3500,
          categoryBudgets: master.categoryBudgets || {},
          userProfile: sanitized,
          recurringRules: master.recurringRules || [],
        }).catch((err) => {
          console.warn('[FinanzoProfile] Erro ao sincronizar perfil com nuvem:', err);
        });
      }
    }
  } catch {}
}
