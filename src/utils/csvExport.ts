import { Transaction, Category, MonthSummary, UserProfile } from '../types/finance';
import { formatMonthYearLabel } from './dateUtils';
import { formatCurrency } from './formatters';

// Helper to escape CSV cell (pt-BR semicolon delimiter)
const escapeCell = (val: string | number) => {
  const str = String(val ?? '').replace(/"/g, '""');
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str}"`;
  }
  return str;
};

// Format number in pt-BR format (e.g. 1500,50)
const formatNumberBR = (num: number) => {
  return num.toFixed(2).replace('.', ',');
};

// Format date to DD/MM/YYYY
const formatDateBR = (isoDate: string) => {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
};

// Trigger browser download of a generated blob
function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 1. Export Month to CSV
export function exportMonthToCSV(
  transactions: Transaction[],
  categories: Category[],
  summary: MonthSummary,
  monthKey: string
) {
  const categoriesMap = new Map(categories.map((c) => [c.id, c.name]));
  const monthLabel = formatMonthYearLabel(monthKey);
  const now = new Date();
  const exportTimestamp = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  const rows: string[] = [];

  // Summary header
  rows.push(['# FINANÇAS PESSOAIS - RESUMO MENSAL'].map(escapeCell).join(';'));
  rows.push(['Mês de Referência', monthLabel].map(escapeCell).join(';'));
  rows.push(['Data da Exportação', exportTimestamp].map(escapeCell).join(';'));
  rows.push([''].join(';'));

  rows.push(['INDICADOR', 'VALOR'].map(escapeCell).join(';'));
  rows.push(['Orçamento Geral do Mês', formatCurrency(summary.budget)].map(escapeCell).join(';'));
  rows.push(['Total de Receitas (Rendas)', formatCurrency(summary.totalIncome)].map(escapeCell).join(';'));
  rows.push(['Gasto Total Geral', formatCurrency(summary.totalExpenses)].map(escapeCell).join(';'));
  rows.push(['  - Gastos Fixos', formatCurrency(summary.totalFixed)].map(escapeCell).join(';'));
  rows.push(['  - Gastos Variáveis', formatCurrency(summary.totalVariable)].map(escapeCell).join(';'));
  rows.push(['  - Gastos Parcelados', formatCurrency(summary.totalInstallment)].map(escapeCell).join(';'));
  rows.push(['Saldo Restante do Orçamento', formatCurrency(summary.remainingBudget)].map(escapeCell).join(';'));
  rows.push(['Saldo Real (Receitas - Gastos)', formatCurrency(summary.netBalance)].map(escapeCell).join(';'));
  rows.push([''].join(';'));

  // Transactions Table
  rows.push(['# LANÇAMENTOS DO MÊS'].map(escapeCell).join(';'));
  rows.push(
    ['Data', 'Descrição / Nome', 'Tipo', 'Categoria', 'Tipo de Gasto', 'Parcela', 'Valor (R$)']
      .map(escapeCell)
      .join(';')
  );

  if (transactions.length === 0) {
    rows.push(['Nenhum lançamento registrado neste mês.'].map(escapeCell).join(';'));
  } else {
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    for (const tx of sorted) {
      const isIncome = tx.kind === 'income';
      const categoryName = categoriesMap.get(tx.categoryId) || (isIncome ? 'Renda' : 'Despesa');

      let expenseTypeLabel = '-';
      let installmentLabel = '-';

      if (!isIncome) {
        if (tx.expenseType === 'fixed') expenseTypeLabel = 'Fixo';
        else if (tx.expenseType === 'variable') expenseTypeLabel = 'Variável';
        else if (tx.expenseType === 'installment') {
          expenseTypeLabel = 'Parcelado';
          installmentLabel = `${tx.installmentIndex || 1}/${tx.installmentTotal || 1}`;
        }
      }

      const signedAmount = isIncome ? tx.amount : -tx.amount;

      rows.push(
        [
          formatDateBR(tx.date),
          tx.name,
          isIncome ? 'Receita' : 'Despesa',
          categoryName,
          expenseTypeLabel,
          installmentLabel,
          formatNumberBR(signedAmount),
        ]
          .map(escapeCell)
          .join(';')
      );
    }
  }

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const cleanMonthKey = monthKey.replace('-', '_');
  triggerDownload(csvContent, `financas_pessoais_${cleanMonthKey}.csv`, 'text/csv;charset=utf-8;');
}

// 2. Export All Time Transactions to CSV
export function exportAllTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  userProfile?: UserProfile
) {
  const categoriesMap = new Map(categories.map((c) => [c.id, c.name]));
  const now = new Date();
  const exportTimestamp = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  const rows: string[] = [];

  rows.push(['# FINANÇAS PESSOAIS - HISTÓRICO GERAL COMPLETO'].map(escapeCell).join(';'));
  if (userProfile?.name) {
    rows.push(['Usuário', `${userProfile.name} (${userProfile.login})`].map(escapeCell).join(';'));
  }
  rows.push(['Data da Exportação', exportTimestamp].map(escapeCell).join(';'));
  rows.push(['Total de Lançamentos', transactions.length.toString()].map(escapeCell).join(';'));
  rows.push([''].join(';'));

  // Calculate totals
  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of transactions) {
    if (t.kind === 'income') totalIncome += t.amount;
    else totalExpense += t.amount;
  }

  rows.push(['RESUMO GERAL', 'VALOR'].map(escapeCell).join(';'));
  rows.push(['Total Geral de Receitas', formatCurrency(totalIncome)].map(escapeCell).join(';'));
  rows.push(['Total Geral de Gastos', formatCurrency(totalExpense)].map(escapeCell).join(';'));
  rows.push(['Saldo Líquido Histórico', formatCurrency(totalIncome - totalExpense)].map(escapeCell).join(';'));
  rows.push([''].join(';'));

  rows.push(
    ['Data', 'Mês/Ano', 'Descrição / Nome', 'Tipo', 'Categoria', 'Tipo de Gasto', 'Parcela', 'Valor (R$)']
      .map(escapeCell)
      .join(';')
  );

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  for (const tx of sorted) {
    const isIncome = tx.kind === 'income';
    const categoryName = categoriesMap.get(tx.categoryId) || (isIncome ? 'Renda' : 'Despesa');

    let expenseTypeLabel = '-';
    let installmentLabel = '-';

    if (!isIncome) {
      if (tx.expenseType === 'fixed') expenseTypeLabel = 'Fixo';
      else if (tx.expenseType === 'variable') expenseTypeLabel = 'Variável';
      else if (tx.expenseType === 'installment') {
        expenseTypeLabel = 'Parcelado';
        installmentLabel = `${tx.installmentIndex || 1}/${tx.installmentTotal || 1}`;
      }
    }

    const signedAmount = isIncome ? tx.amount : -tx.amount;

    rows.push(
      [
        formatDateBR(tx.date),
        tx.monthKey,
        tx.name,
        isIncome ? 'Receita' : 'Despesa',
        categoryName,
        expenseTypeLabel,
        installmentLabel,
        formatNumberBR(signedAmount),
      ]
        .map(escapeCell)
        .join(';')
    );
  }

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const todayStr = now.toISOString().slice(0, 10).replace(/-/g, '_');
  triggerDownload(csvContent, `financas_pessoais_historico_completo_${todayStr}.csv`, 'text/csv;charset=utf-8;');
}

// 3. Export Full JSON Backup
export interface FullBackupPayload {
  version: string;
  exportedAt: string;
  appName: string;
  userProfile?: UserProfile;
  incomeCategories: Category[];
  expenseCategories: Category[];
  transactions: Transaction[];
  budgets: Record<string, number>;
  categoryBudgets: Record<string, number>;
  defaultBudget: number;
}

export function exportCompleteBackupJSON(payload: FullBackupPayload) {
  const jsonContent = JSON.stringify(payload, null, 2);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '_');
  triggerDownload(
    jsonContent,
    `financas_pessoais_backup_${dateStr}.json`,
    'application/json;charset=utf-8;'
  );
}
