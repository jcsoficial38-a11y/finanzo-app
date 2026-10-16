export function formatCurrency(value?: number | null, hide = false): string {
  if (hide) return 'R$ •••••';
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `R$ ${(value || 0).toFixed(2).replace('.', ',')}`;
  }
}

export function formatCompactCurrency(value?: number | null, hide = false): string {
  if (hide) return 'R$ •••••';
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0';
  try {
    if (Math.abs(value) >= 1_000_000) {
      return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
    }
    if (Math.abs(value) >= 10_000) {
      return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')}k`;
    }
    return formatCurrency(value);
  } catch {
    return 'R$ 0';
  }
}

export function formatPercent(value?: number | null): string {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value.toFixed(1).replace('.', ',')}%`;
}
