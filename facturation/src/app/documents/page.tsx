'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  listDocuments, createDraft, updateDocument, deleteDocument,
  sendDocument, convertQuote, duplicateDocument,
} from '@/lib/db';
import { STATUS_LABELS, documentName, formatDateFr, stampClass } from '@/lib/labels';
import type { DocumentRow, DocumentStatus, DocumentType } from '@/lib/types';

export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [typeFilter, setTypeFilter] = useState<'' | DocumentType>('');
  const [statusFilter, setStatusFilter] = useState<'' | DocumentStatus>('');

  const load = useCallback(() => {
    let rows = listDocuments();
    if (typeFilter) rows = rows.filter((d) => d.type === typeFilter);
    if (statusFilter) rows = rows.filter((d) => d.status === statusFilter);
    setDocs(rows);
  }, [typeFilter, statusFilter]);

  useEffect(load, [load]);

  function newDoc(type: DocumentType) {
    router.push(`/documents/edit?id=${createDraft(type)}`);
  }

  function setStatus(id: string, status: DocumentStatus) {
    updateDocument(id, { status });
    load();
  }

  function remove(id: string) {
    if (!confirm('Supprimer ce brouillon ?')) return;
    deleteDocument(id);
    load();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="page-title mb-0 flex-1">Documents</h1>
        <div className="flex gap-2 pb-1">
          <button onClick={() => newDoc('facture')} className="btn-primary">+ Facture</button>
          <button onClick={() => newDoc('devis')} className="btn-ghost">+ Devis</button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <select className="select w-auto text-sm" value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as '' | DocumentType)}>
          <option value="">Tous les types</option>
          <option value="facture">Factures</option>
          <option value="devis">Devis</option>
        </select>
        <select className="select w-auto text-sm" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | DocumentStatus)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <ul className="card divide-y divide-line">
        {docs.map((d) => (
          <li key={d.id} className="row-hover flex flex-wrap items-start justify-between gap-x-4 gap-y-2 p-4">
            <span className="min-w-44 flex-1">
              <Link href={`/documents/edit?id=${d.id}`} className="link font-medium">
                {documentName(d)}
              </Link>
              <span className="mt-1 block text-sm text-sepia">
                {(d.client_snapshot?.company as string) || 'Sans client'} · <span className="amount">{formatDateFr(d.issue_date)}</span>
              </span>
            </span>
            <span className={stampClass(d.status)}>{STATUS_LABELS[d.status]}</span>
            <span className="flex w-full flex-wrap gap-x-4 gap-y-1 text-sm sm:w-auto">
              {d.status === 'brouillon' && (
                <>
                  <button className="link" onClick={() => { sendDocument(d.id); load(); }}>
                    Marquer envoyée
                  </button>
                  <button className="link text-margin" onClick={() => remove(d.id)}>Supprimer</button>
                </>
              )}
              {d.type === 'facture' && (d.status === 'envoyee' || d.status === 'impayee') && (
                <button className="link" onClick={() => setStatus(d.id, 'payee')}>Marquer payée</button>
              )}
              {d.type === 'facture' && d.status === 'envoyee' && (
                <button className="link text-margin" onClick={() => setStatus(d.id, 'impayee')}>Marquer impayée</button>
              )}
              {d.type === 'facture' && d.status !== 'brouillon' && d.status !== 'annulee' && (
                <button className="link text-faded" onClick={() => setStatus(d.id, 'annulee')}>Annuler</button>
              )}
              {d.type === 'devis' && d.status !== 'brouillon' && (
                <button className="link" onClick={() => router.push(`/documents/edit?id=${convertQuote(d.id)}`)}>
                  Convertir en facture
                </button>
              )}
              {d.status !== 'brouillon' && (
                <button className="link" onClick={() => router.push(`/documents/edit?id=${duplicateDocument(d.id)}`)}>
                  Dupliquer
                </button>
              )}
            </span>
          </li>
        ))}
        {docs.length === 0 && (
          <li className="p-4 text-sm text-sepia">Aucun document — créez une facture ou un devis ci-dessus.</li>
        )}
      </ul>

      {/* Boutons flottants mobile */}
      <div className="fixed right-5 z-30 flex items-center gap-2 sm:hidden"
        style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <button onClick={() => newDoc('devis')} aria-label="Nouveau devis"
          className="btn-ghost flex items-center gap-1.5 px-4 py-3 shadow-xl backdrop-blur"
          style={{ borderRadius: 999, background: 'rgba(14,20,36,0.9)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Devis
        </button>
        <button onClick={() => newDoc('facture')} aria-label="Nouvelle facture"
          className="btn-primary flex items-center gap-1.5 px-5 py-3 shadow-xl"
          style={{ borderRadius: 999 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Facture
        </button>
      </div>
    </div>
  );
}
