'use client';
import { pdf } from '@react-pdf/renderer';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { DocumentPdf } from './DocumentPdf';
import type { DocumentLineRow, DocumentRow, SettingsRow } from '@/lib/types';

export function PdfExportButton({ doc, lines }: { doc: DocumentRow; lines: DocumentLineRow[] }) {
  async function download() {
    const { data: settings, error } = await createBrowserSupabase()
      .from('settings').select('*').eq('org_id', doc.org_id).single();
    if (error || !settings) {
      alert('Impossible de charger les réglages — PDF non généré.');
      return;
    }
    const blob = await pdf(
      <DocumentPdf doc={doc} lines={lines} settings={settings as SettingsRow} />,
    ).toBlob();
    const label = doc.type === 'facture' ? 'Facture' : 'Devis';
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${label}-${doc.numero ?? doc.issue_date}.pdf`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <button onClick={download} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
      Exporter en PDF
    </button>
  );
}
