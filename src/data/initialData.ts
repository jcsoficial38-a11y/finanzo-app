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
  return [];
}

export function getInitialRecurringRules(): RecurringExpenseRule[] {
  return [];
}
