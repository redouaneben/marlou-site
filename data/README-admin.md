# Administration Marlou (`/admin.html`)

Interface réservée à Marlou pour mettre à jour la carte de la semaine sans toucher au code.

## Accès

- URL : `https://votre-domaine.netlify.app/admin.html`
- Pas de lien public sur le site
- Mot de passe demandé à chaque session

## Configuration Netlify (une seule fois)

Dans **Site settings → Environment variables**, ajoutez :

| Variable | Exemple | Description |
|----------|---------|-------------|
| `ADMIN_PASSWORD` | `Marlou-Toussieu-2026!` | Mot de passe de connexion |
| `GITHUB_TOKEN` | `ghp_...` | Token GitHub avec accès au dépôt |
| `GITHUB_OWNER` | `votre-compte` | Propriétaire du repo |
| `GITHUB_REPO` | `marlou-site` | Nom du repo |
| `GITHUB_BRANCH` | `main` | Branche de déploiement |

### Créer le token GitHub

1. GitHub → **Settings → Developer settings → Personal access tokens**
2. Créez un token **Fine-grained** ou **Classic** avec le scope `repo`
3. Collez-le dans `GITHUB_TOKEN` sur Netlify

## Fonctionnement

1. Marlou se connecte sur `/admin.html`
2. Elle modifie plats, réglages et photos
3. **Enregistrer les modifications** envoie :
   - les nouvelles photos dans `assets/Plats/`
   - le fichier `data/menu-semaine.json`
4. Netlify redéploie automatiquement le site (1 à 2 minutes)

## Test en local

Installez la CLI Netlify, puis :

```bash
netlify dev
```

Ouvrez `http://localhost:8888/admin.html` avec les variables d'environnement configurées.

Sans `netlify dev`, l'interface s'affiche mais l'enregistrement ne fonctionne pas (pas de functions).

## Sécurité

- Le mot de passe est vérifié **côté serveur** (Netlify Functions)
- Ne partagez jamais le token GitHub
- Choisissez un mot de passe long (phrase facile à retenir)
