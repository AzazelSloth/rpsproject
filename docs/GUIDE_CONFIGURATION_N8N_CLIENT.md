# Guide de configuration n8n client

Ce guide explique comment configurer n8n pour que les rapports RPS soient crees
dans le Google Drive du client, sans stocker de document Word ou Google Docs dans
l'application.

Client cible utilise dans les exemples :

```text
abondelire@gmail.com
```

## Objectif final

Quand un utilisateur clique sur `Analyser` dans l'application :

1. Le backend envoie les reponses de la campagne a n8n.
2. n8n genere le rapport.
3. n8n depose le rapport dans le Drive du client.
4. n8n appelle l'API de l'application pour marquer le rapport comme livre.
5. L'application affiche ensuite : `Analyse terminee. Consultez votre Drive.`

L'application ne doit pas contenir le fichier Word/Docs. Elle garde seulement un
marqueur technique dans la table `reports`.

## Scenario de passation accompagnee avec le client

Utiliser cette section si la configuration est refaite avec le client pendant
un appel video.

Objectif de la session :

```text
Connecter n8n au compte Google du client, generer un rapport test, verifier que
le fichier arrive dans son Drive, puis verifier que l'application affiche que
l'analyse est terminee.
```

### Avant l'appel

Demander au client d'avoir sous la main :

- l'acces a `abondelire@gmail.com` ;
- son telephone ou moyen de validation 2FA Google ;
- l'acces a Google Drive ;
- les emails des personnes qui doivent recevoir ou repartager les rapports ;
- 30 a 45 minutes disponibles sans interruption.

De ton cote, preparer :

- l'acces administrateur n8n ;
- l'acces a l'application RPS ;
- une campagne test terminee avec au moins une reponse exploitable ;
- la valeur `API_KEY` du backend, si le node final `/api/reports` doit etre
  configure pendant l'appel.

### Pendant l'appel

Ne demande pas au client de te donner son mot de passe. Le client partage son
ecran et se connecte lui-meme.

Deroulement recommande :

1. Le client ouvre Google Drive avec `abondelire@gmail.com`.
2. Il confirme qu'il voit son Drive et qu'il pourra retrouver les rapports.
3. Ouvrir n8n :

```text
https://automation.laroche360.ca
```

4. Dans n8n, ouvrir les credentials Google du workflow.
5. Cliquer sur reconnecter / sign in.
6. Le client se connecte avec `abondelire@gmail.com`.
7. Le client accepte les permissions Google demandees.
8. Sauvegarder les credentials.
9. Ouvrir le workflow d'analyse RPS.
10. Dans chaque node Google Drive / Google Docs / Gmail, selectionner les
    credentials du client.
11. Verifier que le fichier rapport est cree par le compte client ou partage
    automatiquement avec les emails requis.
12. Verifier le node final `POST /api/reports`.
13. Activer le workflow.
14. Lancer une analyse test depuis l'application.
15. Verifier dans n8n que l'execution est verte.
16. Verifier dans le Drive du client que le fichier rapport est disponible.
17. Rafraichir l'application et verifier le message :

```text
Analyse terminee. Consultez votre Drive.
```

### Phrase simple a dire au client

```text
Nous allons reconnecter l'automatisation a votre compte Google. Vous gardez le
controle de vos acces : vous tapez vous-meme votre mot de passe et vous acceptez
vous-meme les autorisations. Ensuite, chaque rapport genere par n8n sera cree ou
partage dans votre Drive, et l'application indiquera simplement que le rapport
est disponible dans Drive.
```

### Ce qu'il faut expliquer clairement

- Le client ne doit jamais envoyer son mot de passe.
- L'application RPS ne stocke pas le fichier rapport.
- n8n est l'outil qui genere et livre le fichier.
- Google Drive est l'endroit ou le client consulte et repartage les rapports.
- Si les credentials Google expirent ou sont revoquees, il faudra reconnecter
  n8n avec le compte client.

## Valeurs importantes

| Element | Valeur |
| --- | --- |
| Application | `https://appli.laroche360.ca` |
| API backend | `https://appli.laroche360.ca/api` |
| n8n | `https://automation.laroche360.ca` |
| Webhook n8n production | `https://automation.laroche360.ca/webhook/rps-analysis` |
| Endpoint marqueur rapport | `POST https://appli.laroche360.ca/api/reports` |
| Header API marqueur | `x-api-key: <API_KEY>` |

Important : dans n8n, utiliser l'URL de production du Webhook. L'URL de test
sert seulement pendant un test manuel avec `Listen for test event`.

## 1. Preparer le compte Google du client

1. Se connecter a Google Drive avec `abondelire@gmail.com`.
2. Creer un dossier, par exemple :

```text
Rapports RPS
```

3. Ouvrir le dossier et copier son ID depuis l'URL.

Exemple :

```text
https://drive.google.com/drive/folders/1ABCDEFxxxxxxxxxxxxx
```

L'ID du dossier est :

```text
1ABCDEFxxxxxxxxxxxxx
```

4. Garder cet ID pour les nodes Google Drive/Google Docs dans n8n.

Si le dossier a ete cree par le client et que n8n est connecte avec
`abondelire@gmail.com`, les rapports seront crees directement dans son Drive.

## 2. Configurer Google Cloud OAuth

Cette partie sert a autoriser n8n a utiliser Google Drive avec le compte client.

1. Ouvrir Google Cloud Console.
2. Selectionner le projet Google utilise pour l'automatisation.
3. Verifier que le client a un acces suffisant au projet, idealement `Owner`.
4. Aller dans `APIs & Services > Library`.
5. Activer les APIs necessaires :

```text
Google Drive API
Google Docs API
Gmail API, seulement si le workflow envoie aussi un email
```

6. Aller dans `APIs & Services > OAuth consent screen`.
7. Configurer l'application OAuth.
8. Si le mode est `External` et `Testing`, ajouter `abondelire@gmail.com` comme
   test user.

Attention importante : pour une production durable, eviter de laisser l'app
OAuth en mode `External / Testing`. Google indique que les refresh tokens de ce
mode peuvent expirer apres 7 jours pour les scopes autres que profil/email de
base. Mettre l'app OAuth en production ou utiliser une configuration Workspace
propre si Google le demande.

9. Aller dans `APIs & Services > Credentials`.
10. Creer un `OAuth client ID`.
11. Choisir `Web application`.
12. Dans n8n, ouvrir ou creer une credential Google OAuth2 et copier son
    `OAuth Redirect URL`.
13. Coller cette URL dans les `Authorized redirect URIs` du client OAuth Google.
14. Sauvegarder, puis copier :

```text
Client ID
Client Secret
```

## 3. Creer les credentials Google dans n8n

1. Ouvrir n8n :

```text
https://automation.laroche360.ca
```

2. Aller dans `Credentials`.
3. Creer ou modifier les credentials Google utilises par les nodes :

```text
Google Drive
Google Docs
Gmail, seulement si necessaire
```

4. Renseigner le `Client ID` et le `Client Secret`.
5. Cliquer sur `Sign in with Google`.
6. Se connecter avec :

```text
abondelire@gmail.com
```

7. Autoriser les permissions demandees.
8. Sauvegarder.

Point de controle : si n8n est encore connecte avec ton compte personnel, les
fichiers risquent d'etre crees avec ton compte. Il faut que les nodes Google
utilisent les credentials du client.

## 3.b SendGrid dans n8n

Dans ce deploiement, la variable `SENDGRID_API_KEY` est injectee dans n8n au
demarrage via un credential overwrite. Cela permet au node `SendGrid` d'utiliser
la cle de deploiement sans la ressaisir manuellement apres chaque redeploiement.

Point de controle :

1. Le workflow utilise bien un node `SendGrid`, pas un node HTTP artisanal.
2. Le node `SendGrid` reference une credential de type `SendGrid`.
3. Apres redeploiement, si la cle a change, recreer le conteneur n8n pour que
   le credential overwrite soit recharge.

## 4. Ouvrir le workflow n8n actif

Si le workflow existe deja dans n8n :

1. Ouvrir le workflow d'analyse RPS.
2. Verifier qu'il contient un node `Webhook`.
3. Verifier que c'est bien ce workflow qui est actif en production.
4. Verifier ou reconnecter les credentials Google du client dans les nodes
   Google si necessaire.

Le fichier de reference du workflow est conserve dans le depot :

```text
rps-automation/NEW WORKFLOW RSP.json
```

Il sert de base de reimport ou de reconstruction si le workflow doit etre
restaure dans n8n.

## 5. Configurer le Webhook

Dans le node `Webhook` :

| Champ | Valeur |
| --- | --- |
| HTTP Method | `POST` |
| Path | `rps-analysis` |
| Authentication | `None` |
| Respond | `Immediately` |

La Production URL doit etre :

```text
https://automation.laroche360.ca/webhook/rps-analysis
```

Ensuite :

1. Sauvegarder le workflow.
2. Activer le workflow avec le bouton `Active`.

Sans activation, la Production URL peut retourner `404`.

## 6. Comprendre les donnees recues par n8n

Le backend envoie un payload proche de ceci :

```json
{
  "body": {
    "body": [
      {
        "Employeur": "Client",
        "Email": "employe@example.com",
        "Nom et Prenom(s)": "Nom Prenom",
        "Fonction": "Equipe",
        "Q1": "3",
        "Q2": "4"
      }
    ],
    "campaign_id": 123,
    "client_email": "admin@example.com"
  },
  "campaign_name": "Sondage RPS",
  "company_name": "Client",
  "user_email": "admin@example.com"
}
```

Dans le Webhook node de n8n, selon l'affichage, ces valeurs peuvent apparaitre
sous `$json.body`.

Valeurs utiles habituelles :

```text
ID campagne   : {{ $json.body.body.campaign_id }}
Reponses      : {{ $json.body.body.body }}
Nom campagne  : {{ $json.body.campaign_name }}
Entreprise    : {{ $json.body.company_name }}
Email client  : {{ $json.body.body.client_email || $json.body.user_email }}
```

Recommandation : ajouter un node `Set` juste apres le Webhook pour normaliser les
champs :

```text
campaign_id   = {{ $json.body.body.campaign_id }}
responses     = {{ $json.body.body.body }}
campaign_name = {{ $json.body.campaign_name }}
company_name  = {{ $json.body.company_name }}
client_email  = {{ $json.body.body.client_email || $json.body.user_email }}
```

Ensuite, les autres nodes utilisent les champs normalises.

## 7. Configurer les nodes Google Drive / Google Docs

Dans chaque node Google :

1. Selectionner les credentials Google du client.
2. Mettre le dossier cible avec l'ID du dossier Drive du client.
3. Nommer le fichier clairement.

Exemple de nom de fichier :

```text
Rapport RPS - {{ $json.company_name }} - {{ $json.campaign_name }}
```

Le node final qui cree ou upload le rapport doit permettre de recuperer un lien
Drive si possible, par exemple :

```text
webViewLink
alternateLink
id
```

Si le workflow ne donne pas de lien, utiliser une valeur simple comme :

```text
drive
```

Le plus important pour l'application est que le marqueur `reports` soit cree.

Important : garder `campaign_id` disponible jusqu'au dernier node. Si un node
Google remplace les donnees d'entree, ajouter un node `Merge` ou `Set` pour
continuer a transporter `campaign_id`.

## 8. Partager le rapport avec plusieurs emails

Oui, on peut faire en sorte que plusieurs comptes aient acces au rapport.

Il y a deux facons propres de le faire.

### Option recommandee : partager le dossier Drive une seule fois

1. Creer le dossier final dans le Drive du compte createur ou du client.
2. Partager ce dossier avec les 3 emails voulus.
3. Donner le role `Editor` aux personnes qui doivent pouvoir repartager.
4. Verifier que l'option Google Drive `Editors can change permissions and share`
   n'est pas desactivee.
5. Dans n8n, deposer tous les rapports dans ce dossier.

Avec cette option, les nouveaux rapports heritent de l'acces du dossier. Il n'y
a donc pas besoin de refaire le partage a chaque execution.

Exemple :

```text
creator@example.com      Owner ou Editor
abondelire@gmail.com     Editor
autre-client@example.com Editor
troisieme@example.com    Editor
```

Important : sur un Drive personnel, un fichier a un seul proprietaire. Les
autres comptes peuvent etre `Editor`, consulter, modifier et repartager si le
proprietaire l'autorise, mais ils ne deviennent pas automatiquement proprietaires.

### Option alternative : partager chaque rapport depuis n8n

Utiliser cette option si chaque rapport doit avoir ses propres droits.

Apres le node qui cree ou upload le fichier dans Drive, ajouter un ou plusieurs
nodes Google Drive :

```text
Resource: File
Operation: Share
Type: User
Role: Writer / Editor
Email: abondelire@gmail.com
```

Repeter le node pour chaque email, ou utiliser un node `Split Out` / boucle n8n
avec une liste :

```json
[
  "creator@example.com",
  "abondelire@gmail.com",
  "autre-client@example.com"
]
```

Chaque partage doit viser l'ID du fichier cree par le node Drive/Docs precedent.

Recommandation pratique : partager le dossier est plus simple et plus stable.
Partager chaque fichier est utile seulement si les destinataires changent selon
la campagne.

## 9. Marquer le rapport comme livre dans l'application

Apres le depot Drive reussi, ajouter un node `HTTP Request`.

Nom conseille :

```text
Marquer rapport livre dans l'application
```

Configuration :

| Champ | Valeur |
| --- | --- |
| Method | `POST` |
| URL | `https://appli.laroche360.ca/api/reports` |
| Send Headers | `true` |
| Send Body | `true` |
| Body Content Type | `JSON` |

Headers :

```text
Content-Type: application/json
x-api-key: <API_KEY>
```

Si `API_KEY` est disponible dans l'environnement n8n, utiliser :

```text
x-api-key: {{ $env.API_KEY }}
```

Body JSON recommande si n8n permet une expression qui retourne un objet :

```text
={{ {
  campaign_id: Number($json.campaign_id),
  report_path: $json.drive_url || $json.webViewLink || "drive"
} }}
```

Si n8n demande des champs separes plutot qu'un JSON brut :

```text
campaign_id = {{ Number($json.campaign_id) }}
report_path = {{ $json.drive_url || $json.webViewLink || "drive" }}
```

Resultat attendu :

```text
HTTP 201
```

Apres cette etape, l'application sait que le rapport a ete livre et le bouton
`Analyser` n'est plus cliquable pour cette campagne.

## 10. Tester la configuration

### Test rapide du Webhook

Dans n8n :

1. Ouvrir le workflow.
2. Cliquer sur `Listen for test event`.
3. Envoyer un payload de test vers l'URL de test.

Exemple de payload :

```json
{
  "body": {
    "body": [
      {
        "Employeur": "Demo",
        "Email": "demo@example.com",
        "Nom et Prenom(s)": "Demo User",
        "Fonction": "RH",
        "Q1": "3"
      }
    ],
    "campaign_id": 1,
    "client_email": "abondelire@gmail.com"
  },
  "campaign_name": "Campagne test",
  "company_name": "Demo",
  "user_email": "abondelire@gmail.com"
}
```

### Test depuis l'application

1. Verifier que le workflow est actif dans n8n.
2. Ouvrir l'application.
3. Aller dans les resultats.
4. Cliquer sur `Analyser` pour une campagne terminee avec des reponses.
5. Verifier dans n8n que l'execution est verte.
6. Verifier dans le Drive de `abondelire@gmail.com` que le rapport existe.
7. Rafraichir l'application.
8. Le bouton doit afficher :

```text
Analyse terminee. Consultez votre Drive.
```

## 11. Checklist de passation client

Avant de dire que la passation est terminee :

- [ ] Le client a acces au projet Google Cloud.
- [ ] Le compte `abondelire@gmail.com` possede ou controle le dossier Drive cible.
- [ ] Les credentials Google dans n8n sont connectees avec `abondelire@gmail.com`.
- [ ] Les nodes Google du workflow utilisent les credentials client.
- [ ] Le dossier Drive cible est le bon.
- [ ] Le dossier ou les fichiers sont partages avec les emails clients requis.
- [ ] Les personnes qui doivent repartager ont le role `Editor`.
- [ ] Le Webhook node a le path `rps-analysis`.
- [ ] Le workflow n8n est actif.
- [ ] `N8N_WEBHOOK_URL` vaut `https://automation.laroche360.ca/webhook/rps-analysis`.
- [ ] Le node HTTP Request final appelle `POST https://appli.laroche360.ca/api/reports`.
- [ ] Le header `x-api-key` correspond a la variable `API_KEY` du backend.
- [ ] Une analyse test cree le fichier dans le Drive client.
- [ ] L'application affiche `Analyse terminee. Consultez votre Drive.`

## 12. Depannage

### L'application affiche une erreur 500 lors de l'analyse

Verifier dans n8n :

- le workflow est actif ;
- la Production URL est bien `/webhook/rps-analysis` ;
- le workflow ne retourne pas une erreur interne ;
- les credentials Google sont valides.

Verifier cote serveur :

```text
N8N_WEBHOOK_URL=https://automation.laroche360.ca/webhook/rps-analysis
```

### n8n affiche une URL localhost

Verifier les variables n8n :

```text
N8N_EDITOR_BASE_URL=https://automation.laroche360.ca/
WEBHOOK_URL=https://automation.laroche360.ca/
N8N_PATH=/
```

Pour n8n, `WEBHOOK_URL` doit etre l'URL de base. Ne pas mettre
`/webhook/rps-analysis` dans cette variable n8n.

### Le fichier arrive dans ton Drive au lieu du Drive client

Les credentials Google du workflow sont encore connectees avec ton compte.

Correction :

1. Ouvrir les credentials Google dans n8n.
2. Reconnecter avec `abondelire@gmail.com`.
3. Reselectionner ces credentials dans chaque node Google.
4. Relancer un test.

### Le client voit le rapport mais ne peut pas le partager

Verifier les droits Drive :

- le client doit etre `Editor`, pas seulement `Viewer` ou `Commenter` ;
- le proprietaire ne doit pas avoir desactive l'option qui permet aux editors de
  changer les permissions et partager ;
- si le fichier est dans un Shared Drive Google Workspace, verifier les roles et
  restrictions du Shared Drive.

### Le rapport est dans Drive, mais l'application permet encore de cliquer

Le node final `POST /api/reports` n'a pas fonctionne.

Verifier :

- URL : `https://appli.laroche360.ca/api/reports`
- methode : `POST`
- header : `x-api-key`
- body : `campaign_id` et `report_path`
- reponse attendue : `201`

### Erreur 401 sur `/api/reports`

Le header `x-api-key` est absent ou incorrect. Il doit correspondre exactement a
la variable `API_KEY` du backend.

### Les credentials Google expirent apres quelques jours

Verifier le statut OAuth dans Google Cloud. Si l'app OAuth est `External` et
`Testing`, Google peut expirer le refresh token apres 7 jours. Pour une vraie
production, passer l'app OAuth en production ou utiliser une configuration Google
Workspace adaptee.

## 13. References officielles

- n8n - Import/export workflows : https://docs.n8n.io/workflows/export-import/
- n8n - Webhook node : https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/workflow-development/
- n8n - HTTP Request node : https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
- n8n - Google OAuth2 : https://docs.n8n.io/integrations/builtin/credentials/google/oauth-generic/
- n8n - Google Drive share file : https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googledrive/file-operations/
- Google Drive sharing : https://support.google.com/drive/answer/2494886
- Google OAuth2 refresh tokens : https://developers.google.com/identity/protocols/oauth2
- Google Drive ownership : https://support.google.com/docs/answer/2494892
