import { createBrowserSupabase } from './supabase/client';
import { nextDocumentNumber } from './numbering';
import { quoteToInvoicePayload } from './conversion';
import type { DocumentRow, DocumentType } from './types';

export async function createDraft(orgId: string, type: DocumentType): Promise<string> {
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase.from('documents')
    .insert({ org_id: orgId, type })
    .select('id').single();
  if (error) throw error;
  await supabase.from('document_lines')
    .insert({ document_id: data.id, position: 0 });
  return data.id;
}

export async function sendDocument(docId: string): Promise<void> {
  const supabase = createBrowserSupabase();
  const { data: doc } = await supabase.from('documents')
    .select('*').eq('id', docId).single();
  if (!doc || doc.status !== 'brouillon') return;
  const year = new Date().getFullYear();
  const { data: rows } = await supabase.from('documents')
    .select('numero').eq('org_id', doc.org_id).eq('type', doc.type)
    .not('numero', 'is', null).like('numero', `${year}-%`);
  const last = (rows ?? [])
    .map((r) => r.numero as string)
    .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]))
    .pop() ?? null;
  const numero = nextDocumentNumber(last, year);
  const { error } = await supabase.from('documents')
    .update({ numero, status: 'envoyee' }).eq('id', docId);
  if (error) throw error; // collision d'index unique : réessayer
}

export async function convertQuote(quoteId: string): Promise<string> {
  const supabase = createBrowserSupabase();
  const { data: quote } = await supabase.from('documents')
    .select('*').eq('id', quoteId).single();
  if (!quote) throw new Error('Devis introuvable');
  const payload = quoteToInvoicePayload(quote as DocumentRow,
    new Date().toISOString().slice(0, 10));
  const { data: invoice, error } = await supabase.from('documents')
    .insert(payload).select('id').single();
  if (error) throw error;
  const { data: lines } = await supabase.from('document_lines')
    .select('label, quantity, unit_price_cents, position').eq('document_id', quoteId);
  if (lines?.length) {
    const { error: lineError } = await supabase.from('document_lines')
      .insert(lines.map((l) => ({ ...l, document_id: invoice.id })));
    if (lineError) throw lineError;
  }
  return invoice.id;
}
