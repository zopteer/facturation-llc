-- Modèle de mise en page du PDF, choisi par document
alter table documents add column template text not null default 'moderne-noir';
