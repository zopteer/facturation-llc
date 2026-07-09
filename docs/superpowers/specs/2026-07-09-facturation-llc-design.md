# Spécification — Application de facturation LLC

**Date :** 2026-07-09
**Statut :** validée par l'utilisateur (design approuvé section par section)

## 1. Objectif

Application web de facturation simple et efficace pour une LLC, accessible depuis PC et téléphone via une URL unique, avec synchronisation automatique des données. Elle remplace un outil existant (type « KBC Invoice ») en y ajoutant historique, carnet de clients, suivi des paiements et devis.

## 2. Fonctionnalités

- Création de **factures** et de **devis** ; conversion devis → facture en un clic.
- **Multi-devises** : € ou $ au choix par document.
- **TVA optionnelle** : taux configurable par document, ou case « TVA non applicable » (mention légale imprimée sur le PDF).
- **Historique complet** des documents, avec numérotation automatique.
- **Carnet de clients** réutilisable.
- **Suivi des statuts** : brouillon, envoyée, payée, impayée ; vue d'ensemble des impayés.
- **Export PDF** fidèle à une facture classique.
- **Multi-utilisateurs** : plusieurs comptes (associés, comptable…) partageant les mêmes données au sein d'une organisation.

## 3. Architecture

```
Navigateur (PC / téléphone)
  Interface Next.js (React) + génération PDF locale
        │ HTTPS
Vercel (hébergement) — Next.js : pages + API
        │
Supabase — Auth (email + mot de passe) + Postgres (données, RLS)
```

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS** — interface responsive (mêmes écrans PC/mobile, une colonne + barre de navigation basse sur téléphone).
- **Supabase Auth** — inscription/connexion email + mot de passe ; les nouveaux membres rejoignent l'organisation via lien d'invitation.
- **Supabase Postgres** — règles de sécurité au niveau des lignes (RLS) : seuls les membres authentifiés de l'organisation lisent/écrivent.
- **PDF côté client** — `react-pdf` ou `pdf-lib`, aucun coût serveur.
- **Hébergement** — Vercel (plan gratuit) + Supabase (plan gratuit), suffisant pour cet usage.

## 4. Modèle de données

| Table | Contenu |
|---|---|
| `settings` | 1 ligne par organisation : nom société, SIRET/EIN, adresse, IBAN/BIC, logo (optionnel), footer par défaut, préfixes de numérotation, mention pénalités de retard (activable) |
| `clients` | société, prénom, nom, adresse, code postal, ville, pays, email |
| `documents` | type (`facture`/`devis`), numéro, client (FK), date d'émission, date d'échéance (ou « échéance à réception »), devise (`EUR`/`USD`), taux de TVA (0 + drapeau « TVA non applicable »), statut (`brouillon`/`envoyée`/`payée`/`impayée`/`annulée`), modes de paiement affichés (chèque, virement), footer |
| `document_lines` | désignation, quantité, prix unitaire HT, ordre |

Règles :
- **Numérotation** : séquences séparées factures/devis, format `2026-001`, remise à zéro chaque année. Numéro attribué au passage de brouillon à envoyée (les brouillons n'ont pas de numéro définitif).
- **Conversion devis → facture** : duplication du document avec type `facture` et prochain numéro de facture ; le devis d'origine est conservé et lié.
- **Suppression** : une facture envoyée ne se supprime jamais, elle s'annule (statut `annulée`, traçabilité comptable). Les brouillons sont supprimables.

## 5. Écrans

1. **Tableau de bord** — total des impayés, derniers documents, boutons « Nouvelle facture » / « Nouveau devis ».
2. **Liste des documents** — filtres (type, statut, client), recherche, changement de statut en un clic, export PDF direct.
3. **Éditeur de document** — disposition reprenant la capture de référence : bloc « Mes informations » pré-rempli depuis les réglages ; bloc « Client » (sélection dans le carnet ou saisie libre ajoutée au carnet) ; bloc « Facture » (numéro, dates, échéance à réception, TVA non applicable, pénalités de retard) ; lignes de produits dynamiques ; devise €/$ ; totaux HT/TVA/TTC calculés en direct ; modes de paiement (chèque / virement IBAN+BIC) ; footer. Sauvegarde automatique du brouillon.
4. **Carnet de clients** — liste, ajout, modification.
5. **Réglages** — infos société, IBAN/BIC, logo, préfixes, footer par défaut, gestion des membres (invitations).
6. **Connexion / inscription**.

## 6. Export PDF

- Bouton « Exporter en PDF » dans l'éditeur et la liste.
- Contenu : en-tête avec logo (si défini), blocs émetteur/client, tableau des lignes, totaux HT/TVA/TTC, coordonnées de paiement, mentions légales (« TVA non applicable », pénalités de retard si activées), footer.
- Nom de fichier : `Facture-2026-001.pdf` / `Devis-2026-001.pdf`.

## 7. Sécurité et gestion des erreurs

- Toutes les routes derrière l'authentification ; RLS Supabase par organisation.
- Validations : montants positifs, quantités positives, numéro unique par type et par an, échéance ≥ date d'émission.
- Sauvegarde automatique des brouillons (pas de perte de saisie sur mobile).
- Arrondis monétaires : calculs en centimes (entiers), affichage à 2 décimales.

## 8. Tests

- **Unitaires** : calculs HT/TVA/TTC et arrondis, génération des numéros (incrément, reset annuel, séquences séparées), conversion devis → facture.
- **Bout en bout** : parcours « connexion → créer une facture → exporter le PDF » et « marquer payée depuis la liste ».

## 9. Hors périmètre (pour l'instant)

- Envoi des factures par email depuis l'app.
- Relances automatiques d'impayés.
- Rapprochement bancaire, comptabilité.
- Autres devises que € et $.
