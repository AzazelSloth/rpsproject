# Déploiement VPS Ubuntu

Ce guide permet de déployer le backend + frontend sur un VPS Ubuntu avec PM2 via GitHub Actions.

## 1. Pré-requis Serveur

- Ubuntu Server 22.04+ avec sudo
- Node.js 20+ (installé sur le VPS)
- git
- PostgreSQL accessible par le backend
- SSH configuré pour GitHub Actions

## 2. Architecture de Déploiement

Le déploiement utilise **GitHub Actions** qui se connecte au VPS via SSH et :

1. Clone le code source sur le VPS
2. Installe les dépendances backend/frontend
3. Build le backend (NestJS) et le frontend (Next.js)
4. Configure les variables d'environnement
5. Démarre les services avec PM2

### Structure sur le VPS

Le répertoire cible est calculé par le workflow avec `APP_DIR="$HOME/rps-$ENV"` :

- Push sur `main` -> `ENV=rps_dev` -> `$HOME/rps-rps_dev`
- Push sur `deploy` -> `ENV=development` -> `$HOME/rps-development`

```text
$HOME/rps-rps_dev/            # pour la branche main
├── rps-backend/rps-backend/
│   ├── src/          # Code source
│   ├── dist/        # Build de production
│   ├── package.json
│   └── .env         # Variables d'environnement
├── rps-frontend/nextjs-app/
│   ├── app/         # Code source
│   ├── .next/      # Build de production
│   ├── package.json
│   └── .env.local  # Variables d'environnement
└── ecosystem.config.js  # Configuration PM2
```

## 3. Configuration GitHub Actions

### Secrets requis

Configurer ces secrets dans **Settings > Secrets and variables > Actions** :

| Secret | Description | Exemple |
|--------|-------------|---------|
| `VPS_HOST` | IP publique du VPS | `192.168.1.100` |
| `VPS_USER` | Utilisateur SSH | `ubuntu` |
| `VPS_PORT` | Port SSH | `22` (ou port personnalisé) |
| `VPS_SSH_PRIVATE_KEY` | Clé privée SSH | `-----BEGIN...` |
| `JWT_SECRET` | Secret JWT pour le backend | Chaîne aléatoire |
| `DB_HOST` | Hôte PostgreSQL | `localhost` ou IP externe |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_USER` | Utilisateur PostgreSQL | `rps_user` |
| `DB_PASSWORD` | Mot de passe PostgreSQL | `motdepasse` |
| `DB_NAME` | Nom de la base de données | `rps_db` |

### Déclencheurs

| Événement | Branche | Action |
|-----------|---------|--------|
| Push | `main` | Build + déploiement sur `rps_dev` |
| Push | `deploy` | Build + déploiement sur `development` |
| Pull Request | `main` | Tests uniquement |
| Manual | - | Déploiement manuel |

## 4. Variables d'environnement

Le déploiement crée automatiquement les fichiers `.env` sur le VPS.

### Backend (.env)

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<JWT_SECRET secret>
DB_HOST=<DB_HOST secret>
DB_PORT=<DB_PORT secret>
DB_USER=<DB_USER secret>
DB_PASSWORD=<DB_PASSWORD secret>
DB_NAME=<DB_NAME secret>
DB_SYNCHRONIZE=false
DB_LOGGING=false
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000
API_URL=http://127.0.0.1:3000
NEXT_PUBLIC_STRAPI_URL=
STRAPI_API_TOKEN=
```

## 5. Déploiement Manuel sur le VPS

Pour un déploiement manuel (sans GitHub Actions) :

```bash
# Se connecter au VPS
ssh -i votre-cle ubuntu@IP_VPS

# Cloner le projet
cd $HOME
git clone https://github.com/VOTRE_USER/rpsproject.git rpsproject
cd rpsproject

# Déployer avec le script
chmod +x scripts/vps/deploy.sh
./scripts/vps/deploy.sh main

# Alternative pour simuler la branche deploy
./scripts/vps/deploy.sh deploy
```

## 6. Commandes PM2 Utiles

```bash
# Voir les services
pm2 ls

# Logs backend
pm2 logs rps-backend --lines 200

# Logs frontend
pm2 logs rps-frontend --lines 200

# Redémarrer un service
pm2 restart rps-backend
pm2 restart rps-frontend

# Sauvegarder la configuration
pm2 save
```

## 7. Dépannage

### Le déploiement échoue

- Vérifier les logs GitHub Actions
- Vérifier la connexion SSH : `ssh -i clef -p PORT user@host`
- Vérifier que PM2 est installé sur le VPS

### Les services ne démarrent pas

```bash
# Sur le VPS
pm2 logs --err
pm2 describe rps-backend
pm2 describe rps-frontend
```

### Problèmes de permissions

```bash
# Vérifier les permissions
ls -la $HOME/rps-rps_dev/
ls -la $HOME/rps-development/

# Redémarrer avec les bons droits
sudo chown -R $USER:$USER $HOME/rps-rps_dev/
sudo chown -R $USER:$USER $HOME/rps-development/
```

## 8. Configuration Nginx (optionnel)

Si Nginx est utilisé comme reverse proxy, voir [NGINX_SETUP.md](NGINX_SETUP.md).

Le script de déploiement est compatible avec le fichier [`scripts/vps/nginx.rps.conf`](scripts/vps/nginx.rps.conf).
