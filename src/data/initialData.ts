import { Category, Transaction } from '../types/finance';
import { getCurrentMonthKey, addMonthsToDate } from '../utils/dateUtils';

export const PASTEL_COLORS = [
  { name: 'Azul Céu', hex: '#7dd3fc' },
  { name: 'Verde Sálvia', hex: '#86efac' },
  { name: 'Verde Menta', hex: '#6ee7b7' },
  { name: 'Lavanda', hex: '#c4b5fd' },
  { name: 'Rosa Suave', hex: '#fda4af' },
  { name: 'Pêssego', hex: '#fdba74' },
  { name: 'Amarelo Pastel', hex: '#fde047' },
  { name: 'Azul Turquesa', hex: '#67e8f9' },
  { name: 'Cinza Suave', hex: '#cbd5e1' },
  { name: 'Lilás', hex: '#d8b4fe' },
];

export const AVAILABLE_ICONS = [
  'Briefcase',
  'Laptop',
  'TrendingUp',
  'ShoppingBag',
  'Home',
  'Car',
  'Coffee',
  'HeartPulse',
  'GraduationCap',
  'CreditCard',
  'Sparkles',
  'Utensils',
  'Smartphone',
  'Film',
  'Plane',
  'Gift',
  'Receipt',
  'PiggyBank',
  'Zap',
];

export const INITIAL_INCOME_CATEGORIES: Category[] = [
  {
    id: 'inc-salario',
    name: 'Salário',
    type: 'income',
    color: '#86efac', // Soft green
    iconName: 'Briefcase',
  },
  {
    id: 'inc-freelance',
    name: 'Freelance',
    type: 'income',
    color: '#7dd3fc', // Soft blue
    iconName: 'Laptop',
  },
  {
    id: 'inc-investimentos',
    name: 'Investimentos',
    type: 'income',
    color: '#6ee7b7', // Mint
    iconName: 'TrendingUp',
  },
  {
    id: 'inc-outros',
    name: 'Outros Rendimentos',
    type: 'income',
    color: '#c4b5fd', // Soft lavender
    iconName: 'PiggyBank',
  },
];

export const INITIAL_EXPENSE_CATEGORIES: Category[] = [
  {
    id: 'exp-moradia',
    name: 'Aluguel & Moradia',
    type: 'expense',
    color: '#7dd3fc', // Soft sky blue
    iconName: 'Home',
  },
  {
    id: 'exp-mercado',
    name: 'Mercado & Compras',
    type: 'expense',
    color: '#86efac', // Soft sage green
    iconName: 'ShoppingBag',
  },
  {
    id: 'exp-transporte',
    name: 'Uber & Transporte',
    type: 'expense',
    color: '#fdba74', // Soft peach
    iconName: 'Car',
  },
  {
    id: 'exp-lazer',
    name: 'Lazer & Restaurantes',
    type: 'expense',
    color: '#fda4af', // Soft rose
    iconName: 'Utensils',
  },
  {
    id: 'exp-contas',
    name: 'Contas & Assinaturas',
    type: 'expense',
    color: '#cbd5e1', // Soft slate
    iconName: 'Receipt',
  },
  {
    id: 'exp-saude',
    name: 'Saúde & Bem-estar',
    type: 'expense',
    color: '#6ee7b7', // Mint
    iconName: 'HeartPulse',
  },
  {
    id: 'exp-tecnologia',
    name: 'Eletrônicos & Compras',
    type: 'expense',
    color: '#c4b5fd', // Lavender
    iconName: 'Smartphone',
  },
];

export function getInitialTransactions(): Transaction[] {
  const currentMonth = getCurrentMonthKey();
  const [yearStr, monthStr] = currentMonth.split('-');
  const baseDate = `${yearStr}-${monthStr}-05`;

  const transactions: Transaction[] = [
    // Income
    {
      id: 'tx-seed-1',
      name: 'Salário Mensal',
      amount: 4800.0,
      date: `${yearStr}-${monthStr}-05`,
      monthKey: currentMonth,
      kind: 'income',
      categoryId: 'inc-salario',
      createdAt: Date.now() - 500000,
    },
    {
      id: 'tx-seed-2',
      name: 'Freelance Design UI',
      amount: 1200.0,
      date: `${yearStr}-${monthStr}-12`,
      monthKey: currentMonth,
      kind: 'income',
      categoryId: 'inc-freelance',
      createdAt: Date.now() - 400000,
    },
    {
      id: 'tx-seed-3',
      name: 'Dividendos de Ações',
      amount: 250.0,
      date: `${yearStr}-${monthStr}-15`,
      monthKey: currentMonth,
      kind: 'income',
      categoryId: 'inc-investimentos',
      createdAt: Date.now() - 300000,
    },

    // Fixed Expenses
    {
      id: 'tx-seed-4',
      name: 'Aluguel do Apartamento',
      amount: 1450.0,
      date: `${yearStr}-${monthStr}-08`,
      monthKey: currentMonth,
      kind: 'expense',
      categoryId: 'exp-moradia',
      expenseType: 'fixed',
      createdAt: Date.now() - 250000,
    },
    {
      id: 'tx-seed-5',
      name: 'Internet Fibra + Streaming',
      amount: 189.9,
      date: `${yearStr}-${monthStr}-10`,
      monthKey: currentMonth,
      kind: 'expense',
      categoryId: 'exp-contas',
      expenseType: 'fixed',
      createdAt: Date.now() - 200000,
    },
    {
      id: 'tx-seed-6',
      name: 'Plano de Saúde',
      amount: 320.0,
      date: `${yearStr}-${monthStr}-12`,
      monthKey: currentMonth,
      kind: 'expense',
      categoryId: 'exp-saude',
      expenseType: 'fixed',
      createdAt: Date.now() - 180000,
    },

    // Variable Expenses
    {
      id: 'tx-seed-7',
      name: 'Supermercado da Quinzena',
      amount: 460.5,
      date: `${yearStr}-${monthStr}-06`,
      monthKey: currentMonth,
      kind: 'expense',
      categoryId: 'exp-mercado',
      expenseType: 'variable',
      createdAt: Date.now() - 150000,
    },
    {
      id: 'tx-seed-8',
      name: 'Uber para o Trabalho',
      amount: 124.0,
      date: `${yearStr}-${monthStr}-09`,
      monthKey: currentMonth,
      kind: 'expense',
      categoryId: 'exp-transporte',
      expenseType: 'variable',
      createdAt: Date.now() - 120000,
    },
    {
      id: 'tx-seed-9',
      name: 'Jantar com Amigos',
      amount: 185.0,
      date: `${yearStr}-${monthStr}-14`,
      monthKey: currentMonth,
      kind: 'expense',
      categoryId: 'exp-lazer',
      expenseType: 'variable',
      createdAt: Date.now() - 90000,
    },
  ];

  // Installment Expenses: e.g. Smartphone (4 parcelas de R$ 225,00)
  const installmentGroupId = 'inst-group-smartphone';
  const totalInstallments = 4;
  const installmentAmount = 225.0;

  for (let i = 0; i < totalInstallments; i++) {
    const { date, monthKey } = addMonthsToDate(baseDate, i);
    transactions.push({
      id: `tx-inst-phone-${i + 1}`,
      name: `Smartphone Novo (${i + 1}/${totalInstallments})`,
      amount: installmentAmount,
      date,
      monthKey,
      kind: 'expense',
      categoryId: 'exp-tecnologia',
      expenseType: 'installment',
      installmentGroupId,
      installmentIndex: i + 1,
      installmentTotal: totalInstallments,
      createdAt: Date.now() - 50000 + i,
    });
  }

  // Second installment example: Curso Online em 3x
  const courseGroupId = 'inst-group-curso';
  const courseInstallments = 3;
  const courseAmount = 149.0;

  for (let i = 0; i < courseInstallments; i++) {
    const { date, monthKey } = addMonthsToDate(`${yearStr}-${monthStr}-11`, i);
    transactions.push({
      id: `tx-inst-curso-${i + 1}`,
      name: `Curso Especialização (${i + 1}/${courseInstallments})`,
      amount: courseAmount,
      date,
      monthKey,
      kind: 'expense',
      categoryId: 'exp-contas',
      expenseType: 'installment',
      installmentGroupId: courseGroupId,
      installmentIndex: i + 1,
      installmentTotal: courseInstallments,
      createdAt: Date.now() - 40000 + i,
    });
  }

  return transactions;
}
