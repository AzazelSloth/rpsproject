# Instructions de Préparation du VPS

## Contexte
Une ancienne version tourne sur le serveur mais aucun des changements des développeurs n'apparaît.
Nous allons **nettoyer et reconstruire** proprement.

---

## Étape 1: Connexion au VPS

```bash
# Se connecter au serveur
ssh -i ~/.ssh/id_deploy root@104.254.182.46
```

Si la clé n'est pas dans `~/.ssh/config`, spécifier le chemin complet :
```bash
ssh -i /chemin/vers/id_deploy root@104.254.182.46
```

---

## Étape 2: Diagnostic de l'Existant

```bash
# Voir ce qui tourne actuellement
pm2 status

# Voir les processus en détail
pm2 list

# Vérifier les logs d'erreur
pm2 logs --lines 50

# Voir les ports utilisés
netstat -tlnp | grep -E '3000|3001|8786'

# Voir les anciennes installations
ls -la ~/rps-*
ls -la /home/*/rps-*
```

---

## Étape 3: Nettoyage Complet

```bash
# Arrêter tous les processus PM2
pm2 delete all
pm2 save

# Supprimer les anciennes installations
rm -rf ~/rps-rps_dev
rm -rf ~/rps-development
rm -rf ~/rps-*

# Nettoyer les fichiers temporaires
rm -rf /tmp/rps-*

# Supprimer les anciennes configurations PM2
rm -f ~/ecosystem.config.*
rm -f ~/.pm2/dump.pm2

# Vérifier que tout est propre
pm2 list  # Doit être vide
ls ~/rps-*  # Ne doit rien trouver
```

---

## Étape 4: Installation des Prérequis

### 4.1 Git

```bash
# Vérifier si Git est installé
git --version

# Si non installé ou version < 2.30
apt update
apt install -y git

# Vérifier
git --version  # Doit être >= 2.30
```

### 4.2 Node.js 24 via NVM

```bash
# Vérifier si Node.js existe
node -v  # Si pas v24.x, réinstaller

# Installer NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recharger le shell
source ~/.bashrc

# Vérifier que NVM est chargé
nvm --version

# Installer Node.js 24
nvm install 24.14.1

# Utiliser cette version
nvm use 24.14.1

# Définir comme défaut
nvm alias default 24.14.1

# Vérifier
node -v   # Doit afficher: v24.14.1
npm -v    # Doit afficher: 10.x.x
which node  # Doit être dans ~/.nvm
```

### 4.3 PM2

```bash
# Vérifier si PM2 est installé
pm2 --version

# Si non installé ou erreur
npm install -g pm2

# Vérifier
pm2 --version  # Doit afficher une version

# Configurer le démarrage automatique
pm2 startup systemd -u root --hp /root

# Sauvegarder (vide pour l'instant)
pm2 save
```

### 4.4 PostgreSQL (Vérification)

```bash
# Vérifier si PostgreSQL tourne
systemctl status postgresql

# Si externe, vérifier la connectivité
# (Adapter les valeurs selon votre configuration)
psql -h localhost -p 5432 -U rps_user -d rps_db -c "SELECT 1"

# Si PostgreSQL est local et pas installé:
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Créer l'utilisateur et la base (si nécessaire)
sudo -u postgres psql << 'EOF'
CREATE USER rps_user WITH PASSWORD 'votre_mot_de_passe';
CREATE DATABASE rps_db OWNER rps_user;
GRANT ALL PRIVILEGES ON DATABASE rps_db TO rps_user;
\q
EOF
```

### 4.5 Nginx (Optionnel mais Recommandé)

```bash
# Vérifier si Nginx est installé
nginx -v

# Si non installé
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# Config 
nano /etc/nginx/conf.d/rps.conf

# Vérifier
systemctl status nginx
```

---

## Étape 5: Configuration SSH pour GitHub Actions

### 5.1 Vérifier la Clé id_deploy

```bash
# Voir si la clé existe
ls -la ~/.ssh/id_deploy*

# Si elle n'existe PAS, la générer
ssh-keygen -t ed25519 -f ~/.ssh/id_deploy -C "github-actions-deployment" -N ""

# Afficher la clé PUBLIQUE (à copier dans GitHub)
cat ~/.ssh/id_deploy.pub
```

### 5.2 Autoriser la Clé sur le VPS

```bash
# Ajouter aux authorized_keys
cat ~/.ssh/id_deploy.pub >> ~/.ssh/authorized_keys

# Définir les bonnes permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/id_deploy

# Vérifier
ls -la ~/.ssh/
```

### 5.3 Tester la Connexion SSH

```bash
# Depuis le VPS (localhost test)
ssh -i ~/.ssh/id_deploy root@localhost

# Depuis une machine locale (remplacer le chemin)
# ssh -i /chemin/vers/id_deploy root@104.254.182.46
```

---

## Étape 6: Configurer les Secrets GitHub

### Sur votre machine locale (PAS sur le VPS)

1. **Récupérer la clé privée du VPS** :

```bash
# Depuis le VPS, afficher la clé privée
cat ~/.ssh/id_deploy
```

Copier **TOUT** le contenu (de `-----BEGIN OPENSSH PRIVATE KEY-----` à `-----END OPENSSH PRIVATE KEY-----`)

2. **Aller dans GitHub** :

- Repo → Settings → Secrets and variables → Actions
- Cliquer sur "New repository secret"

3. **Ajouter ces secrets** :

| Secret | Valeur |
|--------|--------|
| `VPS_HOST` | `104.254.182.46` |
| `VPS_USER` | `root` |
| `VPS_PORT` | `22` |
| `VPS_SSH_PRIVATE_KEY` | Le contenu de `~/.ssh/id_deploy` (clé **privée** du VPS) |
| `JWT_SECRET` | Une chaîne aléatoire longue (ex: `openssl rand -hex 32`) |
| `DB_HOST` | `localhost` (ou IP si externe) |
| `DB_PORT` | `5432` |
| `DB_USER` | `rps_user` |
| `DB_PASSWORD` | Le mot de passe PostgreSQL |
| `DB_NAME` | `rps_db` |

---

## Étape 7: Premier Déploiement

### Option A: Automatique (Recommandé)

```bash
# Sur votre machine locale, pousser du code
git add .
git commit -m "trigger deployment"
git push origin main
```

Le workflow se déclenche automatiquement.

**Vérifier dans GitHub** :
- Aller à: https://github.com/AzazelSloth/rpsproject/actions
- Le workflow `RPS CI/CD` doit apparaître et tourner

### Option B: Manuelle (Pour Tester)

```bash
# Sur le VPS
cd ~
git clone https://github.com/AzazelSloth/rpsproject.git rpsproject
cd rpsproject

# Rendre le script exécutable
chmod +x scripts/vps/deploy.sh

# Déployer
./scripts/vps/deploy.sh main
```

---

## Étape 8: Vérification Post-Déploiement

```bash
# 1. Vérifier PM2
pm2 status

# Doit montrer:
# ┌────┬───────────────┬─────┬──────────┬─────┬──────────┐
# │ id │ name          │ mode│ status   │ cpu │ memory   │
# ├────┼───────────────┼─────┼──────────┼─────┼──────────┤
# │ 0  │ rps-backend   │ fork│ online   │ 0%  │ 50mb     │
# │ 1  │ rps-frontend  │ fork│ online   │ 0%  │ 80mb     │
# └────┴───────────────┴─────┴──────────┴─────┴──────────┘

# 2. Tester le backend
curl http://localhost:3000/api/health

# 3. Tester le frontend
curl http://localhost:3001

# 4. Tester via Nginx (si configuré)
curl http://localhost:8786/login

# 5. Vérifier le code déployé
cd ~/rps-rps_dev
git log -1 --oneline
# Doit afficher le DERNIER commit de la branche main

# 6. Voir les logs
pm2 logs rps-backend --lines 50
pm2 logs rps-frontend --lines 50
```

---

## Étape 9: Configuration Nginx (Si Pas Déjà Fait)

```bash
# Copier la configuration RPS
cp ~/rps-rps_dev/scripts/vps/nginx.rps.conf /etc/nginx/sites-available/rps

# Activer le site
ln -sf /etc/nginx/sites-available/rps /etc/nginx/sites-enabled/

# Supprimer le site par défaut s'il conflict
rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
nginx -t

# Recharger Nginx
systemctl reload nginx

# Vérifier
systemctl status nginx
curl http://104.254.182.46:8786/login
```

---

## Étape 10: Firewall (Si UFW Actif)

```bash
# Voir le statut
ufw status

# Si actif, autoriser les ports nécessaires
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 8786/tcp  # Nginx personnalisé
ufw allow 443/tcp   # HTTPS (futur)

# Vérifier
ufw status verbose
```

---

## Checklist Finale

Après avoir suivi toutes les étapes :

- [ ] Connexion SSH fonctionnelle avec `id_deploy`
- [ ] Git installé (`git --version`)
- [ ] Node.js 24.14.1 (`node -v`)
- [ ] npm installé (`npm -v`)
- [ ] PM2 installé et configuré (`pm2 --version`)
- [ ] PostgreSQL accessible
- [ ] Nginx configuré (optionnel)
- [ ] Clé `id_deploy` dans `authorized_keys`
- [ ] Secrets GitHub configurés
- [ ] Workflow GitHub Actions vert ✅
- [ ] `pm2 status` montre 2 processus "online"
- [ ] Application accessible à `http://104.254.182.46:8786/login`
- [ ] Les changements des développeurs apparaissent

---

## Si Ça Ne Marche Toujours Pas

### 1. Vérifier les Logs GitHub Actions

```
https://github.com/AzazelSloth/rpsproject/actions
```

Cliquer sur le workflow qui a échoué et lire les erreurs.

### 2. Vérifier la Connexion SSH

```bash
# Tester depuis une machine locale
ssh -v -i ~/.ssh/id_deploy root@104.254.182.46
# Le -v donne des infos détaillées sur la connexion
```

### 3. Vérifier les Ports

```bash
# Sur le VPS
netstat -tlnp | grep -E '3000|3001|8786'

# Doit montrer:
# tcp  0  0 0.0.0.0:3000  LISTEN  node
# tcp  0  0 0.0.0.0:3001  LISTEN  node
# tcp  0  0 0.0.0.0:8786  LISTEN  nginx
```

### 4. Redémarrer Manuellement

```bash
# Sur le VPS
pm2 restart all
systemctl reload nginx
```

### 5. Voir les Logs d'Erreur

```bash
pm2 logs --err
tail -f /var/log/nginx/rps_error.log
```

---

## Prochaines Étapes

Après le premier déploiement réussi :

1. **Chaque push sur `main`** déclenchera automatiquement le déploiement
2. **Les changements apparaîtront** en 3-5 minutes (temps du build + déploiement)
3. **Vérifier dans GitHub Actions** que le workflow est vert ✅
4. **Tester sur** `http://104.254.182.46:8786/login`
