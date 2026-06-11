# Guide de passation et de modification - Application RPS

Ce document est destine a Abondelire / LaRoche pour prendre en main
l'application RPS, comprendre son fonctionnement, et savoir ce qui peut etre
modifie sans intervention lourde.

## 1. Resume executif

L'application est composee de trois blocs principaux :

- Frontend Next.js : interface utilisateur et administration.
- Backend NestJS : API, authentification, logique metier, emails SendGrid.
- PostgreSQL : stockage des entreprises, sondages, employes, participants,
  reponses et rapports.

Des integrations externes completent le systeme :

- SendGrid : envoi des emails d'invitation aux sondages.
- n8n : automatisations et analyses a valider.
- Strapi : deja prevu cote frontend pour le template editorial des rapports,
  mais pas encore branche sur tous les contenus de l'application.

Etat recommande pour la reprise :

- Prendre en main la version fonctionnelle actuelle.
- Valider n8n en priorite.
- Eviter les grosses modifications structurelles juste avant livraison.
- Prevoir l'autonomie sur les contenus par etapes, en commencant par les emails.

## 2. Structure du projet

```text
rps-project/
  rps-backend/                 API NestJS
  rps-frontend/nextjs-app/      Interface Next.js
  rps-automation/               Base de reference du workflow n8n
  scripts/                      Scripts de deploiement
  .env.n8n.example              Exemple de configuration n8n
  README.md                     Documentation technique existante
```

Fichiers importants :

- Backend email : `rps-backend/src/email/sendgrid-mail.service.ts`
- Backend campagnes : `rps-backend/src/campaign/campaign.service.ts`
- Backend participants : `rps-backend/src/campaign-participant/campaign-participant.service.ts`
- Frontend sondages : `rps-frontend/nextjs-app/components/rps/survey-builder-demo.tsx`
- Frontend participants : `rps-frontend/nextjs-app/components/rps/employees-table-demo.tsx`
- Template rapport Strapi : `rps-frontend/nextjs-app/STRAPI_REPORT_TEMPLATE.md`
- Workflow n8n : `rps-automation/NEW WORKFLOW RSP.json` comme base de reference, puis import/configuration dans l'UI n8n

## 3. Parcours fonctionnel de l'application

### 3.1 Connexion administrateur

L'administrateur se connecte via l'interface web.

Les comptes autorises dependent de la configuration backend :

- `ADMIN_ALLOWED_EMAILS`
- `ALLOWED_REGISTRATION_DOMAINS`

### 3.2 Creation ou modification d'un sondage

Depuis l'interface :

1. Aller dans `Gestion des sondages`.
2. Creer ou selectionner un sondage existant.
3. Choisir l'entreprise.
4. Renseigner le titre, la description et les dates.
5. Ajouter ou modifier les questions.
6. Activer le sondage.

Attention : les questions sont modifiables tant que le sondage n'est pas actif.
Une fois actif, les modifications doivent etre faites avec prudence pour ne pas
fausser les reponses deja collectees.

### 3.3 Import des employes

Depuis le sondage actif :

1. Ouvrir l'import des employes.
2. Importer un fichier `.xlsx`, `.xls`, `.csv` ou coller un CSV.
3. Valider l'import.
4. Telecharger ou copier les liens individuels.

Colonnes supportees par le backend :

- `email`, `courriel`, `adresse_courriel`
- `first_name`, `prenom`
- `last_name`, `nom`
- `phone`
- `status`, `statut`
- `department`, `fonction`, `titre_professionnel`
- `company_name`, `entreprise`, `company`

Exemple CSV :

```csv
Nom,Prenom,Adresse courriel,Fonction
Dupont,Jean,jean.dupont@example.com,Manager
Martin,Sarah,sarah.martin@example.com,RH
```

Lors de l'import, le backend :

- cree ou met a jour les employes ;
- rattache les employes au sondage ;
- cree un token individuel de participation ;
- renvoie la liste des participants avec leurs liens.

### 3.4 Envoi des invitations

Les invitations sont envoyees par SendGrid depuis le backend.

Le service utilise actuellement :

- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `SENDGRID_FROM_NAME`
- `SENDGRID_REPLY_TO`

Le contenu HTML actuel est dans :

```text
rps-backend/src/email/sendgrid-mail.service.ts
```

Les variables injectees dans le mail sont :

- `firstName`
- `startDate`
- `endDate`
- `surveyLink`
- `contactEmail`

### 3.5 Reponse au sondage

Chaque participant recoit un lien unique :

```text
/survey-response/:token
```

Quand le participant soumet le questionnaire :

- ses reponses sont enregistrees ;
- le participant passe au statut `completed` ;
- le taux de participation est mis a jour.

### 3.6 Suivi et relances

Depuis `Gestion des employes`, l'administrateur peut :

- choisir une entreprise ;
- choisir un sondage ;
- consulter les participants ;
- voir le statut : en attente, relance, complete ;
- ouvrir le lien individuel ;
- forcer une relance manuelle.

n8n peut aussi automatiser les relances selon le workflow configure.

### 3.7 Resultats et rapports

Les resultats sont bases sur :

- les participants rattaches au sondage ;
- les reponses associees aux questions du sondage ;
- les regroupements par fonction/departement.

Le rapport Word peut utiliser un template editorial Strapi si Strapi est
configure. Sinon, l'application utilise un fallback local.

## 4. Ce qui est modifiable aujourd'hui sans developpement

Depuis l'application :

- entreprises ;
- sondages ;
- titres et descriptions de sondage ;
- dates de sondage ;
- questions avant activation ;
- import ou reimport d'employes ;
- envoi des invitations ;
- relances manuelles ;
- consultation des resultats ;
- generation / consultation des rapports.

Depuis Strapi, si configure :

- certains textes editoriaux du rapport, selon
  `rps-frontend/nextjs-app/STRAPI_REPORT_TEMPLATE.md`.

Depuis n8n :

- automatisations, relances et workflow d'analyse, si le workflow est importe
  et active dans l'instance n8n.

## 5. Ce qui demande encore une intervention technique

Les elements suivants ne sont pas encore modifiables par un utilisateur final
depuis l'application :

- format HTML complet des emails d'invitation ;
- objet des emails ;
- textes fixes de certaines pages ;
- navigation et libelles globaux ;
- structure des rapports au-dela du template editorial Strapi ;
- logique de calcul des resultats ;
- regles d'import avancees ;
- structure de la base de donnees.

## 6. Guide pour modifier le format des emails

### Option A - Modification directe dans le code

C'est l'option actuelle.

Fichier :

```text
rps-backend/src/email/sendgrid-mail.service.ts
```

Elements a modifier :

- Sujet du mail :

```ts
const subject = `Sondage RPS - ${recipient.campaign_name}`;
```

- Template HTML :

```ts
const SURVEY_INVITATION_HTML_TEMPLATE = `...`;
```

- Version texte :

```ts
private buildInvitationText(...)
```

Variables a conserver dans le HTML :

```text
{{firstName}}
{{startDate}}
{{endDate}}
{{surveyLink}}
{{contactEmail}}
```

Regle importante : ne pas supprimer `{{surveyLink}}`, car c'est le lien
personnel du participant.

Apres modification :

```bash
cd rps-backend
npm.cmd test -- --runInBand
npm.cmd run build
```

Puis tester un envoi reel avec une adresse interne.

### Option B - SendGrid Dynamic Templates

C'est l'option recommandee si Abondelire veut modifier les emails sans toucher
au code.

Principe :

- Le template email est cree dans SendGrid.
- SendGrid fournit un `template_id`.
- Le backend envoie les variables dynamiques.
- Le client modifie le contenu dans SendGrid.

Variables recommandees pour le template SendGrid :

```json
{
  "firstName": "Jean",
  "campaignName": "Sondage RPS",
  "companyName": "Entreprise",
  "startDate": "01/06/2026",
  "endDate": "15/06/2026",
  "surveyLink": "https://app.example.com/survey-response/token",
  "contactEmail": "contact@example.com"
}
```

Configuration backend :

- `SENDGRID_INVITATION_TEMPLATE_ID` pour le premier envoi ;
- `SENDGRID_REMINDER_TEMPLATE_ID` pour les relances ;
- le backend envoie `template_id` et `dynamic_template_data` a SendGrid ;
- le template HTML actuel reste le fallback si l'ID d'invitation n'est pas configure ;
- un template HTML simple reste le fallback si l'ID de relance n'est pas configure.

Les variables dynamiques exposees existent en camelCase et snake_case, par
exemple `firstName` / `first_name`, `campaignName` / `campaign_name` et
`surveyLink` / `survey_url`.

### Option C - Petit module "Parametres email" dans l'application

Principe :

- Ajouter une page admin dans l'application.
- Stocker en base l'objet, l'introduction, la signature et le texte de relance.
- Le backend lit ces valeurs avant d'envoyer les emails.

Avantage :

- Abondelire reste dans l'application.

Limite :

- Plus de developpement qu'un template SendGrid.
- Il faut securiser les champs HTML si on laisse modifier le HTML complet.

Estimation : 1 a 2 jours pour un module simple.

### Option D - CMS externe

Alternatives possibles :

- Strapi ;
- Directus ;
- Payload CMS ;
- Sanity ;
- Contentful ;
- Storyblok.

Recommandation : eviter cette option dans les 3 jours restants si l'objectif
est uniquement de modifier les emails. Un CMS complet est pertinent en phase 2.

## 7. Guide pour modifier les textes de l'application

Les textes visibles sont actuellement dans les composants React.

Exemples de fichiers :

- Navigation : `rps-frontend/nextjs-app/components/rps/app-shell.tsx`
- Creation/modification sondage :
  `rps-frontend/nextjs-app/components/rps/survey-builder-demo.tsx`
- Gestion participants :
  `rps-frontend/nextjs-app/components/rps/employees-table-demo.tsx`
- Resultats : `rps-frontend/nextjs-app/app/(app)/results/page.tsx`
- Rapports : `rps-frontend/nextjs-app/app/(app)/report/page.tsx`

Procedure :

1. Modifier le texte dans le composant.
2. Lancer le lint/build frontend.
3. Verifier la page dans le navigateur.
4. Tester sur mobile et desktop si le texte est long.

Commandes :

```bash
cd rps-frontend/nextjs-app
npm.cmd run lint
npm.cmd run build
```

Pour une autonomie client complete sur ces textes, il faut ajouter une couche
de contenu administrable : Strapi, Directus, ou une table de configuration
interne.

## 8. Guide pour modifier le template de rapport via Strapi

Strapi est deja prevu pour le template editorial du rapport.

Documentation existante :

```text
rps-frontend/nextjs-app/STRAPI_REPORT_TEMPLATE.md
```

Variables frontend :

```text
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=...
```

Champs attendus dans Strapi :

- `templateName`
- `executiveSummaryTitle`
- `executiveSummaryBody`
- `methodologyTitle`
- `methodologyBody`
- `recommendationsTitle`
- `recommendationsIntro`
- `consultantNotesTitle`
- `consultantNotesPlaceholder`
- `conclusionTitle`
- `conclusionBody`

Regle de securite :

- Strapi peut piloter le texte editorial.
- Les donnees metier du rapport doivent rester dans le backend pour eviter les
  incoherences.

## 9. Guide n8n

Le workflow n8n actif est celui configure dans l'UI n8n, mais le depot conserve
un fichier de reference servant de base de reimport et de reconstruction :

```text
rps-automation/NEW WORKFLOW RSP.json
```

Ne pas supprimer ce fichier sans validation explicite avec la personne qui
maintient n8n.

Configuration exemple :

```text
.env.n8n.example
```

Variables importantes :

- `WEBHOOK_URL`
- `N8N_EDITOR_BASE_URL`
- `N8N_WEBHOOK_URL`
- `BACKEND_API_URL`
- `API_KEY`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `SENDGRID_FROM_NAME`
- `REPORT_RECIPIENT_EMAIL`
- `GOOGLE_DRIVE_FOLDER`
- `REMINDER_MIN_DAYS`
- `REMINDER_MAX_COUNT`

Checklist de validation n8n :

- verifier que le workflow actif dans l'UI n8n est le bon ;
- conserver `rps-automation/NEW WORKFLOW RSP.json` comme base de reference ;
- configurer les credentials Google / SendGrid ;
- verifier le webhook `/webhook/rps-analysis` ;
- verifier que n8n peut appeler le backend public ;
- verifier que le backend accepte la cle `API_KEY` ;
- tester une analyse depuis un sondage ;
- tester une relance automatique ;
- verifier les logs n8n et backend.

## 10. Variables d'environnement principales

### Backend

```text
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=...
DB_NAME=rps_platform
DB_SYNCHRONIZE=false
DB_LOGGING=false
JWT_SECRET=...
API_KEY=...
APP_URL=https://app.example.com
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=...
SENDGRID_FROM_NAME=...
SENDGRID_REPLY_TO=...
N8N_WEBHOOK_URL=...
N8N_HEALTH_REQUIRED=false
ADMIN_ALLOWED_EMAILS=...
ALLOWED_REGISTRATION_DOMAINS=...
SWAGGER_ENABLED=true
SWAGGER_PATH=api-docs
```

### Frontend

```text
API_URL=http://localhost:3000/api
NEXT_PUBLIC_API_URL=http://localhost:3000/api
APP_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=...
ADMIN_ALLOWED_EMAILS=...
```

Ne jamais transmettre les fichiers `.env` avec les secrets en clair. Fournir
un `.env.example` et partager les vrais secrets via un canal securise.

## 11. Commandes utiles

### Backend

```bash
cd rps-backend
npm.cmd install
npm.cmd run migration:run
npm.cmd run seed
npm.cmd run start:dev
npm.cmd test -- --runInBand
npm.cmd run build
```

API locale :

```text
http://localhost:3000/api
```

Swagger :

```text
http://localhost:3000/api-docs
```

### Frontend

```bash
cd rps-frontend/nextjs-app
npm.cmd install
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
```

Interface locale :

```text
http://localhost:3001
```

## 12. Checklist de recette avant passation

Fonctionnel :

- connexion admin ;
- creation d'une entreprise ;
- creation d'un sondage ;
- modification d'un sondage ;
- ajout/modification des questions avant activation ;
- activation du sondage ;
- import d'un CSV employes ;
- verification des participants dans `Gestion des employes` ;
- envoi d'une invitation test ;
- ouverture du lien individuel ;
- soumission d'une reponse ;
- mise a jour du statut participant ;
- affichage des resultats ;
- generation ou consultation du rapport ;
- relance manuelle ;
- validation n8n.

Technique :

- backend demarre sans erreur ;
- frontend demarre sans erreur ;
- migrations appliquees ;
- tests backend OK ;
- build backend OK ;
- build frontend OK ;
- SendGrid configure ;
- n8n configure ;
- variables d'environnement sauvegardees ;
- sauvegarde base de donnees effectuee.

## 13. Checklist de passation a Abondelire

Acces a fournir :

- repository Git ;
- acces serveur / VPS ;
- acces base PostgreSQL ou procedure de backup/restore ;
- acces SendGrid ;
- acces n8n ;
- acces Strapi si utilise ;
- credentials Google Drive si utilises par n8n ;
- domaine et DNS ;
- documentation de deploiement ;
- procedure de rollback.

Elements a expliquer en session :

- architecture globale ;
- demarrage local ;
- deploiement ;
- role des variables d'environnement ;
- gestion des sondages ;
- import des employes ;
- fonctionnement des liens individuels ;
- envoi SendGrid ;
- workflow n8n ;
- template rapport Strapi ;
- limites actuelles sur la modification des contenus.

## 14. Plan recommande avec 3 jours restants

Jour 1 :

- stabiliser l'existant ;
- finaliser cette documentation ;
- verifier les variables d'environnement ;
- faire un test complet local ou staging.

Jour 2 :

- valider n8n ;
- valider SendGrid ;
- tester import employes + invitations + reponses ;
- corriger uniquement les anomalies bloquantes.

Jour 3 :

- session de passation Abondelire ;
- remise des acces ;
- validation finale avec LaRoche ;
- documenter les ameliorations de phase 2.

Ce qu'il vaut mieux eviter dans ces 3 jours :

- integrer un CMS complet pour tous les contenus ;
- changer la structure de donnees ;
- remplacer le systeme email sans fallback ;
- modifier lourdement le parcours d'import ou de reponse.

## 15. Recommandation finale sur l'autonomie de modification

Pour donner rapidement de l'autonomie sans fragiliser l'application :

1. Garder la version actuelle stable.
2. Valider n8n.
3. Pour les emails, privilegier SendGrid Dynamic Templates.
4. Pour les rapports, utiliser le Strapi deja prevu.
5. Pour tous les autres textes, prevoir une phase 2 avec Strapi, Directus ou un
   module interne de parametrage.

Formulation client possible :

```text
L'application est fonctionnelle et peut etre prise en main. Pour les contenus
modifiables, nous recommandons une approche progressive : les emails via
SendGrid Dynamic Templates a court terme, le template de rapport via Strapi, et
une extension CMS plus complete en phase 2. Cela permet de donner de
l'autonomie sans fragiliser les flux deja valides.
```

## 16. Creer une partie "Parametres" pour modifier certains contenus

Si Abondelire souhaite modifier certaines choses directement depuis
l'application, la meilleure approche est d'ajouter un petit module admin
appele par exemple `Parametres`.

Objectif :

- permettre au prestataire de modifier des contenus controles ;
- eviter de modifier le code pour chaque changement de texte ;
- garder un fallback stable si un contenu est mal renseigne ;
- ne pas rendre modifiable toute la logique metier.

### 16.1 Perimetre recommande pour une premiere version

Avec peu de temps restant, il faut commencer petit.

Contenus a rendre modifiables en priorite :

- objet de l'email d'invitation ;
- texte d'introduction de l'email ;
- texte de confidentialite ;
- signature ;
- email de contact ;
- nom expediteur affiche ;
- texte de relance ;
- quelques textes du rapport deja prevus via Strapi.

Contenus a ne pas rendre modifiables tout de suite :

- structure complete HTML du mail ;
- calcul des resultats ;
- logique de participation ;
- token de sondage ;
- structure des questions deja repondues ;
- parametres de securite ;
- regles base de donnees.

### 16.2 Architecture simple recommandee

Ajouter une table en base pour stocker les parametres.

Exemple de table :

```text
app_settings
  id
  key
  value
  type
  description
  updated_at
```

Exemples de cles :

```text
email.invitation.subject
email.invitation.intro
email.invitation.confidentiality
email.invitation.signature
email.reminder.subject
email.reminder.body
contact.email
brand.sender_name
```

Le backend lit ces parametres avant d'envoyer un email.

Si un parametre est vide ou absent, le backend utilise la valeur par defaut
actuelle dans le code. C'est tres important pour eviter de casser l'envoi des
emails.

### 16.3 Backend a creer

Dans `rps-backend/src`, creer un module par exemple :

```text
settings/
  settings.entity.ts
  settings.dto.ts
  settings.service.ts
  settings.controller.ts
  settings.module.ts
```

Endpoints recommandes :

```text
GET /api/settings
GET /api/settings/email
PATCH /api/settings/email
```

Le `PATCH /api/settings/email` peut recevoir :

```json
{
  "invitationSubject": "Votre invitation au sondage RPS",
  "invitationIntro": "Nous vous invitons a participer au sondage...",
  "confidentialityText": "Vos reponses sont anonymes.",
  "signature": "Equipe LaRoche",
  "contactEmail": "contact@example.com"
}
```

Regles importantes :

- proteger ces endpoints avec l'authentification admin ;
- valider les tailles de texte ;
- ne jamais accepter de JavaScript dans les contenus HTML ;
- journaliser les erreurs ;
- garder les valeurs par defaut si les parametres ne sont pas disponibles.

### 16.4 Frontend a creer

Ajouter une page admin :

```text
rps-frontend/nextjs-app/app/(app)/settings/page.tsx
```

Ajouter un lien dans la navigation :

```text
rps-frontend/nextjs-app/components/rps/app-shell.tsx
```

Champs simples a afficher :

- objet email invitation ;
- texte introduction invitation ;
- texte confidentialite ;
- signature ;
- email de contact ;
- objet email relance ;
- texte relance.

Interface recommandee :

- champs texte simples ;
- zones de texte pour les paragraphes ;
- bouton `Enregistrer` ;
- bouton `Reinitialiser les valeurs par defaut` ;
- apercu du mail ;
- message de confirmation apres sauvegarde.

### 16.5 Integration avec le service SendGrid

Le fichier actuel est :

```text
rps-backend/src/email/sendgrid-mail.service.ts
```

Aujourd'hui, l'objet et le HTML sont dans le code.

Apres ajout des parametres :

1. Le service email demande les parametres au `SettingsService`.
2. Il construit le sujet avec le parametre configure.
3. Il injecte les textes modifiables dans le template existant.
4. Il garde le template actuel comme fallback.

Pseudo-logique :

```ts
const settings = await this.settingsService.getEmailSettings();

const subject =
  settings.invitationSubject ||
  `Sondage RPS - ${recipient.campaign_name}`;

const intro =
  settings.invitationIntro ||
  "Nous avons le plaisir de vous inviter a participer...";
```

Point de vigilance : `SendGridMailService` devra recevoir `SettingsService`
par injection NestJS. Cela demande de declarer le module settings dans le
module email ou dans `AppModule`.

### 16.6 Ordre de realisation conseille

1. Creer l'entite `Setting`.
2. Creer la migration base de donnees.
3. Creer le service backend avec valeurs par defaut.
4. Creer les endpoints `GET` et `PATCH`.
5. Brancher le service email sur les parametres.
6. Creer la page frontend `Parametres`.
7. Ajouter l'apercu email.
8. Tester l'envoi SendGrid.
9. Tester le fallback si aucun parametre n'est defini.

### 16.7 Estimation

Version minimale pour les emails :

```text
0,5 a 1,5 jour
```

Version propre avec page admin, validation, apercu et tests :

```text
1 a 2 jours
```

Version plus large avec textes d'application, rapports, emails et droits
avances :

```text
3 a 5 jours ou plus
```

### 16.8 Recommandation avec seulement 3 jours restants

Le meilleur compromis est :

- creer uniquement `Parametres email` ;
- garder le template HTML actuel ;
- rendre modifiables seulement les textes principaux ;
- garder les valeurs par defaut dans le code ;
- valider SendGrid et n8n apres modification.

Formulation possible :

```text
Nous pouvons ajouter une section Parametres pour vous permettre de modifier
certains contenus, en commencant par les emails. Pour securiser la livraison,
la premiere version gardera le template actuel et rendra modifiables uniquement
les textes principaux. Les contenus plus larges de l'application pourront etre
branches ensuite sur Strapi ou un CMS dedie.
```
