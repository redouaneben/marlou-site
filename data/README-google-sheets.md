# Carte semaine dans Google Sheets

## Import (2 minutes)

1. [Google Sheets](https://sheets.google.com) → **Nouvelle feuille**
2. **Fichier → Importer → Téléverser** → choisissez `menu-semaine.csv`
3. **Séparateur** : Virgule → **Importer**

## Mise en forme automatique (1 fois)

1. **Extensions → Apps Script**
2. Supprimez le contenu par défaut
3. Copiez-collez tout le fichier `scripts/format-marlou-sheet.gs`
4. **Enregistrer** → lancez **applyMarlouTheme**
5. Autorisez l'accès (première fois seulement)
6. Revenez sur la feuille : couleurs crème / chocolat / terracotta, colonnes élargies

Ensuite, un menu **Marlou → Appliquer la mise en forme** apparaît à chaque ouverture.

## Connexion au site web

Le site charge le menu **directement depuis ce Google Sheet** (export CSV public) à chaque visite.  
Partagez la feuille en **« Toute personne disposant du lien → Lecteur »** pour que le site puisse lire les données.

En cas d'indisponibilité du Sheet, le site repasse automatiquement sur `data/menu-semaine.json`.

## Chaque semaine, Marlou modifie surtout

| Colonne | Action |
|---------|--------|
| **nom, prix, description…** | Modifier le plat |
| **actif** | `TRUE` = visible sur le site · `FALSE` = masqué |
| **Semaine** (en bas) | Ex. `2026-W39` |
| **Créneaux** (en bas) | Ajuster les horaires de retrait |
