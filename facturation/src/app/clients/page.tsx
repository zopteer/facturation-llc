'use client';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useOrg } from '@/lib/useOrg';
import type { ClientRow } from '@/lib/types';

const EMPTY: Omit<ClientRow, 'id' | 'org_id'> = {
  company: '', company_id: '', first_name: '', last_name: '', address: '',
  postal_code: '', city: '', country: '', email: '',
};

const FIELDS: Array<{ key: keyof typeof EMPTY; label: string }> = [
  { key: 'company', label: 'Société' }, { key: 'company_id', label: 'SIRET / SIREN / EIN' },
  { key: 'first_name', label: 'Prénom' },
  { key: 'last_name', label: 'Nom' }, { key: 'address', label: 'Adresse' },
  { key: 'postal_code', label: 'Code postal' }, { key: 'city', label: 'Ville' },
  { key: 'country', label: 'Pays' }, { key: 'email', label: 'Email' },
];

export default function ClientsPage() {
  const { orgId } = useOrg();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!orgId) return;
    createBrowserSupabase().from('clients').select('*')
      .eq('org_id', orgId).order('company')
      .then(({ data }) => setClients(data ?? []));
  }, [orgId]);

  useEffect(load, [load]);

  async function remove(id: string) {
    if (!confirm('Supprimer ce client ? Les factures déjà émises conservent ses coordonnées.')) return;
    await createBrowserSupabase().from('clients').delete().eq('id', id);
    if (editingId === id) {
      setForm(EMPTY);
      setEditingId(null);
    }
    load();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createBrowserSupabase();
    const { error } = editingId
      ? await supabase.from('clients').update(form).eq('id', editingId)
      : await supabase.from('clients').insert({ ...form, org_id: orgId });
    if (error) {
      alert(`Échec de l'enregistrement du client : ${error.message}`);
      return;
    }
    setForm(EMPTY);
    setEditingId(null);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title">Clients</h1>
      <form onSubmit={save} className="card mb-8 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <p className="eyebrow sm:col-span-2">
          {editingId ? 'Modifier le client' : 'Nouveau client'}
        </p>
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="block text-sm text-sepia">
            {label}
            <input className="field mt-1" value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </label>
        ))}
        <div className="sm:col-span-2">
          <button className="btn-primary">
            {editingId ? 'Modifier' : 'Ajouter'} le client
          </button>
          {editingId && (
            <button type="button" className="link ml-3 text-sm"
              onClick={() => { setForm(EMPTY); setEditingId(null); }}>
              Annuler
            </button>
          )}
        </div>
      </form>
      <ul className="card divide-y divide-line">
        {clients.map((c) => (
          <li key={c.id} className="row-hover flex items-center justify-between p-4">
            <div>
              <p className="font-medium">
                {c.company || `${c.first_name} ${c.last_name}`.trim() || 'Client sans nom'}
              </p>
              <p className="text-sm text-sepia">{c.city} {c.email && `· ${c.email}`}</p>
            </div>
            <span className="flex gap-3">
              <button className="link text-sm"
                onClick={() => { setEditingId(c.id); const { id: _id, org_id: _orgId, ...rest } = c; setForm(rest); }}>
                Modifier
              </button>
              <button className="link text-margin text-sm" onClick={() => remove(c.id)}>
                Supprimer
              </button>
            </span>
          </li>
        ))}
        {clients.length === 0 && (
          <li className="p-4 text-sm text-sepia">Aucun client pour l'instant — ajoutez-en un ci-dessus.</li>
        )}
      </ul>
    </div>
  );
}
