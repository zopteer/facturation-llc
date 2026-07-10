'use client';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { computeTotals, formatCents } from '@/lib/money';
import { PdfExportButton } from '@/components/PdfExportButton';
import { STATUS_LABELS } from '@/lib/labels';
import type { ClientRow, DocumentLineRow, DocumentRow } from '@/lib/types';

export default function DocumentEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [lines, setLines] = useState<DocumentLineRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.from('documents').select('*').eq('id', id).single()
      .then(({ data }) => setDoc(data));
    supabase.from('document_lines').select('*').eq('document_id', id).order('position')
      .then(({ data }) => setLines(data ?? []));
    supabase.from('clients').select('*').order('company')
      .then(({ data }) => setClients(data ?? []));
  }, [id]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const scheduleSave = useCallback((nextDoc: DocumentRow, nextLines: DocumentLineRow[]) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const doSave = async () => {
        setSaving(true);
        let hadError = false;
        const supabase = createBrowserSupabase();
        const {
          client_id, client_snapshot, issue_date, due_date, due_on_receipt,
          currency, vat_rate, vat_na, payment_cheque, payment_transfer, footer,
        } = nextDoc;
        const docFields = {
          client_id, client_snapshot, issue_date, due_date, due_on_receipt,
          currency, vat_rate, vat_na, payment_cheque, payment_transfer, footer,
        };
        const { error: docError } = await supabase.from('documents').update(docFields)
          .eq('id', nextDoc.id).eq('status', 'brouillon');
        if (docError) hadError = true;
        for (const line of nextLines) {
          const { id: lineId, ...lineFields } = line;
          const { error: lineError } = await supabase.from('document_lines').update(lineFields).eq('id', lineId);
          if (lineError) hadError = true;
        }
        setSaveError(hadError);
        setSaving(false);
      };
      saveChain.current = saveChain.current.then(doSave);
    }, 1000);
  }, []);

  function patchDoc(patch: Partial<DocumentRow>) {
    if (!doc) return;
    const next = { ...doc, ...patch };
    setDoc(next);
    scheduleSave(next, lines);
  }

  function patchLine(lineId: string, patch: Partial<DocumentLineRow>) {
    const next = lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l));
    setLines(next);
    if (doc) scheduleSave(doc, next);
  }

  async function addLine() {
    const { data } = await createBrowserSupabase().from('document_lines')
      .insert({ document_id: id, position: lines.length })
      .select('*').single();
    if (data) setLines([...lines, data]);
  }

  async function selectClient(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    patchDoc({ client_id: clientId || null, client_snapshot: client ?? {} });
  }

  if (!doc) return <p className="text-sepia">Chargement…</p>;
  const readOnly = doc.status !== 'brouillon';
  const totals = computeTotals(
    lines.map((l) => ({ quantity: Number(l.quantity), unitPriceCents: l.unit_price_cents })),
    doc.vat_na ? 0 : Number(doc.vat_rate),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">
          {doc.type === 'facture' ? 'Facture' : 'Devis'}{' '}
          <span className="amount text-2xl">{doc.numero ?? '(brouillon)'}</span>
        </h1>
        <div className="flex items-center gap-4">
          <span className={`text-sm ${saveError ? 'text-margin' : 'text-sepia'}`}>
            {saving ? 'Enregistrement…' : saveError ? "Erreur d'enregistrement" : 'Enregistré'}
          </span>
          <PdfExportButton doc={doc} lines={lines} />
        </div>
      </div>
      {readOnly && (
        <p className="card border-l-2 border-l-margin p-3 text-sm text-sepia">
          Document {STATUS_LABELS[doc.status].toLowerCase()} — lecture seule.
        </p>
      )}

      <fieldset disabled={readOnly} className="space-y-6">
        <section className="card p-5">
          <h2 className="eyebrow mb-4">Client</h2>
          <select className="field" value={doc.client_id ?? ''}
            onChange={(e) => selectClient(e.target.value)}>
            <option value="">— Choisir un client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company || `${c.first_name} ${c.last_name}`}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-faded">
            Ajoutez de nouveaux clients dans l’onglet Clients.
          </p>
        </section>

        <section className="card p-5">
          <h2 className="eyebrow mb-4">Paramètres</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm text-sepia">Date d’émission
              <input type="date" className="field amount mt-1" value={doc.issue_date}
                onChange={(e) => patchDoc({ issue_date: e.target.value })} />
            </label>
            <label className="text-sm text-sepia">Date d’échéance
              <input type="date" className="field amount mt-1"
                value={doc.due_date ?? ''} min={doc.issue_date} disabled={doc.due_on_receipt}
                onChange={(e) => patchDoc({ due_date: e.target.value || null })} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-ledger" checked={doc.due_on_receipt}
                onChange={(e) => patchDoc({ due_on_receipt: e.target.checked, due_date: null })} />
              Échéance à réception
            </label>
            <label className="text-sm text-sepia">Devise
              <select className="field mt-1" value={doc.currency}
                onChange={(e) => patchDoc({ currency: e.target.value as DocumentRow['currency'] })}>
                <option value="EUR">€ Euro</option>
                <option value="USD">$ Dollar US</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-ledger" checked={doc.vat_na}
                onChange={(e) => patchDoc({ vat_na: e.target.checked, vat_rate: 0 })} />
              TVA non applicable
            </label>
            {!doc.vat_na && (
              <label className="text-sm text-sepia">Taux de TVA (%)
                <input type="number" min={0} max={100} className="field amount mt-1"
                  value={doc.vat_rate}
                  onChange={(e) => patchDoc({ vat_rate: Number(e.target.value) })} />
              </label>
            )}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="eyebrow mb-4">Produits</h2>
          <div className="ledger overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="ledger-row text-left">
                  <th className="eyebrow p-2 font-semibold">Désignation</th>
                  <th className="eyebrow w-24 p-2 font-semibold">Quantité</th>
                  <th className="eyebrow w-32 p-2 font-semibold">Prix unitaire HT</th>
                  <th className="eyebrow w-28 p-2 text-right font-semibold">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="ledger-row">
                    <td className="p-2">
                      <input className="field" value={l.label}
                        placeholder="Description du produit"
                        onChange={(e) => patchLine(l.id, { label: e.target.value })} />
                    </td>
                    <td className="p-2">
                      <input type="number" min={0} className="field amount"
                        value={l.quantity}
                        onChange={(e) => patchLine(l.id, { quantity: Number(e.target.value) })} />
                    </td>
                    <td className="p-2">
                      <input type="number" min={0} step="0.01" className="field amount"
                        value={l.unit_price_cents / 100}
                        onChange={(e) =>
                          patchLine(l.id, { unit_price_cents: Math.round(Number(e.target.value) * 100) })} />
                    </td>
                    <td className="amount p-2 text-right">
                      {formatCents(Math.round(Number(l.quantity) * l.unit_price_cents), doc.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addLine} className="btn-ghost mt-3">
            + Ajouter une ligne
          </button>
          <div className="mt-5 ml-auto w-60 space-y-1 text-sm">
            <p className="flex justify-between text-sepia"><span>Total HT</span><span className="amount">{formatCents(totals.totalHTCents, doc.currency)}</span></p>
            <p className="flex justify-between text-sepia"><span>Total TVA</span><span className="amount">{formatCents(totals.totalTVACents, doc.currency)}</span></p>
            <p className="ledger-row flex justify-between pb-1 font-semibold"><span>Total TTC</span><span className="amount">{formatCents(totals.totalTTCCents, doc.currency)}</span></p>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="eyebrow mb-4">Paiement & footer</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-ledger" checked={doc.payment_cheque}
              onChange={(e) => patchDoc({ payment_cheque: e.target.checked })} />
            Par chèque
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-ledger" checked={doc.payment_transfer}
              onChange={(e) => patchDoc({ payment_transfer: e.target.checked })} />
            Par virement (IBAN/BIC des réglages)
          </label>
          <label className="mt-4 block text-sm text-sepia">Footer
            <input className="field mt-1" value={doc.footer}
              onChange={(e) => patchDoc({ footer: e.target.value })} />
          </label>
        </section>
      </fieldset>
    </div>
  );
}
