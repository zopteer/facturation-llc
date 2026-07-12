'use client';
import { useEffect, useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuth = pathname.startsWith('/login') || pathname.startsWith('/signup');

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (isAuth) return <>{children}</>;

  async function logout() {
    await createBrowserSupabase().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const links = NAV.map((item) => (
    <Link key={item.href} href={item.href}
      className={`border-l-2 px-3 py-2 text-sm transition-colors ${
        pathname === item.href
          ? 'border-margin bg-white/10 font-semibold text-sheet'
          : 'border-transparent text-sheet/70 hover:bg-white/5 hover:text-sheet'
      }`}>
      {item.label}
    </Link>
  ));

  const logoutButton = (
    <button onClick={logout}
      className="mt-auto border-l-2 border-transparent px-3 py-2 text-left text-sm text-sheet/60 hover:bg-white/5 hover:text-sheet">
      Déconnexion
    </button>
  );

  return (
    <div className="min-h-screen md:flex">
      {/* Barre latérale desktop */}
      <aside className="hidden w-60 shrink-0 flex-col gap-1 bg-ledger p-5 md:flex">
        <p className="font-display mb-1 text-2xl text-sheet">Facturation</p>
        <p className="mb-6 border-b border-sheet/20 pb-4 text-[11px] uppercase tracking-[0.14em] text-sheet/50">
          Registre des ventes
        </p>
        {links}
        {logoutButton}
      </aside>

      {/* En-tête mobile avec menu ☰ */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-ledger px-4 py-3 md:hidden">
        <p className="font-display text-xl text-sheet">Facturation</p>
        <button onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu"
          className="p-1 text-sheet">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {/* Panneau mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="drawer-overlay absolute inset-0 bg-ink/40" onClick={() => setMenuOpen(false)} />
          <div className="drawer-panel absolute inset-y-0 left-0 flex w-64 flex-col gap-1 bg-ledger p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-xl text-sheet">Facturation</p>
              <button onClick={() => setMenuOpen(false)} aria-label="Fermer le menu"
                className="p-1 text-sheet/70 hover:text-sheet">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="5" y1="5" x2="19" y2="19" />
                  <line x1="19" y1="5" x2="5" y2="19" />
                </svg>
              </button>
            </div>
            <p className="mb-4 border-b border-sheet/20 pb-3 text-[11px] uppercase tracking-[0.14em] text-sheet/50">
              Registre des ventes
            </p>
            {links}
            {logoutButton}
          </div>
        </div>
      )}

      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
