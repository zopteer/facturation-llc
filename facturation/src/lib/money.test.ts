import { describe, expect, it } from 'vitest';
import { computeTotals, formatCents, lineTotalCents } from './money';

describe('lineTotalCents', () => {
  it('multiplie quantité × prix unitaire en centimes, arrondi', () => {
    expect(lineTotalCents({ quantity: 3, unitPriceCents: 1999 })).toBe(5997);
    expect(lineTotalCents({ quantity: 1.5, unitPriceCents: 333 })).toBe(500); // 499.5 → 500
  });
});

describe('computeTotals', () => {
  it('calcule HT, TVA arrondie et TTC', () => {
    const t = computeTotals([{ quantity: 3, unitPriceCents: 1999 }], 20);
    expect(t).toEqual({ totalHTCents: 5997, totalTVACents: 1199, totalTTCCents: 7196 });
  });
  it('TVA à 0 → TVA nulle, TTC = HT', () => {
    const t = computeTotals([{ quantity: 2, unitPriceCents: 5000 }], 0);
    expect(t).toEqual({ totalHTCents: 10000, totalTVACents: 0, totalTTCCents: 10000 });
  });
  it('liste vide → tout à zéro', () => {
    expect(computeTotals([], 20)).toEqual({ totalHTCents: 0, totalTVACents: 0, totalTTCCents: 0 });
  });
});

describe('formatCents', () => {
  it('formate en euros (fr-FR) et dollars (en-US)', () => {
    expect(formatCents(123456, 'EUR')).toBe('1 234,56 €');
    expect(formatCents(1593000, 'EUR')).toBe('15 930,00 €');
    expect(formatCents(123456, 'USD')).toBe('$1,234.56');
  });
});
