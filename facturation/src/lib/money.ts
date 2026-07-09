export type Currency = 'EUR' | 'USD';

export interface Line {
  quantity: number;
  unitPriceCents: number;
}

export interface Totals {
  totalHTCents: number;
  totalTVACents: number;
  totalTTCCents: number;
}

export function lineTotalCents(line: Line): number {
  return Math.round(line.quantity * line.unitPriceCents);
}

export function computeTotals(lines: Line[], vatRatePercent: number): Totals {
  const totalHTCents = lines.reduce((sum, l) => sum + lineTotalCents(l), 0);
  const totalTVACents = Math.round((totalHTCents * vatRatePercent) / 100);
  return { totalHTCents, totalTVACents, totalTTCCents: totalHTCents + totalTVACents };
}

export function formatCents(cents: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === 'EUR' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
