# PAC Prospection IDF

Application personnelle de suivi de prospection (comptes, contacts, actions, campagnes, mailing, plan d'action, devis, bilan).
Les données restent dans le navigateur (IndexedDB) : faire régulièrement une sauvegarde complète (Exporter / sauvegarder).

## Organisation des fichiers

- `index.html` : la page (structure, en-tête, chargement des fichiers)
- `css/app.css` : la feuille de style
- `js/` : le code, chargé dans l'ordre (les fichiers partagent leurs déclarations, l'ordre compte)
  - `01-socle.js` : référentiels, utilitaires, modèle de données, migration, enregistrement
  - `02-interface.js` : navigation, fenêtres, actions, contacts, comptes
  - `03-agenda-tableau-de-bord.js` : calendrier, tableau de bord, agenda
  - `04-comptes-cibles.js` : liste des comptes, fiche compte, cibles et campagnes
  - `05-pac.js` : plan d'action commercial
  - `06-sauvegarde-doublons.js` : export, sauvegarde, restauration, copie de cibles, doublons
  - `07-mailing.js` : mailing
  - `08-excel.js` : export et import Excel
  - `09-historique-outils.js` : historique clients, stockage, actions rapides, comptes rendus, tableau de bord personnalisable, bloc-notes, bilan
  - `10-devis.js` : suivi des devis et imports Word / PDF / Excel
  - `11-comptes-calendrier.js` : comptes à compléter, glisser-déposer dans le calendrier
  - `12-sauvegarde-auto.js` : sauvegarde automatique quotidienne dans un dossier du PC (Chrome/Edge, hors Notion)
  - `13-relances.js` : relances des devis en attente, mail prêt à envoyer
  - `14-quoi-de-neuf.js` : récapitulatif après chaque import Excel des pièces
  - `15-analyse.js` : page Analyse des devis (objectif, N/N-1, prévisionnel, répartitions)
  - `16-preparation-rdv.js` : fiche imprimable de préparation de RDV
  - `17-recherche.js` : recherche globale (Ctrl+K)
  - `18-demarrage.js` : événements et démarrage (toujours en dernier)

## Nouvelle version

Changer le numéro `VERSION` dans `js/01-socle.js`, la mention de version dans `index.html`
et le paramètre `?v=` de chaque fichier dans `index.html` (force le rechargement par le navigateur).
