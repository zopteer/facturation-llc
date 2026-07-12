import type { DocumentRow } from './types';

export function quoteToInvoicePayload(
  quote: DocumentRow,
  today: string,
): Omit<DocumentRow, 'id' | 'created_at'> {
  return {
    org_id: quote.org_id,
    type: 'facture',
    numero: null,
    client_id: quote.client_id,
    client_snapshot: quote.client_snapshot,
    issue_date: today,
    due_date: null,
    due_on_receipt: quote.due_on_receipt,
    currency: quote.currency,
    vat_rate: quote.vat_rate,
    vat_na: quote.vat_na,
    status: 'brouillon',
    payment_cheque: quote.payment_cheque,
    payment_transfer: quote.payment_transfer,
    footer: quote.footer,
    template: quote.template,
    quote_id: quote.id,
  };
}
