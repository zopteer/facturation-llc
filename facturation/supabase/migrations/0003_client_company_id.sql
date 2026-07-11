-- Numéro d'immatriculation du client (SIRET / SIREN / EIN)
alter table clients add column company_id text not null default '';
