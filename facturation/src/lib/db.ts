// Stockage local (navigateur) — remplace Supabase.
// Toutes les données vivent dans le localStorage de l'appareil.
import type {
  ClientRow, DocumentLineRow, DocumentRow, DocumentType, SettingsRow,
} from './types';
import { nextDocumentNumber } from './numbering';
import { DEFAULT_TEMPLATE } from './templates';

const KEY = {
  settings: 'fact_settings_v1',
  clients: 'fact_clients_v1',
  documents: 'fact_documents_v1',
  lines: 'fact_lines_v1',
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota dépassé ou stockage indisponible : silencieux
  }
}

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ---------------------------------------------------------------- */
/* Réglages                                                          */
/* ---------------------------------------------------------------- */

const DEFAULT_SETTINGS: SettingsRow = {
  company_name: '', company_id: '', address: '', postal_code: '', city: '',
  country: '', iban: '', bic: '', footer_default: '', late_penalty_enabled: false,
};

export function getSettings(): SettingsRow {
  return { ...DEFAULT_SETTINGS, ...read<Partial<SettingsRow>>(KEY.settings, {}) };
}

export function saveSettings(settings: SettingsRow): void {
  write(KEY.settings, settings);
}

/* ---------------------------------------------------------------- */
/* Clients                                                           */
/* ---------------------------------------------------------------- */

export function listClients(): ClientRow[] {
  return read<ClientRow[]>(KEY.clients, [])
    .slice()
    .sort((a, b) => a.company.localeCompare(b.company, 'fr'));
}

export function saveClient(
  data: Omit<ClientRow, 'id'>,
  id?: string | null,
): ClientRow {
  const all = read<ClientRow[]>(KEY.clients, []);
  if (id) {
    const idx = all.findIndex((c) => c.id === id);
    const updated: ClientRow = { ...data, id };
    if (idx >= 0) all[idx] = updated; else all.push(updated);
    write(KEY.clients, all);
    return updated;
  }
  const created: ClientRow = { ...data, id: uid() };
  all.push(created);
  write(KEY.clients, all);
  return created;
}

export function deleteClient(id: string): void {
  write(KEY.clients, read<ClientRow[]>(KEY.clients, []).filter((c) => c.id !== id));
}

/* ---------------------------------------------------------------- */
/* Documents + lignes                                                */
/* ---------------------------------------------------------------- */

export function listDocuments(): DocumentRow[] {
  return read<DocumentRow[]>(KEY.documents, [])
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function getDocument(id: string): DocumentRow | null {
  return read<DocumentRow[]>(KEY.documents, []).find((d) => d.id === id) ?? null;
}

function writeDocuments(docs: DocumentRow[]): void {
  write(KEY.documents, docs);
}

export function getLines(documentId: string): DocumentLineRow[] {
  return read<DocumentLineRow[]>(KEY.lines, [])
    .filter((l) => l.document_id === documentId)
    .sort((a, b) => a.position - b.position);
}

function writeLines(lines: DocumentLineRow[]): void {
  write(KEY.lines, lines);
}

export function createDraft(type: DocumentType): string {
  const docs = read<DocumentRow[]>(KEY.documents, []);
  const doc: DocumentRow = {
    id: uid(),
    type,
    numero: null,
    client_id: null,
    client_snapshot: {},
    issue_date: today(),
    due_date: null,
    due_on_receipt: false,
    currency: 'EUR',
    vat_rate: 0,
    vat_na: false,
    status: 'brouillon',
    payment_cheque: false,
    payment_transfer: true,
    footer: '',
    template: DEFAULT_TEMPLATE,
    quote_id: null,
    created_at: new Date().toISOString(),
  };
  docs.push(doc);
  writeDocuments(docs);

  const lines = read<DocumentLineRow[]>(KEY.lines, []);
  lines.push({ id: uid(), document_id: doc.id, label: '', quantity: 0, unit_price_cents: 0, position: 0 });
  writeLines(lines);

  return doc.id;
}

export function updateDocument(id: string, patch: Partial<DocumentRow>): void {
  const docs = read<DocumentRow[]>(KEY.documents, []);
  const idx = docs.findIndex((d) => d.id === id);
  if (idx < 0) return;
  docs[idx] = { ...docs[idx], ...patch };
  writeDocuments(docs);
}

export function deleteDocument(id: string): void {
  const doc = getDocument(id);
  if (!doc || doc.status !== 'brouillon') return; // on ne supprime qu'un brouillon
  writeDocuments(read<DocumentRow[]>(KEY.documents, []).filter((d) => d.id !== id));
  writeLines(read<DocumentLineRow[]>(KEY.lines, []).filter((l) => l.document_id !== id));
}

export function addLine(documentId: string): DocumentLineRow {
  const lines = read<DocumentLineRow[]>(KEY.lines, []);
  const position = lines.filter((l) => l.document_id === documentId).length;
  const line: DocumentLineRow = {
    id: uid(), document_id: documentId, label: '', quantity: 0, unit_price_cents: 0, position,
  };
  lines.push(line);
  writeLines(lines);
  return line;
}

export function updateLine(lineId: string, patch: Partial<DocumentLineRow>): void {
  const lines = read<DocumentLineRow[]>(KEY.lines, []);
  const idx = lines.findIndex((l) => l.id === lineId);
  if (idx < 0) return;
  lines[idx] = { ...lines[idx], ...patch };
  writeLines(lines);
}

// Numéro attribué au passage brouillon -> envoyée.
export function sendDocument(id: string): void {
  const doc = getDocument(id);
  if (!doc || doc.status !== 'brouillon') return;
  const year = new Date().getFullYear();
  const last = listDocuments()
    .filter((d) => d.type === doc.type && d.numero && d.numero.startsWith(`${year}-`))
    .map((d) => d.numero as string)
    .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]))
    .pop() ?? null;
  updateDocument(id, { numero: nextDocumentNumber(last, year), status: 'envoyee' });
}

function copyDocument(source: DocumentRow, overrides: Partial<DocumentRow>): string {
  const docs = read<DocumentRow[]>(KEY.documents, []);
  const copy: DocumentRow = {
    ...source,
    ...overrides,
    id: uid(),
    numero: null,
    status: 'brouillon',
    issue_date: today(),
    due_date: null,
    created_at: new Date().toISOString(),
  };
  docs.push(copy);
  writeDocuments(docs);

  const lines = read<DocumentLineRow[]>(KEY.lines, []);
  getLines(source.id).forEach((l) => {
    lines.push({ ...l, id: uid(), document_id: copy.id });
  });
  writeLines(lines);
  return copy.id;
}

export function duplicateDocument(id: string): string {
  const doc = getDocument(id);
  if (!doc) throw new Error('Document introuvable');
  return copyDocument(doc, { quote_id: null });
}

export function convertQuote(quoteId: string): string {
  const quote = getDocument(quoteId);
  if (!quote) throw new Error('Devis introuvable');
  return copyDocument(quote, { type: 'facture', quote_id: quote.id });
}

/* ---------------------------------------------------------------- */
/* Sauvegarde / Import (fichier .json)                               */
/* ---------------------------------------------------------------- */

export function exportData(): string {
  return JSON.stringify({
    version: 1,
    exported_at: new Date().toISOString(),
    settings: getSettings(),
    clients: read<ClientRow[]>(KEY.clients, []),
    documents: read<DocumentRow[]>(KEY.documents, []),
    lines: read<DocumentLineRow[]>(KEY.lines, []),
  }, null, 2);
}

export function importData(json: string): void {
  const data = JSON.parse(json);
  if (data.settings) write(KEY.settings, data.settings);
  if (Array.isArray(data.clients)) write(KEY.clients, data.clients);
  if (Array.isArray(data.documents)) write(KEY.documents, data.documents);
  if (Array.isArray(data.lines)) write(KEY.lines, data.lines);
}
