# Application de facturation LLC — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Application web de facturation (factures + devis, multi-devises €/$, TVA optionnelle, PDF, multi-utilisateurs) hébergée sur Vercel avec Supabase.

**Architecture:** Next.js 15 (App Router) sert l'interface responsive ; toutes les données passent par supabase-js directement depuis les composants (protégé par RLS Postgres) ; auth Supabase email+mot de passe avec organisations multi-membres ; PDF généré côté client avec @react-pdf/renderer.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase (@supabase/supabase-js + @supabase/ssr), @react-pdf/renderer, Vitest, Playwright.

**Spec de référence :** `docs/superpowers/specs/2026-07-09-facturation-llc-design.md`

## Global Constraints

- Tous les montants sont stockés et calculés en **centimes (entiers)** ; affichage à 2 décimales.
- Devises autorisées : `EUR` et `USD` uniquement.
- Types de document : `facture` et `devis` ; statuts : `brouillon`, `envoyee`, `payee`, `impayee`, `annulee`.
- Le numéro (`numero`) est `null` pour un brouillon ; il est attribué au passage à `envoyee`. Format `YYYY-NNN` (ex. `2026-001`), séquences séparées par type, remise à zéro chaque année.
- Une facture envoyée ne se supprime jamais (statut `annulee` à la place) ; seuls les brouillons sont supprimables.
- Interface entièrement en français.
- L'app Next.js vit dans le sous-dossier `facturation/` du dépôt ; tous les chemins ci-dessous sont relatifs à la racine du dépôt.

---

### Task 1 : Scaffolding du projet

**Files:**
- Create: `facturation/` (via create-next-app), `facturation/vitest.config.ts`

**Interfaces:**
- Produces: projet Next.js 15 TypeScript + Tailwind fonctionnel, commande `npm test` (Vitest).

- [ ] **Step 1 : Créer le projet**

```bash
npx create-next-app@latest facturation --typescript --tailwind --eslint --app --src-dir --use-npm --no-import-alias
cd facturation
npm install @supabase/supabase-js @supabase/ssr @react-pdf/renderer
npm install -D vitest
```

- [ ] **Step 2 : Configurer Vitest**

Créer `facturation/vitest.config.ts` :

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
});
```

Dans `facturation/package.json`, ajouter dans `"scripts"` : `"test": "vitest run"`.

- [ ] **Step 3 : Vérifier**

Run: `npm run build` (dans `facturation/`) — Expected: build OK.
Run: `npm test` — Expected: "No test files found" (code de sortie non bloquant ou message équivalent).

- [ ] **Step 4 : Commit**

```bash
git add facturation
git commit -m "chore: scaffold Next.js 15 + Tailwind + Vitest"
```

---

### Task 2 : Domaine — calculs monétaires

**Files:**
- Create: `facturation/src/lib/money.ts`
- Test: `facturation/src/lib/money.test.ts`

**Interfaces:**
- Produces: `type Currency = 'EUR' | 'USD'` ; `interface Line { quantity: number; unitPriceCents: number }` ; `lineTotalCents(line: Line): number` ; `computeTotals(lines: Line[], vatRatePercent: number): { totalHTCents: number; totalTVACents: number; totalTTCCents: number }` ; `formatCents(cents: number, currency: Currency): string`.

- [ ] **Step 1 : Écrire les tests (qui échouent)**

`facturation/src/lib/money.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { computeTotals, formatCents, lineTotalCents } from './money';

describe('lineTotalCents', () => {
  it('multiplie quantité × prix unitaire en centimes, arrondi', () => {
    expect(lineTotalCents({ quantity: 3, unitPriceCents: 1999 })).toBe(5997);
    expect(lineTotalCents({ quantity: 1.5, unitPriceCents: 333 })).toBe(500); // 499.5 → 500
  });
});

describe('computeTotals', () => {
  it('calcule HT, TVA arrondie et TTC', () => {
    const t = computeTotals([{ quantity: 3, unitPriceCents: 1999 }], 20);
    expect(t).toEqual({ totalHTCents: 5997, totalTVACents: 1199, totalTTCCents: 7196 });
  });
  it('TVA à 0 → TVA nulle, TTC = HT', () => {
    const t = computeTotals([{ quantity: 2, unitPriceCents: 5000 }], 0);
    expect(t).toEqual({ totalHTCents: 10000, totalTVACents: 0, totalTTCCents: 10000 });
  });
  it('liste vide → tout à zéro', () => {
    expect(computeTotals([], 20)).toEqual({ totalHTCents: 0, totalTVACents: 0, totalTTCCents: 0 });
  });
});

describe('formatCents', () => {
  it('formate en euros (fr-FR) et dollars (en-US)', () => {
    expect(formatCents(123456, 'EUR')).toContain('1');
    expect(formatCents(123456, 'EUR')).toContain('€');
    expect(formatCents(123456, 'USD')).toBe('$1,234.56');
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `npm test` — Expected: FAIL, `money.ts` introuvable.

- [ ] **Step 3 : Implémenter**

`facturation/src/lib/money.ts` :

```ts
export type Currency = 'EUR' | 'USD';

export interface Line {
  quantity: number;
  unitPriceCents: number;
}

export interface Totals {
  totalHTCents: number;
  totalTVACents: number;
  totalTTCCents: number;
}

export function lineTotalCents(line: Line): number {
  return Math.round(line.quantity * line.unitPriceCents);
}

export function computeTotals(lines: Line[], vatRatePercent: number): Totals {
  const totalHTCents = lines.reduce((sum, l) => sum + lineTotalCents(l), 0);
  const totalTVACents = Math.round((totalHTCents * vatRatePercent) / 100);
  return { totalHTCents, totalTVACents, totalTTCCents: totalHTCents + totalTVACents };
}

export function formatCents(cents: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === 'EUR' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
```

- [ ] **Step 4 : Vérifier le succès**

Run: `npm test` — Expected: PASS (6 tests).

- [ ] **Step 5 : Commit**

```bash
git add facturation/src/lib/money.ts facturation/src/lib/money.test.ts
git commit -m "feat: calculs monétaires en centimes (HT/TVA/TTC)"
```

---

### Task 3 : Domaine — numérotation

**Files:**
- Create: `facturation/src/lib/numbering.ts`
- Test: `facturation/src/lib/numbering.test.ts`

**Interfaces:**
- Produces: `nextDocumentNumber(lastNumber: string | null, year: number): string` — format `YYYY-NNN`, incrémente, repart à 001 si année différente ou aucun numéro.

- [ ] **Step 1 : Écrire les tests**

`facturation/src/lib/numbering.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { nextDocumentNumber } from './numbering';

describe('nextDocumentNumber', () => {
  it('démarre à 001 sans numéro précédent', () => {
    expect(nextDocumentNumber(null, 2026)).toBe('2026-001');
  });
  it('incrémente le dernier numéro de la même année', () => {
    expect(nextDocumentNumber('2026-003', 2026)).toBe('2026-004');
    expect(nextDocumentNumber('2026-099', 2026)).toBe('2026-100');
  });
  it('repart à 001 en changeant d’année', () => {
    expect(nextDocumentNumber('2025-042', 2026)).toBe('2026-001');
  });
  it('repart à 001 si le format est invalide', () => {
    expect(nextDocumentNumber('n/a', 2026)).toBe('2026-001');
  });
});
```

- [ ] **Step 2 : Vérifier l'échec** — Run: `npm test` — Expected: FAIL.

- [ ] **Step 3 : Implémenter**

`facturation/src/lib/numbering.ts` :

```ts
const NUMBER_RE = /^(\d{4})-(\d{3,})$/;

export function nextDocumentNumber(lastNumber: string | null, year: number): string {
  const pad = (n: number) => String(n).padStart(3, '0');
  if (!lastNumber) return `${year}-${pad(1)}`;
  const match = NUMBER_RE.exec(lastNumber);
  if (!match || Number(match[1]) !== year) return `${year}-${pad(1)}`;
  return `${year}-${pad(Number(match[2]) + 1)}`;
}
```

- [ ] **Step 4 : Vérifier le succès** — Run: `npm test` — Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add facturation/src/lib/numbering.ts facturation/src/lib/numbering.test.ts
git commit -m "feat: numérotation annuelle des documents"
```

---

### Task 4 : Domaine — types partagés et conversion devis → facture

**Files:**
- Create: `facturation/src/lib/types.ts`, `facturation/src/lib/conversion.ts`
- Test: `facturation/src/lib/conversion.test.ts`

**Interfaces:**
- Produces: types `DocumentType`, `DocumentStatus`, `ClientRow`, `DocumentRow`, `DocumentLineRow`, `SettingsRow` (utilisés par toutes les tâches UI) ; `quoteToInvoicePayload(quote: DocumentRow, today: string): Omit<DocumentRow, 'id' | 'created_at'>`.

- [ ] **Step 1 : Écrire les types**

`facturation/src/lib/types.ts` :

```ts
import type { Currency } from './money';

export type DocumentType = 'facture' | 'devis';
export type DocumentStatus = 'brouillon' | 'envoyee' | 'payee' | 'impayee' | 'annulee';

export interface ClientRow {
  id: string;
  org_id: string;
  company: string;
  first_name: string;
  last_name: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  email: string;
}

export interface DocumentRow {
  id: string;
  org_id: string;
  type: DocumentType;
  numero: string | null;
  client_id: string | null;
  client_snapshot: Partial<ClientRow>;
  issue_date: string;          // 'YYYY-MM-DD'
  due_date: string | null;
  due_on_receipt: boolean;
  currency: Currency;
  vat_rate: number;            // pourcentage, 0–100
  vat_na: boolean;             // TVA non applicable
  status: DocumentStatus;
  payment_cheque: boolean;
  payment_transfer: boolean;
  footer: string;
  quote_id: string | null;
  created_at: string;
}

export interface DocumentLineRow {
  id: string;
  document_id: string;
  label: string;
  quantity: number;
  unit_price_cents: number;
  position: number;
}

export interface SettingsRow {
  org_id: string;
  company_name: string;
  company_id: string;          // SIRET / EIN
  address: string;
  postal_code: string;
  city: string;
  country: string;
  iban: string;
  bic: string;
  footer_default: string;
  late_penalty_enabled: boolean;
}
```

- [ ] **Step 2 : Écrire le test de conversion**

`facturation/src/lib/conversion.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { quoteToInvoicePayload } from './conversion';
import type { DocumentRow } from './types';

const quote: DocumentRow = {
  id: 'q1', org_id: 'o1', type: 'devis', numero: '2026-007',
  client_id: 'c1', client_snapshot: { company: 'ACME' },
  issue_date: '2026-06-01', due_date: null, due_on_receipt: true,
  currency: 'USD', vat_rate: 0, vat_na: true, status: 'envoyee',
  payment_cheque: false, payment_transfer: true, footer: 'Merci',
  quote_id: null, created_at: '2026-06-01T00:00:00Z',
};

describe('quoteToInvoicePayload', () => {
  it('crée un brouillon de facture lié au devis, sans numéro', () => {
    const inv = quoteToInvoicePayload(quote, '2026-07-09');
    expect(inv.type).toBe('facture');
    expect(inv.status).toBe('brouillon');
    expect(inv.numero).toBeNull();
    expect(inv.quote_id).toBe('q1');
    expect(inv.issue_date).toBe('2026-07-09');
    expect(inv.currency).toBe('USD');
    expect(inv.vat_na).toBe(true);
    expect(inv.client_id).toBe('c1');
  });
});
```

- [ ] **Step 3 : Vérifier l'échec** — Run: `npm test` — Expected: FAIL.

- [ ] **Step 4 : Implémenter**

`facturation/src/lib/conversion.ts` :

```ts
import type { DocumentRow } from './types';

export function quoteToInvoicePayload(
  quote: DocumentRow,
  today: string,
): Omit<DocumentRow, 'id' | 'created_at'> {
  return {
    org_id: quote.org_id,
    type: 'facture',
    numero: null,
    client_id: quote.client_id,
    client_snapshot: quote.client_snapshot,
    issue_date: today,
    due_date: null,
    due_on_receipt: quote.due_on_receipt,
    currency: quote.currency,
    vat_rate: quote.vat_rate,
    vat_na: quote.vat_na,
    status: 'brouillon',
    payment_cheque: quote.payment_cheque,
    payment_transfer: quote.payment_transfer,
    footer: quote.footer,
    quote_id: quote.id,
  };
}
```

- [ ] **Step 5 : Vérifier le succès** — Run: `npm test` — Expected: PASS.

- [ ] **Step 6 : Commit**

```bash
git add facturation/src/lib/types.ts facturation/src/lib/conversion.ts facturation/src/lib/conversion.test.ts
git commit -m "feat: types partagés + conversion devis→facture"
```

---

### Task 5 : Schéma Supabase (SQL + RLS + RPC)

**Files:**
- Create: `facturation/supabase/migrations/0001_schema.sql`, `facturation/.env.local.example`

**Interfaces:**
- Produces: tables `organizations`, `memberships`, `invitations`, `settings`, `clients`, `documents`, `document_lines` ; RPC `create_organization(org_name text)` et `join_organization(invite_token uuid)` ; RLS active partout.

- [ ] **Step 1 : Créer le projet Supabase**

Sur https://supabase.com : créer un projet (région Europe). Récupérer l'URL et la clé anon (Settings → API).

Créer `facturation/.env.local.example` :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Copier en `facturation/.env.local` avec les vraies valeurs (`.env.local` est déjà dans `.gitignore` de create-next-app — vérifier).

- [ ] **Step 2 : Écrire la migration**

`facturation/supabase/migrations/0001_schema.sql` :

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table memberships (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (org_id, user_id)
);

create table invitations (
  token uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table settings (
  org_id uuid primary key references organizations(id) on delete cascade,
  company_name text not null default '',
  company_id text not null default '',
  address text not null default '',
  postal_code text not null default '',
  city text not null default '',
  country text not null default '',
  iban text not null default '',
  bic text not null default '',
  footer_default text not null default '',
  late_penalty_enabled boolean not null default false
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  company text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  address text not null default '',
  postal_code text not null default '',
  city text not null default '',
  country text not null default '',
  email text not null default ''
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('facture', 'devis')),
  numero text,
  client_id uuid references clients(id) on delete set null,
  client_snapshot jsonb not null default '{}',
  issue_date date not null default current_date,
  due_date date,
  due_on_receipt boolean not null default false,
  currency text not null default 'EUR' check (currency in ('EUR', 'USD')),
  vat_rate numeric not null default 0 check (vat_rate >= 0 and vat_rate <= 100),
  vat_na boolean not null default false,
  status text not null default 'brouillon'
    check (status in ('brouillon', 'envoyee', 'payee', 'impayee', 'annulee')),
  payment_cheque boolean not null default false,
  payment_transfer boolean not null default true,
  footer text not null default '',
  quote_id uuid references documents(id) on delete set null,
  created_at timestamptz not null default now(),
  check (due_date is null or due_date >= issue_date)
);

create unique index documents_numero_unique
  on documents (org_id, type, numero) where numero is not null;

create table document_lines (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  label text not null default '',
  quantity numeric not null default 0 check (quantity >= 0),
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0),
  position integer not null default 0
);

-- Helper RLS : l'utilisateur courant est-il membre de l'organisation ?
create or replace function is_member(org uuid) returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from memberships where org_id = org and user_id = auth.uid()
  );
$$;

alter table organizations enable row level security;
alter table memberships enable row level security;
alter table invitations enable row level security;
alter table settings enable row level security;
alter table clients enable row level security;
alter table documents enable row level security;
alter table document_lines enable row level security;

create policy org_member_all on organizations
  for all using (is_member(id));
create policy memberships_member_all on memberships
  for all using (is_member(org_id));
create policy invitations_member_all on invitations
  for all using (is_member(org_id));
create policy settings_member_all on settings
  for all using (is_member(org_id)) with check (is_member(org_id));
create policy clients_member_all on clients
  for all using (is_member(org_id)) with check (is_member(org_id));
create policy documents_member_all on documents
  for all using (is_member(org_id)) with check (is_member(org_id));
create policy lines_member_all on document_lines
  for all using (is_member((select org_id from documents where id = document_id)))
  with check (is_member((select org_id from documents where id = document_id)));

-- RPC : créer une organisation (à l'inscription du premier utilisateur)
create or replace function create_organization(org_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_org uuid;
begin
  insert into organizations (name) values (org_name) returning id into new_org;
  insert into memberships (org_id, user_id) values (new_org, auth.uid());
  insert into settings (org_id, company_name) values (new_org, org_name);
  return new_org;
end;
$$;

-- RPC : rejoindre une organisation via un jeton d'invitation
create or replace function join_organization(invite_token uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare target_org uuid;
begin
  select org_id into target_org from invitations where token = invite_token;
  if target_org is null then
    raise exception 'Invitation invalide';
  end if;
  insert into memberships (org_id, user_id) values (target_org, auth.uid())
    on conflict do nothing;
  return target_org;
end;
$$;
```

- [ ] **Step 3 : Appliquer la migration**

Dans le dashboard Supabase → SQL Editor → coller le contenu du fichier → Run.
Expected: « Success. No rows returned ».

- [ ] **Step 4 : Vérifier la RLS**

Dans SQL Editor : `select * from documents;` en tant que rôle `anon` (onglet role) — Expected: 0 lignes (pas d'erreur, mais rien de visible sans membership).

- [ ] **Step 5 : Commit**

```bash
git add facturation/supabase/migrations/0001_schema.sql facturation/.env.local.example
git commit -m "feat: schéma Supabase avec RLS et RPC organisations"
```

---

### Task 6 : Clients Supabase + authentification

**Files:**
- Create: `facturation/src/lib/supabase/client.ts`, `facturation/src/lib/supabase/server.ts`, `facturation/src/middleware.ts`, `facturation/src/app/(auth)/login/page.tsx`, `facturation/src/app/(auth)/signup/page.tsx`

**Interfaces:**
- Consumes: RPC `create_organization`, `join_organization` (Task 5).
- Produces: `createBrowserSupabase(): SupabaseClient` (client) ; `createServerSupabase(): Promise<SupabaseClient>` (RSC) ; routes `/login`, `/signup` (+ `?invite=<token>`), middleware redirigeant les non-connectés vers `/login`.

- [ ] **Step 1 : Clients Supabase**

`facturation/src/lib/supabase/client.ts` :

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

`facturation/src/lib/supabase/server.ts` :

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (all) => all.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)),
      },
    },
  );
}
```

- [ ] **Step 2 : Middleware de protection**

`facturation/src/middleware.ts` :

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (all) => {
          all.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          all.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
    || request.nextUrl.pathname.startsWith('/signup');
  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 3 : Pages login et signup**

`facturation/src/app/(auth)/login/page.tsx` :

```tsx
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
      <h1 className="mb-6 text-2xl font-bold">Se connecter</h1>
      <form onSubmit={submit} className="space-y-4">
        <input className="w-full rounded border p-2" type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded border p-2" type="password" placeholder="Mot de passe"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-blue-600 p-2 text-white">Connexion</button>
      </form>
      <p className="mt-4 text-sm">
        Pas de compte ? <Link className="text-blue-600 underline" href="/signup">Créer un compte</Link>
      </p>
    </main>
  );
}
```

`facturation/src/app/(auth)/signup/page.tsx` :

```tsx
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
```

Note : dans Supabase → Authentication → Providers → Email, **désactiver « Confirm email »** pour que `signUp` connecte directement (usage interne, pas de flux de confirmation).

- [ ] **Step 4 : Vérifier manuellement**

Run: `npm run dev` puis ouvrir http://localhost:3000.
Expected: redirection vers `/login` ; création de compte sur `/signup` → redirection vers `/` ; dans Supabase, une ligne apparaît dans `organizations`, `memberships` et `settings`.

- [ ] **Step 5 : Commit**

```bash
git add facturation/src/lib/supabase facturation/src/middleware.ts "facturation/src/app/(auth)"
git commit -m "feat: auth Supabase (login, signup, invitations, middleware)"
```

---

### Task 7 : Layout applicatif + hook d'organisation

**Files:**
- Create: `facturation/src/components/AppShell.tsx`, `facturation/src/lib/useOrg.ts`
- Modify: `facturation/src/app/layout.tsx`

**Interfaces:**
- Produces: `useOrg(): { orgId: string | null, loading: boolean }` (récupère l'org du membre connecté) ; `<AppShell>` avec navigation (Tableau de bord `/`, Documents `/documents`, Clients `/clients`, Réglages `/settings`, Déconnexion) — barre latérale sur desktop, barre basse sur mobile.

- [ ] **Step 1 : Hook useOrg**

`facturation/src/lib/useOrg.ts` :

```ts
'use client';
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from './supabase/client';

export function useOrg() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.from('memberships').select('org_id').limit(1).single()
      .then(({ data }) => {
        setOrgId(data?.org_id ?? null);
        setLoading(false);
      });
  }, []);

  return { orgId, loading };
}
```

- [ ] **Step 2 : AppShell**

`facturation/src/components/AppShell.tsx` :

```tsx
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
```

- [ ] **Step 3 : Brancher dans le layout**

Dans `facturation/src/app/layout.tsx`, envelopper `{children}` avec `<AppShell>` (importé depuis `@/components/AppShell`) à l'intérieur de `<body>` et passer `lang="fr"` sur `<html>`.

- [ ] **Step 4 : Vérifier** — Run: `npm run dev` — Expected: navigation visible (latérale desktop, basse mobile — tester en réduisant la fenêtre), déconnexion fonctionne.

- [ ] **Step 5 : Commit**

```bash
git add facturation/src/components/AppShell.tsx facturation/src/lib/useOrg.ts facturation/src/app/layout.tsx
git commit -m "feat: layout applicatif responsive + hook organisation"
```

---

### Task 8 : Page Réglages (+ invitations)

**Files:**
- Create: `facturation/src/app/settings/page.tsx`

**Interfaces:**
- Consumes: `useOrg`, `SettingsRow`, table `settings`, table `invitations`.
- Produces: écran de modification des infos société / IBAN / BIC / footer / pénalités, et bouton « Générer un lien d'invitation ».

- [ ] **Step 1 : Implémenter la page**

`facturation/src/app/settings/page.tsx` :

```tsx
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

  if (!settings) return <p>Chargement…</p>;

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
      <h1 className="mb-6 text-2xl font-bold">Réglages</h1>
      <form onSubmit={save} className="space-y-3">
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="block text-sm">
            {label}
            <input className="mt-1 w-full rounded border p-2"
              value={String(settings[key] ?? '')}
              onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.late_penalty_enabled}
            onChange={(e) => setSettings({ ...settings, late_penalty_enabled: e.target.checked })} />
          Afficher la mention de pénalités de retard sur les factures
        </label>
        <button className="rounded bg-blue-600 px-4 py-2 text-white">Enregistrer</button>
        {saved && <span className="ml-3 text-sm text-green-600">Enregistré ✓</span>}
      </form>

      <h2 className="mt-10 mb-2 text-lg font-semibold">Inviter un membre</h2>
      <button onClick={invite} className="rounded border px-4 py-2 text-sm">
        Générer un lien d’invitation
      </button>
      {inviteUrl && <p className="mt-2 break-all rounded bg-gray-100 p-2 text-sm">{inviteUrl}</p>}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier** — Run: `npm run dev` → `/settings` — Expected: champs pré-remplis (nom société de l'inscription), modification persistée après rechargement, lien d'invitation généré. Tester le lien en navigation privée : créer un 2ᵉ compte qui rejoint l'organisation.

- [ ] **Step 3 : Commit**

```bash
git add facturation/src/app/settings/page.tsx
git commit -m "feat: page réglages + invitations"
```

---

### Task 9 : Carnet de clients

**Files:**
- Create: `facturation/src/app/clients/page.tsx`

**Interfaces:**
- Consumes: `useOrg`, `ClientRow`, table `clients`.
- Produces: liste des clients + formulaire d'ajout/modification (mêmes champs que `ClientRow`).

- [ ] **Step 1 : Implémenter la page**

`facturation/src/app/clients/page.tsx` :

```tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useOrg } from '@/lib/useOrg';
import type { ClientRow } from '@/lib/types';

const EMPTY: Omit<ClientRow, 'id' | 'org_id'> = {
  company: '', first_name: '', last_name: '', address: '',
  postal_code: '', city: '', country: '', email: '',
};

const FIELDS: Array<{ key: keyof typeof EMPTY; label: string }> = [
  { key: 'company', label: 'Société' }, { key: 'first_name', label: 'Prénom' },
  { key: 'last_name', label: 'Nom' }, { key: 'address', label: 'Adresse' },
  { key: 'postal_code', label: 'Code postal' }, { key: 'city', label: 'Ville' },
  { key: 'country', label: 'Pays' }, { key: 'email', label: 'Email' },
];

export default function ClientsPage() {
  const { orgId } = useOrg();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!orgId) return;
    createBrowserSupabase().from('clients').select('*')
      .eq('org_id', orgId).order('company')
      .then(({ data }) => setClients(data ?? []));
  }, [orgId]);

  useEffect(load, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createBrowserSupabase();
    if (editingId) {
      await supabase.from('clients').update(form).eq('id', editingId);
    } else {
      await supabase.from('clients').insert({ ...form, org_id: orgId });
    }
    setForm(EMPTY);
    setEditingId(null);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Clients</h1>
      <form onSubmit={save} className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="block text-sm">
            {label}
            <input className="mt-1 w-full rounded border p-2" value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </label>
        ))}
        <div className="sm:col-span-2">
          <button className="rounded bg-blue-600 px-4 py-2 text-white">
            {editingId ? 'Modifier' : 'Ajouter'} le client
          </button>
          {editingId && (
            <button type="button" className="ml-2 text-sm text-gray-500 underline"
              onClick={() => { setForm(EMPTY); setEditingId(null); }}>
              Annuler
            </button>
          )}
        </div>
      </form>
      <ul className="divide-y rounded border">
        {clients.map((c) => (
          <li key={c.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{c.company || `${c.first_name} ${c.last_name}`}</p>
              <p className="text-sm text-gray-500">{c.city} {c.email && `· ${c.email}`}</p>
            </div>
            <button className="text-sm text-blue-600 underline"
              onClick={() => { setEditingId(c.id); setForm({ ...EMPTY, ...c }); }}>
              Modifier
            </button>
          </li>
        ))}
        {clients.length === 0 && <li className="p-3 text-sm text-gray-500">Aucun client pour l’instant.</li>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier** — `/clients` : ajouter, modifier, recharger — Expected: données persistées.

- [ ] **Step 3 : Commit**

```bash
git add facturation/src/app/clients/page.tsx
git commit -m "feat: carnet de clients"
```

---

### Task 10 : Éditeur de facture / devis (avec sauvegarde auto)

**Files:**
- Create: `facturation/src/app/documents/[id]/page.tsx`, `facturation/src/lib/documents.ts`

**Interfaces:**
- Consumes: `computeTotals`, `formatCents` (Task 2), types (Task 4), `useOrg`, tables `documents` / `document_lines` / `clients`.
- Produces: `createDraft(orgId: string, type: DocumentType): Promise<string>` (retourne l'id du brouillon créé) dans `documents.ts` ; route `/documents/[id]` (éditeur complet, autosave 1 s après la dernière frappe).

- [ ] **Step 1 : Helper de création de brouillon**

`facturation/src/lib/documents.ts` :

```ts
import { createBrowserSupabase } from './supabase/client';
import type { DocumentType } from './types';

export async function createDraft(orgId: string, type: DocumentType): Promise<string> {
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase.from('documents')
    .insert({ org_id: orgId, type })
    .select('id').single();
  if (error) throw error;
  await supabase.from('document_lines')
    .insert({ document_id: data.id, position: 0 });
  return data.id;
}
```

- [ ] **Step 2 : Éditeur**

`facturation/src/app/documents/[id]/page.tsx` :

```tsx
'use client';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { computeTotals, formatCents } from '@/lib/money';
import type { ClientRow, DocumentLineRow, DocumentRow } from '@/lib/types';

export default function DocumentEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [lines, setLines] = useState<DocumentLineRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.from('documents').select('*').eq('id', id).single()
      .then(({ data }) => setDoc(data));
    supabase.from('document_lines').select('*').eq('document_id', id).order('position')
      .then(({ data }) => setLines(data ?? []));
    supabase.from('clients').select('*').order('company')
      .then(({ data }) => setClients(data ?? []));
  }, [id]);

  const scheduleSave = useCallback((nextDoc: DocumentRow, nextLines: DocumentLineRow[]) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      const supabase = createBrowserSupabase();
      const { id: _id, created_at: _c, ...docFields } = nextDoc;
      await supabase.from('documents').update(docFields).eq('id', nextDoc.id);
      for (const line of nextLines) {
        const { id: lineId, ...lineFields } = line;
        await supabase.from('document_lines').update(lineFields).eq('id', lineId);
      }
      setSaving(false);
    }, 1000);
  }, []);

  function patchDoc(patch: Partial<DocumentRow>) {
    if (!doc) return;
    const next = { ...doc, ...patch };
    setDoc(next);
    scheduleSave(next, lines);
  }

  function patchLine(lineId: string, patch: Partial<DocumentLineRow>) {
    const next = lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l));
    setLines(next);
    if (doc) scheduleSave(doc, next);
  }

  async function addLine() {
    const { data } = await createBrowserSupabase().from('document_lines')
      .insert({ document_id: id, position: lines.length })
      .select('*').single();
    if (data) setLines([...lines, data]);
  }

  async function selectClient(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    patchDoc({ client_id: clientId || null, client_snapshot: client ?? {} });
  }

  if (!doc) return <p>Chargement…</p>;
  const readOnly = doc.status !== 'brouillon';
  const totals = computeTotals(
    lines.map((l) => ({ quantity: Number(l.quantity), unitPriceCents: l.unit_price_cents })),
    doc.vat_na ? 0 : Number(doc.vat_rate),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {doc.type === 'facture' ? 'Facture' : 'Devis'} {doc.numero ?? '(brouillon)'}
        </h1>
        <span className="text-sm text-gray-500">{saving ? 'Enregistrement…' : 'Enregistré'}</span>
      </div>
      {readOnly && (
        <p className="rounded bg-yellow-50 p-2 text-sm text-yellow-800">
          Document {doc.status} — lecture seule.
        </p>
      )}

      <fieldset disabled={readOnly} className="space-y-6">
        <section className="rounded border p-4">
          <h2 className="mb-3 font-semibold">Client</h2>
          <select className="w-full rounded border p-2" value={doc.client_id ?? ''}
            onChange={(e) => selectClient(e.target.value)}>
            <option value="">— Choisir un client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company || `${c.first_name} ${c.last_name}`}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-500">
            Ajoutez de nouveaux clients dans l’onglet Clients.
          </p>
        </section>

        <section className="rounded border p-4">
          <h2 className="mb-3 font-semibold">Paramètres</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">Date d’émission
              <input type="date" className="mt-1 w-full rounded border p-2" value={doc.issue_date}
                onChange={(e) => patchDoc({ issue_date: e.target.value })} />
            </label>
            <label className="text-sm">Date d’échéance
              <input type="date" className="mt-1 w-full rounded border p-2"
                value={doc.due_date ?? ''} min={doc.issue_date} disabled={doc.due_on_receipt}
                onChange={(e) => patchDoc({ due_date: e.target.value || null })} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={doc.due_on_receipt}
                onChange={(e) => patchDoc({ due_on_receipt: e.target.checked, due_date: null })} />
              Échéance à réception
            </label>
            <label className="text-sm">Devise
              <select className="mt-1 w-full rounded border p-2" value={doc.currency}
                onChange={(e) => patchDoc({ currency: e.target.value as DocumentRow['currency'] })}>
                <option value="EUR">€ Euro</option>
                <option value="USD">$ Dollar US</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={doc.vat_na}
                onChange={(e) => patchDoc({ vat_na: e.target.checked, vat_rate: 0 })} />
              TVA non applicable
            </label>
            {!doc.vat_na && (
              <label className="text-sm">Taux de TVA (%)
                <input type="number" min={0} max={100} className="mt-1 w-full rounded border p-2"
                  value={doc.vat_rate}
                  onChange={(e) => patchDoc({ vat_rate: Number(e.target.value) })} />
              </label>
            )}
          </div>
        </section>

        <section className="rounded border p-4">
          <h2 className="mb-3 font-semibold">Produits</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="p-1">Désignation</th>
                  <th className="p-1 w-24">Quantité</th>
                  <th className="p-1 w-32">Prix unitaire HT</th>
                  <th className="p-1 w-28 text-right">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="p-1">
                      <input className="w-full rounded border p-2" value={l.label}
                        placeholder="Description du produit"
                        onChange={(e) => patchLine(l.id, { label: e.target.value })} />
                    </td>
                    <td className="p-1">
                      <input type="number" min={0} className="w-full rounded border p-2"
                        value={l.quantity}
                        onChange={(e) => patchLine(l.id, { quantity: Number(e.target.value) })} />
                    </td>
                    <td className="p-1">
                      <input type="number" min={0} step="0.01" className="w-full rounded border p-2"
                        value={l.unit_price_cents / 100}
                        onChange={(e) =>
                          patchLine(l.id, { unit_price_cents: Math.round(Number(e.target.value) * 100) })} />
                    </td>
                    <td className="p-1 text-right">
                      {formatCents(Math.round(Number(l.quantity) * l.unit_price_cents), doc.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addLine} className="mt-2 rounded border px-3 py-1 text-sm">
            + Ajouter une ligne
          </button>
          <div className="mt-4 ml-auto w-56 space-y-1 text-sm">
            <p className="flex justify-between"><span>Total HT</span><span>{formatCents(totals.totalHTCents, doc.currency)}</span></p>
            <p className="flex justify-between"><span>Total TVA</span><span>{formatCents(totals.totalTVACents, doc.currency)}</span></p>
            <p className="flex justify-between font-bold"><span>Total TTC</span><span>{formatCents(totals.totalTTCCents, doc.currency)}</span></p>
          </div>
        </section>

        <section className="rounded border p-4">
          <h2 className="mb-3 font-semibold">Paiement & footer</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={doc.payment_cheque}
              onChange={(e) => patchDoc({ payment_cheque: e.target.checked })} />
            Par chèque
          </label>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={doc.payment_transfer}
              onChange={(e) => patchDoc({ payment_transfer: e.target.checked })} />
            Par virement (IBAN/BIC des réglages)
          </label>
          <label className="mt-3 block text-sm">Footer
            <input className="mt-1 w-full rounded border p-2" value={doc.footer}
              onChange={(e) => patchDoc({ footer: e.target.value })} />
          </label>
        </section>
      </fieldset>
    </div>
  );
}
```

- [ ] **Step 3 : Vérifier**

Créer un brouillon à la main (console navigateur : `await createDraft(...)` sera branché en Task 11 ; en attendant, insérer via l'éditeur SQL Supabase un document + une ligne), ouvrir `/documents/<id>`.
Expected: édition fluide, totaux recalculés en direct, « Enregistrement… » ~1 s après la frappe, données conservées au rechargement.

- [ ] **Step 4 : Commit**

```bash
git add "facturation/src/app/documents/[id]/page.tsx" facturation/src/lib/documents.ts
git commit -m "feat: éditeur de facture/devis avec autosave"
```

---

### Task 11 : Liste des documents (statuts, numérotation, suppression, conversion)

**Files:**
- Create: `facturation/src/app/documents/page.tsx`
- Modify: `facturation/src/lib/documents.ts`

**Interfaces:**
- Consumes: `nextDocumentNumber` (Task 3), `quoteToInvoicePayload` (Task 4), `createDraft` (Task 10).
- Produces: `sendDocument(docId: string): Promise<void>` (attribue le numéro et passe à `envoyee`) ; `convertQuote(quoteId: string): Promise<string>` (retourne l'id de la facture créée) ; route `/documents` avec filtres type/statut, actions par ligne.

- [ ] **Step 1 : Étendre documents.ts**

Ajouter à `facturation/src/lib/documents.ts` :

```ts
import { nextDocumentNumber } from './numbering';
import { quoteToInvoicePayload } from './conversion';
import type { DocumentRow } from './types';

export async function sendDocument(docId: string): Promise<void> {
  const supabase = createBrowserSupabase();
  const { data: doc } = await supabase.from('documents')
    .select('*').eq('id', docId).single();
  if (!doc || doc.status !== 'brouillon') return;
  const year = new Date().getFullYear();
  const { data: last } = await supabase.from('documents')
    .select('numero').eq('org_id', doc.org_id).eq('type', doc.type)
    .not('numero', 'is', null).like('numero', `${year}-%`)
    .order('numero', { ascending: false }).limit(1).maybeSingle();
  const numero = nextDocumentNumber(last?.numero ?? null, year);
  const { error } = await supabase.from('documents')
    .update({ numero, status: 'envoyee' }).eq('id', docId);
  if (error) throw error; // collision d'index unique : réessayer
}

export async function convertQuote(quoteId: string): Promise<string> {
  const supabase = createBrowserSupabase();
  const { data: quote } = await supabase.from('documents')
    .select('*').eq('id', quoteId).single();
  if (!quote) throw new Error('Devis introuvable');
  const payload = quoteToInvoicePayload(quote as DocumentRow,
    new Date().toISOString().slice(0, 10));
  const { data: invoice, error } = await supabase.from('documents')
    .insert(payload).select('id').single();
  if (error) throw error;
  const { data: lines } = await supabase.from('document_lines')
    .select('label, quantity, unit_price_cents, position').eq('document_id', quoteId);
  if (lines?.length) {
    await supabase.from('document_lines')
      .insert(lines.map((l) => ({ ...l, document_id: invoice.id })));
  }
  return invoice.id;
}
```

- [ ] **Step 2 : Page liste**

`facturation/src/app/documents/page.tsx` :

```tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useOrg } from '@/lib/useOrg';
import { convertQuote, createDraft, sendDocument } from '@/lib/documents';
import type { DocumentRow, DocumentStatus, DocumentType } from '@/lib/types';

const STATUS_LABELS: Record<DocumentStatus, string> = {
  brouillon: 'Brouillon', envoyee: 'Envoyée', payee: 'Payée',
  impayee: 'Impayée', annulee: 'Annulée',
};

export default function DocumentsPage() {
  const { orgId } = useOrg();
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [typeFilter, setTypeFilter] = useState<'' | DocumentType>('');
  const [statusFilter, setStatusFilter] = useState<'' | DocumentStatus>('');

  const load = useCallback(() => {
    if (!orgId) return;
    let query = createBrowserSupabase().from('documents').select('*')
      .eq('org_id', orgId).order('created_at', { ascending: false });
    if (typeFilter) query = query.eq('type', typeFilter);
    if (statusFilter) query = query.eq('status', statusFilter);
    query.then(({ data }) => setDocs(data ?? []));
  }, [orgId, typeFilter, statusFilter]);

  useEffect(load, [load]);

  async function newDoc(type: DocumentType) {
    if (!orgId) return;
    router.push(`/documents/${await createDraft(orgId, type)}`);
  }

  async function setStatus(id: string, status: DocumentStatus) {
    await createBrowserSupabase().from('documents').update({ status }).eq('id', id);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce brouillon ?')) return;
    await createBrowserSupabase().from('documents').delete().eq('id', id);
    load();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Documents</h1>
        <div className="flex gap-2">
          <button onClick={() => newDoc('facture')} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
            + Facture
          </button>
          <button onClick={() => newDoc('devis')} className="rounded border px-4 py-2 text-sm">
            + Devis
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <select className="rounded border p-2 text-sm" value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as '' | DocumentType)}>
          <option value="">Tous les types</option>
          <option value="facture">Factures</option>
          <option value="devis">Devis</option>
        </select>
        <select className="rounded border p-2 text-sm" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | DocumentStatus)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <ul className="divide-y rounded border">
        {docs.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <Link href={`/documents/${d.id}`} className="min-w-40 font-medium text-blue-700 hover:underline">
              {d.type === 'facture' ? 'Facture' : 'Devis'} {d.numero ?? '(brouillon)'}
            </Link>
            <span className="text-sm text-gray-500">
              {(d.client_snapshot?.company as string) || '—'} · {d.issue_date}
            </span>
            <span className="rounded bg-gray-100 px-2 py-1 text-xs">{STATUS_LABELS[d.status]}</span>
            <span className="flex gap-2 text-sm">
              {d.status === 'brouillon' && (
                <>
                  <button className="text-blue-600 underline" onClick={() => sendDocument(d.id).then(load)}>
                    Marquer envoyée
                  </button>
                  <button className="text-red-600 underline" onClick={() => remove(d.id)}>Supprimer</button>
                </>
              )}
              {d.type === 'facture' && (d.status === 'envoyee' || d.status === 'impayee') && (
                <button className="text-green-700 underline" onClick={() => setStatus(d.id, 'payee')}>
                  Marquer payée
                </button>
              )}
              {d.type === 'facture' && d.status === 'envoyee' && (
                <button className="text-orange-600 underline" onClick={() => setStatus(d.id, 'impayee')}>
                  Marquer impayée
                </button>
              )}
              {d.type === 'facture' && d.status !== 'brouillon' && d.status !== 'annulee' && (
                <button className="text-gray-500 underline" onClick={() => setStatus(d.id, 'annulee')}>
                  Annuler
                </button>
              )}
              {d.type === 'devis' && d.status !== 'brouillon' && (
                <button className="text-blue-600 underline"
                  onClick={async () => router.push(`/documents/${await convertQuote(d.id)}`)}>
                  Convertir en facture
                </button>
              )}
            </span>
          </li>
        ))}
        {docs.length === 0 && <li className="p-3 text-sm text-gray-500">Aucun document.</li>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3 : Vérifier**

Parcours complet : + Facture → éditer → retour liste → « Marquer envoyée » (numéro `2026-001` attribué) → « Marquer payée ». Créer un devis, l'envoyer, le convertir → un brouillon de facture s'ouvre avec les mêmes lignes. Supprimer un brouillon fonctionne ; une facture envoyée ne propose que « Annuler ».

- [ ] **Step 4 : Commit**

```bash
git add facturation/src/app/documents/page.tsx facturation/src/lib/documents.ts
git commit -m "feat: liste des documents, statuts, numérotation, conversion devis"
```

---

### Task 12 : Tableau de bord

**Files:**
- Modify: `facturation/src/app/page.tsx` (remplacer intégralement le contenu par défaut)

**Interfaces:**
- Consumes: `useOrg`, `formatCents`, `computeTotals`, tables `documents` + `document_lines`.

- [ ] **Step 1 : Implémenter**

`facturation/src/app/page.tsx` :

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useOrg } from '@/lib/useOrg';
import { computeTotals, formatCents, type Currency } from '@/lib/money';
import type { DocumentLineRow, DocumentRow } from '@/lib/types';

export default function Dashboard() {
  const { orgId } = useOrg();
  const [unpaidByCurrency, setUnpaidByCurrency] = useState<Record<Currency, number>>({ EUR: 0, USD: 0 });
  const [recent, setRecent] = useState<DocumentRow[]>([]);

  useEffect(() => {
    if (!orgId) return;
    const supabase = createBrowserSupabase();
    supabase.from('documents').select('*, document_lines(*)')
      .eq('org_id', orgId).eq('type', 'facture').eq('status', 'impayee')
      .then(({ data }) => {
        const totals: Record<Currency, number> = { EUR: 0, USD: 0 };
        (data ?? []).forEach((d: DocumentRow & { document_lines: DocumentLineRow[] }) => {
          const t = computeTotals(
            d.document_lines.map((l) => ({ quantity: Number(l.quantity), unitPriceCents: l.unit_price_cents })),
            d.vat_na ? 0 : Number(d.vat_rate));
          totals[d.currency] += t.totalTTCCents;
        });
        setUnpaidByCurrency(totals);
      });
    supabase.from('documents').select('*').eq('org_id', orgId)
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setRecent(data ?? []));
  }, [orgId]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Tableau de bord</h1>
      <div className="mb-8 rounded border p-4">
        <p className="text-sm text-gray-500">Impayés</p>
        <p className="text-2xl font-bold">
          {formatCents(unpaidByCurrency.EUR, 'EUR')}
          {unpaidByCurrency.USD > 0 && <> + {formatCents(unpaidByCurrency.USD, 'USD')}</>}
        </p>
      </div>
      <h2 className="mb-2 font-semibold">Derniers documents</h2>
      <ul className="divide-y rounded border">
        {recent.map((d) => (
          <li key={d.id} className="p-3">
            <Link href={`/documents/${d.id}`} className="text-blue-700 hover:underline">
              {d.type === 'facture' ? 'Facture' : 'Devis'} {d.numero ?? '(brouillon)'} — {d.status}
            </Link>
          </li>
        ))}
        {recent.length === 0 && <li className="p-3 text-sm text-gray-500">Aucun document.</li>}
      </ul>
      <div className="mt-6 flex gap-2">
        <Link href="/documents" className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
          Voir tous les documents
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier** — marquer une facture « impayée » → le total apparaît sur `/`.

- [ ] **Step 3 : Commit**

```bash
git add facturation/src/app/page.tsx
git commit -m "feat: tableau de bord (impayés, derniers documents)"
```

---

### Task 13 : Export PDF

**Files:**
- Create: `facturation/src/components/DocumentPdf.tsx`, `facturation/src/components/PdfExportButton.tsx`
- Modify: `facturation/src/app/documents/[id]/page.tsx` (ajouter le bouton dans l'en-tête)

**Interfaces:**
- Consumes: `computeTotals`, `formatCents`, types, table `settings`.
- Produces: `<PdfExportButton doc={DocumentRow} lines={DocumentLineRow[]} />` — télécharge `Facture-2026-001.pdf` / `Devis-….pdf` (ou `…-brouillon.pdf`).

- [ ] **Step 1 : Composant PDF**

`facturation/src/components/DocumentPdf.tsx` :

```tsx
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { computeTotals, formatCents } from '@/lib/money';
import type { DocumentLineRow, DocumentRow, SettingsRow } from '@/lib/types';

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 18, marginBottom: 20, fontFamily: 'Helvetica-Bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  block: { width: '45%' },
  h2: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  table: { marginTop: 20 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#999', paddingVertical: 4 },
  cLabel: { width: '55%' }, cQty: { width: '15%', textAlign: 'right' },
  cPrice: { width: '15%', textAlign: 'right' }, cTotal: { width: '15%', textAlign: 'right' },
  totals: { marginTop: 10, alignSelf: 'flex-end', width: 180 },
  bold: { fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#666' },
  mention: { marginTop: 16, color: '#444' },
});

export function DocumentPdf({ doc, lines, settings }: {
  doc: DocumentRow; lines: DocumentLineRow[]; settings: SettingsRow;
}) {
  const totals = computeTotals(
    lines.map((l) => ({ quantity: Number(l.quantity), unitPriceCents: l.unit_price_cents })),
    doc.vat_na ? 0 : Number(doc.vat_rate));
  const c = doc.client_snapshot;
  const label = doc.type === 'facture' ? 'Facture' : 'Devis';

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{label} {doc.numero ?? '(brouillon)'}</Text>
        <View style={s.row}>
          <View style={s.block}>
            <Text style={s.h2}>{settings.company_name}</Text>
            {settings.company_id ? <Text>{settings.company_id}</Text> : null}
            <Text>{settings.address}</Text>
            <Text>{settings.postal_code} {settings.city}</Text>
            <Text>{settings.country}</Text>
          </View>
          <View style={s.block}>
            <Text style={s.h2}>Client</Text>
            {c.company ? <Text>{c.company}</Text> : null}
            <Text>{[c.first_name, c.last_name].filter(Boolean).join(' ')}</Text>
            <Text>{c.address}</Text>
            <Text>{[c.postal_code, c.city].filter(Boolean).join(' ')}</Text>
            <Text>{c.country}</Text>
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <Text>Date d’émission : {doc.issue_date}</Text>
          <Text>
            Échéance : {doc.due_on_receipt ? 'à réception' : (doc.due_date ?? '—')}
          </Text>
        </View>

        <View style={s.table}>
          <View style={[s.tr, s.bold]}>
            <Text style={s.cLabel}>Désignation</Text>
            <Text style={s.cQty}>Qté</Text>
            <Text style={s.cPrice}>PU HT</Text>
            <Text style={s.cTotal}>Total HT</Text>
          </View>
          {lines.map((l) => (
            <View key={l.id} style={s.tr}>
              <Text style={s.cLabel}>{l.label}</Text>
              <Text style={s.cQty}>{String(l.quantity)}</Text>
              <Text style={s.cPrice}>{formatCents(l.unit_price_cents, doc.currency)}</Text>
              <Text style={s.cTotal}>
                {formatCents(Math.round(Number(l.quantity) * l.unit_price_cents), doc.currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.row}><Text>Total HT</Text><Text>{formatCents(totals.totalHTCents, doc.currency)}</Text></View>
          <View style={s.row}><Text>Total TVA ({doc.vat_na ? 0 : doc.vat_rate}%)</Text><Text>{formatCents(totals.totalTVACents, doc.currency)}</Text></View>
          <View style={[s.row, s.bold]}><Text>Total TTC</Text><Text>{formatCents(totals.totalTTCCents, doc.currency)}</Text></View>
        </View>

        <View style={s.mention}>
          {doc.payment_transfer ? (
            <Text>Règlement par virement — IBAN : {settings.iban} — BIC : {settings.bic}</Text>
          ) : null}
          {doc.payment_cheque ? <Text>Règlement par chèque accepté</Text> : null}
          {doc.vat_na ? <Text>TVA non applicable</Text> : null}
          {doc.type === 'facture' && settings.late_penalty_enabled ? (
            <Text>Tout retard de paiement entraînera des pénalités de retard exigibles sans rappel.</Text>
          ) : null}
        </View>

        {doc.footer || settings.footer_default ? (
          <Text style={s.footer}>{doc.footer || settings.footer_default}</Text>
        ) : null}
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2 : Bouton d'export**

`facturation/src/components/PdfExportButton.tsx` :

```tsx
'use client';
import { pdf } from '@react-pdf/renderer';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { DocumentPdf } from './DocumentPdf';
import type { DocumentLineRow, DocumentRow, SettingsRow } from '@/lib/types';

export function PdfExportButton({ doc, lines }: { doc: DocumentRow; lines: DocumentLineRow[] }) {
  async function download() {
    const { data: settings } = await createBrowserSupabase()
      .from('settings').select('*').eq('org_id', doc.org_id).single();
    const blob = await pdf(
      <DocumentPdf doc={doc} lines={lines} settings={settings as SettingsRow} />,
    ).toBlob();
    const label = doc.type === 'facture' ? 'Facture' : 'Devis';
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${label}-${doc.numero ?? 'brouillon'}.pdf`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <button onClick={download} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
      Exporter en PDF
    </button>
  );
}
```

- [ ] **Step 3 : Brancher dans l'éditeur**

Dans `facturation/src/app/documents/[id]/page.tsx`, dans le `<div>` d'en-tête (à côté de l'indicateur « Enregistré »), ajouter :

```tsx
<PdfExportButton doc={doc} lines={lines} />
```

avec l'import `import { PdfExportButton } from '@/components/PdfExportButton';`.

- [ ] **Step 4 : Vérifier** — exporter une facture avec 2 lignes, TVA 20 %, virement activé — Expected: PDF téléchargé nommé `Facture-2026-001.pdf`, totaux corrects, IBAN/BIC présents, mention TVA correcte.

- [ ] **Step 5 : Commit**

```bash
git add facturation/src/components/DocumentPdf.tsx facturation/src/components/PdfExportButton.tsx "facturation/src/app/documents/[id]/page.tsx"
git commit -m "feat: export PDF des factures et devis"
```

---

### Task 14 : Test de bout en bout (Playwright)

**Files:**
- Create: `facturation/playwright.config.ts`, `facturation/e2e/invoice-flow.spec.ts`

**Interfaces:**
- Consumes: l'app complète en local (`npm run dev`) + un compte de test existant (`E2E_EMAIL` / `E2E_PASSWORD` en variables d'environnement — créer ce compte via `/signup` au préalable).

- [ ] **Step 1 : Installer et configurer**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

`facturation/playwright.config.ts` :

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true },
});
```

Ajouter dans `package.json` scripts : `"e2e": "playwright test"`.

- [ ] **Step 2 : Écrire le test**

`facturation/e2e/invoice-flow.spec.ts` :

```ts
import { expect, test } from '@playwright/test';

test('connexion → création facture → envoi → export PDF → payée', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(process.env.E2E_EMAIL!);
  await page.getByPlaceholder('Mot de passe').fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Connexion' }).click();
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();

  await page.goto('/documents');
  await page.getByRole('button', { name: '+ Facture' }).click();
  await expect(page.getByRole('heading', { name: /Facture \(brouillon\)/ })).toBeVisible();

  await page.getByPlaceholder('Description du produit').fill('Prestation de test');
  const numbers = page.locator('input[type="number"]');
  await numbers.nth(0).fill('2');       // quantité
  await numbers.nth(1).fill('100');     // prix unitaire
  await expect(page.getByText('Enregistré', { exact: true })).toBeVisible({ timeout: 5000 });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter en PDF' }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^Facture-.*\.pdf$/);

  await page.goto('/documents');
  await page.getByRole('button', { name: 'Marquer envoyée' }).first().click();
  await page.getByRole('button', { name: 'Marquer payée' }).first().click();
  await expect(page.getByText('Payée').first()).toBeVisible();
});
```

- [ ] **Step 3 : Lancer**

Run (PowerShell) : `$env:E2E_EMAIL='...'; $env:E2E_PASSWORD='...'; npm run e2e`
Expected: 1 passed.

- [ ] **Step 4 : Commit**

```bash
git add facturation/playwright.config.ts facturation/e2e facturation/package.json facturation/package-lock.json
git commit -m "test: parcours e2e facture complète"
```

---

### Task 15 : Déploiement Vercel

**Files:**
- Aucun fichier de code ; opérations d'infrastructure.

- [ ] **Step 1 : Pousser le dépôt sur GitHub**

```bash
gh repo create facturation-llc --private --source . --push
```

(ou créer le dépôt sur github.com et `git remote add origin … && git push -u origin master`).

- [ ] **Step 2 : Importer dans Vercel**

Sur https://vercel.com : « Add New Project » → importer le dépôt GitHub → **Root Directory : `facturation`** → ajouter les variables d'environnement `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Deploy.

- [ ] **Step 3 : Configurer Supabase pour la prod**

Dans Supabase → Authentication → URL Configuration : ajouter l'URL Vercel (`https://<projet>.vercel.app`) comme Site URL.

- [ ] **Step 4 : Vérifier depuis le téléphone**

Ouvrir l'URL Vercel sur le téléphone : connexion, création d'une facture, export PDF.
Expected: tout fonctionne ; les données créées sur PC apparaissent sur le téléphone.

- [ ] **Step 5 : Commit final**

```bash
git add -A
git commit -m "chore: application de facturation v1 déployée" --allow-empty
```

---

## Hors périmètre (rappel de la spec)

Pas d'envoi d'email, pas de relances automatiques, pas de comptabilité, pas d'autres devises que € et $. Le logo dans le PDF (mentionné comme optionnel dans la spec) est reporté à une itération ultérieure pour garder la v1 simple — le PDF utilise le nom de la société en en-tête.
