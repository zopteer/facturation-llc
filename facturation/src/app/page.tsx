'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useOrg } from '@/lib/useOrg';
import { computeTotals, formatCents, type Currency } from '@/lib/money';
import { STATUS_LABELS, stampClass } from '@/lib/labels';
import type { DocumentLineRow, DocumentRow } from '@/lib/types';

export default function Dashboard() {
  const { orgId } = useOrg();
  const [unpaidByCurrency, setUnpaidByCurrency] = useState<Record<Currency, number>>({ EUR: 0, USD: 0 });
  const [recent, setRecent] = useState<DocumentRow[]>([]);

  useEffect(() => {
    if (!orgId) return;
    const supabase = createBrowserSupabase();
    supabase.from('documents').select('*, document_lines(*)')
      .eq('org_id', orgId).eq('type', 'facture').eq('status', 'impayee')
      .then(({ data }) => {
        const totals: Record<Currency, number> = { EUR: 0, USD: 0 };
        (data ?? []).forEach((d: DocumentRow & { document_lines: DocumentLineRow[] }) => {
          const t = computeTotals(
            d.document_lines.map((l) => ({ quantity: Number(l.quantity), unitPriceCents: l.unit_price_cents })),
            d.vat_na ? 0 : Number(d.vat_rate));
          totals[d.currency] += t.totalTTCCents;
        });
        setUnpaidByCurrency(totals);
      });
    supabase.from('documents').select('*').eq('org_id', orgId)
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setRecent(data ?? []));
  }, [orgId]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display mb-8 text-3xl">Tableau de bord</h1>
      <div className="card mb-8 p-5">
        <p className="eyebrow mb-2">Impayés</p>
        <p className="amount text-3xl">
          {formatCents(unpaidByCurrency.EUR, 'EUR')}
          {unpaidByCurrency.USD > 0 && <> + {formatCents(unpaidByCurrency.USD, 'USD')}</>}
        </p>
      </div>
      <p className="eyebrow mb-3">Derniers documents</p>
      <ul className="card divide-y divide-line">
        {recent.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 p-4">
            <Link href={`/documents/${d.id}`} className="link">
              {d.type === 'facture' ? 'Facture' : 'Devis'}{' '}
              <span className="amount">{d.numero ?? '(brouillon)'}</span>
            </Link>
            <span className={stampClass(d.status)}>{STATUS_LABELS[d.status]}</span>
          </li>
        ))}
        {recent.length === 0 && (
          <li className="p-4 text-sm text-sepia">
            Aucun document pour l’instant — créez votre première facture.
          </li>
        )}
      </ul>
      <div className="mt-6">
        <Link href="/documents" className="btn-primary inline-block">
          Voir tous les documents
        </Link>
      </div>
    </div>
  );
}
