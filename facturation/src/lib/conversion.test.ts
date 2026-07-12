import { describe, expect, it } from 'vitest';
import { quoteToInvoicePayload } from './conversion';
import type { DocumentRow } from './types';

const quote: DocumentRow = {
  id: 'q1', org_id: 'o1', type: 'devis', numero: '2026-007',
  client_id: 'c1', client_snapshot: { company: 'ACME' },
  issue_date: '2026-06-01', due_date: null, due_on_receipt: true,
  currency: 'USD', vat_rate: 0, vat_na: true, status: 'envoyee',
  payment_cheque: false, payment_transfer: true, footer: 'Merci',
  template: 'minimal-noir', quote_id: null, created_at: '2026-06-01T00:00:00Z',
};

describe('quoteToInvoicePayload', () => {
  it('crée un brouillon de facture lié au devis, sans numéro', () => {
    const inv = quoteToInvoicePayload(quote, '2026-07-09');
    expect(inv.type).toBe('facture');
    expect(inv.status).toBe('brouillon');
    expect(inv.numero).toBeNull();
    expect(inv.quote_id).toBe('q1');
    expect(inv.issue_date).toBe('2026-07-09');
    expect(inv.currency).toBe('USD');
    expect(inv.vat_na).toBe(true);
    expect(inv.client_id).toBe('c1');
    expect(inv.template).toBe('minimal-noir');
  });
});
