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
} from '../utils/persistentDatabase';

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

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const stored = safeGetLocalStorage<UserProfile | null>(PERSISTENT_STORAGE_KEYS.USER_PROFILE, null);
    if (stored && typeof stored === 'object' && stored.name) {
      return stored;
    }
    const backup = getMasterSnapshot();
    if (backup?.userProfile?.name) return backup.userProfile;
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
    setUserProfile((prev) => ({
      ...prev,
      ...updates,
    }));
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

  // Transaction deletion
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

        // 1. Handle Installments deletion
        if (deleteAllInstallments && target.installmentGroupId) {
          return prev.filter((t) => t.installmentGroupId !== target.installmentGroupId);
        }

        // 2. Handle Recurring Fixed Expense deletion
        if (target.recurringGroupId) {
          if (deleteRecurringMode === 'future') {
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
            // Delete target and all future instances of this recurring group
            return prev.filter(
              (t) =>
                !(
                  t.recurringGroupId === target.recurringGroupId &&
                  t.monthKey >= target.monthKey
                )
            );
          } else {
            // 'single': Only exclude this specific month, subsequent months continue
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
            // Delete only this month's transaction
            return prev.filter((t) => t.id !== transactionId);
          }
        }

        // 3. Regular transaction deletion
        return prev.filter((t) => t.id !== transactionId);
      });
    },
    []
  );

  // Clear all transactions history (Zerar Histórico de Transações / Limpar Dados Salvos)
  // Zera todo o histórico de lançamentos locais para 0 transações, mantendo perfil, categorias e senhas
  const clearAllTransactions = useCallback(() => {
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
  }, [incomeCategories, expenseCategories, budgets, defaultBudget, categoryBudgets, userProfile]);

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
  };
}
