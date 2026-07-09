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
