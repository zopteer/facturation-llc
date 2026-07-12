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

  if (!settings) return <p className="text-sepia">Chargement…</p>;

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
      <h1 className="page-title">Réglages</h1>
      <form onSubmit={save} className="card space-y-4 p-5">
        <p className="eyebrow">Mes informations</p>
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="block text-sm text-sepia">
            {label}
            <input className={`field mt-1 ${key === 'iban' || key === 'bic' ? 'amount' : ''}`}
              value={String(settings[key] ?? '')}
              onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-ledger" checked={settings.late_penalty_enabled}
            onChange={(e) => setSettings({ ...settings, late_penalty_enabled: e.target.checked })} />
          Afficher la mention de pénalités de retard sur les factures
        </label>
        <div>
          <button className="btn-primary">Enregistrer</button>
          {saved && <span className="ml-3 text-sm text-ledger">Enregistré ✓</span>}
        </div>
      </form>

      <div className="card mt-8 p-5">
        <p className="eyebrow mb-3">Inviter un membre</p>
        <button onClick={invite} className="btn-ghost">
          Générer un lien d'invitation
        </button>
        {inviteUrl && (
          <p className="amount mt-3 break-all border-l-2 border-l-margin bg-paper p-3 text-xs">
            {inviteUrl}
          </p>
        )}
      </div>
    </div>
  );
}
