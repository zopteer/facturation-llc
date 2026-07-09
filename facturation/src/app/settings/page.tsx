'use client';
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useOrg } from '@/lib/useOrg';
import type { SettingsRow } from '@/lib/types';

const FIELDS: Array<{ key: keyof SettingsRow; label: string }> = [
  { key: 'company_name', label: 'Société' },
  { key: 'company_id', label: 'SIRET / EIN' },
  { key: 'address', label: 'Adresse' },
  { key: 'postal_code', label: 'Code postal' },
  { key: 'city', label: 'Ville' },
  { key: 'country', label: 'Pays' },
  { key: 'iban', label: 'IBAN' },
  { key: 'bic', label: 'BIC' },
  { key: 'footer_default', label: 'Footer par défaut' },
];

export default function SettingsPage() {
  const { orgId } = useOrg();
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [saved, setSaved] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');

  useEffect(() => {
    if (!orgId) return;
    createBrowserSupabase().from('settings').select('*').eq('org_id', orgId).single()
      .then(({ data }) => setSettings(data));
  }, [orgId]);

  if (!settings) return <p>Chargement…</p>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    await createBrowserSupabase().from('settings')
      .update(settings).eq('org_id', settings.org_id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function invite() {
    const { data } = await createBrowserSupabase()
      .from('invitations').insert({ org_id: orgId }).select('token').single();
    if (data) setInviteUrl(`${window.location.origin}/signup?invite=${data.token}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Réglages</h1>
      <form onSubmit={save} className="space-y-3">
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="block text-sm">
            {label}
            <input className="mt-1 w-full rounded border p-2"
              value={String(settings[key] ?? '')}
              onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.late_penalty_enabled}
            onChange={(e) => setSettings({ ...settings, late_penalty_enabled: e.target.checked })} />
          Afficher la mention de pénalités de retard sur les factures
        </label>
        <button className="rounded bg-blue-600 px-4 py-2 text-white">Enregistrer</button>
        {saved && <span className="ml-3 text-sm text-green-600">Enregistré ✓</span>}
      </form>

      <h2 className="mt-10 mb-2 text-lg font-semibold">Inviter un membre</h2>
      <button onClick={invite} className="rounded border px-4 py-2 text-sm">
        Générer un lien d'invitation
      </button>
      {inviteUrl && <p className="mt-2 break-all rounded bg-gray-100 p-2 text-sm">{inviteUrl}</p>}
    </div>
  );
}
