'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useOrg } from '@/lib/useOrg';
import { convertQuote, createDraft, sendDocument } from '@/lib/documents';
import { STATUS_LABELS, documentName, stampClass } from '@/lib/labels';
import type { DocumentRow, DocumentStatus, DocumentType } from '@/lib/types';

export default function DocumentsPage() {
  const { orgId } = useOrg();
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [typeFilter, setTypeFilter] = useState<'' | DocumentType>('');
  const [statusFilter, setStatusFilter] = useState<'' | DocumentStatus>('');

  const load = useCallback(() => {
    if (!orgId) return;
    let query = createBrowserSupabase().from('documents').select('*')
      .eq('org_id', orgId).order('created_at', { ascending: false });
    if (typeFilter) query = query.eq('type', typeFilter);
    if (statusFilter) query = query.eq('status', statusFilter);
    query.then(({ data }) => setDocs(data ?? []));
  }, [orgId, typeFilter, statusFilter]);

  useEffect(load, [load]);

  async function newDoc(type: DocumentType) {
    if (!orgId) return;
    router.push(`/documents/${await createDraft(orgId, type)}`);
  }

  async function setStatus(id: string, status: DocumentStatus) {
    await createBrowserSupabase().from('documents').update({ status }).eq('id', id);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce brouillon ?')) return;
    await createBrowserSupabase().from('documents').delete().eq('id', id).eq('status', 'brouillon');
    load();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl">Documents</h1>
        <div className="flex gap-2">
          <button onClick={() => newDoc('facture')} className="btn-primary">
            + Facture
          </button>
          <button onClick={() => newDoc('devis')} className="btn-ghost">
            + Devis
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <select className="field w-auto text-sm" value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as '' | DocumentType)}>
          <option value="">Tous les types</option>
          <option value="facture">Factures</option>
          <option value="devis">Devis</option>
        </select>
        <select className="field w-auto text-sm" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | DocumentStatus)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <ul className="card divide-y divide-line">
        {docs.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <Link href={`/documents/${d.id}`} className="link min-w-40 font-medium">
              {documentName(d)}
            </Link>
            <span className="text-sm text-sepia">
              {(d.client_snapshot?.company as string) || '—'} · <span className="amount">{d.issue_date}</span>
            </span>
            <span className={stampClass(d.status)}>{STATUS_LABELS[d.status]}</span>
            <span className="flex gap-3 text-sm">
              {d.status === 'brouillon' && (
                <>
                  <button className="link"
                    onClick={() => sendDocument(d.id).then(load).catch(() => alert('Échec de l\'envoi — réessayez.'))}>
                    Marquer envoyée
                  </button>
                  <button className="link text-margin" onClick={() => remove(d.id)}>Supprimer</button>
                </>
              )}
              {d.type === 'facture' && (d.status === 'envoyee' || d.status === 'impayee') && (
                <button className="link" onClick={() => setStatus(d.id, 'payee')}>
                  Marquer payée
                </button>
              )}
              {d.type === 'facture' && d.status === 'envoyee' && (
                <button className="link text-margin" onClick={() => setStatus(d.id, 'impayee')}>
                  Marquer impayée
                </button>
              )}
              {d.type === 'facture' && d.status !== 'brouillon' && d.status !== 'annulee' && (
                <button className="link text-faded" onClick={() => setStatus(d.id, 'annulee')}>
                  Annuler
                </button>
              )}
              {d.type === 'devis' && d.status !== 'brouillon' && (
                <button className="link"
                  onClick={async () => router.push(`/documents/${await convertQuote(d.id)}`)}>
                  Convertir en facture
                </button>
              )}
            </span>
          </li>
        ))}
        {docs.length === 0 && (
          <li className="p-4 text-sm text-sepia">Aucun document — créez une facture ou un devis ci-dessus.</li>
        )}
      </ul>
    </div>
  );
}
