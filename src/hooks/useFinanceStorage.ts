import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Category,
  Transaction,
  MonthSummary,
  ExpenseType,
  CategoryType,
  UserProfile,
  RecurringExpenseRule,
} from '../types/finance';
import {
  INITIAL_INCOME_CATEGORIES,
  INITIAL_EXPENSE_CATEGORIES,
  getInitialTransactions,
  getInitialRecurringRules,
} from '../data/initialData';
import {
  getCurrentMonthKey,
  getPreviousMonthKey,
  getNextMonthKey,
  addMonthsToDate,
} from '../utils/dateUtils';
import {
  PERSISTENT_STORAGE_KEYS,
  safeGetLocalStorage,
  safeSetLocalStorage,
  saveMasterSnapshot,
  getMasterSnapshot,
  hasRealUserData,
  markHasRealUserData,
  requestPersistentStorage,
  getFromIndexedDB,
  addDeletedItemIds,
  getDeletedItemIds,
  isItemDeleted,
} from '../utils/persistentDatabase';
import { getStoredPinData, restorePinFromCloud } from '../utils/pinSecurity';
import { getStoredBiometricData, restoreBiometricFromCloud } from '../utils/biometricSecurity';
import {
  auth,
  subscribeToAuth,
  loginWithGoogle,
  logoutUser,
  syncUserDataToCloud,
  fetchUserDataFromCloud,
  deleteTransactionFromCloud,
  deleteCategoryFromCloud,
  deleteRecurringRuleFromCloud,
  saveProfileAndSecurityToCloud,
  clearAllTransactionsFromCloud,
} from '../services/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

const DEFAULT_MONTHLY_BUDGET = 3500.0;

const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Usuário',
  login: '@usuario',
  avatarUrl: '',
  avatarColor: '#7dd3fc',
  bio: '',
  joinedDate: 'Setembro 2026',
};

const LEGACY_CAT_MAPPING: Record<string, string> = {
  'exp-transporte': 'exp-carro',
  'exp-lazer': 'exp-restaurante',
  'exp-contas': 'exp-internet',
  'exp-tecnologia': 'exp-compras-online',
};

function normalizeCategoryId(id: string): string {
  return LEGACY_CAT_MAPPING[id] || id;
}

export function useFinanceStorage() {
  const [currentMonthKey, setCurrentMonthKey] = useState<string>(() => getCurrentMonthKey());

  // Income Categories - Reads from LocalStorage, with Master Snapshot & Initial fallback
  const [incomeCategories, setIncomeCategories] = useState<Category[]>(() => {
    const stored = safeGetLocalStorage<Category[] | null>(PERSISTENT_STORAGE_KEYS.INCOME_CATS, null);
    if (stored && Array.isArray(stored) && stored.length > 0) return stored;
    const backup = getMasterSnapshot();
    if (backup?.incomeCategories && backup.incomeCategories.length > 0) {
      return backup.incomeCategories;
    }
    return INITIAL_INCOME_CATEGORIES;
  });

  // Expense Categories - Reads from LocalStorage, with Master Snapshot & Initial fallback
  const [expenseCategories, setExpenseCategories] = useState<Category[]>(() => {
    const stored = safeGetLocalStorage<Category[] | null>(PERSISTENT_STORAGE_KEYS.EXPENSE_CATS, null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
    const backup = getMasterSnapshot();
    if (backup?.expenseCategories && backup.expenseCategories.length > 0) {
      return backup.expenseCategories;
    }
    return INITIAL_EXPENSE_CATEGORIES;
  });

  // Transactions - Reads from LocalStorage, with Master Snapshot fallback
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const stored = safeGetLocalStorage<Transaction[] | null>(PERSISTENT_STORAGE_KEYS.TRANSACTIONS, null);
    if (stored && Array.isArray(stored)) {
      return stored.map((t) => ({
        ...t,
        categoryId: normalizeCategoryId(t.categoryId),
      }));
    }
    const backup = getMasterSnapshot();
    if (backup?.transactions && Array.isArray(backup.transactions)) {
      return backup.transactions.map((t) => ({
        ...t,
        categoryId: normalizeCategoryId(t.categoryId),
      }));
    }
    // If user already had data, do NOT regenerate sample data
    if (hasRealUserData()) {
      return [];
    }
    return getInitialTransactions();
  });

  // Budgets map: { '2026-09': 3500 }
  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    const stored = safeGetLocalStorage<Record<string, number> | null>(PERSISTENT_STORAGE_KEYS.BUDGETS, null);
    if (stored && typeof stored === 'object') return stored;
    const backup = getMasterSnapshot();
    if (backup?.budgets) return backup.budgets;
    return {
      [getCurrentMonthKey()]: DEFAULT_MONTHLY_BUDGET,
    };
  });

  const [defaultBudget, setDefaultBudget] = useState<number>(() => {
    const stored = safeGetLocalStorage<number | null>(PERSISTENT_STORAGE_KEYS.DEFAULT_BUDGET, null);
    if (typeof stored === 'number' && !isNaN(stored)) return stored;
    const backup = getMasterSnapshot();
    if (typeof backup?.defaultBudget === 'number') return backup.defaultBudget;
    return DEFAULT_MONTHLY_BUDGET;
  });

  // Category Budgets: { [categoryId]: number }
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(() => {
    const stored = safeGetLocalStorage<Record<string, number> | null>(PERSISTENT_STORAGE_KEYS.CATEGORY_BUDGETS, null);
    if (stored && typeof stored === 'object') return stored;
    const backup = getMasterSnapshot();
    if (backup?.categoryBudgets) return backup.categoryBudgets;
    return {
      'exp-moradia': 1500,
      'exp-mercado': 700,
      'exp-transporte': 250,
      'exp-lazer': 300,
      'exp-contas': 400,
    };
  });

  // User Profile - Exibição Imediata ao abrir o App verificando 'userName' e 'userPhoto' no localStorage
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    let savedName = '';
    let savedPhoto = '';
    if (typeof window !== 'undefined') {
      savedName = localStorage.getItem('userName') || '';
      savedPhoto = localStorage.getItem('userPhoto') || '';
    }

    const stored = safeGetLocalStorage<UserProfile | null>(PERSISTENT_STORAGE_KEYS.USER_PROFILE, null);
    if (stored && typeof stored === 'object' && stored.name) {
      return {
        ...stored,
        name: savedName || stored.name,
        managerName: stored.managerName || savedName || stored.name,
        avatarUrl: savedPhoto || stored.avatarUrl || '',
      };
    }
    const backup = getMasterSnapshot();
    if (backup?.userProfile?.name) {
      return {
        ...backup.userProfile,
        name: savedName || backup.userProfile.name,
        managerName: backup.userProfile.managerName || savedName || backup.userProfile.name,
        avatarUrl: savedPhoto || backup.userProfile.avatarUrl || '',
      };
    }
    if (savedName || savedPhoto) {
      return {
        ...DEFAULT_USER_PROFILE,
        name: savedName || DEFAULT_USER_PROFILE.name,
        managerName: savedName || DEFAULT_USER_PROFILE.managerName,
        avatarUrl: savedPhoto || '',
      };
    }
    return DEFAULT_USER_PROFILE;
  });

  // Recurring Fixed Expenses Rules
  const [recurringRules, setRecurringRules] = useState<RecurringExpenseRule[]>(() => {
    const stored = safeGetLocalStorage<RecurringExpenseRule[] | null>(PERSISTENT_STORAGE_KEYS.RECURRING_RULES, null);
    if (stored && Array.isArray(stored)) {
      return stored.map((r) => ({
        ...r,
        categoryId: normalizeCategoryId(r.categoryId),
      }));
    }
    const backup = getMasterSnapshot();
    if (backup?.recurringRules && Array.isArray(backup.recurringRules)) {
      return backup.recurringRules.map((r) => ({
        ...r,
        categoryId: normalizeCategoryId(r.categoryId),
      }));
    }
    if (hasRealUserData()) {
      return [];
    }
    return getInitialRecurringRules();
  });

  // Firebase Authentication & Cloud Database Sync State
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [cloudSyncState, setCloudSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>(() =>
    auth.currentUser ? 'synced' : 'idle'
  );
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => (auth.currentUser ? new Date() : null));

  // Observador onAuthStateChanged para verificar e reconectar automaticamente se já existe um usuário logado
  // SALVAMENTO AUTOMÁTICO NO LOCALSTORAGE:
  // Assim que detectar o usuário logado do Google, pega user.displayName e user.photoURL e salva no localStorage
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setAuthUser(user);
      if (user) {
        setCloudSyncState('synced');

        const gName = user.displayName;
        const gPhoto = user.photoURL;

        if (gName) {
          localStorage.setItem('userName', gName);
        }
        if (gPhoto) {
          localStorage.setItem('userPhoto', gPhoto);
        }

        setUserProfile((prev) => {
          const finalName = (prev.name && prev.name !== 'Usuário') ? prev.name : (gName || prev.name);
          const finalPhoto = prev.avatarUrl ? prev.avatarUrl : (gPhoto || prev.avatarUrl);
          const finalLogin = user.email || prev.login;

          const updatedProfile: UserProfile = {
            ...prev,
            name: finalName,
            managerName: prev.managerName || finalName,
            avatarUrl: finalPhoto,
            login: finalLogin,
          };

          safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.USER_PROFILE, updatedProfile);
          if (finalName && finalName !== 'Usuário') localStorage.setItem('userName', finalName);
          if (finalPhoto) localStorage.setItem('userPhoto', finalPhoto);

          return updatedProfile;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // 1. Request Browser Durable Storage & Hydrate from IndexedDB if needed
  useEffect(() => {
    requestPersistentStorage();

    const healFromIndexedDB = async () => {
      try {
        const dbTxs = await getFromIndexedDB<Transaction[]>(PERSISTENT_STORAGE_KEYS.TRANSACTIONS);
        if (dbTxs && Array.isArray(dbTxs) && dbTxs.length > 0) {
          setTransactions((prev) => {
            if (prev.length === 0) {
              return dbTxs;
            }
            return prev;
          });
        }

        const dbProfile = await getFromIndexedDB<UserProfile>(PERSISTENT_STORAGE_KEYS.USER_PROFILE);
        if (dbProfile && dbProfile.name) {
          setUserProfile(dbProfile);
        }

        const dbExpCats = await getFromIndexedDB<Category[]>(PERSISTENT_STORAGE_KEYS.EXPENSE_CATS);
        if (dbExpCats && Array.isArray(dbExpCats) && dbExpCats.length > 0) {
          setExpenseCategories(dbExpCats);
        }

        const dbIncCats = await getFromIndexedDB<Category[]>(PERSISTENT_STORAGE_KEYS.INCOME_CATS);
        if (dbIncCats && Array.isArray(dbIncCats) && dbIncCats.length > 0) {
          setIncomeCategories(dbIncCats);
        }

        const dbBudgets = await getFromIndexedDB<Record<string, number>>(PERSISTENT_STORAGE_KEYS.BUDGETS);
        if (dbBudgets) {
          setBudgets(dbBudgets);
        }

        const dbRules = await getFromIndexedDB<RecurringExpenseRule[]>(PERSISTENT_STORAGE_KEYS.RECURRING_RULES);
        if (dbRules && Array.isArray(dbRules) && dbRules.length > 0) {
          setRecurringRules(dbRules);
        }
      } catch (err) {
        console.warn('[FinanzoStorage] Sincronização IndexedDB:', err);
      }
    };

    healFromIndexedDB();
  }, []);

  // 2. Persist with dual-engine (LocalStorage + IndexedDB mirror)
  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.INCOME_CATS, incomeCategories);
  }, [incomeCategories]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.EXPENSE_CATS, expenseCategories);
  }, [expenseCategories]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.TRANSACTIONS, transactions);
  }, [transactions]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.BUDGETS, budgets);
  }, [budgets]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.DEFAULT_BUDGET, defaultBudget);
  }, [defaultBudget]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.CATEGORY_BUDGETS, categoryBudgets);
  }, [categoryBudgets]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.USER_PROFILE, userProfile);
    if (userProfile.name && userProfile.name !== 'Usuário') {
      localStorage.setItem('userName', userProfile.name);
    }
    if (userProfile.avatarUrl) {
      localStorage.setItem('userPhoto', userProfile.avatarUrl);
    }
  }, [userProfile]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.RECURRING_RULES, recurringRules);
  }, [recurringRules]);

  // 3. Continuous Master Snapshot Backup
  useEffect(() => {
    saveMasterSnapshot({
      transactions,
      incomeCategories,
      expenseCategories,
      budgets,
      defaultBudget,
      categoryBudgets,
      userProfile,
      recurringRules,
      savedAt: Date.now(),
    });
  }, [
    transactions,
    incomeCategories,
    expenseCategories,
    budgets,
    defaultBudget,
    categoryBudgets,
    userProfile,
    recurringRules,
  ]);

  // 4. Hydrate from Cloud Database (Firestore) when user signs in or opens the app
  useEffect(() => {
    if (!authUser) return;

    let isMounted = true;
    const hydrateFromCloud = async () => {
      setCloudSyncState('syncing');
      try {
        const cloudData = await fetchUserDataFromCloud(authUser.uid);
        if (!isMounted) return;

        if (cloudData) {
          // 1. Dual Persistence: Restore User Profile & Settings
          if (cloudData.userProfile?.name) {
            const savedName = localStorage.getItem('userName');
            const savedPhoto = localStorage.getItem('userPhoto');

            const restoredProfile: UserProfile = {
              ...cloudData.userProfile,
              name: cloudData.userProfile.name || savedName || 'Usuário',
              managerName: cloudData.userProfile.managerName || cloudData.userProfile.name || savedName || 'Usuário',
              avatarUrl: cloudData.userProfile.avatarUrl || savedPhoto || '',
            };

            setUserProfile(restoredProfile);
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.USER_PROFILE, restoredProfile);
            if (restoredProfile.name && restoredProfile.name !== 'Usuário') {
              localStorage.setItem('userName', restoredProfile.name);
            }
            if (restoredProfile.avatarUrl) {
              localStorage.setItem('userPhoto', restoredProfile.avatarUrl);
            }
          }

          // 2. Dual Persistence: Restore PIN & Biometrics
          if (cloudData.security) {
            restorePinFromCloud(cloudData.security.pin, cloudData.security.pinEnabled);
            restoreBiometricFromCloud(cloudData.security);
          }

          // 3. Sync Tombstone Deleted IDs
          if (cloudData.deletedItemIds && cloudData.deletedItemIds.length > 0) {
            addDeletedItemIds(cloudData.deletedItemIds);
          }

          const deletedSet = new Set(getDeletedItemIds());

          // 4. Filter cloud items against deleted set to ensure deleted items NEVER resurrect
          const validCloudTxs = (cloudData.transactions || []).filter((t) => !deletedSet.has(t.id));
          const validIncomeCats = (cloudData.incomeCategories || []).filter((c) => !deletedSet.has(c.id));
          const validExpenseCats = (cloudData.expenseCategories || []).filter((c) => !deletedSet.has(c.id));
          const validRules = (cloudData.recurringRules || []).filter((r) => !deletedSet.has(r.id));

          // 5. Intelligent Merge without overwriting user data with sample/initial data
          if (validCloudTxs.length > 0 || hasRealUserData()) {
            setTransactions((localTxs) => {
              const cloudMap = new Map(validCloudTxs.map((t) => [t.id, t]));
              for (const loc of localTxs) {
                if (!deletedSet.has(loc.id) && !cloudMap.has(loc.id)) {
                  cloudMap.set(loc.id, loc);
                }
              }
              const merged = Array.from(cloudMap.values());
              return merged.length > 0 ? merged : localTxs.filter((t) => !deletedSet.has(t.id));
            });
          }

          if (validIncomeCats.length > 0) {
            setIncomeCategories(validIncomeCats);
          }
          if (validExpenseCats.length > 0) {
            setExpenseCategories(validExpenseCats);
          }
          if (cloudData.budgets && Object.keys(cloudData.budgets).length > 0) {
            setBudgets(cloudData.budgets);
          }
          if (typeof cloudData.defaultBudget === 'number') {
            setDefaultBudget(cloudData.defaultBudget);
          }
          if (cloudData.categoryBudgets && Object.keys(cloudData.categoryBudgets).length > 0) {
            setCategoryBudgets(cloudData.categoryBudgets);
          }
          if (validRules.length > 0) {
            setRecurringRules(validRules);
          }

          // 6. If cloud was completely empty for this user, upload existing local data with security & profile
          if (validCloudTxs.length === 0 && transactions.length > 0) {
            const pinData = getStoredPinData();
            const bioData = getStoredBiometricData();
            await syncUserDataToCloud(authUser.uid, {
              transactions: transactions.filter((t) => !deletedSet.has(t.id)),
              incomeCategories,
              expenseCategories,
              budgets,
              defaultBudget,
              categoryBudgets,
              userProfile: {
                ...userProfile,
                name: authUser.displayName || userProfile.name,
                avatarUrl: authUser.photoURL || userProfile.avatarUrl,
              },
              recurringRules,
              security: {
                pin: pinData.pin,
                pinEnabled: pinData.isEnabled,
                biometricEnabled: bioData.isEnabled,
                biometricRegistered: bioData.isRegistered,
                biometricType: bioData.type,
                biometricDate: bioData.registeredDate,
                biometricCredentialId: bioData.keyId,
              },
              deletedItemIds: getDeletedItemIds(),
            });
          }
        }
        setCloudSyncState('synced');
        setLastSyncTime(new Date());
      } catch (err) {
        console.warn('[FinanzoStorage] Sincronização inicial com nuvem:', err);
        setCloudSyncState('error');
      }
    };

    hydrateFromCloud();

    return () => {
      isMounted = false;
    };
  }, [authUser?.uid]);

  // 5. Auto-sync to Cloud (Debounced to avoid quota waste)
  useEffect(() => {
    if (!authUser) return;

    const timer = setTimeout(async () => {
      try {
        setCloudSyncState('syncing');
        const pinData = getStoredPinData();
        const bioData = getStoredBiometricData();
        const deletedIds = getDeletedItemIds();

        await syncUserDataToCloud(authUser.uid, {
          transactions: transactions.filter((t) => !deletedIds.includes(t.id)),
          incomeCategories: incomeCategories.filter((c) => !deletedIds.includes(c.id)),
          expenseCategories: expenseCategories.filter((c) => !deletedIds.includes(c.id)),
          budgets,
          defaultBudget,
          categoryBudgets,
          userProfile,
          recurringRules: recurringRules.filter((r) => !deletedIds.includes(r.id)),
          security: {
            pin: pinData.pin,
            pinEnabled: pinData.isEnabled,
            biometricEnabled: bioData.isEnabled,
            biometricRegistered: bioData.isRegistered,
            biometricType: bioData.type,
            biometricDate: bioData.registeredDate,
            biometricCredentialId: bioData.keyId,
          },
          deletedItemIds: deletedIds,
        });
        setCloudSyncState('synced');
        setLastSyncTime(new Date());
      } catch (err) {
        console.warn('[FinanzoStorage] Falha no auto-sync da nuvem:', err);
        setCloudSyncState('error');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    authUser?.uid,
    transactions,
    incomeCategories,
    expenseCategories,
    budgets,
    defaultBudget,
    categoryBudgets,
    userProfile,
    recurringRules,
  ]);

  // Automatically project recurring fixed expenses to all future months (up to 24 months ahead)
  // Only runs when recurringRules changes (instantaneous and lag-free month switching)
  useEffect(() => {
    setTransactions((prevTransactions) => {
      // Fast Set lookup of existing transactions: `${recurringGroupId}_${monthKey}` and `id`
      const existingKeys = new Set<string>();
      for (const t of prevTransactions) {
        if (t.recurringGroupId && t.monthKey) {
          existingKeys.add(`${t.recurringGroupId}_${t.monthKey}`);
        }
        existingKeys.add(t.id);
      }

      let changed = false;
      const newTxs: Transaction[] = [];

      for (const rule of recurringRules) {
        for (let m = 0; m <= 24; m++) {
          const { monthKey: targetMonthKey } = addMonthsToDate(`${rule.startMonthKey}-01`, m);

          // If rule starts after this target month, don't project
          if (rule.startMonthKey > targetMonthKey) continue;
          // If rule ended before this target month, don't project
          if (rule.endMonthKey && targetMonthKey > rule.endMonthKey) continue;
          // If user deleted this specific month independently, don't project
          if (rule.excludedMonthKeys && rule.excludedMonthKeys.includes(targetMonthKey)) continue;

          const key = `${rule.id}_${targetMonthKey}`;
          const id = `tx-rec-${rule.id}-${targetMonthKey}`;

          if (!existingKeys.has(key) && !existingKeys.has(id)) {
            const [yearStr, monthStr] = targetMonthKey.split('-');
            const yearNum = parseInt(yearStr, 10);
            const monthNum = parseInt(monthStr, 10);
            const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
            const day = Math.min(Math.max(1, rule.dayOfMonth || 1), daysInMonth);
            const actualDate = `${targetMonthKey}-${String(day).padStart(2, '0')}`;

            newTxs.push({
              id,
              name: rule.name,
              amount: rule.amount,
              date: actualDate,
              monthKey: targetMonthKey,
              kind: 'expense',
              categoryId: rule.categoryId,
              expenseType: 'fixed',
              isRecurring: true,
              recurringGroupId: rule.id,
              notes: rule.notes,
              createdAt: rule.createdAt || (Date.now() + m),
            });
            existingKeys.add(key);
            existingKeys.add(id);
            changed = true;
          }
        }
      }

      // Also ensure any orphan fixed expense from older data without a rule gets a rule registered
      for (const t of prevTransactions) {
        if (t.kind === 'expense' && t.expenseType === 'fixed' && t.monthKey && !t.recurringGroupId) {
          const groupId = `rec-fixed-${t.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          t.recurringGroupId = groupId;
          t.isRecurring = true;
          changed = true;
          setRecurringRules((currentRules) => {
            if (!currentRules.some((r) => r.id === groupId || r.name.toLowerCase() === t.name.toLowerCase())) {
              return [
                ...currentRules,
                {
                  id: groupId,
                  name: t.name,
                  amount: t.amount,
                  categoryId: t.categoryId,
                  dayOfMonth: parseInt(t.date.split('-')[2], 10) || 1,
                  startMonthKey: t.monthKey,
                  notes: t.notes,
                  createdAt: t.createdAt,
                },
              ];
            }
            return currentRules;
          });
        }
      }

      if (changed && newTxs.length > 0) {
        return [...newTxs, ...prevTransactions];
      }
      return prevTransactions;
    });
  }, [recurringRules]);

  // Current month budget
  const currentMonthBudget = useMemo(() => {
    if (typeof budgets[currentMonthKey] === 'number') {
      return budgets[currentMonthKey];
    }
    return defaultBudget;
  }, [budgets, currentMonthKey, defaultBudget]);

  // Filter transactions for current month
  const currentMonthTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.monthKey === currentMonthKey)
      .sort((a, b) => {
        // Sort descending by date, then by creation
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.createdAt - a.createdAt;
      });
  }, [transactions, currentMonthKey]);

  // Month Summary calculation
  const monthSummary = useMemo<MonthSummary>(() => {
    let totalIncome = 0;
    let totalFixed = 0;
    let totalVariable = 0;
    let totalInstallment = 0;

    for (const t of currentMonthTransactions) {
      if (t.kind === 'income') {
        totalIncome += t.amount;
      } else if (t.kind === 'expense') {
        if (t.expenseType === 'fixed') {
          totalFixed += t.amount;
        } else if (t.expenseType === 'variable') {
          totalVariable += t.amount;
        } else if (t.expenseType === 'installment') {
          totalInstallment += t.amount;
        } else {
          // fallback
          totalVariable += t.amount;
        }
      }
    }

    const totalExpenses = totalFixed + totalVariable + totalInstallment;
    const remainingBudget = currentMonthBudget - totalExpenses;
    const netBalance = totalIncome - totalExpenses;

    return {
      budget: currentMonthBudget,
      totalIncome,
      totalFixed,
      totalVariable,
      totalInstallment,
      totalExpenses,
      remainingBudget,
      netBalance,
    };
  }, [currentMonthTransactions, currentMonthBudget]);

  // Navigation handlers
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonthKey((prev) => getPreviousMonthKey(prev));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonthKey((prev) => getNextMonthKey(prev));
  }, []);

  // Budget management
  const setMonthBudget = useCallback((monthKey: string, amount: number, setAsDefault = false) => {
    markHasRealUserData();
    setBudgets((prev) => ({
      ...prev,
      [monthKey]: amount,
    }));
    if (setAsDefault) {
      setDefaultBudget(amount);
    }
  }, []);

  // Category management
  const addCategory = useCallback((categoryData: Omit<Category, 'id'>) => {
    markHasRealUserData();
    const id = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newCategory: Category = {
      ...categoryData,
      id,
    };

    if (categoryData.type === 'income') {
      setIncomeCategories((prev) => [...prev, newCategory]);
    } else {
      setExpenseCategories((prev) => [...prev, newCategory]);
    }
    return newCategory;
  }, []);

  const updateCategory = useCallback((categoryId: string, updates: Partial<Category>) => {
    markHasRealUserData();
    setIncomeCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, ...updates } : c))
    );
    setExpenseCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, ...updates } : c))
    );
  }, []);

  const deleteCategory = useCallback((categoryId: string, type: CategoryType) => {
    markHasRealUserData();
    addDeletedItemIds(categoryId);

    const uid = authUser?.uid || auth.currentUser?.uid;
    if (uid) {
      deleteCategoryFromCloud(uid, categoryId).catch(() => {});
    }

    if (type === 'income') {
      setIncomeCategories((prev) => prev.filter((c) => c.id !== categoryId));
    } else {
      setExpenseCategories((prev) => prev.filter((c) => c.id !== categoryId));
    }
  }, [authUser]);

  const setCategoryBudget = useCallback((categoryId: string, amount: number) => {
    markHasRealUserData();
    setCategoryBudgets((prev) => ({
      ...prev,
      [categoryId]: Math.max(0, amount),
    }));
  }, []);

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    markHasRealUserData();
    setUserProfile((prev) => {
      const next: UserProfile = {
        ...prev,
        ...updates,
      };
      safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.USER_PROFILE, next);
      if (next.name && next.name !== 'Usuário') {
        localStorage.setItem('userName', next.name);
      }
      if (next.avatarUrl) {
        localStorage.setItem('userPhoto', next.avatarUrl);
      }

      // Dual persistence: save immediately to Firestore users/{userId} if user is logged in
      const uid = authUser?.uid || auth.currentUser?.uid;
      if (uid) {
        const pinData = getStoredPinData();
        const bioData = getStoredBiometricData();
        saveProfileAndSecurityToCloud(uid, next, {
          pin: pinData.pin,
          pinEnabled: pinData.isEnabled,
          biometricEnabled: bioData.isEnabled,
          biometricRegistered: bioData.isRegistered,
          biometricType: bioData.type,
          biometricDate: bioData.registeredDate,
          biometricCredentialId: bioData.keyId,
        }).catch((err) => console.warn('[FinanzoStorage] Falha ao persistir perfil na nuvem:', err));
      }

      return next;
    });
  }, [authUser]);

  // Transaction creation
  const addTransaction = useCallback(
    (params: {
      name: string;
      amount: number;
      date: string;
      kind: CategoryType;
      categoryId: string;
      expenseType?: ExpenseType;
      isRecurring?: boolean;
      installmentsCount?: number;
      isTotalAmount?: boolean;
      notes?: string;
    }) => {
      const {
        name,
        amount,
        date,
        kind,
        categoryId,
        expenseType = 'variable',
        isRecurring = false,
        installmentsCount = 1,
        isTotalAmount = false,
        notes,
      } = params;

      const baseMonthKey = date.slice(0, 7);

      // Handle normal transaction (Income, or Non-installment expense)
      if (kind === 'income' || expenseType !== 'installment' || installmentsCount <= 1) {
        let recurringGroupId: string | undefined = undefined;

        // If it's a fixed recurring expense, create the recurring rule and project immediately to next 24 months
        if (kind === 'expense' && (expenseType === 'fixed' || isRecurring)) {
          recurringGroupId = `rec-grp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const day = parseInt(date.split('-')[2], 10) || 1;
          const newRule: RecurringExpenseRule = {
            id: recurringGroupId,
            name,
            amount: Math.abs(amount),
            categoryId,
            dayOfMonth: day,
            startMonthKey: baseMonthKey,
            notes,
            createdAt: Date.now(),
          };
          setRecurringRules((prev) => [...prev, newRule]);

          const createdFixedTxs: Transaction[] = [];
          for (let m = 0; m <= 24; m++) {
            const { date: fDate, monthKey: fMonthKey } = addMonthsToDate(date, m);
            createdFixedTxs.push({
              id: m === 0
                ? `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
                : `tx-rec-${recurringGroupId}-${fMonthKey}`,
              name,
              amount: Math.abs(amount),
              date: fDate,
              monthKey: fMonthKey,
              kind: 'expense',
              categoryId,
              expenseType: 'fixed',
              isRecurring: true,
              recurringGroupId,
              notes,
              createdAt: Date.now() + m,
            });
          }

          setTransactions((prev) => [...createdFixedTxs, ...prev]);
          return createdFixedTxs;
        }

        const newTx: Transaction = {
          id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name,
          amount: Math.abs(amount),
          date,
          monthKey: baseMonthKey,
          kind,
          categoryId,
          expenseType: kind === 'expense' ? expenseType : undefined,
          isRecurring: Boolean(isRecurring && kind === 'expense' && expenseType === 'fixed'),
          recurringGroupId,
          notes,
          createdAt: Date.now(),
        };

        setTransactions((prev) => [newTx, ...prev]);
        markHasRealUserData();
        return [newTx];
      }

      // Handle Installment Expense (repeated in subsequent months)
      markHasRealUserData();
      const count = Math.max(2, installmentsCount);
      const installmentAmount = isTotalAmount
        ? Number((amount / count).toFixed(2))
        : amount;

      const installmentGroupId = `inst-grp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const createdTxs: Transaction[] = [];

      for (let i = 0; i < count; i++) {
        const { date: instDate, monthKey: instMonthKey } = addMonthsToDate(date, i);
        const tx: Transaction = {
          id: `tx-inst-${installmentGroupId}-${i + 1}`,
          name: `${name} (${i + 1}/${count})`,
          amount: installmentAmount,
          date: instDate,
          monthKey: instMonthKey,
          kind: 'expense',
          categoryId,
          expenseType: 'installment',
          installmentGroupId,
          installmentIndex: i + 1,
          installmentTotal: count,
          notes,
          createdAt: Date.now() + i,
        };
        createdTxs.push(tx);
      }

      setTransactions((prev) => [...createdTxs, ...prev]);
      return createdTxs;
    },
    []
  );

  // Transaction update (allows editing amount and details independently per month)
  const updateTransaction = useCallback(
    (
      transactionId: string,
      updates: Partial<Transaction>,
      applyToFutureRecurring = false
    ) => {
      let targetRecurringGroupId: string | undefined;

      setTransactions((prev) => {
        const target = prev.find((t) => t.id === transactionId);
        if (!target) return prev;
        targetRecurringGroupId = target.recurringGroupId;

        return prev.map((t) => {
          if (t.id === transactionId) {
            return { ...t, ...updates };
          }
          // If requested, also apply new name/amount/category to subsequent future months of the same recurring series
          if (
            applyToFutureRecurring &&
            target.recurringGroupId &&
            t.recurringGroupId === target.recurringGroupId &&
            t.monthKey > target.monthKey
          ) {
            return {
              ...t,
              name: updates.name !== undefined ? updates.name : t.name,
              amount: updates.amount !== undefined ? updates.amount : t.amount,
              categoryId: updates.categoryId !== undefined ? updates.categoryId : t.categoryId,
            };
          }
          return t;
        });
      });

      // Also update the recurring rule template if requested
      if (applyToFutureRecurring) {
        setRecurringRules((rules) => {
          if (!targetRecurringGroupId) {
            const found = transactions.find((t) => t.id === transactionId);
            targetRecurringGroupId = found?.recurringGroupId;
          }
          if (!targetRecurringGroupId) return rules;

          return rules.map((r) =>
            r.id === targetRecurringGroupId
              ? {
                  ...r,
                  name: updates.name ?? r.name,
                  amount: updates.amount !== undefined ? updates.amount : r.amount,
                  categoryId: updates.categoryId ?? r.categoryId,
                }
              : r
          );
        });
      }
      markHasRealUserData();
    },
    [transactions]
  );

  // Transaction deletion with immediate local + cloud deletion & tombstone tracking
  const deleteTransaction = useCallback(
    (
      transactionId: string,
      options?: {
        deleteAllInstallments?: boolean;
        deleteRecurringMode?: 'single' | 'future';
      }
    ) => {
      markHasRealUserData();
      const { deleteAllInstallments = false, deleteRecurringMode = 'single' } = options || {};
      const uid = authUser?.uid || auth.currentUser?.uid;

      setTransactions((prev) => {
        const target = prev.find((t) => t.id === transactionId);
        if (!target) return prev;

        // 1. Handle Installments deletion
        if (deleteAllInstallments && target.installmentGroupId) {
          const matching = prev.filter((t) => t.installmentGroupId === target.installmentGroupId);
          const idsToDelete = matching.map((t) => t.id);
          addDeletedItemIds(idsToDelete);

          if (uid) {
            for (const id of idsToDelete) {
              deleteTransactionFromCloud(uid, id).catch(() => {});
            }
          }

          return prev.filter((t) => t.installmentGroupId !== target.installmentGroupId);
        }

        // 2. Handle Recurring Fixed Expense deletion
        if (target.recurringGroupId) {
          if (deleteRecurringMode === 'future') {
            const futureTxs = prev.filter(
              (t) =>
                t.recurringGroupId === target.recurringGroupId &&
                t.monthKey >= target.monthKey
            );
            const futureIds = futureTxs.map((t) => t.id);
            addDeletedItemIds(futureIds);

            if (uid) {
              for (const id of futureIds) {
                deleteTransactionFromCloud(uid, id).catch(() => {});
              }
            }

            // Stop recurrence from this month onwards
            setRecurringRules((rules) =>
              rules.map((r) => {
                if (r.id === target.recurringGroupId) {
                  const prevMonth = getPreviousMonthKey(target.monthKey);
                  return { ...r, endMonthKey: prevMonth };
                }
                return r;
              })
            );

            return prev.filter(
              (t) =>
                !(
                  t.recurringGroupId === target.recurringGroupId &&
                  t.monthKey >= target.monthKey
                )
            );
          } else {
            // 'single': Only exclude this specific month
            addDeletedItemIds(transactionId);
            if (uid) {
              deleteTransactionFromCloud(uid, transactionId).catch(() => {});
            }

            setRecurringRules((rules) =>
              rules.map((r) => {
                if (r.id === target.recurringGroupId) {
                  const excluded = r.excludedMonthKeys || [];
                  if (!excluded.includes(target.monthKey)) {
                    return { ...r, excludedMonthKeys: [...excluded, target.monthKey] };
                  }
                }
                return r;
              })
            );

            return prev.filter((t) => t.id !== transactionId);
          }
        }

        // 3. Regular transaction deletion
        addDeletedItemIds(transactionId);
        if (uid) {
          deleteTransactionFromCloud(uid, transactionId).catch(() => {});
        }
        return prev.filter((t) => t.id !== transactionId);
      });
    },
    [authUser]
  );

  // Clear all transactions history (Zerar Histórico de Transações / Limpar Dados Salvos)
  // Zera todo o histórico de lançamentos locais para 0 transações, mantendo perfil, categorias e senhas
  const clearAllTransactions = useCallback(() => {
    // Collect all transaction IDs to add to tombstones
    const allIds = transactions.map((t) => t.id);
    const ruleIds = recurringRules.map((r) => r.id);
    addDeletedItemIds([...allIds, ...ruleIds]);

    // 1. Clear in-memory transactions and recurring rules
    setTransactions([]);
    setRecurringRules([]);

    // 2. Clear persisted transactions and recurring rules in LocalStorage and IndexedDB
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.TRANSACTIONS, []);
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.RECURRING_RULES, []);

    // 3. Mark that user has interacted with data so sample transactions are never re-populated
    markHasRealUserData();

    // 4. Update master snapshot with empty transactions list, keeping user profile, categories and budgets
    saveMasterSnapshot({
      transactions: [],
      recurringRules: [],
      incomeCategories,
      expenseCategories,
      budgets,
      defaultBudget,
      categoryBudgets,
      userProfile,
      savedAt: Date.now(),
    });

    // 5. Clear from cloud if logged in
    const uid = authUser?.uid || auth.currentUser?.uid;
    if (uid) {
      clearAllTransactionsFromCloud(uid).catch(() => {});
    }
  }, [authUser, transactions, recurringRules, incomeCategories, expenseCategories, budgets, defaultBudget, categoryBudgets, userProfile]);

  // Manual Trigger to sync immediately with Cloud
  const syncNow = useCallback(async (targetUserId?: string) => {
    const uid = targetUserId || authUser?.uid || auth.currentUser?.uid;
    if (!uid) {
      return loginWithGoogle();
    }
    setCloudSyncState('syncing');
    try {
      const pinData = getStoredPinData();
      const bioData = getStoredBiometricData();
      const deletedItemIds = getDeletedItemIds();
      const deletedSet = new Set(deletedItemIds);

      await syncUserDataToCloud(uid, {
        transactions: transactions.filter((t) => !deletedSet.has(t.id)),
        incomeCategories: incomeCategories.filter((c) => !deletedSet.has(c.id)),
        expenseCategories: expenseCategories.filter((c) => !deletedSet.has(c.id)),
        budgets,
        defaultBudget,
        categoryBudgets,
        userProfile,
        recurringRules: recurringRules.filter((r) => !deletedSet.has(r.id)),
        deletedItemIds,
        security: {
          pin: pinData.pin,
          pinEnabled: pinData.isEnabled,
          biometricEnabled: bioData.isEnabled,
          biometricRegistered: bioData.isRegistered,
          biometricType: bioData.type,
          biometricDate: bioData.registeredDate,
          biometricCredentialId: bioData.keyId,
        },
      });
      setCloudSyncState('synced');
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('[FinanzoStorage] Erro no sync manual:', err);
      setCloudSyncState('error');
    }
  }, [authUser, transactions, incomeCategories, expenseCategories, budgets, defaultBudget, categoryBudgets, userProfile, recurringRules]);

  // Protected reset handler (Anti-reset safeguard: protects user data from any automated wipe)
  const resetToInitialData = useCallback(() => {
    console.warn('[FinanzoStorage] Prevenção de Reset ativa: dados do usuário preservados.');
  }, []);

  // Restore complete backup
  const restoreFromBackup = useCallback((backup: any) => {
    if (backup.incomeCategories && Array.isArray(backup.incomeCategories)) {
      setIncomeCategories(backup.incomeCategories);
    }
    if (backup.expenseCategories && Array.isArray(backup.expenseCategories)) {
      setExpenseCategories(backup.expenseCategories);
    }
    if (backup.transactions && Array.isArray(backup.transactions)) {
      setTransactions(backup.transactions);
    }
    if (backup.recurringRules && Array.isArray(backup.recurringRules)) {
      setRecurringRules(backup.recurringRules);
    }
    if (backup.budgets && typeof backup.budgets === 'object') {
      setBudgets(backup.budgets);
    }
    if (backup.categoryBudgets && typeof backup.categoryBudgets === 'object') {
      setCategoryBudgets(backup.categoryBudgets);
    }
    if (typeof backup.defaultBudget === 'number') {
      setDefaultBudget(backup.defaultBudget);
    }
    if (backup.userProfile && typeof backup.userProfile === 'object') {
      setUserProfile(backup.userProfile);
    }
  }, []);

  return {
    currentMonthKey,
    setCurrentMonthKey,
    goToPreviousMonth,
    goToNextMonth,
    incomeCategories,
    expenseCategories,
    transactions,
    currentMonthTransactions,
    currentMonthBudget,
    budgets,
    defaultBudget,
    categoryBudgets,
    userProfile,
    recurringRules,
    updateUserProfile,
    setMonthBudget,
    setCategoryBudget,
    monthSummary,
    addCategory,
    updateCategory,
    deleteCategory,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    clearAllTransactions,
    resetToInitialData,
    restoreFromBackup,
    authUser,
    cloudSyncState,
    lastSyncTime,
    loginWithGoogle,
    logoutUser,
    syncNow,
  };
}
