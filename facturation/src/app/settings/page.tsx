'use client';
import { useEffect, useRef, useState } from 'react';
import { getSettings, saveSettings, exportData, importData } from '@/lib/db';
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
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { setSettings(getSettings()); }, []);

  if (!settings) return <p className="text-sepia">Chargement…</p>;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function downloadBackup() {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `facturation-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Importer ce fichier remplacera toutes les données de cet appareil. Continuer ?')) {
      e.target.value = '';
      return;
    }
    try {
      importData(await file.text());
      alert('Données importées. La page va se recharger.');
      window.location.reload();
    } catch {
      alert('Fichier invalide — import annulé.');
      e.target.value = '';
    }
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
        <p className="eyebrow mb-2">Sauvegarde des données</p>
        <p className="mb-4 text-sm text-sepia">
          Vos données sont stockées dans ce navigateur. Téléchargez une sauvegarde pour les
          conserver ou les transférer sur un autre appareil.
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={downloadBackup} className="btn-primary">Télécharger une sauvegarde</button>
          <button onClick={() => fileInput.current?.click()} className="btn-ghost">Importer une sauvegarde</button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={handleImport} />
        </div>
      </div>
    </div>
  );
}
