'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';

const NAV = [
  { href: '/', label: 'Tableau de bord' },
  { href: '/documents', label: 'Documents' },
  { href: '/clients', label: 'Clients' },
  { href: '/settings', label: 'Réglages' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuth = pathname.startsWith('/login') || pathname.startsWith('/signup');
  if (isAuth) return <>{children}</>;

  async function logout() {
    await createBrowserSupabase().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const sideLinks = NAV.map((item) => (
    <Link key={item.href} href={item.href}
      className={`border-l-2 px-3 py-2 text-sm transition-colors ${
        pathname === item.href
          ? 'border-margin bg-white/10 font-semibold text-sheet'
          : 'border-transparent text-sheet/70 hover:bg-white/5 hover:text-sheet'
      }`}>
      {item.label}
    </Link>
  ));

  const bottomLinks = NAV.map((item) => (
    <Link key={item.href} href={item.href}
      className={`px-2 py-2 text-xs ${
        pathname === item.href ? 'font-semibold text-ledger' : 'text-sepia'
      }`}>
      {item.label}
    </Link>
  ));

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col gap-1 bg-ledger p-5 md:flex">
        <p className="font-display mb-1 text-2xl text-sheet">Facturation</p>
        <p className="mb-6 border-b border-sheet/20 pb-4 text-[11px] uppercase tracking-[0.14em] text-sheet/50">
          Registre des ventes
        </p>
        {sideLinks}
        <button onClick={logout}
          className="mt-auto border-l-2 border-transparent px-3 py-2 text-left text-sm text-sheet/60 hover:bg-white/5 hover:text-sheet">
          Déconnexion
        </button>
      </aside>
      <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-around border-t border-line bg-sheet p-2 md:hidden">
        {bottomLinks}
        <button onClick={logout} className="px-2 py-2 text-xs text-faded">
          Déconnexion
        </button>
      </nav>
    </div>
  );
}
