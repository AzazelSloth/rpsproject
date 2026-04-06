# Déploiement VPS Ubuntu

Ce guide permet de déployer le backend + frontend sur un VPS Ubuntu avec PM2 via GitHub Actions.

## 1. Pré-requis Serveur

- Ubuntu Server 22.04+ avec sudo
- Node.js 20-24 (installé sur le VPS)
- git (uniquement pour le clone minimal des fichiers source)
- PostgreSQL accessible par le backend
- SSH configuré pour GitHub Actions
- **curl** et **unzip** (pour télécharger les artefacts CI)

## 2. Architecture de Déploiement

### Nouveau Système Basé sur les Artefacts CI

Le déploiement utilise désormais les **artefacts pré-construits** de GitHub Actions au lieu de reconstruire sur le VPS :

1. GitHub Actions build et teste le code dans le cloud
2. Les artefacts compilés sont uploadés (rps-backend, rps-frontend)
3. Le script sur le VPS télécharge ces artefacts
4. Déploiement du code **100% identique** à celui testé dans CI

### Ancien vs Nouveau

| Aspect | Ancien Système | Nouveau Système |
|--------|----------------|-----------------|
| Build | Sur le VPS (lent) | Dans GitHub Actions (rapide) |
| Code déployé | Clone Git (peut être obsolète) | Artefact CI (garanti最新) |
| Temps de déploiement | 5-10 min | 2-3 min |
| Fiabilité | Variable (dépend du VPS) | Garantie (même build que CI) |

### Structure sur le VPS

Le répertoire cible est calculé par le workflow avec `APP_DIR="$HOME/rps-$ENV"` :

- Push sur `main` -> `ENV=rps_dev` -> `$HOME/rps-rps_dev`
- Push sur `deploy` -> `ENV=development` -> `$HOME/rps-development`

```text
$HOME/rps-rps_dev/            # pour la branche main
├── rps-backend/
│   ├── src/          # Code source (pour référence)
│   ├── dist/        # Build de production (artefact CI)
│   ├── package.json
│   └── .env         # Variables d'environnement
├── rps-frontend/nextjs-app/
│   ├── app/         # Code source (pour référence)
│   ├── .next/      # Build de production (artefact CI)
│   ├── package.json
│   └── .env.local  # Variables d'environnement
├── ecosystem.config.cjs  # Configuration PM2
└── deployment.log        # Logs de déploiement
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
| `GITHUB_TOKEN` | Token pour télécharger les artefacts | `ghp_xxxx` |
| `JWT_SECRET` | Secret JWT pour le backend | Chaîne aléatoire |
| `DB_HOST` | Hôte PostgreSQL | `localhost` ou IP externe |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_USER` | Utilisateur PostgreSQL | `rps_user` |
| `DB_PASSWORD` | Mot de passe PostgreSQL | `motdepasse` |
| `DB_NAME` | Nom de la base de données | `rps_db` |

### Nouveau : GitHub Token pour Artefacts

Le déploiement nécessite un **Personal Access Token** GitHub pour télécharger les artefacts CI :

1. Créer un token ici: https://github.com/settings/tokens
2. Portées requises: `repo` (accès complet au repository)
3. Stocker le token en sécurité
4. Ajouter comme secret `GITHUB_TOKEN` dans GitHub Actions

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
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000/api
API_URL=http://127.0.0.1:3000/api
NEXT_PUBLIC_STRAPI_URL=
STRAPI_API_TOKEN=
```

## 5. Déploiement Manuel sur le VPS

Pour un déploiement manuel (sans GitHub Actions) :

### Option A: Script avec Artefacts CI (Recommandé)

```bash
# Se connecter au VPS
ssh -i votre-cle ubuntu@IP_VPS

# Accéder au répertoire du projet
cd /home/ubuntu/rps-rps_dev  # adapter selon votre setup

# Déployer avec le nouveau script (télécharge les artefacts CI)
# Nécessite un GitHub Personal Access Token
bash scripts/vps/deploy.sh ghp_votre_token main

# Ou utiliser le script simplifié
export GITHUB_TOKEN=ghp_votre_token
bash scripts/vps/quick-deploy.sh main
```

### Option B: Ancienne Méthode (Déconseillée)

Si vous devez absolument reconstruire sur le VPS :

```bash
# Cloner manuellement
cd $HOME
git clone https://github.com/VOTRE_USER/rpsproject.git rpsproject
cd rpsproject

# Utiliser l'ancien script de déploiement
chmod +x scripts/vps/deploy-from-git.sh
./scripts/vps/deploy-from-git.sh main
```

### Créer un GitHub Personal Access Token

1. Aller sur https://github.com/settings/tokens
2. Cliquer sur "Generate new token (classic)"
3. Nom: `rps-deployment-vps`
4. Expiration: 90 jours (ou personnalisé)
5. Cocher les scopes: **repo** (toutes les sous-catégories)
6. Générer et copier le token (commence par `ghp_`)
7. **IMPORTANT**: Stocker le token en sécurité immédiatement

```bash
# Tester le token
curl -H "Authorization: Bearer ghp_votre_token" \
  https://api.github.com/repos/AzazelSloth/rpsproject/actions/workflows
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
- **Nouveau**: Vérifier que le GitHub Token est valide et n'a pas expiré

### "No successful workflow run found"

```bash
# Cause: Aucun workflow CI n'a réussi pour cette branche
# Solution:
# 1. Vérifier les Actions GitHub: https://github.com/AzazelSloth/rpsproject/actions
# 2. Pousser du code pour déclencher un build
# 3. Attendre que le workflow se termine avec succès
```

### "Artifact not found"

```bash
# Cause: Les artefacts ont expiré (7 jours de rétention)
# Solution:
# 1. Re-déclencher le workflow CI
# 2. Vérifier que l'étape "Upload artifact" a réussi
# 3. Re-lancer le déploiement rapidement après un build réussi
```

### Les services ne démarrent pas

```bash
# Sur le VPS
pm2 logs --err
pm2 describe rps-backend
pm2 describe rps-frontend

# Vérifier les logs de déploiement
tail -n 100 ~/rps-rps_dev/deployment.log
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

### Code non mis à jour après déploiement

```bash
# Vérifier le commit déployé
tail -n 20 ~/rps-rps_dev/deployment.log | grep "Deploying commit"

# Comparer avec le dernier commit GitHub
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/AzazelSloth/rpsproject/commits/main

# Force re-déploiement
bash scripts/vps/deploy.sh $GITHUB_TOKEN main
```

## 8. Configuration Nginx (optionnel)

Si Nginx est utilisé comme reverse proxy, voir [NGINX_SETUP.md](NGINX_SETUP.md).

Le script de déploiement est compatible avec le fichier [`scripts/vps/nginx.rps.conf`](scripts/vps/nginx.rps.conf).

---

## 9. Instructions Complètes - Configuration Initiale du VPS

Cette section détaille toutes les étapes nécessaires pour préparer le VPS au déploiement avec artefacts CI.

### Étape 1: Connexion et Mise à Jour du Serveur

```bash
# Se connecter au VPS
ssh -i votre-cle.pem ubuntu@104.254.182.46

# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer les dépendances requises
sudo apt install -y curl unzip git build-essential
```

### Étape 2: Installation de Node.js 24 via NVM

```bash
# Installer NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recharger le shell
source ~/.bashrc

# Installer Node.js 24
nvm install 24.14.1
nvm use 24.14.1
nvm alias default 24.14.1

# Vérifier l'installation
node -v   # Doit afficher: v24.14.1
npm -v    # Doit afficher: 10.x.x
```

### Étape 3: Installation de PM2

```bash
# Installer PM2 globalement
npm install -g pm2

# Configurer PM2 pour démarrer automatiquement au reboot
pm2 startup systemd -u $USER --hp $HOME

# Sauvegarder la configuration (vide pour l'instant)
pm2 save
```

### Étape 4: Configuration de l'Accès GitHub

```bash
# Tester la connexion à GitHub
git ls-remote https://github.com/AzazelSloth/rpsproject.git HEAD

# Si le repo est privé, configurer les credentials Git
git config --global user.name "Votre Nom"
git config --global user.email "votre@email.com"
```

### Étape 5: Créer un GitHub Personal Access Token

**Sur votre machine locale** (pas sur le VPS) :

1. Aller sur https://github.com/settings/tokens
2. Cliquer sur **"Generate new token"** > **"Generate new token (classic)"**
3. Configuration :
   - **Nom**: `rps-deployment-vps`
   - **Expiration**: 90 jours
   - **Scopes**: Cocher `repo` (toutes les sous-catégories automatiquement)
4. Cliquer **"Generate token"**
5. **COPIER IMMÉDIATEMENT** le token (commence par `ghp_`)

```bash
# Tester le token (remplacer ghp_xxxx)
curl -H "Authorization: Bearer ghp_xxxx" \
  https://api.github.com/repos/AzazelSloth/rpsproject
```

### Étape 6: Préparer les Variables d'Environnement

**Sur le VPS**, créer un fichier `.env` sécurisé :

```bash
# Créer le fichier d'environnement
cat > ~/.rps-env << 'EOF'
# GitHub
GITHUB_TOKEN=ghp_votre_token_ici

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_USER=rps_user
DB_PASSWORD=votre_mot_de_passe_db
DB_NAME=rps_db

# JWT
JWT_SECRET=votre_secret_jwt_tres_long_et_aleatoire
EOF

# Sécuriser le fichier
chmod 600 ~/.rps-env

# Charger les variables automatiquement
echo "source ~/.rps-env" >> ~/.bashrc
source ~/.rps-env
```

### Étape 7: Installer et Configurer PostgreSQL (si local)

```bash
# Installer PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Démarrer le service
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Créer l'utilisateur et la base
sudo -u postgres psql << 'EOF'
CREATE USER rps_user WITH PASSWORD 'votre_mot_de_passe_db';
CREATE DATABASE rps_db OWNER rps_user;
GRANT ALL PRIVILEGES ON DATABASE rps_db TO rps_user;
\q
EOF

# Tester la connexion
PGPASSWORD='votre_mot_de_passe_db' psql -h localhost -p 5432 -U rps_user -d rps_db -c "SELECT 1"
```

### Étape 8: Configurer Nginx (Optionnel mais Recommandé)

```bash
# Installer Nginx
sudo apt install -y nginx

# Copier la configuration RPS
sudo cp /home/ubuntu/rps-rps_dev/scripts/vps/nginx.rps.conf \
  /etc/nginx/sites-available/rps

# Activer le site
sudo ln -sf /etc/nginx/sites-available/rps /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx

# Vérifier
sudo systemctl status nginx
```

### Étape 9: Premier Déploiement

**Option A: Via GitHub Actions (Recommandé)**

1. Pousser du code sur `main` ou `deploy`
2. Le workflow CI se déclenche automatiquement
3. Le déploiement se fait via SSH automatiquement

**Option B: Manuellement sur le VPS**

```bash
# Se connecter au VPS
ssh ubuntu@104.254.182.46

# Charger les variables d'environnement
source ~/.rps-env

# Cloner le projet (première fois)
cd $HOME
git clone https://github.com/AzazelSloth/rpsproject.git rpsproject
cd rpsproject

# Rendre le script exécutable
chmod +x scripts/vps/deploy.sh

# Déployer (télécharge les artefacts CI)
bash scripts/vps/deploy.sh $GITHUB_TOKEN main

# Vérifier le déploiement
pm2 status
pm2 logs --lines 50
```

### Étape 10: Vérification Post-Déploiement

```bash
# 1. Vérifier que les processus tournent
pm2 status

# Doit afficher:
# ┌────┬─────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
# │ id │ name            │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
# ├────┼─────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
# │ 0  │ rps-backend     │ default     │ N/A     │ fork    │ 12345    │ 10m    │ 0    │ online    │ 0%       │ 50mb     │ ubuntu   │ disabled │
# │ 1  │ rps-frontend    │ default     │ N/A     │ fork    │ 12346    │ 10m    │ 0    │ online    │ 0%       │ 80mb     │ ubuntu   │ disabled │
# └────┴─────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘

# 2. Tester le backend
curl http://localhost:3000/api/health

# 3. Tester le frontend
curl http://localhost:3001

# 4. Tester via Nginx (si configuré)
curl http://localhost:8786/login

# 5. Voir les logs de déploiement
tail -n 50 ~/rps-rps_dev/deployment.log

# Doit contenir:
# [YYYY-MM-DD HH:MM:SS] [INFO] Deploying commit: abc12345
# [YYYY-MM-DD HH:MM:SS] [INFO] Deployment completed successfully!
```

### Étape 11: Configuration du Firewall (Si UFW Actif)

```bash
# Activer UFW si pas déjà fait
sudo ufw enable

# Autoriser SSH (ATTENTION: ne pas oublier!)
sudo ufw allow 22/tcp

# Autoriser HTTP (Nginx)
sudo ufw allow 80/tcp
sudo ufw allow 8786/tcp  # Si port personnalisé

# Autoriser HTTPS (si SSL configuré plus tard)
sudo ufw allow 443/tcp

# Vérifier le statut
sudo ufw status
```

### Étape 12: Automatiser les Mises à Jour (Optionnel)

Pour que le VPS se mette à jour automatiquement après chaque push :

**Le workflow GitHub Actions le fait déjà automatiquement !**

Mais si vous voulez un déploiement périodique ou manuel rapide :

```bash
# Créer un alias pour déploiement rapide
echo "alias rps-deploy='cd ~/rpsproject && bash scripts/vps/deploy.sh \$GITHUB_TOKEN main'" >> ~/.bashrc
source ~/.bashrc

# Utilisation
rps-deploy
```

---

## 10. Checklist de Vérification

Après avoir suivi toutes les étapes, vérifier :

- [ ] Node.js 24.14.1 installé et fonctionnel
- [ ] PM2 installé et configuré au démarrage
- [ ] GitHub Token créé et stocké sécurisé
- [ ] PostgreSQL accessible et configuré
- [ ] Nginx installé et configuré (optionnel)
- [ ] Premier déploiement réussi
- [ ] `pm2 status` montre les 2 processus "online"
- [ ] Application accessible à `http://104.254.182.46:8786/login`
- [ ] Les changements des développeurs apparaissent après push
- [ ] Logs de déploiement propres (pas d'erreurs)

---

## 11. Support et Ressources

- **Logs de déploiement**: `~/rps-rps_dev/deployment.log`
- **Logs PM2**: `pm2 logs`
- **Logs Nginx**: `/var/log/nginx/rps_error.log`
- **GitHub Actions**: https://github.com/AzazelSloth/rpsproject/actions
- **Documentation complète**: `scripts/vps/DEPLOYMENT.md`
- **Résumé en français**: `scripts/vps/RESUME.md`
