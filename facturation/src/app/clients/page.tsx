'use client';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useOrg } from '@/lib/useOrg';
import type { ClientRow } from '@/lib/types';

const EMPTY: Omit<ClientRow, 'id' | 'org_id'> = {
  company: '', first_name: '', last_name: '', address: '',
  postal_code: '', city: '', country: '', email: '',
};

const FIELDS: Array<{ key: keyof typeof EMPTY; label: string }> = [
  { key: 'company', label: 'Société' }, { key: 'first_name', label: 'Prénom' },
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createBrowserSupabase();
    if (editingId) {
      await supabase.from('clients').update(form).eq('id', editingId);
    } else {
      await supabase.from('clients').insert({ ...form, org_id: orgId });
    }
    setForm(EMPTY);
    setEditingId(null);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Clients</h1>
      <form onSubmit={save} className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="block text-sm">
            {label}
            <input className="mt-1 w-full rounded border p-2" value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </label>
        ))}
        <div className="sm:col-span-2">
          <button className="rounded bg-blue-600 px-4 py-2 text-white">
            {editingId ? 'Modifier' : 'Ajouter'} le client
          </button>
          {editingId && (
            <button type="button" className="ml-2 text-sm text-gray-500 underline"
              onClick={() => { setForm(EMPTY); setEditingId(null); }}>
              Annuler
            </button>
          )}
        </div>
      </form>
      <ul className="divide-y rounded border">
        {clients.map((c) => (
          <li key={c.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{c.company || `${c.first_name} ${c.last_name}`}</p>
              <p className="text-sm text-gray-500">{c.city} {c.email && `· ${c.email}`}</p>
            </div>
            <button className="text-sm text-blue-600 underline"
              onClick={() => { setEditingId(c.id); const { id: _id, org_id: _orgId, ...rest } = c; setForm(rest); }}>
              Modifier
            </button>
          </li>
        ))}
        {clients.length === 0 && <li className="p-3 text-sm text-gray-500">Aucun client pour l'instant.</li>}
      </ul>
    </div>
  );
}
