# Registre

Application personnelle de suivi commercial (comptes, contacts, actions, campagnes, mailing, analyse SWOT, plan d'action, devis, analyse, bilan), utilisable partout en France.
L'adresse du dépôt et le nom interne des données (`pac-idf`) restent inchangés : rien à migrer.
Les données restent dans le navigateur (IndexedDB) : faire régulièrement une sauvegarde complète (Exporter / sauvegarder).

## Organisation des fichiers

- `index.html` : la page (structure, en-tête, chargement des fichiers)
- `css/app.css` : la feuille de style
- `js/` : le code, chargé dans l'ordre (les fichiers partagent leurs déclarations, l'ordre compte)
  - `01-socle.js` : référentiels, utilitaires, modèle de données, migration, enregistrement
  - `02-interface.js` : navigation, fenêtres, actions, contacts, comptes
  - `03-agenda-tableau-de-bord.js` : calendrier, tableau de bord, agenda
  - `04-comptes-cibles.js` : liste des comptes, fiche compte, cibles et campagnes, sélection multiple des cibles (cases à cocher : classer sans suite, retirer de la campagne, supprimer, avec annulation), gestion des campagnes (renommer, fusionner, supprimer)
  - `05-pac.js` : plan d'action commercial ; compléments du plan (budget, arbitrages…) sous le tableau, modifiables dans « Paramètres du plan »
  - `06-sauvegarde-doublons.js` : export, sauvegarde, restauration, copie de cibles, doublons
  - `07-mailing.js` : mailing
  - `08-excel.js` : export et import Excel
  - `09-historique-outils.js` : historique clients, stockage, actions rapides, comptes rendus, tableau de bord personnalisable, bloc-notes, bilan
  - `10-devis.js` : suivi des devis et imports Word / PDF / Excel ; devis en double (même n°, même client) signalés et fusionnables
  - `11-comptes-calendrier.js` : comptes à compléter, glisser-déposer dans le calendrier
  - `12-groupes.js` : groupes multi-sites (compte tête de groupe, sites rattachés, notes et comptes rendus communs)
  - `13-relances.js` : relances des devis en attente, mail prêt à envoyer
  - `14-quoi-de-neuf.js` : récapitulatif après chaque import Excel des pièces
  - `15-analyse.js` : page Analyse des devis (objectif, N/N-1, prévisionnel, répartitions)
  - `16-preparation-rdv.js` : fiche imprimable de préparation de RDV
  - `17-recherche.js` : recherche globale (Ctrl+K)
  - `19-comptes-rendus.js` : page Comptes rendus (recherche plein texte, filtres, impression de la sélection) et bloc du tableau de bord ; chargé juste avant le démarrage
  - `20-reunions.js` : réunions (Café Commerce, inter-BU, équipe, direction, formation, autre) : compte rendu sans compte obligatoire, affaires évoquées reliées aux fiches des clients cités ; réunions planifiées dans l'agenda (calendrier, À faire, glisser-déposer), compte rendu une fois tenues, lien vers un point d'agenda (action) ; intégrées à la page Comptes rendus, à la recherche globale et à la fiche compte
  - `21-fichiers.js` : fichiers reliés (réunions, comptes rendus et actions, fiches compte, cibles) : un lien vers le fichier du PC, rien n'est copié ; l'accès reste dans le navigateur, le nom et la taille suivent la sauvegarde. Chrome ou Edge, en pleine page
  - `22-selection-contacts.js` : sélection de contacts pour un mailing (typologie, sous-typologie, famille, type, département, agence, fonction) ; copie des adresses ou création d'une liste dans le Mailing
  - `23-comptes-contacts.js` : import « Comptes et contacts » (Comptes › Importer) : une base de contacts sans cible ni campagne ; comptes créés ou complétés (champs vides seulement), tous les contacts ajoutés sans doublon, annulation tant que le panneau reste ouvert
  - `24-swot.js` : analyses SWOT (forces, faiblesses, opportunités, menaces) sur l'entreprise (nom saisi), un compte (bouton SWOT de la fiche), un secteur ou une campagne, lignes à glisser d'un quadrant à l'autre, importance, stratégies croisées (S×O, W×O, S×T, W×T) envoyées dans le PAC, duplication pour la période suivante, impression, recherche globale ; analyse jointe à un plan du PAC (choisie dans la page du plan, sinon celle dont des axes sont dans le plan) : imprimée en première page du PAC et exportée dans un onglet « SWOT » après celui du plan
  - `25-swot-import.js` : import d'une analyse SWOT (Excel, Word, PowerPoint, PDF, .txt, .csv ou texte collé) : lignes classées d'après les titres Forces, Faiblesses, Opportunités, Menaces et les stratégies (et leur position sur la page), matrice TOWS reconnue (cases du croisement classées dans leur stratégie), aperçu corrigible (lignes non classées classables d'un coup), import dans une nouvelle analyse ou dans l'analyse affichée ; import des stratégies seules (bouton « Importer » du panneau Stratégies) : axes Offensive, Réorientation, Défensive, Repli ajoutés à l'analyse affichée, sans doublon
  - `26-pac-import.js` : import d'un PAC Excel (format PAC France ou export Registre retouché dans Excel) : priorité « P1 · » de l'élément, colonnes Attendus / Obtenus, cellules fusionnées, chiffres calculés de la colonne Obtenus ignorés (objectifs chiffrés, campagnes et secteurs reliés repris) ; le tableau s'arrête à la première ligne vide, la suite devient les compléments du plan ; mise à jour d'un plan (lignes reconnues par leur élément, liens et objectifs conservés), ajout à la suite ou nouveau plan ; annulation tant que le panneau reste ouvert
  - `18-demarrage.js` : événements et démarrage (toujours en dernier)

## Nouvelle version

Changer le numéro `VERSION` dans `js/01-socle.js`, la mention de version dans `index.html`
et le paramètre `?v=` de chaque fichier dans `index.html` (force le rechargement par le navigateur).
