'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';

function SignupForm() {
  const router = useRouter();
  const invite = useSearchParams().get('invite');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createBrowserSupabase();
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) { setError(signUpError.message); return; }
    const { error: rpcError } = invite
      ? await supabase.rpc('join_organization', { invite_token: invite })
      : await supabase.rpc('create_organization', { org_name: orgName });
    if (rpcError) { setError(rpcError.message); return; }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="mx-auto mt-16 max-w-sm p-4">
      <p className="font-display text-center text-3xl">Facturation</p>
      <p className="eyebrow mb-8 mt-2 text-center">Registre des ventes</p>
      <div className="card p-6">
        <h1 className="font-display mb-6 text-xl">
          {invite ? 'Rejoindre l’organisation' : 'Créer un compte'}
        </h1>
        <form onSubmit={submit} className="space-y-5">
          {!invite && (
            <input className="field" placeholder="Nom de la société"
              value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
          )}
          <input className="field" type="email" placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="field" type="password" placeholder="Mot de passe (8+ caractères)"
            value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          {error && <p className="text-sm text-margin">{error}</p>}
          <button className="btn-primary w-full">Créer le compte</button>
        </form>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}
