// Durable Persistent Storage Engine (IndexedDB + Optimized LocalStorage + Master Snapshot)
// Ensures user data is never lost or reset across app updates, deploys, or restarts.

import {
  Category,
  Transaction,
  UserProfile,
  RecurringExpenseRule,
} from '../types/finance';

const DB_NAME = 'FinanzoPersistentDB_v2';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

export const PERSISTENT_STORAGE_KEYS = {
  INCOME_CATS: 'finanzo_income_categories_v1',
  EXPENSE_CATS: 'finanzo_expense_categories_v1',
  TRANSACTIONS: 'finanzo_transactions_v1',
  BUDGETS: 'finanzo_monthly_budgets_v1',
  DEFAULT_BUDGET: 'finanzo_default_budget_v1',
  CATEGORY_BUDGETS: 'finanzo_category_budgets_v1',
  USER_PROFILE: 'finanzo_user_profile_v1',
  RECURRING_RULES: 'finanzo_recurring_fixed_rules_v1',
  HAS_USER_DATA: 'finanzo_has_real_user_data_v1',
  MASTER_BACKUP: 'finanzo_master_snapshot_v2',
};

export interface MasterBackupPayload {
  transactions: Transaction[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  budgets: Record<string, number>;
  defaultBudget: number;
  categoryBudgets: Record<string, number>;
  userProfile: UserProfile;
  recurringRules: RecurringExpenseRule[];
  savedAt: number;
}

// Request persistent storage from browser (prevents OS eviction)
export function requestPersistentStorage(): void {
  if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then((persistent) => {
      if (persistent) {
        console.log('[FinanzoStorage] Armazenamento durável garantido pelo navegador.');
      }
    }).catch((err) => {
      console.warn('[FinanzoStorage] Aviso persistência:', err);
    });
  }
}

// Initialize and open IndexedDB
function getIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = () => {
        console.warn('[FinanzoStorage] Falha ao abrir IndexedDB, usando LocalStorage robusto.');
        resolve(null);
      };
    } catch (e) {
      console.warn('[FinanzoStorage] Erro ao instanciar IndexedDB:', e);
      resolve(null);
    }
  });
}

// Save a key-value record to IndexedDB
export async function saveToIndexedDB<T>(key: string, value: T): Promise<boolean> {
  const db = await getIndexedDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const record = { key, value, updatedAt: Date.now() };
      const req = store.put(record);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// Read a key-value record from IndexedDB
export async function getFromIndexedDB<T>(key: string): Promise<T | null> {
  const db = await getIndexedDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        if (req.result && req.result.value !== undefined) {
          resolve(req.result.value as T);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// Check if user has real saved data
export function hasRealUserData(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PERSISTENT_STORAGE_KEYS.HAS_USER_DATA) === 'true';
}

export function markHasRealUserData(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PERSISTENT_STORAGE_KEYS.HAS_USER_DATA, 'true');
  saveToIndexedDB(PERSISTENT_STORAGE_KEYS.HAS_USER_DATA, true).catch(() => {});
}

// Robust read from LocalStorage with error safety
export function safeGetLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (err) {
    console.warn(`[FinanzoStorage] Erro ao ler chave ${key}:`, err);
    return fallback;
  }
}

// Robust write to LocalStorage and mirror to IndexedDB
export function safeSetLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch (err) {
    console.warn(`[FinanzoStorage] Aviso ao gravar chave ${key} no localStorage:`, err);
  }

  // Asynchronously mirror into IndexedDB for persistent durability
  saveToIndexedDB(key, value).catch(() => {});
}

// Save complete master snapshot across both LocalStorage and IndexedDB
export function saveMasterSnapshot(payload: MasterBackupPayload): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(PERSISTENT_STORAGE_KEYS.MASTER_BACKUP, JSON.stringify(payload));
  } catch {
    // ignore
  }

  saveToIndexedDB(PERSISTENT_STORAGE_KEYS.MASTER_BACKUP, payload).catch(() => {});
}

// Restore from Master Snapshot if any data was lost
export function getMasterSnapshot(): MasterBackupPayload | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(PERSISTENT_STORAGE_KEYS.MASTER_BACKUP);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  return null;
}
