# RPS Platform - Documentation technique et fonctionnelle

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/frontend-Next.js%2015-green)
![NestJS](https://img.shields.io/badge/backend-NestJS%2011-green)
![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-blue)
![n8n](https://img.shields.io/badge/automation-n8n-orange)

Plateforme de gestion des risques psychosociaux pour LaRoche 360. Le projet permet de créer des campagnes de sondage RPS, importer des employés, envoyer des invitations, collecter les réponses par lien individuel, suivre la participation, analyser les résultats et déclencher des automatisations n8n pour les rapports et les relances.

Cette documentation couvre le projet complet: frontend Next.js, backend NestJS, base PostgreSQL, automatisations n8n, intégration SendGrid, déploiement VPS Docker Compose et pipeline GitHub Actions.

## Table des matières

1. [Résumé du projet](#résumé-du-projet)
2. [Architecture générale](#architecture-générale)
3. [Stack technique](#stack-technique)
4. [Structure du dépôt](#structure-du-dépôt)
5. [Parcours fonctionnels](#parcours-fonctionnels)
6. [Installation locale](#installation-locale)
7. [Variables d'environnement](#variables-denvironnement)
8. [Commandes utiles](#commandes-utiles)
9. [Backend NestJS](#backend-nestjs)
10. [Frontend Next.js](#frontend-nextjs)
11. [Automatisations n8n](#automatisations-n8n)
12. [Base de données](#base-de-données)
13. [Sécurité](#sécurité)
14. [Déploiement CI/CD et VPS](#déploiement-cicd-et-vps)
15. [Recette fonctionnelle](#recette-fonctionnelle)
16. [Dépannage](#dépannage)
17. [Documentation complémentaire](#documentation-complémentaire)

## Résumé du projet

### Objectif

L'application centralise le cycle de vie d'une évaluation RPS:

- création des entreprises et des campagnes de sondage;
- création, modification et ordonnancement des questions;
- import des employés depuis CSV ou tableur;
- génération de liens individuels sécurisés par token;
- envoi des invitations et relances par SendGrid;
- saisie des réponses par les participants sans compte administrateur;
- suivi de la participation et des statuts;
- lecture des résultats par département ou fonction;
- génération et livraison de rapports via n8n et Google Drive;
- suivi des rapports livrés dans l'application.

### Applications incluses

| Bloc | Dossier | Rôle |
| --- | --- | --- |
| Frontend | `rps-frontend/nextjs-app` | Interface admin, pages publiques de réponse, appels tRPC et API Next |
| Backend | `rps-backend` | API REST NestJS, authentification, logique métier, PostgreSQL, SendGrid |
| Automatisation | `rps-automation` | Workflow n8n de référence pour analyse, Drive, emails et relances |
| Déploiement | `scripts/vps` | Docker Compose, Nginx, bootstrap serveur et script de déploiement |
| Documentation | `docs` | Guides de passation et configuration n8n client |

## Architecture générale

```text
+-------------------------+           +--------------------------+
| Navigateur utilisateur |           | n8n automation publique  |
| Admin ou participant   |           | automation.laroche360.ca |
+------------+------------+           +------------+-------------+
             |                                     |
             v                                     v
+---------------------------------------------------------------+
| Nginx hôte / proxy HTTPS                                      |
| scripts/vps/nginx.host.conf                                   |
| applique les domaines publics et transmet vers Docker          |
+-----------------------------+---------------------------------+
                              |
                              v
+---------------------------------------------------------------+
| Nginx Docker                                                   |
| scripts/vps/nginx.rps.conf                                    |
| route /api vers NestJS, / vers Next.js, domaine n8n vers n8n   |
+--------------+--------------------+---------------------------+
               |                    |
               v                    v
+--------------------------+   +--------------------------+
| Frontend Next.js         |   | Backend NestJS           |
| Port conteneur 3001      |   | Port conteneur 3000      |
| UI, tRPC, cookies auth   |   | API /api, JWT, SendGrid  |
+--------------+-----------+   +-------------+------------+
               |                             |
               |                             v
               |                +--------------------------+
               |                | PostgreSQL               |
               |                | users, campaigns, etc.   |
               |                +--------------------------+
               |
               v
+--------------------------+
| Strapi optionnel         |
| Template éditorial       |
| rapports frontend        |
+--------------------------+
```

### Flux principal

1. Un administrateur se connecte sur le frontend.
2. Le frontend appelle les routes API Next et tRPC.
3. Les appels serveur Next utilisent le cookie `auth_token` pour interroger le backend NestJS.
4. Le backend valide le JWT ou la clé `x-api-key` pour les appels d'automatisation.
5. Les données métier sont stockées dans PostgreSQL.
6. Les invitations et relances email sont envoyées via SendGrid.
7. L'analyse d'une campagne appelle le webhook n8n `rps-analysis`.
8. n8n génère ou dépose le rapport dans Google Drive, envoie l'email et marque le rapport livré via l'API backend.

## Stack technique

| Couche | Technologie | Version constatée |
| --- | --- | --- |
| Frontend | Next.js App Router | `^15.1.7` |
| Frontend | React | `^19.2.3` |
| Frontend | TypeScript | `^5` |
| Frontend | Tailwind CSS | `^4` |
| Frontend | tRPC | `^11.16.0` |
| Backend | NestJS | `^11.0.1` |
| Backend | TypeORM | `0.3.x` |
| Backend | PostgreSQL driver `pg` | `^8.14.1` |
| Auth | JWT + bcrypt | `@nestjs/jwt`, `bcrypt` |
| Email | SendGrid | Service backend + node n8n |
| Automatisation | n8n | Docker, image par défaut `n8nio/n8n:2.22.5` dans `deploy.sh` |
| Déploiement | Docker Compose | backend, frontend, nginx, runtime n8n séparé |
| CI/CD | GitHub Actions | tests, builds, déploiement SSH |
| Runtime cible | Node.js | 24 en Docker et CI |

## Structure du dépôt

```text
rps-project/
  .github/
    workflows/
      rps_deployment.yml
  docs/
    GUIDE_CONFIGURATION_N8N_CLIENT.md
    GUIDE_PASSATION_ET_MODIFICATIONS.md
  rps-automation/
    NEW WORKFLOW RSP.json
    README.md
  rps-backend/
    src/
      auth/
      campaign/
      campaign-participant/
      common/
      company/
      database/
      email/
      employee/
      health/
      n8n/
      question/
      report/
      response/
    Dockerfile
    package.json
  rps-frontend/
    nextjs-app/
      app/
      components/
      lib/
      public/
      Dockerfile
      package.json
  scripts/
    vps/
      bootstrap-server.sh
      deploy.sh
      docker-compose.yml
      nginx.host.conf
      nginx.rps.conf
      n8n/docker-compose.yml
  .env.n8n.example
  README.md
```

## Parcours fonctionnels

### 1. Connexion administrateur

Les administrateurs utilisent `/login`. L'inscription est disponible via `/signup`, mais elle est limitée aux emails autorisés par le backend.

Les contrôles sont pilotés par:

- `ADMIN_ALLOWED_EMAILS`: liste d'emails explicitement autorisés;
- `ALLOWED_REGISTRATION_DOMAINS`: domaines autorisés, conservé pour compatibilité;
- `JWT_SECRET`: signature des tokens JWT.

Après connexion, Next.js stocke le JWT dans le cookie HTTP-only `auth_token`. Les pages du groupe `app/(app)` exigent une session valide et redirigent vers `/login` sinon.

### 2. Gestion des sondages

Route principale: `/surveys`

Onglets:

- `?tab=list`: liste des sondages;
- `?tab=create`: création d'un sondage;
- `?tab=edit&campaignId=<id>`: modification d'un sondage.

Fonctions principales:

- créer une entreprise;
- créer une campagne avec titre, description et dates;
- créer des questions de type `scale`, `choice` ou `text`;
- modifier ou supprimer des questions;
- réordonner les questions;
- activer, terminer ou archiver une campagne.

Statuts backend d'une campagne:

```text
preparation
active
terminated
archived
```

### 3. Gestion des employés et participants

Route principale: `/employees`

Fonctions principales:

- sélection d'une entreprise et d'une campagne;
- import CSV ou tableur côté UI, converti en CSV ou lignes envoyées au backend;
- création ou mise à jour des employés;
- rattachement des employés à la campagne;
- génération d'un token individuel de participation;
- envoi d'invitations;
- relances manuelles;
- suivi des statuts `pending`, `reminded`, `completed`.

Colonnes d'import supportées:

```text
email, courriel, adresse_courriel
first_name, prenom
last_name, nom
phone
status, statut
department, fonction, titre_professionnel
company_name, entreprise, company
```

Exemple CSV:

```csv
Nom,Prenom,Adresse courriel,Fonction
Dupont,Jean,jean.dupont@example.com,Manager
Martin,Sarah,sarah.martin@example.com,RH
```

### 4. Réponse au sondage

Routes publiques:

```text
/survey-response
/survey-response/:token
```

Le participant n'a pas besoin de compte. Son lien contient un token unique créé dans `campaign_participants.participation_token`.

Au submit:

- le backend vérifie le token;
- les réponses sont enregistrées dans `responses`;
- le participant passe au statut `completed`;
- `completed_at` est renseigné;
- les tableaux de bord se mettent à jour via les données consolidées.

### 5. Résultats

Route principale: `/results`

Fonctions principales:

- liste des sondages analysables;
- détail d'un sondage avec `?view=detail&campaignId=<id>`;
- taux de participation;
- stress moyen calculé sur les questions `scale` de 1 à 5;
- répartition et moyennes par département;
- points saillants et recommandations simples côté frontend;
- bouton de synthèse vers `/report`.

### 6. Rapports

Route principale: `/report`

Fonctions principales:

- vue de synthèse d'une campagne;
- consultation des rapports déjà livrés;
- déclenchement d'analyse via le backend et n8n;
- suivi de la dernière entrée `reports.report_path`.

Le rapport final n'est pas stocké comme fichier dans l'application. Le backend garde un marqueur dans `reports`, généralement un lien Drive ou la valeur `drive`.

## Installation locale

### Prérequis

| Outil | Version recommandée | Usage |
| --- | --- | --- |
| Node.js | 24.x | runtime backend et frontend |
| npm | 10.x ou plus | installation et scripts |
| PostgreSQL | 14 ou plus | base applicative |
| Git | 2.x | versioning |
| Docker | optionnel en local | test du déploiement |

### 1. Cloner le projet

```bash
git clone <repository-url>
cd rps-project
```

### 2. Créer la base PostgreSQL locale

```bash
psql -U postgres
CREATE DATABASE rps_platform;
\q
```

### 3. Installer et configurer le backend

```bash
cd rps-backend
npm install
```

Créer `rps-backend/.env`:

```env
NODE_ENV=development
PORT=3000

JWT_SECRET=dev-secret-change-me
API_KEY=dev-api-key-change-me

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=rps_platform
DB_SYNCHRONIZE=false
DB_LOGGING=false

ADMIN_ALLOWED_EMAILS=admin@example.com
ALLOWED_REGISTRATION_DOMAINS=example.com,localhost.local

APP_URL=http://localhost:3001

SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=communications@laroche360.ca
SENDGRID_FROM_NAME=Laroche 360
SENDGRID_REPLY_TO=communications@laroche360.ca

N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_URL=http://localhost:5678/webhook/rps-analysis
N8N_WEBHOOK_PATH=/webhook/rps-analysis
N8N_HEALTH_REQUIRED=false

SWAGGER_ENABLED=true
SWAGGER_PATH=api-docs
LOG_LEVEL=info
```

Appliquer les migrations:

```bash
npm run migration:run
npm run seed
```

Lancer le backend:

```bash
npm run start:dev
```

API locale:

```text
http://localhost:3000/api
```

Swagger:

```text
http://localhost:3000/api-docs
```

### 4. Installer et configurer le frontend

Dans un deuxième terminal:

```bash
cd rps-frontend/nextjs-app
npm install
```

Créer `rps-frontend/nextjs-app/.env.local`:

```env
API_URL=http://localhost:3000/api
NEXT_PUBLIC_API_URL=http://localhost:3000/api

APP_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3001

NEXT_PUBLIC_STRAPI_URL=
STRAPI_API_TOKEN=

ADMIN_ALLOWED_EMAILS=admin@example.com

N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_URL=http://localhost:5678/webhook/rps-analysis
N8N_WEBHOOK_PATH=/webhook/rps-analysis
```

Lancer le frontend:

```bash
npm run dev
```

Interface locale:

```text
http://localhost:3001
```

### 5. Créer un compte admin de test

1. Vérifier que `ADMIN_ALLOWED_EMAILS` contient l'email souhaité.
2. Ouvrir `http://localhost:3001/signup`.
3. Créer le compte.
4. Se connecter sur `http://localhost:3001/login`.

## Variables d'environnement

Ne jamais commiter de vrais secrets. Les valeurs ci-dessous sont des exemples.

### Backend NestJS

| Variable | Obligatoire | Exemple | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | non | `development` | Environnement d'exécution |
| `PORT` | non | `3000` | Port NestJS |
| `JWT_SECRET` | oui | `change-me` | Secret de signature JWT |
| `API_KEY` | oui pour n8n | `change-me` | Clé acceptée dans le header `x-api-key` |
| `DB_HOST` | oui | `localhost` | Hôte PostgreSQL |
| `DB_PORT` | oui | `5432` | Port PostgreSQL |
| `DB_USER` | oui | `postgres` | Utilisateur DB |
| `DB_PASSWORD` | oui | `postgres` | Mot de passe DB |
| `DB_NAME` | oui | `rps_platform` | Base applicative |
| `DB_SYNCHRONIZE` | non | `false` | Synchronisation TypeORM, à garder `false` en prod |
| `DB_LOGGING` | non | `false` | Logs SQL |
| `ADMIN_ALLOWED_EMAILS` | oui | `admin@example.com` | Emails admin autorisés |
| `ALLOWED_REGISTRATION_DOMAINS` | non | `example.com` | Domaines d'inscription autorisés |
| `APP_URL` | oui | `https://appli.laroche360.ca` | URL publique utilisée dans les invitations |
| `SENDGRID_API_KEY` | oui en prod | `SG...` | Envoi des emails |
| `SENDGRID_FROM_EMAIL` | oui en prod | `communications@laroche360.ca` | Expéditeur |
| `SENDGRID_FROM_NAME` | non | `Laroche 360` | Nom affiché |
| `SENDGRID_REPLY_TO` | non | `communications@laroche360.ca` | Reply-To |
| `N8N_BASE_URL` | non | `https://automation.laroche360.ca` | Base n8n |
| `N8N_WEBHOOK_URL` | oui si analyse | `https://automation.laroche360.ca/webhook/rps-analysis` | Webhook d'analyse |
| `N8N_WEBHOOK_PATH` | non | `/webhook/rps-analysis` | Chemin par défaut si seule la base est fournie |
| `N8N_HEALTH_REQUIRED` | non | `false` | Rend la santé n8n bloquante si `true` |
| `SWAGGER_ENABLED` | non | `true` | Active Swagger sauf si `false` |
| `SWAGGER_PATH` | non | `api-docs` | Chemin Swagger |
| `LOG_LEVEL` | non | `info` | Niveau Winston |
| `LOG_DIR` | non | `logs` | Dossier des logs backend |

### Frontend Next.js

| Variable | Obligatoire | Exemple | Description |
| --- | --- | --- | --- |
| `API_URL` | oui côté serveur | `http://localhost:3000/api` | URL API utilisée par Server Components et routes Next |
| `NEXT_PUBLIC_API_URL` | oui côté navigateur | `http://localhost:3000/api` | URL API exposée au navigateur |
| `APP_URL` | oui côté serveur | `http://localhost:3001` | URL publique app |
| `NEXT_PUBLIC_APP_URL` | oui côté navigateur | `http://localhost:3001` | URL publique exposée |
| `NEXT_PUBLIC_STRAPI_URL` | non | `http://localhost:1337` | CMS optionnel pour template rapport |
| `STRAPI_API_TOKEN` | non | `...` | Token Strapi serveur |
| `ADMIN_ALLOWED_EMAILS` | non | `admin@example.com` | Usage frontend pour affichage/validation côté UI |
| `N8N_BASE_URL` | non | `https://automation.laroche360.ca` | Base n8n |
| `N8N_WEBHOOK_URL` | oui si route Next d'analyse | `https://automation.laroche360.ca/webhook/rps-analysis` | Webhook n8n |
| `N8N_WEBHOOK_PATH` | non | `/webhook/rps-analysis` | Chemin webhook |

### n8n

Le fichier de référence est `.env.n8n.example`.

Variables importantes:

| Variable | Description |
| --- | --- |
| `WEBHOOK_URL` | URL publique de base n8n, par exemple `https://automation.laroche360.ca/` |
| `N8N_EDITOR_BASE_URL` | URL de l'éditeur n8n |
| `N8N_HOST` | Domaine n8n |
| `N8N_PROTOCOL` | `https` en production |
| `N8N_PATH` | `/` pour un domaine dédié |
| `N8N_ENCRYPTION_KEY` | Secret de chiffrement des credentials n8n |
| `DB_TYPE` | `postgresdb` |
| `DB_NAME_N8N` | Base PostgreSQL n8n |
| `BACKEND_API_URL` | URL API backend accessible depuis n8n |
| `API_KEY` | Clé envoyée par n8n dans `x-api-key` |
| `SENDGRID_API_KEY` | Clé SendGrid injectée dans n8n |
| `GOOGLE_DRIVE_FOLDER` | Dossier Drive cible |
| `REPORT_RECIPIENT_EMAIL` | Destinataire rapport |
| `REMINDER_MIN_DAYS` | Délai minimal avant relance |
| `REMINDER_MAX_COUNT` | Nombre maximal de relances |

## Commandes utiles

### Backend

```bash
cd rps-backend
npm run start:dev
npm run build
npm run start:prod
npm run lint
npm run test
npm run test:cov
npm run test:e2e
npm run migration:run
npm run migration:run:prod
npm run migration:revert
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

### Docker Compose VPS

Depuis `scripts/vps` avec les variables chargées:

```bash
cd scripts/vps
docker compose config
docker compose build backend frontend
docker compose up -d
docker compose ps
docker compose logs -f nginx backend frontend
```

Runtime n8n dédié, selon `N8N_RUNTIME_DIR`, souvent `/srv/n8n`:

```bash
cd /srv/n8n
docker compose ps
docker compose logs --tail 120 n8n
```

## Backend NestJS

### Démarrage applicatif

Fichier principal: `rps-backend/src/main.ts`

Le backend:

- charge `.env` via `dotenv/config`;
- applique le préfixe global `/api`;
- active Helmet;
- applique un rate limit global;
- applique un rate limit plus strict sur `/api/auth/login` et `/api/auth/register`;
- limite les imports JSON/text à `50mb`;
- active `ValidationPipe` avec whitelist et transformation;
- active Swagger sauf si `SWAGGER_ENABLED=false`;
- écoute sur `0.0.0.0:${PORT}`.

### Modules NestJS

| Module | Dossier | Responsabilité |
| --- | --- | --- |
| `AuthModule` | `src/auth` | Register, login, JWT, guard, contrôle admin |
| `CompanyModule` | `src/company` | CRUD entreprises |
| `CampaignModule` | `src/campaign` | CRUD campagnes, statuts, analyse n8n |
| `CampaignParticipantModule` | `src/campaign-participant` | Participants, tokens, imports, invitations, relances |
| `EmployeeModule` | `src/employee` | CRUD employés, import global |
| `QuestionModule` | `src/question` | CRUD questions et réordonnancement |
| `ResponseModule` | `src/response` | Réponses de sondage |
| `ReportModule` | `src/report` | Marqueurs de rapports livrés |
| `HealthModule` | `src/health` | Santé DB et n8n |
| `Email` | `src/email/sendgrid-mail.service.ts` | Envoi SendGrid |

### Authentification

Le `AuthGuard` accepte deux modes:

- `Authorization: Bearer <jwt>` pour les administrateurs;
- `x-api-key: <API_KEY>` pour les appels n8n et automatisations.

Quand `x-api-key` est valide, l'utilisateur interne est:

```json
{
  "sub": 0,
  "email": "n8n@internal"
}
```

### Endpoints API

Tous les endpoints ci-dessous sont préfixés par `/api`.

#### Santé

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | non | Vérifie PostgreSQL et n8n si configuré |

#### Auth

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | non | Crée un admin si email autorisé |
| `POST` | `/auth/login` | non | Retourne user + JWT |
| `GET` | `/auth/me` | JWT | Profil de la session |
| `POST` | `/auth/logout` | JWT | Réponse de déconnexion côté API |

#### Entreprises

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/companies` | JWT/API key | Créer une entreprise |
| `GET` | `/companies` | JWT/API key | Lister les entreprises |
| `GET` | `/companies/:id` | JWT/API key | Lire une entreprise |
| `PATCH` | `/companies/:id` | JWT/API key | Modifier une entreprise |
| `DELETE` | `/companies/:id` | JWT/API key | Supprimer une entreprise |

#### Campagnes

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/campaigns` | JWT/API key | Créer une campagne |
| `GET` | `/campaigns` | JWT/API key | Lister les campagnes |
| `GET` | `/campaigns/:id` | JWT/API key | Lire une campagne |
| `PATCH` | `/campaigns/:id` | JWT/API key | Modifier une campagne |
| `POST` | `/campaigns/:id/activate` | JWT/API key | Passer en actif |
| `POST` | `/campaigns/:id/terminate` | JWT/API key | Terminer la campagne |
| `POST` | `/campaigns/:id/archive` | JWT/API key | Archiver |
| `POST` | `/campaigns/:id/analyze` | JWT/API key | Déclencher l'analyse n8n |
| `POST` | `/campaigns/:id/analyze-with-company` | JWT/API key | Analyse avec nom d'entreprise fourni |
| `DELETE` | `/campaigns/:id` | JWT/API key | Supprimer une campagne |

#### Participants de campagne

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/campaign-participants/token/:token` | public | Lire un participant par token |
| `GET` | `/campaign-participants/token/:token/questionnaire` | public | Récupérer le questionnaire public |
| `POST` | `/campaign-participants/token/:token/submit` | public | Soumettre les réponses |
| `POST` | `/campaign-participants` | JWT/API key | Créer un participant |
| `GET` | `/campaign-participants` | JWT/API key | Lister les participants |
| `GET` | `/campaign-participants/campaign/:campaignId/progress` | JWT/API key | Progression d'une campagne |
| `POST` | `/campaign-participants/campaign/:campaignId/import-employees` | JWT/API key | Importer et rattacher des employés |
| `POST` | `/campaign-participants/campaign/:campaignId/send-invitations` | JWT/API key | Envoyer les invitations |
| `POST` | `/campaign-participants/campaign/:campaignId/remind` | JWT/API key | Envoyer les relances |
| `GET` | `/campaign-participants/:id` | JWT/API key | Lire un participant |
| `PATCH` | `/campaign-participants/:id` | JWT/API key | Mettre à jour un participant |

#### Automatisation participants

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/automation/campaigns/pending-reminders` | JWT/API key | Campagnes avec relances en attente |
| `GET` | `/campaigns/:campaignId/pending-reminders` | JWT/API key | Participants à relancer |
| `PATCH` | `/participants/:id/reminder` | JWT/API key | Marquer une relance envoyée |

#### Employés

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/employees` | JWT/API key | Créer un employé |
| `POST` | `/employees/import` | JWT/API key | Import global d'employés |
| `GET` | `/employees?page=1&limit=50` | JWT/API key | Liste paginée |
| `GET` | `/employees/:id` | JWT/API key | Lire un employé |
| `PATCH` | `/employees/:id` | JWT/API key | Modifier un employé |
| `DELETE` | `/employees/:id` | JWT/API key | Supprimer ou désactiver selon service |

#### Questions

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/questions` | JWT/API key | Créer une question |
| `GET` | `/questions` | JWT/API key | Lister les questions |
| `GET` | `/questions/:id` | JWT/API key | Lire une question |
| `PATCH` | `/questions/:id` | JWT/API key | Modifier une question |
| `PATCH` | `/questions/campaign/:campaignId/reorder` | JWT/API key | Réordonner les questions |
| `DELETE` | `/questions/:id` | JWT/API key | Supprimer une question |

#### Réponses

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/responses` | public | Créer une réponse directe |
| `GET` | `/responses` | JWT/API key | Lister les réponses |
| `GET` | `/responses/:id` | JWT/API key | Lire une réponse |
| `PATCH` | `/responses/:id` | JWT/API key | Modifier une réponse |
| `DELETE` | `/responses/:id` | JWT/API key | Supprimer une réponse |

#### Rapports

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/reports` | JWT/API key | Créer un marqueur de rapport livré |
| `GET` | `/reports` | JWT/API key | Lister les rapports |
| `GET` | `/reports/:id` | JWT/API key | Lire un rapport |
| `PATCH` | `/reports/:id` | JWT/API key | Modifier un rapport |
| `DELETE` | `/reports/:id` | JWT/API key | Supprimer un rapport |

### Exemples d'appels API

Login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

Créer une entreprise:

```bash
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{"name":"Entreprise Demo"}'
```

Marquer un rapport livré depuis n8n:

```bash
curl -X POST https://appli.laroche360.ca/api/reports \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{"campaign_id":1,"report_path":"drive"}'
```

## Frontend Next.js

### Routes principales

| Route | Type | Description |
| --- | --- | --- |
| `/` | redirection | Redirige vers `/login` |
| `/login` | public | Connexion admin |
| `/signup` | public | Inscription admin contrôlée |
| 
| `/dashboard` | protégé | Vue d'ensemble |
| `/surveys` | protégé | Gestion des sondages |
| `/employees` | protégé | Gestion employés et participants |
| `/results` | protégé | Résultats par sondage |
| `/report` | protégé | Rapports et analyses |
| `/survey-response` | public | Accès répondant |
| `/survey-response/:token` | public | Questionnaire par token |

### Routes API Next

| Route | Rôle |
| --- | --- |
| `/auth/login` | Proxy login backend, pose les cookies de session |
| `/auth/logout` | Supprime les cookies |
| `/auth/session` | Retourne la session courante |
| `/auth/register` | Proxy register backend |
| `/trpc/[trpc]` | API tRPC interne |
| `/webhook/n8n/analyze` | Forward vers n8n, route historique côté frontend |
| `/webhook/n8n/remind` | Forward relance vers backend |
| `/admin/surveys` | Route API admin |
| `/admin/campaign-participants` | Route API admin |
| `/survey-responses` | Route API réponses |

### Organisation frontend

| Dossier | Rôle |
| --- | --- |
| `app` | App Router Next.js, pages et route handlers |
| `app/(app)` | Pages protégées par session admin |
| `components/rps` | Composants métier UI |
| `lib/backend` | Client backend, auth, types |
| `lib/repositories` | Agrégation des données métier pour l'UI |
| `lib/trpc` | Router tRPC et caller serveur |
| `lib/strapi` | Client CMS optionnel |
| `lib/n8n` | Résolution URL n8n |

### tRPC

Le router tRPC est dans `rps-frontend/nextjs-app/lib/trpc/router.ts`.

Il expose:

- `adminSurveys`: création entreprise/campagne/questions, statuts, analyse;
- `campaignParticipants`: import, invitations, progression, relances;
- `surveyResponses`: submit public ou direct;
- `data`: dashboard, gestion employés, builder sondage, liste sondages, résultats, rapport.

tRPC sert d'interface interne au frontend. L'API métier source reste le backend NestJS.

### Calculs frontend

Les données d'affichage sont consolidées dans `lib/repositories/rps-repository.ts`.

Calculs principaux:

- `participationRate`: fourni par le backend via progression de campagne;
- `averageStress`: moyenne des réponses numériques de type `scale`, valeurs 1 à 5;
- barres département: moyenne de stress par département, convertie en pourcentage visuel;
- alertes: départements avec moyenne supérieure ou égale à `4`;
- zones de risque rapport: départements avec moyenne supérieure ou égale à `3.5`;
- recommandations: générées selon participation et zones de risque.

## Automatisations n8n

### Fichier de référence

Le workflow de référence est:

```text
rps-automation/NEW WORKFLOW RSP.json
```

Ce fichier sert de base de réimport ou de reconstruction. Le workflow réellement actif est celui configuré dans l'interface n8n.

### URL de production

```text
https://automation.laroche360.ca/webhook/rps-analysis
```

Node Webhook:

| Champ | Valeur |
| --- | --- |
| Method | `POST` |
| Path | `rps-analysis` |
| Authentication | `None` |

### Nodes principaux du workflow

| Node | Type | Rôle |
| --- | --- | --- |
| `Webhook` | `n8n-nodes-base.webhook` | Reçoit les demandes d'analyse |
| `Formater les donnees` | Code | Normalise les réponses |
| `Split Out reponses pour sheet` | Split Out | Prépare les lignes Google Sheet |
| `Append or update row in sheet` | Google Sheets | Journalise ou consolide les réponses |
| `AI Agent1` | LangChain Agent | Génère l'analyse |
| `Google Gemini Chat Model` | Google Gemini | Modèle IA du rapport |
| `Construire le rapport` | Code | Construit le contenu rapport |
| `Enregistrement du rapport dans drive` | Google Drive | Crée le rapport dans Drive |
| `Telechargement du fichier pour l'email` | Google Drive | Récupère le fichier |
| `Send an email` | SendGrid | Envoie le rapport |
| `Marquer rapport livre dans l'application` | HTTP Request | `POST /api/reports` |
| `Declencheur` | Schedule Trigger | Relances automatiques à 8h |
| `Lister relances en attente` | HTTP Request | `GET /api/automation/campaigns/pending-reminders` |
| `Filtrer non completes` | Code | Garde les participants non complétés |
| `Calculer 6 jours` | Code | Applique le délai de relance |
| `Send an email1` | SendGrid | Envoie la relance |
| `Marquer relance envoyee dans l'application` | HTTP Request | `PATCH /api/participants/:id/reminder` |

### Payload d'analyse attendu

Le backend envoie un payload proche de:

```json
{
  "body": {
    "body": [
      {
        "Employeur": "Entreprise",
        "Email": "employe@example.com",
        "Nom et Prenom(s)": "Jean Dupont",
        "Fonction": "RH",
        "Q1": "3",
        "Q2": "4"
      }
    ],
    "campaign_id": 123,
    "client_email": "admin@example.com"
  },
  "campaign_name": "Sondage RPS",
  "company_name": "Entreprise",
  "user_email": "admin@example.com"
}
```

### Endpoints appelés par n8n

Lister les relances:

```text
GET <BACKEND_API_URL>/automation/campaigns/pending-reminders
Header: x-api-key: <API_KEY>
```

Marquer une relance:

```text
PATCH <BACKEND_API_URL>/participants/:id/reminder
Header: x-api-key: <API_KEY>
Body: { "reminder_sent_at": "...", "reminder_count": 1, "status": "reminded" }
```

Marquer un rapport livré:

```text
POST <BACKEND_API_URL>/reports
Header: x-api-key: <API_KEY>
Body: { "campaign_id": 123, "report_path": "drive-or-url" }
```

### Checklist n8n

- Importer ou restaurer `rps-automation/NEW WORKFLOW RSP.json`.
- Configurer les credentials Google Drive/Sheets avec le compte client.
- Configurer SendGrid.
- Vérifier `WEBHOOK_URL` et `N8N_EDITOR_BASE_URL`.
- Vérifier que le webhook production est actif.
- Vérifier `BACKEND_API_URL` et `API_KEY`.
- Tester `POST /webhook/rps-analysis`.
- Tester une analyse depuis l'application.
- Vérifier la création du fichier Drive.
- Vérifier la création du marqueur `reports`.
- Tester la relance planifiée ou manuelle.

## Base de données

### Migrations

Les migrations TypeORM sont dans:

```text
rps-backend/src/database/migrations
```

Commandes:

```bash
cd rps-backend
npm run migration:run
npm run migration:revert
```

En production, le script `scripts/vps/deploy.sh` construit le backend puis exécute les migrations avant le démarrage complet.

### Entités principales

| Table | Entité | Champs clés |
| --- | --- | --- |
| `users` | `User` | `id`, `name`, `email`, `password`, `created_at` |
| `companies` | `Company` | `id`, `name`, `created_at` |
| `campaigns` | `Campaign` | `company_id`, `name`, `description`, `start_date`, `end_date`, `status` |
| `employees` | `Employee` | `company_id`, `first_name`, `last_name`, `email`, `department`, `survey_token`, `deleted_at` |
| `campaign_participants` | `CampaignParticipant` | `campaign_id`, `employee_id`, `participation_token`, `status`, `reminder_count`, `completed_at` |
| `questions` | `Question` | `campaign_id`, `question_text`, `question_type`, `rps_dimension`, `order_index`, `choice_options` |
| `responses` | `SurveyResponse` | `employee_id`, `question_id`, `answer`, `deleted_at` |
| `reports` | `Report` | `campaign_id`, `report_path`, `created_at` |

### Relations

```text
Company 1---n Campaign
Company 1---n Employee
Campaign 1---n Question
Campaign 1---n CampaignParticipant
Campaign 1---n Report
Employee 1---n CampaignParticipant
Employee 1---n SurveyResponse
Question 1---n SurveyResponse
```

### Contraintes importantes

- `users.email` est unique.
- `employees.email` est unique.
- `employees.survey_token` est unique si renseigné.
- `campaign_participants.participation_token` est unique.
- un couple `campaign + employee` ne peut apparaître qu'une seule fois dans `campaign_participants`.
- les suppressions en cascade sont configurées sur plusieurs relations métier.

## Sécurité

### Mesures déjà présentes

- JWT admin côté backend.
- Cookie `auth_token` HTTP-only côté Next.js.
- `x-api-key` pour n8n et automatisations.
- Liste d'emails admin autorisés.
- Validation DTO avec `class-validator`.
- `ValidationPipe` global avec whitelist et rejet des propriétés non prévues.
- Helmet côté NestJS.
- Rate limit global et rate limit spécifique auth.
- Timeout et retry côté client frontend pour certains appels.
- Swagger désactivable par variable d'environnement.

### Points d'attention production

- Utiliser un `JWT_SECRET` fort.
- Utiliser une `API_KEY` forte et distincte du JWT.
- Garder `DB_SYNCHRONIZE=false`.
- Restreindre `ADMIN_ALLOWED_EMAILS`.
- Ne pas exposer PostgreSQL publiquement.
- Servir l'application et n8n en HTTPS.
- Conserver `N8N_ENCRYPTION_KEY` de manière stable entre redéploiements.
- Vérifier les permissions Google Drive.
- Ne jamais transmettre de `.env` contenant des secrets en clair.

## Déploiement CI/CD et VPS

### GitHub Actions

Workflow:

```text
.github/workflows/rps_deployment.yml
```

Déclencheurs:

| Événement | Branche | Action |
| --- | --- | --- |
| Push | `main` | CI + déploiement environnement `rps_dev` |
| Push | `deploy` | CI + déploiement environnement `development` |
| Pull request | `main` | CI uniquement |
| Manual | toutes | Exécution manuelle |

Jobs:

| Job | Description |
| --- | --- |
| `backend-ci` | `npm ci`, tests Jest, build NestJS |
| `frontend-ci` | `npm ci`, build Next.js |
| `deploy` | Connexion SSH au VPS, export variables, lancement `deploy.sh` |

### Secrets et variables GitHub

Secrets principaux:

```text
VPS_HOST
VPS_USER
VPS_PORT
VPS_SSH_PRIVATE_KEY
JWT_SECRET
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
DB_NAME_N8N
N8N_ENCRYPTION_KEY
API_KEY
SENDGRID_API_KEY
ADMIN_ALLOWED_EMAILS
ALLOWED_REGISTRATION_DOMAINS
```

Variables principales:

```text
PUBLIC_BASE_URL
APP_URL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_API_URL
APP_DOMAIN
N8N_DOMAIN
N8N_EDITOR_BASE_URL
WEBHOOK_URL
N8N_WEBHOOK_URL
N8N_WEBHOOK_PATH
BACKEND_API_URL
SENDGRID_FROM_EMAIL
SENDGRID_FROM_NAME
SENDGRID_REPLY_TO
REPORT_RECIPIENT_EMAIL
GOOGLE_DRIVE_FOLDER
REMINDER_MIN_DAYS
REMINDER_MAX_COUNT
```

### Déploiement manuel VPS

Préparer le serveur:

```bash
sudo apt-get update
sudo apt-get install -y git
git clone git@github.com:AzazelSloth/rpsproject.git rps-project
cd rps-project
sudo bash scripts/vps/bootstrap-server.sh
```

Préparer PostgreSQL:

```bash
sudo -u postgres psql
CREATE USER rps_user WITH PASSWORD 'mot_de_passe_securise';
CREATE DATABASE rps_db OWNER rps_user;
CREATE DATABASE n8n_db OWNER rps_user;
GRANT ALL PRIVILEGES ON DATABASE rps_db TO rps_user;
GRANT ALL PRIVILEGES ON DATABASE n8n_db TO rps_user;
\q
```

Charger les variables privées:

```bash
set -a
. ~/rps-deploy.env
set +a
```

Lancer:

```bash
bash scripts/vps/deploy.sh main
```

Le script:

- clone la branche ciblée dans un répertoire de release;
- génère l'environnement Docker Compose applicatif;
- prépare le runtime n8n dans `N8N_RUNTIME_DIR`;
- construit backend et frontend;
- vérifie PostgreSQL;
- applique les migrations;
- démarre n8n, backend, frontend et Nginx;
- exécute des smoke tests.

### Topologie Nginx

`scripts/vps/docker-compose.yml` publie le Nginx Docker:

```text
8787:8786
```

Le Nginx hôte peut écouter localement sur:

```text
127.0.0.1:8786
```

Puis proxy vers:

```text
http://127.0.0.1:8787
```

Domaines prévus:

```text
appli.laroche360.ca
automation.laroche360.ca
```

Installer la configuration hôte si cette topologie est utilisée:

```bash
sudo cp scripts/vps/nginx.host.conf /etc/nginx/sites-available/rps.conf
sudo ln -sf /etc/nginx/sites-available/rps.conf /etc/nginx/sites-enabled/rps.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Recette fonctionnelle

### Backend

- [ ] `npm run test` passe.
- [ ] `npm run build` passe.
- [ ] `npm run migration:run` passe.
- [ ] `GET /api/health` retourne `healthy` ou `degraded` compréhensible.
- [ ] Swagger est accessible si activé.
- [ ] Login admin fonctionne.
- [ ] Les routes protégées refusent sans JWT.
- [ ] Les routes d'automatisation acceptent `x-api-key`.

### Frontend

- [ ] `npm run lint` passe.
- [ ] `npm run build` passe.
- [ ] `/login` s'affiche.
- [ ] `/signup` crée un admin autorisé.
- [ ] Les pages protégées redirigent sans session.
- [ ] Le dashboard charge après connexion.
- [ ] Les erreurs backend affichent un état clair.

### Métier

- [ ] Créer une entreprise.
- [ ] Créer une campagne.
- [ ] Ajouter plusieurs questions.
- [ ] Réordonner les questions.
- [ ] Activer la campagne.
- [ ] Importer un CSV d'employés.
- [ ] Vérifier les participants et tokens.
- [ ] Envoyer une invitation test.
- [ ] Ouvrir `/survey-response/:token`.
- [ ] Soumettre des réponses.
- [ ] Vérifier le passage en `completed`.
- [ ] Consulter `/results`.
- [ ] Déclencher une analyse.
- [ ] Vérifier le rapport dans Drive.
- [ ] Vérifier le marqueur dans `/reports`.
- [ ] Tester une relance manuelle.
- [ ] Tester une relance n8n planifiée.

### n8n

- [ ] Workflow actif.
- [ ] Webhook production fonctionnel.
- [ ] Credentials Google reconnectés au compte client.
- [ ] Credentials SendGrid fonctionnels.
- [ ] `BACKEND_API_URL` accessible depuis n8n.
- [ ] `API_KEY` alignée avec le backend.
- [ ] Les rapports arrivent dans le bon dossier Drive.
- [ ] Les emails sont reçus.
- [ ] Les relances sont marquées côté application.

## Dépannage

### Le backend ne démarre pas

Vérifier:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`;
- PostgreSQL démarré;
- migrations;
- `JWT_SECRET` présent;
- version Node compatible.

Commandes:

```bash
cd rps-backend
npm run migration:run
npm run start:dev
```

### Erreur 401 sur les pages admin

Causes fréquentes:

- cookie expiré ou absent;
- `JWT_SECRET` modifié depuis la création du token;
- email non présent dans `ADMIN_ALLOWED_EMAILS`;
- backend inaccessible depuis Next.js;
- `API_URL` incorrect.

Solution:

```text
Se déconnecter, vider les cookies si besoin, vérifier ADMIN_ALLOWED_EMAILS, puis se reconnecter.
```

### Le frontend indique que le backend n'est pas configuré

Vérifier:

```env
API_URL=http://localhost:3000/api
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

En production, `API_URL` peut pointer vers le service Docker interne:

```env
API_URL=http://backend:3000/api
```

Et `NEXT_PUBLIC_API_URL` vers l'URL publique:

```env
NEXT_PUBLIC_API_URL=https://appli.laroche360.ca/api
```

### Les imports employés échouent

Vérifier:

- le CSV contient un email valide;
- `company_id` existe;
- la campagne existe;
- la taille du payload reste raisonnable;
- l'email n'est pas en conflit inattendu;
- les noms de colonnes sont reconnus.

### Les invitations ne partent pas

Vérifier:

- `SENDGRID_API_KEY`;
- `SENDGRID_FROM_EMAIL`;
- validation du domaine expéditeur SendGrid;
- logs backend;
- statut du participant;
- existence de `APP_URL` pour construire le lien.

### n8n retourne 404 sur le webhook

Vérifier:

- workflow activé;
- path `rps-analysis`;
- utilisation de l'URL production, pas l'URL de test;
- `N8N_WEBHOOK_URL=https://automation.laroche360.ca/webhook/rps-analysis`;
- proxy Nginx vers le domaine n8n.

### n8n ne peut pas appeler le backend

Vérifier:

- `BACKEND_API_URL` ne pointe pas vers `localhost` ou `host.docker.internal:3000` si le backend n'est pas publié sur le port hôte;
- avec le runtime Docker fourni par le projet, préférer `BACKEND_API_URL=http://backend:3000/api`;
- si n8n est externe au réseau Docker, utiliser l'URL publique `https://appli.laroche360.ca/api`;
- header `x-api-key`;
- `API_KEY` identique côté backend et n8n;
- routes `/api/reports` et `/api/automation/campaigns/pending-reminders`;
- logs `docker compose logs n8n backend nginx`.

### Le rapport est dans Drive mais l'application ne le voit pas

Le node final n8n `Marquer rapport livre dans l'application` a probablement échoué.

Vérifier:

- méthode `POST`;
- URL `https://appli.laroche360.ca/api/reports`;
- header `x-api-key`;
- body `campaign_id` et `report_path`;
- réponse attendue `201`.

### Nginx renvoie 502

Vérifier:

```bash
cd scripts/vps
docker compose ps
docker compose logs --tail 120 nginx backend frontend
curl -i http://127.0.0.1:8787/api/health
curl -i -H "Host: appli.laroche360.ca" http://127.0.0.1:8787/login
curl -i -H "Host: automation.laroche360.ca" http://127.0.0.1:8787/
```

### PostgreSQL est inaccessible depuis Docker

Si PostgreSQL tourne sur l'hôte VPS:

- `listen_addresses` doit permettre l'accès depuis Docker;
- `pg_hba.conf` doit autoriser les sous-réseaux Docker;
- le pare-feu doit autoriser le trafic local Docker vers `5432`.

Exemples à adapter:

```conf
listen_addresses = '*'
```

```conf
host    all    all    172.17.0.0/16    md5
host    all    all    172.18.0.0/16    md5
```

## Documentation complémentaire

Guides internes:

- [Guide de passation et de modification](docs/GUIDE_PASSATION_ET_MODIFICATIONS.md)
- [Guide de configuration n8n client](docs/GUIDE_CONFIGURATION_N8N_CLIENT.md)
- [Template rapport Strapi](rps-frontend/nextjs-app/STRAPI_REPORT_TEMPLATE.md)

Fichiers techniques importants:

- [Workflow CI/CD](.github/workflows/rps_deployment.yml)
- [Docker Compose VPS](scripts/vps/docker-compose.yml)
- [Docker Compose n8n](scripts/vps/n8n/docker-compose.yml)
- [Script de déploiement](scripts/vps/deploy.sh)
- [Nginx Docker](scripts/vps/nginx.rps.conf)
- [Nginx hôte](scripts/vps/nginx.host.conf)
- [Exemple env n8n](.env.n8n.example)
- [Workflow n8n de référence](rps-automation/NEW%20WORKFLOW%20RSP.json)

## Notes de maintenance

- Le README racine est la documentation technique consolidée.
- Les guides dans `docs/` sont orientés passation client et configuration détaillée n8n.
- Le fichier `.env` backend ouvert localement ne doit jamais être copié dans la documentation.
- Le fichier `rps-automation/NEW WORKFLOW RSP.json` peut être modifié dans l'interface n8n puis réexporté, mais il faut garder une trace claire des changements.
- Les scripts de production utilisent Docker Compose. PM2 n'est pas le runtime de production courant.

Dernière mise à jour: 1 juin 2026.
