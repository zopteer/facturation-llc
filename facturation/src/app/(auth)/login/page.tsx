'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError('Email ou mot de passe incorrect.'); return; }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="mx-auto mt-16 max-w-sm p-4">
      <p className="font-display text-center text-3xl">Facturation</p>
      <p className="eyebrow mb-8 mt-2 text-center">Registre des ventes</p>
      <div className="card p-6">
        <h1 className="font-display mb-6 text-xl">Se connecter</h1>
        <form onSubmit={submit} className="space-y-5">
          <input className="field" type="email" placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="field" type="password" placeholder="Mot de passe"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-margin">{error}</p>}
          <button className="btn-primary w-full">Connexion</button>
        </form>
      </div>
      <p className="mt-5 text-center text-sm text-sepia">
        Pas de compte ? <Link className="link" href="/signup">Créer un compte</Link>
      </p>
    </main>
  );
}
