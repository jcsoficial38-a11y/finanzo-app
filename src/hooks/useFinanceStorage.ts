import { useState, useEffect, useMemo, useCallback } from 'react';
import { Category, Transaction, MonthSummary, ExpenseType, CategoryType, UserProfile } from '../types/finance';
import {
  INITIAL_INCOME_CATEGORIES,
  INITIAL_EXPENSE_CATEGORIES,
  getInitialTransactions,
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
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return INITIAL_EXPENSE_CATEGORIES;
  });

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (stored) return JSON.parse(stored);
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
        installmentsCount = 1,
        isTotalAmount = false,
        notes,
      } = params;

      const baseMonthKey = date.slice(0, 7);

      // Handle normal transaction (Income, or Non-installment expense)
      if (kind === 'income' || expenseType !== 'installment' || installmentsCount <= 1) {
        const newTx: Transaction = {
          id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name,
          amount: Math.abs(amount),
          date,
          monthKey: baseMonthKey,
          kind,
          categoryId,
          expenseType: kind === 'expense' ? expenseType : undefined,
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

  // Transaction deletion
  const deleteTransaction = useCallback(
    (transactionId: string, deleteAllInstallments = false) => {
      setTransactions((prev) => {
        const target = prev.find((t) => t.id === transactionId);
        if (!target) return prev;

        if (deleteAllInstallments && target.installmentGroupId) {
          // Delete all installments with this group ID
          return prev.filter((t) => t.installmentGroupId !== target.installmentGroupId);
        }

        // Just delete this specific transaction
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

    setIncomeCategories(INITIAL_INCOME_CATEGORIES);
    setExpenseCategories(INITIAL_EXPENSE_CATEGORIES);
    setTransactions(getInitialTransactions());
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
    updateUserProfile,
    setMonthBudget,
    setCategoryBudget,
    monthSummary,
    addCategory,
    deleteCategory,
    addTransaction,
    deleteTransaction,
    resetToInitialData,
    restoreFromBackup,
  };
}
