-- Inscriptions fermées : plus personne ne peut créer une nouvelle
-- organisation. Les invitations (join_organization) restent ouvertes,
-- donc les membres invités via lien peuvent toujours rejoindre.
revoke execute on function create_organization(text) from public;
revoke execute on function create_organization(text) from anon;
revoke execute on function create_organization(text) from authenticated;
