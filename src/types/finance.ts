import { ThemeId } from '../utils/themeConfig';

export type CategoryType = 'income' | 'expense';

export type ExpenseType = 'fixed' | 'variable' | 'installment';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string; // Pastel hex code
  iconName: string; // Lucide icon identifier
}

export interface Transaction {
  id: string;
  name: string;
  amount: number; // Stored in BRL positive number
  date: string; // ISO date string 'YYYY-MM-DD'
  monthKey: string; // 'YYYY-MM'
  kind: CategoryType; // 'income' | 'expense'
  categoryId: string;
  expenseType?: ExpenseType; // Only for expenses
  isRecurring?: boolean; // True if this is a recurring fixed expense
  recurringGroupId?: string; // Group ID referencing RecurringExpenseRule
  installmentGroupId?: string;
  installmentIndex?: number; // 1-based
  installmentTotal?: number;
  notes?: string;
  createdAt: number;
}

export interface RecurringExpenseRule {
  id: string; // Group ID
  name: string;
  amount: number;
  categoryId: string;
  dayOfMonth: number;
  startMonthKey: string; // 'YYYY-MM'
  endMonthKey?: string; // Optional 'YYYY-MM' when recurrence was stopped
  excludedMonthKeys?: string[]; // Months where user deleted only that single occurrence
  notes?: string;
  createdAt: number;
}

export interface MonthSummary {
  budget: number;
  totalIncome: number;
  totalFixed: number;
  totalVariable: number;
  totalInstallment: number;
  totalExpenses: number;
  remainingBudget: number; // budget - totalExpenses
  netBalance: number; // totalIncome - totalExpenses
}

export interface UserProfile {
  name: string;
  login: string; // E-mail or Username
  avatarUrl?: string; // Data URL or Image URL
  avatarColor?: string; // Background color for initial avatar
  bio?: string;
  joinedDate: string;
  themeColor?: ThemeId;
}

export type ActiveTab = 'dashboard' | 'history' | 'charts' | 'categories';
