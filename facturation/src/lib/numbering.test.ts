import { describe, expect, it } from 'vitest';
import { nextDocumentNumber } from './numbering';

describe('nextDocumentNumber', () => {
  it('démarre à 001 sans numéro précédent', () => {
    expect(nextDocumentNumber(null, 2026)).toBe('2026-001');
  });
  it('incrémente le dernier numéro de la même année', () => {
    expect(nextDocumentNumber('2026-003', 2026)).toBe('2026-004');
    expect(nextDocumentNumber('2026-099', 2026)).toBe('2026-100');
  });
  it('repart à 001 en changeant d\'année', () => {
    expect(nextDocumentNumber('2025-042', 2026)).toBe('2026-001');
  });
  it('repart à 001 si le format est invalide', () => {
    expect(nextDocumentNumber('n/a', 2026)).toBe('2026-001');
  });
});
