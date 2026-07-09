'use client';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { computeTotals, formatCents } from '@/lib/money';
import type { ClientRow, DocumentLineRow, DocumentRow } from '@/lib/types';

export default function DocumentEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [lines, setLines] = useState<DocumentLineRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.from('documents').select('*').eq('id', id).single()
      .then(({ data }) => setDoc(data));
    supabase.from('document_lines').select('*').eq('document_id', id).order('position')
      .then(({ data }) => setLines(data ?? []));
    supabase.from('clients').select('*').order('company')
      .then(({ data }) => setClients(data ?? []));
  }, [id]);

  const scheduleSave = useCallback((nextDoc: DocumentRow, nextLines: DocumentLineRow[]) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      const supabase = createBrowserSupabase();
      const { id: _id, created_at: _c, ...docFields } = nextDoc;
      await supabase.from('documents').update(docFields).eq('id', nextDoc.id);
      for (const line of nextLines) {
        const { id: lineId, ...lineFields } = line;
        await supabase.from('document_lines').update(lineFields).eq('id', lineId);
      }
      setSaving(false);
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

  if (!doc) return <p>Chargement…</p>;
  const readOnly = doc.status !== 'brouillon';
  const totals = computeTotals(
    lines.map((l) => ({ quantity: Number(l.quantity), unitPriceCents: l.unit_price_cents })),
    doc.vat_na ? 0 : Number(doc.vat_rate),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {doc.type === 'facture' ? 'Facture' : 'Devis'} {doc.numero ?? '(brouillon)'}
        </h1>
        <span className="text-sm text-gray-500">{saving ? 'Enregistrement…' : 'Enregistré'}</span>
      </div>
      {readOnly && (
        <p className="rounded bg-yellow-50 p-2 text-sm text-yellow-800">
          Document {doc.status} — lecture seule.
        </p>
      )}

      <fieldset disabled={readOnly} className="space-y-6">
        <section className="rounded border p-4">
          <h2 className="mb-3 font-semibold">Client</h2>
          <select className="w-full rounded border p-2" value={doc.client_id ?? ''}
            onChange={(e) => selectClient(e.target.value)}>
            <option value="">— Choisir un client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company || `${c.first_name} ${c.last_name}`}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-500">
            Ajoutez de nouveaux clients dans l’onglet Clients.
          </p>
        </section>

        <section className="rounded border p-4">
          <h2 className="mb-3 font-semibold">Paramètres</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">Date d’émission
              <input type="date" className="mt-1 w-full rounded border p-2" value={doc.issue_date}
                onChange={(e) => patchDoc({ issue_date: e.target.value })} />
            </label>
            <label className="text-sm">Date d’échéance
              <input type="date" className="mt-1 w-full rounded border p-2"
                value={doc.due_date ?? ''} min={doc.issue_date} disabled={doc.due_on_receipt}
                onChange={(e) => patchDoc({ due_date: e.target.value || null })} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={doc.due_on_receipt}
                onChange={(e) => patchDoc({ due_on_receipt: e.target.checked, due_date: null })} />
              Échéance à réception
            </label>
            <label className="text-sm">Devise
              <select className="mt-1 w-full rounded border p-2" value={doc.currency}
                onChange={(e) => patchDoc({ currency: e.target.value as DocumentRow['currency'] })}>
                <option value="EUR">€ Euro</option>
                <option value="USD">$ Dollar US</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={doc.vat_na}
                onChange={(e) => patchDoc({ vat_na: e.target.checked, vat_rate: 0 })} />
              TVA non applicable
            </label>
            {!doc.vat_na && (
              <label className="text-sm">Taux de TVA (%)
                <input type="number" min={0} max={100} className="mt-1 w-full rounded border p-2"
                  value={doc.vat_rate}
                  onChange={(e) => patchDoc({ vat_rate: Number(e.target.value) })} />
              </label>
            )}
          </div>
        </section>

        <section className="rounded border p-4">
          <h2 className="mb-3 font-semibold">Produits</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="p-1">Désignation</th>
                  <th className="p-1 w-24">Quantité</th>
                  <th className="p-1 w-32">Prix unitaire HT</th>
                  <th className="p-1 w-28 text-right">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="p-1">
                      <input className="w-full rounded border p-2" value={l.label}
                        placeholder="Description du produit"
                        onChange={(e) => patchLine(l.id, { label: e.target.value })} />
                    </td>
                    <td className="p-1">
                      <input type="number" min={0} className="w-full rounded border p-2"
                        value={l.quantity}
                        onChange={(e) => patchLine(l.id, { quantity: Number(e.target.value) })} />
                    </td>
                    <td className="p-1">
                      <input type="number" min={0} step="0.01" className="w-full rounded border p-2"
                        value={l.unit_price_cents / 100}
                        onChange={(e) =>
                          patchLine(l.id, { unit_price_cents: Math.round(Number(e.target.value) * 100) })} />
                    </td>
                    <td className="p-1 text-right">
                      {formatCents(Math.round(Number(l.quantity) * l.unit_price_cents), doc.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addLine} className="mt-2 rounded border px-3 py-1 text-sm">
            + Ajouter une ligne
          </button>
          <div className="mt-4 ml-auto w-56 space-y-1 text-sm">
            <p className="flex justify-between"><span>Total HT</span><span>{formatCents(totals.totalHTCents, doc.currency)}</span></p>
            <p className="flex justify-between"><span>Total TVA</span><span>{formatCents(totals.totalTVACents, doc.currency)}</span></p>
            <p className="flex justify-between font-bold"><span>Total TTC</span><span>{formatCents(totals.totalTTCCents, doc.currency)}</span></p>
          </div>
        </section>

        <section className="rounded border p-4">
          <h2 className="mb-3 font-semibold">Paiement & footer</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={doc.payment_cheque}
              onChange={(e) => patchDoc({ payment_cheque: e.target.checked })} />
            Par chèque
          </label>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={doc.payment_transfer}
              onChange={(e) => patchDoc({ payment_transfer: e.target.checked })} />
            Par virement (IBAN/BIC des réglages)
          </label>
          <label className="mt-3 block text-sm">Footer
            <input className="mt-1 w-full rounded border p-2" value={doc.footer}
              onChange={(e) => patchDoc({ footer: e.target.value })} />
          </label>
        </section>
      </fieldset>
    </div>
  );
}
