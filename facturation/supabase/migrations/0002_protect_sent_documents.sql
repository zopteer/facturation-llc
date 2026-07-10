-- Empêche la modification ou la suppression des documents non-brouillon,
-- sauf transition de statut autorisée. Filet de sécurité côté base de
-- données en complément des filtres appliqués côté client.

create or replace function protect_sent_documents() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'brouillon' then
      raise exception 'Un document envoyé ne peut pas être supprimé';
    end if;
    return old;
  end if;
  if old.status <> 'brouillon' then
    if to_jsonb(new) - 'status' <> to_jsonb(old) - 'status' then
      raise exception 'Un document envoyé ne peut plus être modifié';
    end if;
    if not (
      (old.status = 'envoyee' and new.status in ('payee','impayee','annulee')) or
      (old.status = 'impayee' and new.status in ('payee','annulee')) or
      (old.status = 'payee' and new.status in ('annulee')) or
      new.status = old.status
    ) then
      raise exception 'Transition de statut invalide';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_sent_documents
  before update or delete on documents
  for each row execute function protect_sent_documents();
