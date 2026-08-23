'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { PasswordField } from '@/components/PasswordField';

function SignupForm() {
  const router = useRouter();
  const invite = useSearchParams().get('invite');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    const supabase = createBrowserSupabase();
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) { setError(signUpError.message); return; }
    const { error: rpcError } = await supabase.rpc('join_organization', { invite_token: invite });
    if (rpcError) { setError(rpcError.message); return; }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="mx-auto mt-16 max-w-sm p-4">
      <p className="font-display text-center text-3xl">Facturation</p>
      <p className="eyebrow mb-8 mt-2 text-center">Registre des ventes</p>
      <div className="card p-6">
        {invite ? (
          <>
            <h1 className="font-display mb-6 text-xl">Rejoindre l’organisation</h1>
            <form onSubmit={submit} className="space-y-5">
              <input className="field" type="email" placeholder="Email"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
              <PasswordField placeholder="Mot de passe (8+ caractères)" value={password}
                onChange={setPassword} minLength={8} />
              {error && <p className="text-sm text-margin">{error}</p>}
              <button className="btn-primary w-full">Créer le compte</button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-display mb-3 text-xl">Inscription sur invitation</h1>
            <p className="text-sm text-sepia">
              La création de compte se fait uniquement via un lien d’invitation.
              Contactez l’administrateur pour en recevoir un.
            </p>
            <Link href="/login" className="link mt-5 inline-block text-sm">
              ← Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}
