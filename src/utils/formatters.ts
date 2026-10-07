export function formatCurrency(value: number, hide = false): string {
  if (hide) return 'R$ •••••';
  if (isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactCurrency(value: number, hide = false): string {
  if (hide) return 'R$ •••••';
  if (isNaN(value)) return 'R$ 0';
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (Math.abs(value) >= 10_000) {
    return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')}k`;
  }
  return formatCurrency(value);
}

export function formatPercent(value: number): string {
  if (isNaN(value)) return '0%';
  return `${value.toFixed(1).replace('.', ',')}%`;
}
