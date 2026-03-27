# Guide de presentation RPS Platform

## Verification avant demo

1. Verifier PostgreSQL et la base `rps_platform`
2. Verifier le backend sur `http://localhost:3000`
3. Verifier le frontend sur `http://localhost:3001/login`

## Lancement local

### Base de donnees

Si besoin, executer :

```bash
psql -U postgres -f rps-database/init-db.sql
psql -U postgres -d rps_platform -f rps-database/seed.sql
```

Si la base existe deja :

```sql
ALTER TABLE questions ADD COLUMN IF NOT EXISTS choice_options TEXT;
```

### Backend

Dans `rps-backend/rps-backend` :

```bash
npm install
npm run start:dev
```

Controle rapide :

- `http://localhost:3000` doit repondre avec un status JSON
- `http://localhost:3000/campaigns` doit lister les campagnes
- `http://localhost:3000/companies` doit lister les entreprises

### Frontend

Dans `rps-frontend/nextjs-app` :

```bash
npm install
npm run dev
```

Ouvrir :

- `http://localhost:3001/login`

## Compte de demonstration

- Email : `admin@laroche.fr`
- Mot de passe : `password`

## Scenario de presentation recommande

### 1. Connexion

- Ouvrir la page de login
- Montrer l'acces consultant / admin
- Se connecter

### 2. Dashboard

- Montrer les indicateurs globaux
- Expliquer que la plateforme consolide campagnes, participants et resultats

### 3. Creation d'une campagne

- Aller dans `Sondages`
- Cliquer sur `Nouvelle campagne`
- Choisir une entreprise
- Saisir un titre et des dates
- Cliquer sur `Creer la campagne`

Message attendu :

- `Campagne creee.`

### 4. Creation d'un QCM

- Cliquer sur `Ajouter QCM`
- Modifier le libelle de la question
- Ajouter plusieurs choix
- Exemple :
  - `Jamais`
  - `Parfois`
  - `Souvent`
- Cliquer sur `Enregistrer la question`

Message attendu :

- `Question mise a jour.` ou `Question ajoutee.`

Verification visuelle :

- Les choix apparaissent dans le panneau d'aperçu a droite

### 5. Creation d'autres types de questions

- Ajouter une question `Echelle`
- Ajouter une question `Texte libre`
- Montrer le reordonnancement avec `Monter` / `Descendre`

### 6. Activation

- Cliquer sur `Activer`
- Expliquer que la campagne passe du mode preparation au mode actif

## Requetes SQL utiles pendant la demo

### Voir les campagnes

```sql
SELECT id, company_id, name, status, start_date, end_date
FROM campaigns
ORDER BY id DESC;
```

### Voir les questions de la derniere campagne

```sql
SELECT id, campaign_id, question_text, question_type, choice_options, order_index
FROM questions
ORDER BY id DESC;
```

## Plan B si un parcours bloque

### Si la creation echoue

- Verifier que le backend tourne
- Verifier `NEXT_PUBLIC_API_URL=http://localhost:3000`
- Recharger la page `Sondages`

### Si le frontend ne charge pas

- Relancer `npm run dev` dans le frontend

### Si la base n'a pas la colonne QCM

Executer :

```sql
ALTER TABLE questions ADD COLUMN IF NOT EXISTS choice_options TEXT;
```

## Message de conclusion 0

La plateforme permet de creer une campagne pour une entreprise, de construire un questionnaire avec plusieurs types de questions, de definir des choix personnalisables pour les QCM, puis de piloter la suite du dispositif depuis une interface unique.
