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

  const links = NAV.map((item) => (
    <Link key={item.href} href={item.href}
      className={`rounded px-3 py-2 text-sm ${pathname === item.href ? 'bg-blue-100 font-semibold text-blue-800' : 'text-gray-700 hover:bg-gray-100'}`}>
      {item.label}
    </Link>
  ));

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r p-4 md:flex">
        <p className="mb-4 text-lg font-bold">Facturation</p>
        {links}
        <button onClick={logout} className="mt-auto rounded px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100">
          Déconnexion
        </button>
      </aside>
      <main className="flex-1 p-4 pb-20 md:pb-4">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t bg-white p-2 md:hidden">
        {links}
      </nav>
    </div>
  );
}
