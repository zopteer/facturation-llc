'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listDocuments, getLines } from '@/lib/db';
import { computeTotals, formatCents, type Currency } from '@/lib/money';
import { STATUS_LABELS, documentName, stampClass } from '@/lib/labels';
import type { DocumentRow } from '@/lib/types';

export default function Dashboard() {
  const [unpaidByCurrency, setUnpaidByCurrency] = useState<Record<Currency, number>>({ EUR: 0, USD: 0 });
  const [recent, setRecent] = useState<DocumentRow[]>([]);

  useEffect(() => {
    const all = listDocuments();
    const totals: Record<Currency, number> = { EUR: 0, USD: 0 };
    all
      .filter((d) => d.type === 'facture' && d.status === 'impayee')
      .forEach((d) => {
        const t = computeTotals(
          getLines(d.id).map((l) => ({ quantity: Number(l.quantity), unitPriceCents: l.unit_price_cents })),
          d.vat_na ? 0 : Number(d.vat_rate));
        totals[d.currency] += t.totalTTCCents;
      });
    setUnpaidByCurrency(totals);
    setRecent(all.slice(0, 5));
  }, []);

  const unpaidTotal = unpaidByCurrency.EUR + unpaidByCurrency.USD;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title">Tableau de bord</h1>
      <div className="card mb-8 p-5">
        <p className="eyebrow mb-2">Impayés</p>
        <p className={`amount readout text-4xl ${unpaidTotal > 0 ? 'text-margin' : 'text-sheet'}`}>
          {formatCents(unpaidByCurrency.EUR, 'EUR')}
          {unpaidByCurrency.USD > 0 && <> + {formatCents(unpaidByCurrency.USD, 'USD')}</>}
        </p>
      </div>
      <p className="eyebrow mb-3">Derniers documents</p>
      <ul className="card divide-y divide-line">
        {recent.map((d) => (
          <li key={d.id} className="row-hover flex items-center justify-between gap-3 p-4">
            <Link href={`/documents/edit?id=${d.id}`} className="link">
              {documentName(d)}
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
