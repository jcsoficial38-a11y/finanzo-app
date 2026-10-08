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

const STORAGE_KEYS = {
  INCOME_CATS: 'finanzo_income_categories_v1',
  EXPENSE_CATS: 'finanzo_expense_categories_v1',
  TRANSACTIONS: 'finanzo_transactions_v1',
  BUDGETS: 'finanzo_monthly_budgets_v1',
  DEFAULT_BUDGET: 'finanzo_default_budget_v1',
  CATEGORY_BUDGETS: 'finanzo_category_budgets_v1',
  USER_PROFILE: 'finanzo_user_profile_v1',
  RECURRING_RULES: 'finanzo_recurring_fixed_rules_v1',
};

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

  // Income Categories
  const [incomeCategories, setIncomeCategories] = useState<Category[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INCOME_CATS);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return INITIAL_INCOME_CATEGORIES;
  });

  // Expense Categories
  const [expenseCategories, setExpenseCategories] = useState<Category[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EXPENSE_CATS);
      if (stored) {
        const parsed: Category[] = JSON.parse(stored);
        const existingIds = new Set(parsed.map((c) => c.id));
        const missing = INITIAL_EXPENSE_CATEGORIES.filter((c) => !existingIds.has(c.id));
        if (missing.length > 0) {
          return [...parsed, ...missing];
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_EXPENSE_CATEGORIES;
  });

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (stored) {
        const parsed: Transaction[] = JSON.parse(stored);
        return parsed.map((t) => ({
          ...t,
          categoryId: normalizeCategoryId(t.categoryId),
        }));
      }
    } catch {
      // ignore
    }
    return getInitialTransactions();
  });

  // Budgets map: { '2026-09': 3500 }
  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return {
      [getCurrentMonthKey()]: DEFAULT_MONTHLY_BUDGET,
    };
  });

  const [defaultBudget, setDefaultBudget] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DEFAULT_BUDGET);
      if (stored) return Number(stored);
    } catch {
      // ignore
    }
    return DEFAULT_MONTHLY_BUDGET;
  });

  // Category Budgets: { [categoryId]: number }
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CATEGORY_BUDGETS);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
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
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name === 'JCS Oficial' || parsed.login === 'jcs.oficial38@gmail.com') {
          localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
          return DEFAULT_USER_PROFILE;
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_USER_PROFILE;
  });

  // Recurring Fixed Expenses Rules
  const [recurringRules, setRecurringRules] = useState<RecurringExpenseRule[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECURRING_RULES);
      if (stored) {
        const parsed: RecurringExpenseRule[] = JSON.parse(stored);
        return parsed.map((r) => ({
          ...r,
          categoryId: normalizeCategoryId(r.categoryId),
        }));
      }
    } catch {
      // ignore
    }
    return getInitialRecurringRules();
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INCOME_CATS, JSON.stringify(incomeCategories));
  }, [incomeCategories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSE_CATS, JSON.stringify(expenseCategories));
  }, [expenseCategories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEFAULT_BUDGET, String(defaultBudget));
  }, [defaultBudget]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CATEGORY_BUDGETS, JSON.stringify(categoryBudgets));
  }, [categoryBudgets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECURRING_RULES, JSON.stringify(recurringRules));
  }, [recurringRules]);

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
    setIncomeCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, ...updates } : c))
    );
    setExpenseCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, ...updates } : c))
    );
  }, []);

  const deleteCategory = useCallback((categoryId: string, type: CategoryType) => {
    if (type === 'income') {
      setIncomeCategories((prev) => prev.filter((c) => c.id !== categoryId));
    } else {
      setExpenseCategories((prev) => prev.filter((c) => c.id !== categoryId));
    }
  }, []);

  const setCategoryBudget = useCallback((categoryId: string, amount: number) => {
    setCategoryBudgets((prev) => ({
      ...prev,
      [categoryId]: Math.max(0, amount),
    }));
  }, []);

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
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
        return [newTx];
      }

      // Handle Installment Expense (repeated in subsequent months)
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

  // Reset to initial sample data
  const resetToInitialData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.INCOME_CATS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSE_CATS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.BUDGETS);
    localStorage.removeItem(STORAGE_KEYS.DEFAULT_BUDGET);
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.RECURRING_RULES);

    setIncomeCategories(INITIAL_INCOME_CATEGORIES);
    setExpenseCategories(INITIAL_EXPENSE_CATEGORIES);
    setTransactions(getInitialTransactions());
    setRecurringRules(getInitialRecurringRules());
    setBudgets({ [getCurrentMonthKey()]: DEFAULT_MONTHLY_BUDGET });
    setDefaultBudget(DEFAULT_MONTHLY_BUDGET);
    setUserProfile(DEFAULT_USER_PROFILE);
    setCurrentMonthKey(getCurrentMonthKey());
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
    resetToInitialData,
    restoreFromBackup,
  };
}
