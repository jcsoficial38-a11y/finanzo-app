import { Category, Transaction, RecurringExpenseRule } from '../types/finance';
import { getCurrentMonthKey, addMonthsToDate } from '../utils/dateUtils';

export const PASTEL_COLORS = [
  { name: 'Verde Menta', hex: '#86efac' },
  { name: 'Azul Céu', hex: '#7dd3fc' },
  { name: 'Esmeralda', hex: '#34d399' },
  { name: 'Vermelho Suave', hex: '#f87171' },
  { name: 'Rosa Suave', hex: '#f472b6' },
  { name: 'Laranja Suave', hex: '#fb923c' },
  { name: 'Pêssego', hex: '#fdba74' },
  { name: 'Amarelo Ouro', hex: '#facc15' },
  { name: 'Amarelo Pastel', hex: '#fde047' },
  { name: 'Azul Água', hex: '#60a5fa' },
  { name: 'Índigo', hex: '#818cf8' },
  { name: 'Lavanda', hex: '#a78bfa' },
  { name: 'Roxo Claro', hex: '#c084fc' },
  { name: 'Verde Saúde', hex: '#4ade80' },
  { name: 'Cinza Suave', hex: '#94a3b8' },
  { name: 'Grafite', hex: '#475569' },
];

export const AVAILABLE_ICONS = [
  // Supermercado & Alimentação
  'ShoppingCart',
  'ShoppingBag',
  'Store',
  'Utensils',
  'Pizza',
  'IceCream',
  'Sandwich',
  'Coffee',
  // Saúde & Farmácia
  'HeartPulse',
  'Pill',
  'Stethoscope',
  // Transporte & Combustível
  'Car',
  'Fuel',
  'Bike',
  'Truck',
  'Plane',
  // Moradia & Contas
  'Home',
  'Droplets',
  'Zap',
  'Flame',
  'Wifi',
  'Phone',
  'Smartphone',
  // Compras, Entregas & Assinaturas
  'Package',
  'Tv',
  'Film',
  // Finanças & Trabalho
  'Briefcase',
  'Laptop',
  'TrendingUp',
  'PiggyBank',
  'CreditCard',
  'Receipt',
  'CircleDollarSign',
  // Outros
  'Sparkles',
  'Gift',
  'GraduationCap',
  'Tag',
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
    id: 'exp-mercado',
    name: 'Mercado',
    type: 'expense',
    color: '#86efac',
    iconName: 'ShoppingCart',
  },
  {
    id: 'exp-farmacia',
    name: 'Farmácia',
    type: 'expense',
    color: '#f87171',
    iconName: 'Pill',
  },
  {
    id: 'exp-sorvete',
    name: 'Sorvete',
    type: 'expense',
    color: '#f472b6',
    iconName: 'IceCream',
  },
  {
    id: 'exp-pizzaria',
    name: 'Pizzaria',
    type: 'expense',
    color: '#fb923c',
    iconName: 'Pizza',
  },
  {
    id: 'exp-restaurante',
    name: 'Restaurante',
    type: 'expense',
    color: '#fdba74',
    iconName: 'Utensils',
  },
  {
    id: 'exp-carro',
    name: 'Carro',
    type: 'expense',
    color: '#38bdf8',
    iconName: 'Car',
  },
  {
    id: 'exp-combustivel',
    name: 'Combustível',
    type: 'expense',
    color: '#facc15',
    iconName: 'Fuel',
  },
  {
    id: 'exp-agua',
    name: 'Água',
    type: 'expense',
    color: '#60a5fa',
    iconName: 'Droplets',
  },
  {
    id: 'exp-luz',
    name: 'Luz',
    type: 'expense',
    color: '#fbbf24',
    iconName: 'Zap',
  },
  {
    id: 'exp-internet',
    name: 'Internet',
    type: 'expense',
    color: '#818cf8',
    iconName: 'Wifi',
  },
  {
    id: 'exp-telefone',
    name: 'Telefone',
    type: 'expense',
    color: '#a78bfa',
    iconName: 'Smartphone',
  },
  {
    id: 'exp-gas',
    name: 'Gás',
    type: 'expense',
    color: '#f97316',
    iconName: 'Flame',
  },
  {
    id: 'exp-compras-online',
    name: 'Compras Online',
    type: 'expense',
    color: '#c084fc',
    iconName: 'Package',
  },
  {
    id: 'exp-delivery',
    name: 'Delivery',
    type: 'expense',
    color: '#34d399',
    iconName: 'Bike',
  },
  {
    id: 'exp-sanduiche',
    name: 'Sanduíche',
    type: 'expense',
    color: '#eab308',
    iconName: 'Sandwich',
  },
  {
    id: 'exp-assinaturas-streaming',
    name: 'Assinaturas/Streaming',
    type: 'expense',
    color: '#94a3b8',
    iconName: 'Tv',
  },
  {
    id: 'exp-saude',
    name: 'Saúde',
    type: 'expense',
    color: '#4ade80',
    iconName: 'HeartPulse',
  },
  {
    id: 'exp-moradia',
    name: 'Aluguel & Moradia',
    type: 'expense',
    color: '#7dd3fc',
    iconName: 'Home',
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
      categoryId: 'exp-carro',
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
      categoryId: 'exp-restaurante',
      expenseType: 'variable',
      createdAt: Date.now() - 90000,
    },
  ];

  // Fixed Expenses (Recurring for current month and next 24 future months)
  const fixedExpensesSeed = [
    {
      id: 'rec-seed-aluguel',
      name: 'Aluguel do Apartamento',
      amount: 1450.0,
      day: 8,
      categoryId: 'exp-moradia',
    },
    {
      id: 'rec-seed-internet',
      name: 'Internet Fibra + Streaming',
      amount: 189.9,
      day: 10,
      categoryId: 'exp-internet',
    },
    {
      id: 'rec-seed-saude',
      name: 'Plano de Saúde',
      amount: 320.0,
      day: 12,
      categoryId: 'exp-saude',
    },
  ];

  for (const item of fixedExpensesSeed) {
    for (let m = 0; m <= 24; m++) {
      const { date: fDate, monthKey: fMonthKey } = addMonthsToDate(
        `${yearStr}-${monthStr}-${String(item.day).padStart(2, '0')}`,
        m
      );
      transactions.push({
        id: m === 0 ? `tx-seed-${item.id}` : `tx-rec-${item.id}-${fMonthKey}`,
        name: item.name,
        amount: item.amount,
        date: fDate,
        monthKey: fMonthKey,
        kind: 'expense',
        categoryId: item.categoryId,
        expenseType: 'fixed',
        isRecurring: true,
        recurringGroupId: item.id,
        createdAt: Date.now() - 250000 + m,
      });
    }
  }

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
      categoryId: 'exp-compras-online',
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
      categoryId: 'exp-assinaturas-streaming',
      expenseType: 'installment',
      installmentGroupId: courseGroupId,
      installmentIndex: i + 1,
      installmentTotal: courseInstallments,
      createdAt: Date.now() - 40000 + i,
    });
  }

  return transactions;
}

export function getInitialRecurringRules(): RecurringExpenseRule[] {
  const currentMonth = getCurrentMonthKey();
  return [
    {
      id: 'rec-seed-aluguel',
      name: 'Aluguel do Apartamento',
      amount: 1450.0,
      categoryId: 'exp-moradia',
      dayOfMonth: 8,
      startMonthKey: currentMonth,
      createdAt: Date.now() - 250000,
    },
    {
      id: 'rec-seed-internet',
      name: 'Internet Fibra + Streaming',
      amount: 189.9,
      categoryId: 'exp-internet',
      dayOfMonth: 10,
      startMonthKey: currentMonth,
      createdAt: Date.now() - 200000,
    },
    {
      id: 'rec-seed-saude',
      name: 'Plano de Saúde',
      amount: 320.0,
      categoryId: 'exp-saude',
      dayOfMonth: 12,
      startMonthKey: currentMonth,
      createdAt: Date.now() - 180000,
    },
  ];
}
