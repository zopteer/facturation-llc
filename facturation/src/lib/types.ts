import type { Currency } from './money';

export type DocumentType = 'facture' | 'devis';
export type DocumentStatus = 'brouillon' | 'envoyee' | 'payee' | 'impayee' | 'annulee';

export interface ClientRow {
  id: string;
  company: string;
  company_id: string;          // SIRET / SIREN / EIN
  first_name: string;
  last_name: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  email: string;
}

export interface DocumentRow {
  id: string;
  type: DocumentType;
  numero: string | null;
  client_id: string | null;
  client_snapshot: Partial<ClientRow>;
  issue_date: string;          // 'YYYY-MM-DD'
  due_date: string | null;
  due_on_receipt: boolean;
  currency: Currency;
  vat_rate: number;            // pourcentage, 0–100
  vat_na: boolean;             // TVA non applicable
  status: DocumentStatus;
  payment_cheque: boolean;
  payment_transfer: boolean;
  footer: string;
  template: string;            // id de modèle PDF (voir lib/templates.ts)
  quote_id: string | null;
  created_at: string;
}

export interface DocumentLineRow {
  id: string;
  document_id: string;
  label: string;
  quantity: number;
  unit_price_cents: number;
  position: number;
}

export interface SettingsRow {
  company_name: string;
  company_id: string;          // SIRET / EIN
  address: string;
  postal_code: string;
  city: string;
  country: string;
  iban: string;
  bic: string;
  footer_default: string;
  late_penalty_enabled: boolean;
}
