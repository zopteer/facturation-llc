import type { DocumentStatus } from './types';

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  payee: 'Payée',
  impayee: 'Impayée',
  annulee: 'Annulée',
};

export function stampClass(status: DocumentStatus): string {
  return `stamp stamp-${status}`;
}

export function formatDateFr(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function documentName(d: { type: 'facture' | 'devis'; numero: string | null; issue_date: string }): string {
  const label = d.type === 'facture' ? 'Facture' : 'Devis';
  return d.numero ? `${label} ${d.numero}` : `${label} du ${formatDateFr(d.issue_date)}`;
}
