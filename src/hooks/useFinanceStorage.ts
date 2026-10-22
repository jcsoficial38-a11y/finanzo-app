import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Category,
  Transaction,
  TrashTransaction,
  MonthSummary,
  ExpenseType,
  CategoryType,
  UserProfile,
  RecurringExpenseRule,
} from '../types/finance';
import { getStoredPinData, restorePinFromCloud } from '../utils/pinSecurity';
import { getStoredBiometricData, restoreBiometricFromCloud } from '../utils/biometricSecurity';
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
  saveToIndexedDB,
  recoverAllLocalTransactions,
  deduplicateTransactions,
  clearAllIndexedDB,
  clearAllFinanzoLocalStorage,
  addDeletedItemIds,
  removeDeletedItemIds,
  getDeletedItemIds,
  isItemDeleted,
  generateUniqueId,
} from '../utils/persistentDatabase';
import {
  subscribeToAuth,
  loginWithGoogle,
  logoutUser,
  syncUserDataToCloud,
  fetchUserDataFromCloud,
  deleteTransactionFromCloud,
  clearAllTransactionsFromCloud,
  resetAllUserDataFromCloud,
  checkRedirectResult,
  saveBudgetAndIncomeToCloud,
} from '../services/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  getStoredUserProfile,
  saveStoredUserProfile,
  PROFILE_UPDATE_EVENT,
  DEFAULT_USER_PROFILE,
} from '../utils/userProfileManager';
import {
  getGoogleDriveAccessToken,
  findAppDataBackupFile,
  downloadAppDataBackup,
  uploadAppDataBackup,
  GoogleDriveBackupPayload,
} from '../services/googleDriveService';

const DEFAULT_MONTHLY_BUDGET = 3500.0;


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

  // Transactions - Reads from LocalStorage, Master Snapshot & Local Recovery scan
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const recovered = recoverAllLocalTransactions();
    const stored = safeGetLocalStorage<Transaction[] | null>(PERSISTENT_STORAGE_KEYS.TRANSACTIONS, null);
    const backup = getMasterSnapshot();

    const mergedMap = new Map<string, Transaction>();
    if (recovered && recovered.length > 0) {
      for (const t of recovered) {
        mergedMap.set(t.id, t);
      }
    }
    if (stored && Array.isArray(stored)) {
      for (const t of stored) {
        mergedMap.set(t.id, {
          ...t,
          categoryId: normalizeCategoryId(t.categoryId),
        });
      }
    }
    if (backup?.transactions && Array.isArray(backup.transactions)) {
      for (const t of backup.transactions) {
        mergedMap.set(t.id, {
          ...t,
          categoryId: normalizeCategoryId(t.categoryId),
        });
      }
    }
    const validTxs = deduplicateTransactions(Array.from(mergedMap.values()));
    return validTxs.sort((a, b) => b.createdAt - a.createdAt);
  });

  // Local Trash (Lixeira Local no Armazenamento Interno)
  const [trashTransactions, setTrashTransactions] = useState<TrashTransaction[]>(() => {
    const stored = safeGetLocalStorage<TrashTransaction[] | null>(PERSISTENT_STORAGE_KEYS.TRASH_TRANSACTIONS, null);
    if (stored && Array.isArray(stored)) {
      return stored;
    }
    return [];
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

  // Monthly Incomes map: { '2026-10': 5000 }
  const [monthlyIncomes, setMonthlyIncomes] = useState<Record<string, number>>(() => {
    const stored = safeGetLocalStorage<Record<string, number> | null>(PERSISTENT_STORAGE_KEYS.MONTHLY_INCOMES, null);
    if (stored && typeof stored === 'object') return stored;
    const backup = getMasterSnapshot();
    if (backup?.monthlyIncomes && typeof backup.monthlyIncomes === 'object') return backup.monthlyIncomes;
    return {};
  });

  const [defaultIncome, setDefaultIncome] = useState<number>(() => {
    const stored = safeGetLocalStorage<number | null>(PERSISTENT_STORAGE_KEYS.DEFAULT_INCOME, null);
    if (typeof stored === 'number' && !isNaN(stored)) return stored;
    const backup = getMasterSnapshot();
    if (typeof backup?.defaultIncome === 'number') return backup.defaultIncome;
    return 0;
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

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    return getStoredUserProfile();
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
    return [];
  });

  // Firebase Authentication & Cloud Database Sync State
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [cloudSyncState, setCloudSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Google Drive API (appDataFolder) Sync State
  const [driveSyncState, setDriveSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');
  const [lastDriveSyncTime, setLastDriveSyncTime] = useState<Date | null>(null);

  // Subscribe to Firebase Auth
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setAuthUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Captura do resultado de redirecionamento do Google OAuth (signInWithRedirect) no carregamento inicial
  useEffect(() => {
    checkRedirectResult()
      .then((user) => {
        if (user) {
          console.log('[useFinanceStorage] Usuário autenticado pós-redirect Google:', user.email);
          setAuthUser(user);
        }
      })
      .catch((err) => {
        console.warn('[useFinanceStorage] Erro ao recuperar redirect auth:', err);
      });
  }, []);

  // 1. Request Browser Durable Storage & Hydrate from IndexedDB if needed
  useEffect(() => {
    requestPersistentStorage();

    const healFromIndexedDB = async () => {
      try {
        const dbTxs = await getFromIndexedDB<Transaction[]>(PERSISTENT_STORAGE_KEYS.TRANSACTIONS);
        if (dbTxs && Array.isArray(dbTxs) && dbTxs.length > 0) {
          setTransactions((prev) => {
            const stored = safeGetLocalStorage<Transaction[] | null>(PERSISTENT_STORAGE_KEYS.TRANSACTIONS, null);
            if (stored && Array.isArray(stored) && stored.length === 0) {
              return [];
            }
            if (prev.length === 0 && !hasRealUserData()) {
              return dbTxs;
            }
            return prev;
          });
        }

        const dbProfile = await getFromIndexedDB<UserProfile>(PERSISTENT_STORAGE_KEYS.USER_PROFILE);
        if (dbProfile && dbProfile.name) {
          const isGeneric =
            dbProfile.name.trim().toLowerCase() === 'usuário' ||
            dbProfile.name.trim().toLowerCase() === 'usuario';
          if (!isGeneric || dbProfile.avatarUrl) {
            setUserProfile((prev) => {
              const isPrevGeneric =
                !prev.name ||
                prev.name.trim().toLowerCase() === 'usuário' ||
                prev.name.trim().toLowerCase() === 'usuario';
              if (!isPrevGeneric && isGeneric) {
                return {
                  ...prev,
                  avatarUrl: prev.avatarUrl || dbProfile.avatarUrl || '',
                };
              }
              return dbProfile;
            });
          }
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
        if (dbBudgets && typeof dbBudgets === 'object' && Object.keys(dbBudgets).length > 0) {
          setBudgets((prev) => ({ ...dbBudgets, ...prev }));
        }

        const dbDefBudget = await getFromIndexedDB<number>(PERSISTENT_STORAGE_KEYS.DEFAULT_BUDGET);
        if (typeof dbDefBudget === 'number' && !isNaN(dbDefBudget) && dbDefBudget > 0) {
          setDefaultBudget(dbDefBudget);
        }

        const dbIncomes = await getFromIndexedDB<Record<string, number>>(PERSISTENT_STORAGE_KEYS.MONTHLY_INCOMES);
        if (dbIncomes && typeof dbIncomes === 'object' && Object.keys(dbIncomes).length > 0) {
          setMonthlyIncomes((prev) => ({ ...dbIncomes, ...prev }));
        }

        const dbDefIncome = await getFromIndexedDB<number>(PERSISTENT_STORAGE_KEYS.DEFAULT_INCOME);
        if (typeof dbDefIncome === 'number' && !isNaN(dbDefIncome) && dbDefIncome >= 0) {
          setDefaultIncome(dbDefIncome);
        }

        const dbRules = await getFromIndexedDB<RecurringExpenseRule[]>(PERSISTENT_STORAGE_KEYS.RECURRING_RULES);
        if (dbRules && Array.isArray(dbRules) && dbRules.length > 0) {
          setRecurringRules(dbRules);
        }

        const dbTrash = await getFromIndexedDB<TrashTransaction[]>(PERSISTENT_STORAGE_KEYS.TRASH_TRANSACTIONS);
        if (dbTrash && Array.isArray(dbTrash) && dbTrash.length > 0) {
          setTrashTransactions((prev) => (prev.length === 0 ? dbTrash : prev));
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
    saveToIndexedDB(PERSISTENT_STORAGE_KEYS.INCOME_CATS, incomeCategories).catch(() => {});
  }, [incomeCategories]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.EXPENSE_CATS, expenseCategories);
    saveToIndexedDB(PERSISTENT_STORAGE_KEYS.EXPENSE_CATS, expenseCategories).catch(() => {});
  }, [expenseCategories]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.TRANSACTIONS, transactions);
    saveToIndexedDB(PERSISTENT_STORAGE_KEYS.TRANSACTIONS, transactions).catch(() => {});
  }, [transactions]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.BUDGETS, budgets);
    saveToIndexedDB(PERSISTENT_STORAGE_KEYS.BUDGETS, budgets).catch(() => {});
  }, [budgets]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.DEFAULT_BUDGET, defaultBudget);
    saveToIndexedDB(PERSISTENT_STORAGE_KEYS.DEFAULT_BUDGET, defaultBudget).catch(() => {});
  }, [defaultBudget]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.MONTHLY_INCOMES, monthlyIncomes);
    saveToIndexedDB(PERSISTENT_STORAGE_KEYS.MONTHLY_INCOMES, monthlyIncomes).catch(() => {});
  }, [monthlyIncomes]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.DEFAULT_INCOME, defaultIncome);
    saveToIndexedDB(PERSISTENT_STORAGE_KEYS.DEFAULT_INCOME, defaultIncome).catch(() => {});
  }, [defaultIncome]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.CATEGORY_BUDGETS, categoryBudgets);
    saveToIndexedDB(PERSISTENT_STORAGE_KEYS.CATEGORY_BUDGETS, categoryBudgets).catch(() => {});
  }, [categoryBudgets]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.USER_PROFILE, userProfile);
    saveToIndexedDB(PERSISTENT_STORAGE_KEYS.USER_PROFILE, userProfile).catch(() => {});
  }, [userProfile]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.RECURRING_RULES, recurringRules);
    saveToIndexedDB(PERSISTENT_STORAGE_KEYS.RECURRING_RULES, recurringRules).catch(() => {});
  }, [recurringRules]);

  useEffect(() => {
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.TRASH_TRANSACTIONS, trashTransactions);
    saveToIndexedDB(PERSISTENT_STORAGE_KEYS.TRASH_TRANSACTIONS, trashTransactions).catch(() => {});
  }, [trashTransactions]);

  // 3. Continuous Master Snapshot Backup
  useEffect(() => {
    saveMasterSnapshot({
      transactions,
      incomeCategories,
      expenseCategories,
      budgets,
      defaultBudget,
      categoryBudgets,
      monthlyIncomes,
      defaultIncome,
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
    monthlyIncomes,
    defaultIncome,
    userProfile,
    recurringRules,
  ]);

  // 4. Hydrate from Cloud Database (Firestore) when user signs in
  useEffect(() => {
    if (!authUser) return;

    let isMounted = true;
    const hydrateFromCloud = async () => {
      setCloudSyncState('syncing');
      try {
        const cloudData = await fetchUserDataFromCloud(authUser.uid);
        if (!isMounted) return;

        // Se houver dados no Firestore para este UID da conta Google:
        if (
          cloudData &&
          (cloudData.transactions.length > 0 ||
            cloudData.incomeCategories.length > 0 ||
            cloudData.expenseCategories.length > 0 ||
            cloudData.userProfile?.name ||
            cloudData.security)
        ) {
          // 1. Restaura Preferências de Segurança (PIN e Biometria) salvas no Firestore
          if (cloudData.security) {
            if (cloudData.security.pin) {
              restorePinFromCloud(cloudData.security.pin, cloudData.security.pinEnabled !== false);
            }
            restoreBiometricFromCloud(cloudData.security);
          }

          markHasRealUserData();
          const deletedIds = new Set(getDeletedItemIds());
          const cloudTxs = deduplicateTransactions(
            (cloudData.transactions || []).filter((t) => !deletedIds.has(t.id))
          );
          setTransactions((prevLocal) => {
            const localPending = prevLocal.filter(
              (t) => (t.pendingSync || t.synced === false) && !deletedIds.has(t.id)
            );
            const localMap = new Map(
              prevLocal.filter((t) => !deletedIds.has(t.id)).map((t) => [t.id, t])
            );
            const cloudMap = new Map(cloudTxs.map((t) => [t.id, t]));

            const mergedMap = new Map<string, Transaction>();
            for (const [id, t] of cloudMap) {
              mergedMap.set(id, { ...t, synced: true, pendingSync: false });
            }
            for (const [id, t] of localMap) {
              const cloudT = cloudMap.get(id);
              if (
                !cloudT ||
                t.pendingSync ||
                t.synced === false ||
                (t.createdAt && cloudT.createdAt && t.createdAt >= cloudT.createdAt)
              ) {
                mergedMap.set(id, t);
              }
            }
            for (const t of localPending) {
              mergedMap.set(t.id, t);
            }
            const deduped = deduplicateTransactions(Array.from(mergedMap.values()));
            return deduped.sort((a, b) => b.createdAt - a.createdAt);
          });
          if (cloudData.incomeCategories.length > 0) {
            setIncomeCategories(cloudData.incomeCategories);
          }
          if (cloudData.expenseCategories.length > 0) {
            setExpenseCategories(cloudData.expenseCategories);
          }
          if (cloudData.budgets && Object.keys(cloudData.budgets).length > 0) {
            setBudgets((prev) => ({ ...prev, ...cloudData.budgets }));
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.BUDGETS, cloudData.budgets);
            saveToIndexedDB(PERSISTENT_STORAGE_KEYS.BUDGETS, cloudData.budgets).catch(() => {});
          }
          if (typeof cloudData.defaultBudget === 'number' && cloudData.defaultBudget > 0) {
            setDefaultBudget(cloudData.defaultBudget);
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.DEFAULT_BUDGET, cloudData.defaultBudget);
            saveToIndexedDB(PERSISTENT_STORAGE_KEYS.DEFAULT_BUDGET, cloudData.defaultBudget).catch(() => {});
          }
          if (cloudData.monthlyIncomes && Object.keys(cloudData.monthlyIncomes).length > 0) {
            setMonthlyIncomes((prev) => ({ ...prev, ...cloudData.monthlyIncomes }));
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.MONTHLY_INCOMES, cloudData.monthlyIncomes);
            saveToIndexedDB(PERSISTENT_STORAGE_KEYS.MONTHLY_INCOMES, cloudData.monthlyIncomes).catch(() => {});
          }
          if (typeof cloudData.defaultIncome === 'number' && cloudData.defaultIncome >= 0) {
            setDefaultIncome(cloudData.defaultIncome);
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.DEFAULT_INCOME, cloudData.defaultIncome);
            saveToIndexedDB(PERSISTENT_STORAGE_KEYS.DEFAULT_INCOME, cloudData.defaultIncome).catch(() => {});
          }
          if (cloudData.categoryBudgets && Object.keys(cloudData.categoryBudgets).length > 0) {
            setCategoryBudgets(cloudData.categoryBudgets);
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.CATEGORY_BUDGETS, cloudData.categoryBudgets);
            saveToIndexedDB(PERSISTENT_STORAGE_KEYS.CATEGORY_BUDGETS, cloudData.categoryBudgets).catch(() => {});
          }
          if (cloudData.userProfile?.name) {
            const cloudProfile = cloudData.userProfile;
            const isCloudGeneric =
              !cloudProfile.name ||
              cloudProfile.name.trim().toLowerCase() === 'usuário' ||
              cloudProfile.name.trim().toLowerCase() === 'usuario' ||
              cloudProfile.name.trim() === 'JC';

            setUserProfile((prev) => {
              const localStored = getStoredUserProfile();
              const hasCustomLocal =
                localStored &&
                localStored.name &&
                localStored.name.trim().toLowerCase() !== 'usuário' &&
                localStored.name.trim().toLowerCase() !== 'usuario' &&
                localStored.name.trim() !== 'JC' &&
                localStored.name.trim().length > 0;

              if (hasCustomLocal) {
                // Preserva o perfil local customizado com prioridade total
                const preserved = {
                  ...cloudProfile,
                  name: localStored.name,
                  login: localStored.login || cloudProfile.login,
                  avatarUrl: localStored.avatarUrl || cloudProfile.avatarUrl || '',
                  bio: localStored.bio || cloudProfile.bio || '',
                  avatarColor: localStored.avatarColor || cloudProfile.avatarColor || '#7dd3fc',
                };
                saveStoredUserProfile(preserved);
                return preserved;
              }

              const isPrevGeneric =
                !prev.name ||
                prev.name.trim().toLowerCase() === 'usuário' ||
                prev.name.trim().toLowerCase() === 'usuario' ||
                prev.name.trim() === 'JC';

              if (!isPrevGeneric && isCloudGeneric) {
                const merged = {
                  ...cloudProfile,
                  name: prev.name,
                  login: prev.login,
                  avatarUrl: prev.avatarUrl || cloudProfile.avatarUrl || '',
                };
                saveStoredUserProfile(merged);
                return merged;
              }
              saveStoredUserProfile(cloudProfile);
              return cloudProfile;
            });
          }
          if (cloudData.recurringRules && cloudData.recurringRules.length > 0) {
            setRecurringRules(cloudData.recurringRules);
          }
        } else {
          // Primeira conexão desta conta Google: salva os dados locais atuais na nuvem
          const pinData = getStoredPinData();
          const bioData = getStoredBiometricData();
          await syncUserDataToCloud(authUser.uid, {
            transactions,
            incomeCategories,
            expenseCategories,
            budgets,
            defaultBudget,
            categoryBudgets,
            monthlyIncomes,
            defaultIncome,
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
          });
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

  // 5b. Reconnection Offline-First Sync (Online Event Listener)
  useEffect(() => {
    const handleOnline = async () => {
      if (!authUser) return;
      setCloudSyncState('syncing');
      try {
        const pinData = getStoredPinData();
        const bioData = getStoredBiometricData();

        await syncUserDataToCloud(authUser.uid, {
          transactions,
          incomeCategories,
          expenseCategories,
          budgets,
          defaultBudget,
          categoryBudgets,
          monthlyIncomes,
          defaultIncome,
          userProfile,
          recurringRules,
          deletedItemIds: getDeletedItemIds(),
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

        setTransactions((prev) =>
          prev.map((t) =>
            t.pendingSync || t.synced === false
              ? { ...t, pendingSync: false, synced: true }
              : t
          )
        );
        setCloudSyncState('synced');
        setLastSyncTime(new Date());
      } catch (err) {
        console.warn('[OfflineSync] Erro ao sincronizar itens pendentes na reconexão:', err);
        setCloudSyncState('error');
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [authUser, transactions, incomeCategories, expenseCategories, budgets, defaultBudget, categoryBudgets, monthlyIncomes, defaultIncome, userProfile, recurringRules]);

  // 5. Auto-sync to Cloud (Debounced to avoid quota waste)
  useEffect(() => {
    if (!authUser) return;

    const timer = setTimeout(async () => {
      try {
        setCloudSyncState('syncing');
        const pinData = getStoredPinData();
        const bioData = getStoredBiometricData();
        await syncUserDataToCloud(authUser.uid, {
          transactions,
          incomeCategories,
          expenseCategories,
          budgets,
          defaultBudget,
          categoryBudgets,
          monthlyIncomes,
          defaultIncome,
          userProfile,
          recurringRules,
          deletedItemIds: getDeletedItemIds(),
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
        setTransactions((prev) =>
          prev.map((t) =>
            t.pendingSync || t.synced === false
              ? { ...t, pendingSync: false, synced: true }
              : t
          )
        );
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
    monthlyIncomes,
    defaultIncome,
    userProfile,
    recurringRules,
  ]);

  // Google Drive: Função para salvar/atualizar 'backup_app.json' no appDataFolder
  const syncToGoogleDrive = useCallback(async (): Promise<boolean> => {
    const token = getGoogleDriveAccessToken();
    if (!token) return false;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setDriveSyncState('offline');
      return false;
    }

    setDriveSyncState('syncing');
    try {
      const pinData = getStoredPinData();
      const bioData = getStoredBiometricData();

      const payload: GoogleDriveBackupPayload = {
        version: '2.0.0',
        updatedAt: new Date().toISOString(),
        transactions,
        incomeCategories,
        expenseCategories,
        budgets,
        defaultBudget,
        categoryBudgets,
        monthlyIncomes,
        defaultIncome,
        userProfile,
        recurringRules,
        trashTransactions,
        deletedItemIds: getDeletedItemIds(),
        security: {
          pin: pinData.pin,
          pinEnabled: pinData.isEnabled,
          biometricEnabled: bioData.isEnabled,
          biometricRegistered: bioData.isRegistered,
          biometricType: bioData.type,
          biometricDate: bioData.registeredDate,
          biometricCredentialId: bioData.keyId,
        },
      };

      await uploadAppDataBackup(token, payload);
      setDriveSyncState('synced');
      setLastDriveSyncTime(new Date());
      return true;
    } catch (err: any) {
      console.warn('[GoogleDrive] Falha ao sincronizar com Google Drive:', err);
      setDriveSyncState('error');
      return false;
    }
  }, [
    transactions,
    incomeCategories,
    expenseCategories,
    budgets,
    defaultBudget,
    categoryBudgets,
    monthlyIncomes,
    defaultIncome,
    userProfile,
    recurringRules,
    trashTransactions,
  ]);

  // Google Drive: Restauração Automática ao Entrar (Restaura 'backup_app.json' do appDataFolder)
  useEffect(() => {
    if (!authUser) return;

    let isCancelled = false;
    const checkAndRestoreFromDrive = async () => {
      const token = getGoogleDriveAccessToken();
      if (!token) return;

      try {
        setDriveSyncState('syncing');
        const backupFile = await findAppDataBackupFile(token);

        if (backupFile?.id) {
          const driveData = await downloadAppDataBackup(token, backupFile.id);
          if (isCancelled || !driveData) return;

          console.log('[GoogleDrive] Arquivo backup_app.json encontrado no appDataFolder, restaurando...');

          // 1. Restaura Lançamentos
          if (driveData.transactions && Array.isArray(driveData.transactions)) {
            const deletedIds = new Set(getDeletedItemIds());
            const validDriveTxs = deduplicateTransactions(
              driveData.transactions.filter((t: Transaction) => !deletedIds.has(t.id))
            );

            setTransactions((prevLocal) => {
              const localMap = new Map(prevLocal.map((t) => [t.id, t]));
              for (const t of validDriveTxs) {
                if (!localMap.has(t.id)) {
                  localMap.set(t.id, { ...t, synced: true, pendingSync: false });
                }
              }
              const merged = deduplicateTransactions(Array.from(localMap.values()));
              safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.TRANSACTIONS, merged);
              saveToIndexedDB(PERSISTENT_STORAGE_KEYS.TRANSACTIONS, merged).catch(() => {});
              return merged;
            });
          }

          // 2. Restaura Categorias
          if (driveData.incomeCategories && Array.isArray(driveData.incomeCategories) && driveData.incomeCategories.length > 0) {
            setIncomeCategories(driveData.incomeCategories);
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.INCOME_CATS, driveData.incomeCategories);
          }
          if (driveData.expenseCategories && Array.isArray(driveData.expenseCategories) && driveData.expenseCategories.length > 0) {
            setExpenseCategories(driveData.expenseCategories);
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.EXPENSE_CATS, driveData.expenseCategories);
          }

          // 3. Restaura Orçamentos
          if (driveData.budgets) {
            setBudgets(driveData.budgets);
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.BUDGETS, driveData.budgets);
          }
          if (typeof driveData.defaultBudget === 'number' && driveData.defaultBudget > 0) {
            setDefaultBudget(driveData.defaultBudget);
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.DEFAULT_BUDGET, driveData.defaultBudget);
          }
          if (driveData.monthlyIncomes) {
            setMonthlyIncomes(driveData.monthlyIncomes);
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.MONTHLY_INCOMES, driveData.monthlyIncomes);
          }
          if (typeof driveData.defaultIncome === 'number' && driveData.defaultIncome >= 0) {
            setDefaultIncome(driveData.defaultIncome);
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.DEFAULT_INCOME, driveData.defaultIncome);
          }
          if (driveData.categoryBudgets) {
            setCategoryBudgets(driveData.categoryBudgets);
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.CATEGORY_BUDGETS, driveData.categoryBudgets);
          }

          // 4. Restaura Perfil
          if (driveData.userProfile?.name) {
            setUserProfile((prev) => {
              const updated = {
                ...prev,
                ...driveData.userProfile,
                name: driveData.userProfile.name || authUser.displayName || prev.name,
                avatarUrl: driveData.userProfile.avatarUrl || authUser.photoURL || prev.avatarUrl,
              };
              saveStoredUserProfile(updated);
              return updated;
            });
          }

          // 5. Restaura Regras Recorrentes
          if (driveData.recurringRules && Array.isArray(driveData.recurringRules)) {
            setRecurringRules(driveData.recurringRules);
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.RECURRING_RULES, driveData.recurringRules);
          }

          // 6. Restaura Lixeira Local
          if (driveData.trashTransactions && Array.isArray(driveData.trashTransactions)) {
            setTrashTransactions(driveData.trashTransactions);
            safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.TRASH_TRANSACTIONS, driveData.trashTransactions);
          }

          setDriveSyncState('synced');
          setLastDriveSyncTime(new Date());
        } else {
          // Primeiro acesso com esta conta Google: salva os dados locais atuais no Google Drive
          console.log('[GoogleDrive] Nenhum backup_app.json encontrado no Google Drive. Criando backup inicial...');
          await syncToGoogleDrive();
        }
      } catch (err: any) {
        console.warn('[GoogleDrive] Erro na restauração inicial:', err);
        setDriveSyncState('error');
      }
    };

    checkAndRestoreFromDrive();

    return () => {
      isCancelled = true;
    };
  }, [authUser?.uid]);

  // Google Drive: Auto-Sync Contínuo em Segundo Plano (Silencioso e com Debounce)
  useEffect(() => {
    const token = getGoogleDriveAccessToken();
    if (!token || !authUser) return;

    const timer = setTimeout(() => {
      syncToGoogleDrive();
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
    monthlyIncomes,
    defaultIncome,
    userProfile,
    recurringRules,
    trashTransactions,
    syncToGoogleDrive,
  ]);

  // Google Drive: Reconexão e Envio Automático ao voltar a internet
  useEffect(() => {
    const handleDriveOnline = () => {
      const token = getGoogleDriveAccessToken();
      if (token && authUser) {
        syncToGoogleDrive();
      }
    };
    window.addEventListener('online', handleDriveOnline);
    return () => window.removeEventListener('online', handleDriveOnline);
  }, [authUser, syncToGoogleDrive]);

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

  // Filter transactions for current month with strict deduplication of fixed/recurring entries per month
  const currentMonthTransactions = useMemo(() => {
    const monthTxs = transactions.filter((t) => t.monthKey === currentMonthKey);
    const seenMap = new Map<string, Transaction>();

    for (const t of monthTxs) {
      const dedupKey = t.recurringGroupId ? `${t.recurringGroupId}_${t.monthKey}` : t.id;
      if (!seenMap.has(dedupKey)) {
        seenMap.set(dedupKey, t);
      } else {
        const existing = seenMap.get(dedupKey)!;
        if (t.createdAt > existing.createdAt) {
          seenMap.set(dedupKey, t);
        }
      }
    }

    return Array.from(seenMap.values()).sort((a, b) => {
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
    if (type === 'income') {
      setIncomeCategories((prev) => prev.filter((c) => c.id !== categoryId));
    } else {
      setExpenseCategories((prev) => prev.filter((c) => c.id !== categoryId));
    }
  }, []);

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
      saveStoredUserProfile(next);
      return next;
    });
  }, []);

  // Listen to profile updates dispatched from anywhere in the app
  useEffect(() => {
    const handleProfileEvent = (event: Event) => {
      const customEvent = event as CustomEvent<UserProfile>;
      if (customEvent.detail) {
        setUserProfile(customEvent.detail);
      }
    };
    window.addEventListener(PROFILE_UPDATE_EVENT, handleProfileEvent);
    return () => window.removeEventListener(PROFILE_UPDATE_EVENT, handleProfileEvent);
  }, []);

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

      // Anti-duplicate check guardrail
      const nameTrim = name.trim().toLowerCase();
      const amt = Math.abs(amount);
      const isDuplicate = transactions.some((t) => {
        return (
          t.kind === kind &&
          t.categoryId === categoryId &&
          t.amount === amt &&
          t.date === date &&
          (t.name || '').trim().toLowerCase() === nameTrim
        );
      });

      if (isDuplicate) {
        console.warn('[AddTransaction] Tentativa de criar lançamento duplicado bloqueada.');
        return [];
      }

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
              pendingSync: true,
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
          pendingSync: true,
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
          pendingSync: true,
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
            return { ...t, ...updates, pendingSync: true };
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
              pendingSync: true,
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

  // Transaction deletion (moves to Local Trash + removes from cloud)
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

      setTransactions((prev) => {
        const target = prev.find((t) => t.id === transactionId);
        if (!target) return prev;

        let toTrash: Transaction[] = [target];

        // 1. Handle Installments deletion
        if (deleteAllInstallments && target.installmentGroupId) {
          toTrash = prev.filter((t) => t.installmentGroupId === target.installmentGroupId);
        } else if (target.recurringGroupId) {
          // 2. Handle Recurring Fixed Expense deletion
          if (deleteRecurringMode === 'future') {
            setRecurringRules((rules) =>
              rules.map((r) => {
                if (r.id === target.recurringGroupId) {
                  const prevMonth = getPreviousMonthKey(target.monthKey);
                  return { ...r, endMonthKey: prevMonth };
                }
                return r;
              })
            );
            toTrash = prev.filter(
              (t) =>
                t.recurringGroupId === target.recurringGroupId &&
                t.monthKey >= target.monthKey
            );
          } else {
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
            toTrash = [target];
          }
        }

        // Armazena na Lixeira Local com timestamp da exclusão
        const now = Date.now();
        const trashEntries: TrashTransaction[] = toTrash.map((t) => ({
          ...t,
          deletedAt: now,
        }));

        setTrashTransactions((prevTrash) => {
          const trashIds = new Set(prevTrash.map((item) => item.id));
          const newItems = trashEntries.filter((item) => !trashIds.has(item.id));
          return [...newItems, ...prevTrash];
        });

        // Delete from cloud
        if (authUser) {
          toTrash.forEach((t) => {
            deleteTransactionFromCloud(authUser.uid, t.id).catch(() => {});
          });
        }

        const idsToDelete = new Set(toTrash.map((t) => t.id));
        addDeletedItemIds(toTrash.map((t) => t.id));
        return prev.filter((t) => !idsToDelete.has(t.id));
      });
    },
    [authUser]
  );

  // Restaura item da lixeira local de volta para os lançamentos
  const restoreTransactionFromTrash = useCallback((id: string) => {
    setTrashTransactions((prevTrash) => {
      const target = prevTrash.find((t) => t.id === id);
      if (!target) return prevTrash;

      const { deletedAt, ...restoredTx } = target;
      removeDeletedItemIds(id);
      setTransactions((prev) => {
        if (prev.some((t) => t.id === restoredTx.id)) return prev;
        return [{ ...restoredTx, pendingSync: true, synced: false }, ...prev];
      });

      return prevTrash.filter((t) => t.id !== id);
    });
  }, []);

  // Restaura todos os itens da lixeira de volta para os lançamentos
  const restoreAllFromTrash = useCallback(() => {
    setTrashTransactions((prevTrash) => {
      if (prevTrash.length === 0) return prevTrash;
      const ids = prevTrash.map((t) => t.id);
      removeDeletedItemIds(ids);
      const restored = prevTrash.map(({ deletedAt, ...t }) => ({
        ...t,
        pendingSync: true,
        synced: false,
      }));
      setTransactions((prev) => {
        const existing = new Set(prev.map((t) => t.id));
        const toAdd = restored.filter((t) => !existing.has(t.id));
        return [...toAdd, ...prev];
      });
      return [];
    });
  }, []);

  // Esvazia permanentemente a lixeira local
  const emptyTrash = useCallback(() => {
    setTrashTransactions((prevTrash) => {
      const ids = prevTrash.map((t) => t.id);
      if (ids.length > 0) {
        addDeletedItemIds(ids);
        if (authUser) {
          ids.forEach((id) => {
            deleteTransactionFromCloud(authUser.uid, id).catch(() => {});
          });
        }
      }
      return [];
    });
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.TRASH_TRANSACTIONS, []);
    saveToIndexedDB(PERSISTENT_STORAGE_KEYS.TRASH_TRANSACTIONS, []).catch(() => {});
  }, [authUser]);

  // Exclui permanentemente um único item da lixeira
  const deletePermanentlyFromTrash = useCallback(
    (id: string) => {
      addDeletedItemIds(id);
      if (authUser) {
        deleteTransactionFromCloud(authUser.uid, id).catch(() => {});
      }
      setTrashTransactions((prev) => prev.filter((t) => t.id !== id));
    },
    [authUser]
  );

  // Clear all transactions history (Zerar Histórico de Transações / Limpar Dados Salvos)
  // Zera todo o histórico de lançamentos locais para 0 transações, mantendo perfil, categorias e senhas
  const clearAllTransactions = useCallback(async () => {
    // 1. Clear in-memory transactions and recurring rules immediately so UI renders 0
    setTransactions([]);
    setRecurringRules([]);

    // 2. Clear persisted transactions and recurring rules in LocalStorage and IndexedDB
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.TRANSACTIONS, []);
    safeSetLocalStorage(PERSISTENT_STORAGE_KEYS.RECURRING_RULES, []);
    try {
      await saveToIndexedDB(PERSISTENT_STORAGE_KEYS.TRANSACTIONS, []);
      await saveToIndexedDB(PERSISTENT_STORAGE_KEYS.RECURRING_RULES, []);
    } catch {}

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

    // 5. Exclusão definitiva direta do banco Firestore na nuvem
    if (authUser?.uid) {
      setCloudSyncState('syncing');
      try {
        await clearAllTransactionsFromCloud(authUser.uid);
        setCloudSyncState('synced');
        setLastSyncTime(new Date());
      } catch (err) {
        console.warn('[FinanzoStorage] Falha ao zerar no Firestore:', err);
      }
    }
  }, [authUser, incomeCategories, expenseCategories, budgets, defaultBudget, categoryBudgets, userProfile]);

  // Manual Trigger to sync immediately with Cloud
  const syncNow = useCallback(async () => {
    if (!authUser) {
      return loginWithGoogle();
    }
    setCloudSyncState('syncing');
    try {
      const pinData = getStoredPinData();
      const bioData = getStoredBiometricData();
      await syncUserDataToCloud(authUser.uid, {
        transactions,
        incomeCategories,
        expenseCategories,
        budgets,
        defaultBudget,
        categoryBudgets,
        userProfile,
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
      });
      setCloudSyncState('synced');
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('[FinanzoStorage] Erro no sync manual:', err);
      setCloudSyncState('error');
    }
  }, [authUser, transactions, incomeCategories, expenseCategories, budgets, defaultBudget, categoryBudgets, userProfile, recurringRules]);

  // Reset Total / Limpeza Geral de Dados
  // Apaga absolutamente todos os lançamentos, despesas fixas, variáveis, orçamentos e dados salvos,
  // limpando LocalStorage, IndexedDB e Firebase/Firestore, retornando ao estado inicial de fábrica (R$ 0,00 e 0 registros).
  const resetAllData = useCallback(async () => {
    // 1. Zera estado em memória para o estado de fábrica
    setTransactions([]);
    setRecurringRules([]);
    setTrashTransactions([]);
    setBudgets({});
    setDefaultBudget(0);
    setMonthlyIncomes({});
    setDefaultIncome(0);
    setCategoryBudgets({});
    setIncomeCategories(INITIAL_INCOME_CATEGORIES);
    setExpenseCategories(INITIAL_EXPENSE_CATEGORIES);

    // 2. Limpa LocalStorage de chaves antigas e define estado limpo
    clearAllFinanzoLocalStorage();
    markHasRealUserData();

    // 3. Limpa completamente o banco IndexedDB
    try {
      await clearAllIndexedDB();
    } catch (e) {
      console.warn('[FinanzoStorage] Erro ao limpar IndexedDB:', e);
    }

    // 4. Salva Snapshot Mestre limpo (zerado com R$ 0,00 e 0 transações)
    saveMasterSnapshot({
      transactions: [],
      recurringRules: [],
      incomeCategories: INITIAL_INCOME_CATEGORIES,
      expenseCategories: INITIAL_EXPENSE_CATEGORIES,
      budgets: {},
      defaultBudget: 0,
      categoryBudgets: {},
      monthlyIncomes: {},
      defaultIncome: 0,
      userProfile,
      savedAt: Date.now(),
    });

    // 5. Zera no Firebase Firestore se o usuário estiver autenticado
    if (authUser?.uid) {
      setCloudSyncState('syncing');
      try {
        await resetAllUserDataFromCloud(authUser.uid);
        setCloudSyncState('synced');
        setLastSyncTime(new Date());
      } catch (err) {
        console.warn('[FinanzoStorage] Falha ao resetar na nuvem:', err);
        setCloudSyncState('error');
      }
    }
  }, [authUser, userProfile]);

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
    trashTransactions,
    restoreTransactionFromTrash,
    restoreAllFromTrash,
    emptyTrash,
    deletePermanentlyFromTrash,
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
    resetAllData,
    resetToInitialData,
    restoreFromBackup,
    authUser,
    cloudSyncState,
    lastSyncTime,
    driveSyncState,
    lastDriveSyncTime,
    syncDriveNow: syncToGoogleDrive,
    loginWithGoogle,
    logoutUser,
    syncNow,
  };
}
