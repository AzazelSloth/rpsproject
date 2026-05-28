# RPS Platform - Gestion des Risques Psychosociaux

![RPS Platform](https://img.shields.io/badge/Version-1.0.0-blue)
![NestJS](https://img.shields.io/badge/Backend-NestJS_11-green)
![Next.js](https://img.shields.io/badge/Frontend-Next.js_15-green)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue)

Plateforme de gestion des Risques Psychosociaux (RPS) pour LaRoche Consulting.
L'application permet de créer, gérer et analyser des campagnes d'évaluation RPS
en entreprise.

## Documentation de passation

Pour la prise en main par Abondelire / LaRoche et le guide des modifications
possibles côté client, consulter :

- [Guide de passation et de modification](docs/GUIDE_PASSATION_ET_MODIFICATIONS.md)
- [Guide de configuration n8n client](docs/GUIDE_CONFIGURATION_N8N_CLIENT.md)

---

## Table des Matières

1. [Description du Projet](#description-du-projet)
2. [Architecture Technique](#architecture-technique)
3. [Prérequis](#prérequis)
4. [Installation Locale](#installation-locale)
5. [Structure du Projet](#structure-du-projet)
6. [Variables d'Environnement](#variables-denvironnement)
7. [Commandes Utiles](#commandes-utiles)
8. [Déploiement CI/CD](#déploiement-cicd)
9. [Déploiement VPS Manuel](#déploiement-vps-manuel)
10. [Préparations Nécessaires au Déploiement](#préparations-nécessaires-au-déploiement)
11. [Dépannage](#dépannage)

---

## Description du Projet

La plateforme RPS est une solution complète pour :

- **Gestion des campagnes** : création et suivi des campagnes d'évaluation RPS.
- **Questionnaires** : questionnaires standardisés sur les risques psychosociaux.
- **Suivi des participants** : gestion des employés, invitations et relances.
- **Rapports** : génération de rapports détaillés au format Word (`.docx`).
- **Dashboard analytique** : visualisation des données et statistiques.
- **Automatisations** : intégration n8n pour les relances et analyses.

### Fonctionnalités Principales

| Module | Fonctionnalités |
|--------|-----------------|
| **Authentification** | Login/Logout, JWT, protection des routes |
| **Dashboard** | Vue d'ensemble des campagnes, participation, scores |
| **Campagnes** | Création, configuration des questions, activation |
| **Employés** | Import CSV/XLSX, suivi des statuts, relances |
| **Rapports** | Export Word, analyse par département/fonction |
| **n8n** | Automatisations et workflows d'analyse |

---

## Architecture Technique

```text
+----------------------+        +----------------------+
|      Navigateur      |        |      n8n public      |
+----------+-----------+        +----------+-----------+
           |                               |
           v                               v
+-----------------------------------------------------+
| Nginx hôte / terminaison HTTPS / proxy public       |
| scripts/vps/nginx.host.conf                         |
| écoute locale: 127.0.0.1:8786                       |
+---------------------------+-------------------------+
                            |
                            v
+-----------------------------------------------------+
| Nginx Docker                                        |
| scripts/vps/nginx.rps.conf                          |
| conteneur: 8786, publié VPS: 8787                   |
+-------------+--------------------+------------------+
              |                    |
              v                    v
+----------------------+  +----------------------+
| Frontend Next.js     |  | Backend NestJS       |
| port conteneur 3001  |  | port conteneur 3000  |
+----------+-----------+  +----------+-----------+
                                      |
                                      v
                         +----------------------+
                         | PostgreSQL 14+       |
                         +----------------------+
```

Le déploiement courant utilise Docker Compose. PM2 n'est plus utilisé par les
scripts de production.

### Stack Technologique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| **Frontend** | Next.js | 15.1.7 |
| | React | 19.2.3 |
| | TypeScript | 5.x |
| | Tailwind CSS | 4.x |
| **Backend** | NestJS | 11.0.1 |
| | TypeORM | 0.3.28 |
| | JWT | 11.0.0 |
| | bcrypt | 6.0.0 |
| **Base de données** | PostgreSQL | 14+ |
| **Automatisation** | n8n | image Docker `n8nio/n8n:latest` |
| **Runtime** | Node.js | 24 en CI/Docker |
| **Déploiement** | Docker Compose | plugin Docker Compose |
| **Proxy** | Nginx | hôte + conteneur |

---

## Prérequis

### Développement local

| Logiciel | Version Minimum | Usage |
|----------|-----------------|-------|
| **Node.js** | 24.x recommandé | Runtime JavaScript |
| **npm** | 10.x | Gestionnaire de paquets |
| **PostgreSQL** | 14.x | Base de données |
| **Git** | 2.x | Contrôle de version |

### Déploiement VPS

| Logiciel | Usage |
|----------|-------|
| **Docker Engine** | Construction et exécution des conteneurs |
| **Docker Compose plugin** | Orchestration backend/frontend/nginx/n8n |
| **PostgreSQL** | Base de données applicative et n8n |
| **Nginx** | Proxy hôte si une terminaison HTTPS locale est utilisée |
| **Certbot ou proxy HTTPS externe** | Certificats SSL |

---

## Installation Locale

### 1. Cloner le Projet

```bash
git clone <repository-url>
cd rps-project
```

### 2. Préparer PostgreSQL

```bash
psql -U postgres
CREATE DATABASE rps_platform;
\q
```

### 3. Configurer le Backend

```bash
cd rps-backend
npm install
```

Créer `rps-backend/.env` :

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=dev-secret-change-me
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=rps_platform
DB_SYNCHRONIZE=false
DB_LOGGING=false
SWAGGER_ENABLED=true
SWAGGER_PATH=api-docs
ADMIN_ALLOWED_EMAILS=admin@example.com
ALLOWED_REGISTRATION_DOMAINS=example.com,localhost.local
N8N_HEALTH_REQUIRED=false
```

Appliquer les migrations TypeORM :

```bash
npm run migration:run
npm run seed
```

### 4. Configurer le Frontend

```bash
cd ../rps-frontend/nextjs-app
npm install
```

Créer `rps-frontend/nextjs-app/.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
APP_URL=http://localhost:3001
NEXT_PUBLIC_STRAPI_URL=
STRAPI_API_TOKEN=
ADMIN_ALLOWED_EMAILS=admin@example.com
```

### 5. Lancer en Développement

Terminal 1 :

```bash
cd rps-backend
npm run start:dev
```

Terminal 2 :

```bash
cd rps-frontend/nextjs-app
npm run dev
```

Le backend est disponible sur `http://localhost:3000` et le frontend sur
`http://localhost:3001`.

---

## Structure du Projet

```text
rps-project/
+-- .github/
|   +-- workflows/
|       +-- rps_deployment.yml      # Pipeline CI/CD GitHub Actions
+-- docs/
|   +-- GUIDE_PASSATION_ET_MODIFICATIONS.md
+-- rps-automation/
|   +-- NEW WORKFLOW RSP.json       # Base de reference / reimport du workflow n8n
+-- rps-backend/
|   +-- src/
|   |   +-- auth/
|   |   +-- campaign/
|   |   +-- campaign-participant/
|   |   +-- company/
|   |   +-- database/
|   |   +-- employee/
|   |   +-- health/
|   |   +-- question/
|   |   +-- report/
|   |   +-- response/
|   +-- Dockerfile
|   +-- package.json
+-- rps-frontend/
|   +-- nextjs-app/
|       +-- app/
|       +-- components/
|       +-- lib/
|       +-- Dockerfile
|       +-- package.json
+-- scripts/
|   +-- vps/
|       +-- bootstrap-server.sh
|       +-- deploy.sh
|       +-- docker-compose.yml
|       +-- nginx.host.conf
|       +-- nginx.rps.conf
|       +-- n8n/
|           +-- docker-compose.yml
+-- .env.n8n.example
```

---

## Variables d'Environnement

### Backend local (`rps-backend/.env`)

Variables principales :

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=change-me
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=rps_platform
DB_SYNCHRONIZE=false
DB_LOGGING=false
ADMIN_ALLOWED_EMAILS=
ALLOWED_REGISTRATION_DOMAINS=localhost.local
SENDGRID_API_KEY=
N8N_BASE_URL=https://automation.laroche360.ca
N8N_WEBHOOK_URL=https://automation.laroche360.ca/webhook/rps-analysis
N8N_WEBHOOK_PATH=/webhook/rps-analysis
N8N_HEALTH_REQUIRED=false
```

### Frontend local (`rps-frontend/nextjs-app/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
APP_URL=http://localhost:3001
NEXT_PUBLIC_STRAPI_URL=
STRAPI_API_TOKEN=
ADMIN_ALLOWED_EMAILS=
```

### Déploiement

Le script [scripts/vps/deploy.sh](scripts/vps/deploy.sh) reçoit ses variables
depuis GitHub Actions ou depuis l'environnement shell du VPS. Les exemples utiles
sont dans :

- [scripts/vps/.env.example](scripts/vps/.env.example)
- [scripts/vps/.env.server.example](scripts/vps/.env.server.example)
- [.env.n8n.example](.env.n8n.example)

Variables obligatoires au minimum :

| Variable | Usage |
|----------|-------|
| `JWT_SECRET` | Signature des tokens JWT |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Connexion PostgreSQL applicative |
| `DB_NAME_N8N` | Base PostgreSQL utilisée par n8n |
| `N8N_ENCRYPTION_KEY` | Chiffrement des credentials n8n |

Variables publiques importantes :

| Variable | Usage |
|----------|-------|
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | URL publique de l'application |
| `NEXT_PUBLIC_API_URL` | URL publique de l'API, généralement `https://domaine/api` |
| `APP_DOMAIN` | Domaine de l'application, par exemple `appli.laroche360.ca` |
| `N8N_DOMAIN` | Domaine n8n, par exemple `automation.laroche360.ca` |
| `N8N_EDITOR_BASE_URL` / `WEBHOOK_URL` | URLs publiques n8n |

---

## Commandes Utiles

### Backend

```bash
cd rps-backend
npm run start:dev
npm run build
npm run start:prod
npm run test
npm run test:cov
npm run test:e2e
npm run migration:run
npm run seed
```

### Frontend

```bash
cd rps-frontend/nextjs-app
npm run dev
npm run build
npm run start
npm run lint
```

### Docker Compose

À utiliser depuis `scripts/vps` avec un environnement de déploiement chargé ou
un fichier `.env` déjà généré par `deploy.sh` :

```bash
cd scripts/vps
docker compose config
docker compose build backend frontend
docker compose up -d
docker compose ps
docker compose logs -f nginx backend frontend
```

---

## Déploiement CI/CD

Le projet utilise GitHub Actions pour tester, builder et déployer sur VPS.

Le pipeline [.github/workflows/rps_deployment.yml](.github/workflows/rps_deployment.yml)
exécute :

1. **Backend CI** : `npm ci`, tests, build.
2. **Frontend CI** : `npm ci`, build Next.js.
3. **Deploy** : exécution de `scripts/vps/deploy.sh` sur le VPS via SSH.

### Déclencheurs

| Événement | Branche | Action |
|-----------|---------|--------|
| Push | `main` | Build + déploiement sur l'environnement `rps_dev` |
| Push | `deploy` | Build + déploiement sur l'environnement `development` |
| Pull Request | `main` | Tests et builds seulement |
| Manual | - | Exécution manuelle du workflow |

### Secrets et Variables GitHub

Secrets principaux :

| Secret | Description |
|--------|-------------|
| `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_SSH_PRIVATE_KEY` | Accès SSH au VPS |
| `JWT_SECRET` | Secret JWT backend |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL applicatif |
| `DB_NAME_N8N` | Base PostgreSQL n8n |
| `N8N_ENCRYPTION_KEY` | Clé de chiffrement n8n |
| `SENDGRID_API_KEY` | Envoi des emails |
| `API_KEY` | Accès API utilisé par les automatisations |

Variables principales :

| Variable | Description |
|----------|-------------|
| `PUBLIC_BASE_URL`, `APP_URL`, `NEXT_PUBLIC_APP_URL` | URL publique application |
| `NEXT_PUBLIC_API_URL` | URL publique API |
| `APP_DOMAIN`, `N8N_DOMAIN` | Domaines Nginx |
| `N8N_EDITOR_BASE_URL`, `WEBHOOK_URL`, `N8N_WEBHOOK_PATH` | Configuration publique n8n |
| `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`, `SENDGRID_REPLY_TO` | Identité email |

---

## Déploiement VPS Manuel

Le déploiement manuel doit suivre la même logique que GitHub Actions :
Docker Compose + `scripts/vps/deploy.sh`. Les anciennes instructions PM2 ne sont
plus valides.

### 1. Préparer le VPS

Sur Ubuntu, cloner le projet ou copier au minimum le dossier `scripts/vps`, puis
lancer le bootstrap. Si `git` n'est pas encore installé, installez-le d'abord ou
copiez le script par SSH.

```bash
sudo apt-get update
sudo apt-get install -y git
git clone git@github.com:AzazelSloth/rpsproject.git rps-project
cd rps-project
```

Le script de bootstrap installe Docker et le plugin Compose :

```bash
sudo bash scripts/vps/bootstrap-server.sh
```

Le bootstrap désactive Nginx si le service Nginx est activé. Si votre
infrastructure a besoin d'un Nginx hôte, réactivez-le ensuite avec la
configuration adaptée.

### 2. Préparer PostgreSQL

Créer l'utilisateur et les bases applicative/n8n :

```bash
sudo -u postgres psql
CREATE USER rps_user WITH PASSWORD 'mot_de_passe_securise';
CREATE DATABASE rps_db OWNER rps_user;
CREATE DATABASE n8n_db OWNER rps_user;
GRANT ALL PRIVILEGES ON DATABASE rps_db TO rps_user;
GRANT ALL PRIVILEGES ON DATABASE n8n_db TO rps_user;
\q
```

Si PostgreSQL tourne sur le VPS hôte et que les conteneurs doivent y accéder,
il doit écouter une interface joignable depuis Docker.

Exemple à vérifier :

```conf
# postgresql.conf
listen_addresses = '*'
```

```conf
# pg_hba.conf
host    all    all    172.17.0.0/16    md5
host    all    all    172.18.0.0/16    md5
```

Puis redémarrer PostgreSQL :

```bash
sudo systemctl restart postgresql
```

### 3. Exporter les Variables de Déploiement

Créer un fichier privé sur le VPS, par exemple `~/rps-deploy.env`, à partir de
[scripts/vps/.env.server.example](scripts/vps/.env.server.example), puis charger
les variables :

```bash
set -a
. ~/rps-deploy.env
set +a
```

Vérifier au minimum :

```bash
echo "$JWT_SECRET"
echo "$DB_HOST:$DB_PORT/$DB_NAME"
echo "$APP_URL"
echo "$N8N_DOMAIN"
```

### 4. Lancer le Déploiement

Depuis une copie du repo sur le VPS :

```bash
bash scripts/vps/deploy.sh main
```

Le script :

- clone la branche ciblée dans un répertoire de release ;
- écrit les fichiers `.env` Docker Compose ;
- prépare le runtime n8n dans `N8N_RUNTIME_DIR` ;
- construit backend/frontend ;
- vérifie PostgreSQL ;
- applique les migrations TypeORM ;
- démarre backend, frontend, Nginx Docker et n8n ;
- exécute des smoke tests.

### 5. Configurer Nginx Hôte

Le fichier [scripts/vps/nginx.host.conf](scripts/vps/nginx.host.conf) est prévu
pour une couche Nginx hôte qui reçoit déjà le trafic public ou le trafic d'une
terminaison HTTPS, puis proxy vers le Nginx Docker.

Important :

- `nginx.host.conf` écoute `127.0.0.1:8786`.
- Il proxy `appli.laroche360.ca` et `automation.laroche360.ca` vers
  `http://127.0.0.1:8787`.
- Le conteneur Nginx publie `8787:8786`.
- Si Nginx hôte est votre seul serveur public, adaptez les directives `listen`
  pour `80`/`443` et ajoutez la configuration SSL.

Installation type si cette topologie correspond à votre VPS :

```bash
sudo cp scripts/vps/nginx.host.conf /etc/nginx/sites-available/rps.conf
sudo ln -sf /etc/nginx/sites-available/rps.conf /etc/nginx/sites-enabled/rps.conf
sudo nginx -t
sudo systemctl reload nginx
```

---

## Préparations Nécessaires au Déploiement

Avant une mise en production :

1. Générer des secrets forts :

```bash
openssl rand -base64 32
```

2. Vérifier les domaines :

```text
APP_DOMAIN=appli.laroche360.ca
N8N_DOMAIN=automation.laroche360.ca
APP_URL=https://appli.laroche360.ca
NEXT_PUBLIC_APP_URL=https://appli.laroche360.ca
NEXT_PUBLIC_API_URL=https://appli.laroche360.ca/api
N8N_EDITOR_BASE_URL=https://automation.laroche360.ca/
WEBHOOK_URL=https://automation.laroche360.ca/
```

3. Configurer le pare-feu :

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

4. Vérifier les accès Docker vers PostgreSQL :

```bash
cd scripts/vps
docker compose config
```

5. Vérifier l'état après déploiement :

```bash
cd <release>/scripts/vps
docker compose ps
docker compose logs --tail 120 nginx backend frontend
curl -i http://127.0.0.1:8787/api/health
curl -i -H "Host: appli.laroche360.ca" http://127.0.0.1:8787/login
curl -i -H "Host: automation.laroche360.ca" http://127.0.0.1:8787/
```

---

## Dépannage

### Problèmes Courants

| Problème | Vérification |
|----------|--------------|
| **Erreur de connexion DB** | Vérifier `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `pg_hba.conf` et le pare-feu |
| **`JWT_SECRET` vide** | Le script doit recevoir les secrets GitHub ou un env chargé sur le VPS |
| **n8n ne démarre pas** | Vérifier `N8N_ENCRYPTION_KEY`, `DB_NAME_N8N`, `N8N_RUNTIME_DIR` et les permissions du dossier data |
| **502 Bad Gateway** | Vérifier la chaîne Nginx hôte `127.0.0.1:8786` -> Nginx Docker `127.0.0.1:8787` -> services Docker |
| **Frontend inaccessible** | Vérifier `docker compose ps`, les logs `frontend` et la route `/login` |
| **API inaccessible** | Vérifier `/api/health`, les logs `backend` et les migrations |
| **Domaine n8n redirige mal** | Vérifier `N8N_DOMAIN`, `N8N_EDITOR_BASE_URL`, `WEBHOOK_URL` et `N8N_PATH=/` pour un domaine dédié |

### Commandes de Diagnostic

```bash
cd scripts/vps

# Valider la configuration Compose interpolée
docker compose config

# Voir les conteneurs
docker compose ps

# Logs application
docker compose logs --tail 120 backend frontend nginx

# Logs n8n si le runtime dédié est dans /srv/n8n
cd /srv/n8n
docker compose ps
docker compose logs --tail 120

# Tests réseau depuis le VPS
curl -i http://127.0.0.1:8787/api/health
curl -i -H "Host: appli.laroche360.ca" http://127.0.0.1:8787/login
curl -i -H "Host: automation.laroche360.ca" http://127.0.0.1:8787/

# Vérification Nginx hôte
sudo nginx -t
sudo systemctl status nginx
```

---

## Support

Pour toute question ou problème, contacter l'équipe de développement.

---

Dernière mise à jour : Mai 2026
