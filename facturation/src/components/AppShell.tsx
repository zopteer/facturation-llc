'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Tableau de bord' },
  { href: '/documents', label: 'Documents' },
  { href: '/clients', label: 'Clients' },
  { href: '/settings', label: 'Réglages' },
];

function Brand() {
  return (
    <div className="mb-6 border-b border-line pb-5">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan"
          style={{ boxShadow: '0 0 12px 2px var(--cyan)' }} />
        <p className="font-display text-xl font-semibold tracking-wide text-sheet">Facturation</p>
      </div>
      <p className="eyebrow mt-2">Console des ventes</p>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const links = NAV.map((item) => {
    const active = isActive(item.href);
    return (
      <Link key={item.href} href={item.href}
        className={`relative rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${
          active
            ? 'border-cyan bg-[rgba(61,240,228,0.1)] font-semibold text-cyan'
            : 'border-transparent text-sheet/60 hover:bg-white/5 hover:text-sheet'
        }`}
        style={active ? { boxShadow: 'inset 0 0 20px -10px var(--cyan)' } : undefined}>
        {item.label}
      </Link>
    );
  });

  return (
    <div className="min-h-screen md:flex">
      {/* Rail latéral desktop */}
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-line bg-rail p-5 md:flex">
        <Brand />
        {links}
      </aside>

      {/* En-tête mobile */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-rail px-4 py-3 md:hidden"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan" style={{ boxShadow: '0 0 10px 2px var(--cyan)' }} />
          <p className="font-display text-lg font-semibold text-sheet">Facturation</p>
        </div>
        <button onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu" className="p-1 text-sheet">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {/* Panneau mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="drawer-overlay absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className="drawer-panel absolute inset-y-0 left-0 flex w-64 flex-col gap-1 border-r border-line bg-rail p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-cyan" style={{ boxShadow: '0 0 10px 2px var(--cyan)' }} />
                <p className="font-display text-lg font-semibold text-sheet">Facturation</p>
              </div>
              <button onClick={() => setMenuOpen(false)} aria-label="Fermer le menu" className="p-1 text-sheet/70 hover:text-sheet">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
                </svg>
              </button>
            </div>
            <p className="eyebrow mb-3 border-b border-line pb-3">Console des ventes</p>
            {links}
          </div>
        </div>
      )}

      <main className="flex-1 p-4 md:p-8"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        {children}
      </main>
    </div>
  );
}
