# Déploiement VPS Ubuntu

Ce guide permet de déployer le backend + frontend sur un VPS Ubuntu avec PM2 via GitHub Actions.

## 1. Pré-requis Serveur

- Ubuntu Server 22.04+ avec sudo
- **Git** (clone du code depuis GitHub)
- **Node.js 24** (installé via NVM sur le VPS)
- **npm** (gestion des dépendances + build)
- **PM2** (gestion des processus)
- PostgreSQL accessible par le backend
- SSH configuré avec la clé `~/.ssh/id_deploy`

## 2. Architecture de Déploiement

### Approche Simplifiée - Git + npm + PM2

Le workflow utilise les outils déjà installés sur le VPS :

```
1. Push sur GitHub → main/deploy
   ↓
2. GitHub Actions build et teste (CI uniquement)
   ↓
3. SSH dans le VPS via clé id_deploy
   ↓
4. git clone --depth 1 (code frais garanti)
   ↓
5. npm ci + npm run build (sur le VPS)
   ↓
6. PM2 redémarre avec le nouveau code
```

### Outils Utilisés

| Outil | Usage |
|-------|-------|
| **Git** | Clone le dernier code depuis GitHub |
| **Node.js 24** | Runtime pour npm et l'app |
| **npm** | Installe les dépendances + build |
| **PM2** | Gère les processus backend/frontend |
| **Nginx** | Reverse proxy (optionnel) |
| **PostgreSQL** | Base de données |

**Avantages** :
- ✅ Pas de SCP, pas de transfert de fichiers
- ✅ Pas de GitHub Token nécessaire
- ✅ Code garanti : `git clone --depth 1` = dernier commit
- ✅ Build reproductible sur le VPS
- ✅ Utilise uniquement les outils existants

### Structure sur le VPS

Le répertoire cible est calculé par le workflow avec `APP_DIR="$HOME/rps-$ENV"` :

- Push sur `main` -> `ENV=rps_dev` -> `$HOME/rps-rps_dev`
- Push sur `deploy` -> `ENV=development` -> `$HOME/rps-development`

```text
$HOME/rps-rps_dev/            # pour la branche main
├── rps-backend/
│   ├── src/          # Code source (depuis Git)
│   ├── dist/        # Build de production (npm run build sur VPS)
│   ├── package.json
│   └── .env         # Variables d'environnement
├── rps-frontend/nextjs-app/
│   ├── app/         # Code source (depuis Git)
│   ├── .next/      # Build de production (npm run build sur VPS)
│   ├── package.json
│   └── .env.local  # Variables d'environnement
├── ecosystem.config.cjs  # Configuration PM2
└── deployment.log        # Logs de déploiement (si manuel)
```

## 3. Configuration GitHub Actions

### Secrets requis

Configurer ces secrets dans **Settings > Secrets and variables > Actions** :

| Secret | Description | Exemple |
|--------|-------------|---------|
| `VPS_HOST` | IP publique du VPS | `104.254.182.46` |
| `VPS_USER` | Utilisateur SSH | `root` |
| `VPS_PORT` | Port SSH | `22` |
| `VPS_SSH_PRIVATE_KEY` | Clé privée SSH (`~/.ssh/id_deploy`) | `-----BEGIN...` |
| `JWT_SECRET` | Secret JWT pour le backend | Chaîne aléatoire |
| `DB_HOST` | Hôte PostgreSQL | `localhost` ou IP externe |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_USER` | Utilisateur PostgreSQL | `rps_user` |
| `DB_PASSWORD` | Mot de passe PostgreSQL | `motdepasse` |
| `DB_NAME` | Nom de la base de données | `rps_db` |

**Note** : Aucun GitHub Personal Access Token n'est nécessaire. Le déploiement utilise uniquement la clé SSH `id_deploy`.

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

### Option A: Script avec Build Local (Manuel)

Ce script clone le code depuis Git et build directement sur le VPS :

```bash
# Se connecter au VPS
ssh -i votre-cle ubuntu@IP_VPS

# Cloner le projet (première fois uniquement)
cd $HOME
git clone https://github.com/AzazelSloth/rpsproject.git rpsproject
cd rpsproject

# Rendre le script exécutable
chmod +x scripts/vps/deploy.sh

# Déployer (clone + build + PM2)
./scripts/vps/deploy.sh main

# Ou pour la branche deploy
./scripts/vps/deploy.sh deploy
```

**Note** : Cette méthode build sur le VPS et peut prendre 5-10 minutes. Elle est utile pour les tests manuels ou les déploiements hors CI.

### Option B: Automatique via GitHub Actions (Recommandé)

Le workflow automatique transfère les artefacts pré-construits via SCP et les déploie sans build sur le VPS (2-3 minutes).

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

- Vérifier les logs GitHub Actions: https://github.com/AzazelSloth/rpsproject/actions
- Vérifier la connexion SSH avec `id_deploy` : `ssh -i ~/.ssh/id_deploy root@104.254.182.46`
- Vérifier que Git, Node.js, npm, PM2 sont installés sur le VPS
- Vérifier que la clé `id_deploy` est valide et dans `authorized_keys`

### Échec du build sur le VPS

```bash
# Cause: Dépendances manquantes ou erreur de compilation
# Solution:
# 1. Vérifier les logs du workflow dans GitHub Actions
# 2. Sur le VPS, tester manuellement:
cd ~/rps-rps_dev/rps-backend
npm ci && npm run build

cd ~/rps-rps_dev/rps-frontend/nextjs-app
npm ci && npm run build

# 3. Vérifier la version Node.js:
node -v  # Doit être 24.x
```

### Les services ne démarrent pas

```bash
# Sur le VPS
pm2 logs --err
pm2 describe rps-backend
pm2 describe rps-frontend

# Redémarrer manuellement
pm2 restart all
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
# Vérifier le commit déployé (dans les logs GitHub Actions)
# Doit afficher le dernier commit de la branche

# Sur le VPS, vérifier le HEAD du clone
cd ~/rps-rps_dev
git log -1 --oneline

# Forcer le redémarrage
pm2 restart all

# Si nécessaire, re-déclencher le workflow manuellement depuis GitHub Actions
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

### Étape 4: Configuration de la Clé SSH pour GitHub Actions

La clé utilisée est `~/.ssh/id_deploy` sur le VPS.

```bash
# Vérifier si la clé existe sur le VPS
ls -la ~/.ssh/id_deploy*

# Si elle n'existe pas, la générer
ssh-keygen -t ed25519 -f ~/.ssh/id_deploy -C "github-actions-deployment"

# Afficher la clé PUBLIQUE (à ajouter dans GitHub)
cat ~/.ssh/id_deploy.pub
```

**Dans GitHub** (Repo → Settings → Secrets and variables → Actions) :

1. **`VPS_SSH_PRIVATE_KEY`** : Copier le contenu de `~/.ssh/id_deploy` (clé **PRIVÉE**) depuis le VPS
2. **`VPS_HOST`** : `104.254.182.46`
3. **`VPS_USER`** : `root` (ou votre utilisateur VPS)
4. **`VPS_PORT`** : `22`

**Autoriser la clé publique sur le VPS** (si pas déjà fait) :

```bash
# Sur le VPS, ajouter la clé publique aux authorized_keys
cat ~/.ssh/id_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**Tester la connexion SSH** (depuis une machine locale avec la clé privée) :

```bash
ssh -i id_deploy root@104.254.182.46
```

### Étape 5: Préparer les Variables d'Environnement

Les variables d'environnement sont automatiquement injectées par le workflow GitHub Actions via les secrets. Aucune configuration manuelle nécessaire sur le VPS pour le déploiement automatique.

Pour un déploiement **manuel** uniquement :

```bash
# Backend
export JWT_SECRET="votre_secret_jwt"
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_USER="rps_user"
export DB_PASSWORD="votre_mot_de_passe"
export DB_NAME="rps_db"
```

### Étape 6: Installer et Configurer PostgreSQL (si local)

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

### Étape 7: Configurer Nginx (Optionnel mais Recommandé)

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

### Étape 8: Premier Déploiement

**Option A: Via GitHub Actions (Recommandé - Automatique)**

1. Pousser du code sur `main` ou `deploy`
2. Le workflow CI se déclenche automatiquement
3. Build et tests dans GitHub Actions (validation)
4. SSH dans le VPS via clé `id_deploy`
5. `git clone` du dernier code
6. `npm ci` + `npm run build` sur le VPS
7. PM2 redémarre avec le nouveau code

**Option B: Manuellement sur le VPS**

```bash
# Se connecter au VPS
ssh -i ~/.ssh/id_deploy root@104.254.182.46

# Cloner le projet (première fois)
cd $HOME
git clone https://github.com/AzazelSloth/rpsproject.git rpsproject
cd rpsproject

# Rendre le script exécutable
chmod +x scripts/vps/deploy.sh

# Déployer (clone + build + PM2)
./scripts/vps/deploy.sh main
```

### Étape 9: Vérification Post-Déploiement

```bash
# 1. Vérifier que les processus tournent
pm2 status

# Doit afficher:
# ┌────┬─────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
# │ id │ name            │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
# ├────┼─────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
# │ 0  │ rps-backend     │ default     │ N/A     │ fork    │ 12345    │ 10m    │ 0    │ online    │ 0%       │ 50mb     │ root     │ disabled │
# │ 1  │ rps-frontend    │ default     │ N/A     │ fork    │ 12346    │ 10m    │ 0    │ online    │ 0%       │ 80mb     │ root     │ disabled │
# └────┴─────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘

# 2. Tester le backend
curl http://localhost:3000/api/health

# 3. Tester le frontend
curl http://localhost:3001

# 4. Tester via Nginx (si configuré)
curl http://localhost:8786/login

# 5. Vérifier le commit déployé
cd ~/rps-rps-dev
git log -1 --oneline
# Doit correspondre au dernier commit de la branche main
```

### Étape 10: Configuration du Firewall (Si UFW Actif)

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

## 10. Checklist de Vérification

Après avoir suivi toutes les étapes, vérifier :

- [ ] Git installé et fonctionnel (`git --version`)
- [ ] Node.js 24.14.1 installé (`node -v`)
- [ ] npm installé (`npm -v`)
- [ ] PM2 installé et configuré au démarrage
- [ ] Clé `id_deploy` créée et dans `authorized_keys`
- [ ] Secrets GitHub configurés (surtout `VPS_SSH_PRIVATE_KEY`)
- [ ] PostgreSQL accessible et configuré
- [ ] Nginx installé et configuré (optionnel)
- [ ] Premier déploiement réussi (workflow vert)
- [ ] `pm2 status` montre les 2 processus "online"
- [ ] Application accessible à `http://104.254.182.46:8786/login`
- [ ] Les changements des développeurs apparaissent après push
- [ ] `git log -1` sur le VPS correspond au dernier commit GitHub

---

## 11. Support et Ressources

- **Logs GitHub Actions**: https://github.com/AzazelSloth/rpsproject/actions
- **Logs PM2**: `pm2 logs`
- **Logs Nginx**: `/var/log/nginx/rps_error.log`
- **Code déployé sur VPS**: `cd ~/rps-rps_dev && git log -1`
- **Documentation complète**: `scripts/vps/DEPLOYMENT.md`
- **Résumé en français**: `scripts/vps/RESUME.md`
