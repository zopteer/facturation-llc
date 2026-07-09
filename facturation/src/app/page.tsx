'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useOrg } from '@/lib/useOrg';
import { computeTotals, formatCents, type Currency } from '@/lib/money';
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
      <h1 className="mb-6 text-2xl font-bold">Tableau de bord</h1>
      <div className="mb-8 rounded border p-4">
        <p className="text-sm text-gray-500">Impayés</p>
        <p className="text-2xl font-bold">
          {formatCents(unpaidByCurrency.EUR, 'EUR')}
          {unpaidByCurrency.USD > 0 && <> + {formatCents(unpaidByCurrency.USD, 'USD')}</>}
        </p>
      </div>
      <h2 className="mb-2 font-semibold">Derniers documents</h2>
      <ul className="divide-y rounded border">
        {recent.map((d) => (
          <li key={d.id} className="p-3">
            <Link href={`/documents/${d.id}`} className="text-blue-700 hover:underline">
              {d.type === 'facture' ? 'Facture' : 'Devis'} {d.numero ?? '(brouillon)'} — {d.status}
            </Link>
          </li>
        ))}
        {recent.length === 0 && <li className="p-3 text-sm text-gray-500">Aucun document.</li>}
      </ul>
      <div className="mt-6 flex gap-2">
        <Link href="/documents" className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
          Voir tous les documents
        </Link>
      </div>
    </div>
  );
}
