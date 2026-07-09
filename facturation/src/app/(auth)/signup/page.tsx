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
      <h1 className="mb-6 text-2xl font-bold">
        {invite ? 'Rejoindre l’organisation' : 'Créer un compte'}
      </h1>
      <form onSubmit={submit} className="space-y-4">
        {!invite && (
          <input className="w-full rounded border p-2" placeholder="Nom de la société"
            value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
        )}
        <input className="w-full rounded border p-2" type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded border p-2" type="password" placeholder="Mot de passe (8+ caractères)"
          value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-blue-600 p-2 text-white">Créer le compte</button>
      </form>
    </main>
  );
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}
