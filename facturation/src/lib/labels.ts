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
