'use client';
import { pdf } from '@react-pdf/renderer';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { DocumentPdf } from './DocumentPdf';
import type { ClientRow, DocumentLineRow, DocumentRow, SettingsRow } from '@/lib/types';

export function PdfExportButton({ doc, lines }: { doc: DocumentRow; lines: DocumentLineRow[] }) {
  async function download() {
    const supabase = createBrowserSupabase();
    const { data: settings, error } = await supabase
      .from('settings').select('*').eq('org_id', doc.org_id).single();
    if (error || !settings) {
      alert('Impossible de charger les réglages — PDF non généré.');
      return;
    }

    // Complète les coordonnées manquantes du snapshot depuis le carnet de
    // clients (ex. SIRET ajouté après la création du document). Les valeurs
    // déjà figées dans le snapshot restent prioritaires.
    let docForPdf = doc;
    if (doc.client_id) {
      const { data: client } = await supabase
        .from('clients').select('*').eq('id', doc.client_id).maybeSingle();
      if (client) {
        const snapshotFilled = Object.fromEntries(
          Object.entries(doc.client_snapshot ?? {}).filter(([, v]) => v !== '' && v != null),
        ) as Partial<ClientRow>;
        docForPdf = { ...doc, client_snapshot: { ...client, ...snapshotFilled } };
      }
    }

    const blob = await pdf(
      <DocumentPdf doc={docForPdf} lines={lines} settings={settings as SettingsRow} />,
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
    <button onClick={download} className="btn-primary">
      Exporter en PDF
    </button>
  );
}
