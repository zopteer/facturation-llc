'use client';
import { pdf } from '@react-pdf/renderer';
import { getSettings, listClients } from '@/lib/db';
import { DocumentPdf } from './DocumentPdf';
import type { ClientRow, DocumentLineRow, DocumentRow } from '@/lib/types';

export function PdfExportButton({ doc, lines, label = 'Exporter en PDF', className = 'btn-primary' }: {
  doc: DocumentRow; lines: DocumentLineRow[]; label?: string; className?: string;
}) {
  async function download() {
    const settings = getSettings();

    // Complète les coordonnées manquantes du client depuis le carnet
    // (ex. SIRET ajouté après la création du document).
    let docForPdf = doc;
    if (doc.client_id) {
      const client = listClients().find((c) => c.id === doc.client_id);
      if (client) {
        const filled = Object.fromEntries(
          Object.entries(doc.client_snapshot ?? {}).filter(([, v]) => v !== '' && v != null),
        ) as Partial<ClientRow>;
        docForPdf = { ...doc, client_snapshot: { ...client, ...filled } };
      }
    }

    const blob = await pdf(<DocumentPdf doc={docForPdf} lines={lines} settings={settings} />).toBlob();
    const label = doc.type === 'facture' ? 'Facture' : 'Devis';
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${label}-${doc.numero ?? doc.issue_date}.pdf`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  }

  return (
    <button onClick={download} className={className}>{label}</button>
  );
}
