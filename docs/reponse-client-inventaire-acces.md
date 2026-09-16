**Objet : Confirmation de l’état actuel des accès et proposition de structure cible**

Bonjour,

Merci pour vos questions et pour votre proposition concernant les niveaux d’accès. Vous avez raison de demander une distinction claire entre l’état actuel et la structure cible. Nous avons repris chaque point à partir de l’application, du déploiement et du workflow d’automatisation.

## 1. Comptes d’administration

Aujourd’hui, l’accès à l’administration repose sur deux éléments :

- une liste de courriels autorisés dans la configuration de l’application;
- un compte utilisateur nominatif créé dans la base de données de l’application, avec son propre mot de passe.

La configuration actuelle permet techniquement d’inscrire soit des adresses exactes, soit une règle générique de type `*@laroche360.ca`. Si cette règle générique est présente dans la configuration de production, toute personne disposant d’une adresse correspondante peut créer un compte d’administration. Le compte ainsi créé reste ensuite dans la base de l’application tant qu’il n’est pas explicitement désactivé ou retiré.

Ce fonctionnement ne répond pas au modèle souhaité. Nous retenons donc les règles suivantes :

- suppression de toute autorisation globale fondée sur le domaine;
- utilisation exclusive d’une liste de comptes nommés;
- ajout, changement de rôle, désactivation et retrait explicites;
- révocation du compte applicatif lors du départ d’une personne;
- journalisation des changements d’accès.

Une page « Utilisateurs et rôles » devra être ajoutée afin que les administrateurs privilégiés puissent gérer ces opérations sans modifier directement la configuration du serveur.

La liste des comptes effectivement créés aujourd’hui doit être extraite de la table des utilisateurs de production. La valeur de la liste d’autorisation, conservée comme secret de déploiement, doit également être comparée à cette liste. Ces deux vérifications permettront de produire la liste nominative définitive sans exposer de mot de passe ni de secret.

## 2. Droits privilégiés, suppressions et exports

L’application ne possède pas encore quatre rôles distincts. La majorité des fonctions administratives sont accessibles à tous les comptes admis dans l’administration, tandis que certaines fonctions sont contrôlées par une seconde liste d’adresses exactes.

### Suppressions

- La suppression d’un sondage existe et est limitée à la seconde liste d’adresses exactes.
- La suppression d’un rapport existe dans l’API et est actuellement accessible à tout compte d’administration authentifié. Aucun bouton dédié n’est toutefois proposé dans l’interface actuelle.
- La suppression d’un sondage et celle d’un rapport sont deux opérations techniques distinctes.
- Le rôle formel d’« administration privilégiée » n’existe pas encore.

Nous confirmons que Sébastien Laforge et Roxanne Dubé doivent recevoir ce futur rôle privilégié. Les deux suppressions seront présentées séparément, avec confirmation explicite et sans effet de bord entre le sondage et le rapport.

### Export des réponses fermées

Une ligne d’export contient actuellement :

- une référence pseudonyme du répondant;
- la section;
- la question;
- le type de question;
- la réponse;
- le statut de la réponse : répondue, sautée ou refusée.

Elle ne contient directement ni nom, ni courriel, ni identifiant d’employé. La référence pseudonyme est cependant stable à l’intérieur d’une campagne et permet de regrouper les réponses d’un même répondant. Pour respecter strictement la cible proposée, cette référence devra elle aussi être retirée ou remplacée par une structure qui ne permet aucun suivi individuel inutile.

### Export des réponses textuelles

Cette fonction existe aujourd’hui, en formats CSV et Excel. Une ligne contient la référence pseudonyme, la section, la question, le commentaire complet et son statut.

Nous confirmons que cette fonction contredit la règle attendue. Elle devra être supprimée de l’interface et bloquée côté serveur. La restriction ne reposera pas uniquement sur le masquage d’un bouton.

### Commentaires et chaîne d’IA

La chaîne actuelle ne correspond pas encore au fonctionnement cible décrit. Le traitement transmet présentement à n8n, puis au service Gemini, le nom, le courriel, la fonction et les réponses brutes de chaque répondant, y compris les textes libres. Le masquage avant le premier appel d’IA n’est donc pas encore réalisé.

L’écran des commentaires signalés n’existe pas non plus dans la version actuelle.

Les corrections nécessaires sont donc :

- masquer les identifiants avant toute transmission au premier service d’IA;
- ne transmettre à la suite de la chaîne que les données strictement nécessaires;
- produire des thèmes plutôt que de rendre les verbatims disponibles en masse;
- créer l’écran des commentaires signalés;
- présenter un seul commentaire à la fois, sans nom, courriel, service ni autre réponse associée;
- réserver cet écran à Sébastien Laforge, Roxanne Dubé et Judith Lockhead;
- appliquer les deux décisions prévues au protocole de secours;
- interdire tout export depuis cet écran.

## 3. Consultation de la participation

Dans l’état actuel, « Consulter la participation des employés » ne signifie pas uniquement consulter le taux global.

L’écran de gestion des participants affiche aujourd’hui, pour chaque personne :

- son nom;
- son courriel;
- sa fonction ou son service;
- son statut individuel : en attente, en cours, relancé ou complété;
- les dates d’invitation et de relance;
- son lien et son jeton individuels de participation.

Il est donc actuellement possible de savoir qui a répondu et qui n’a pas répondu. Nous confirmons que ce comportement ne correspond pas à la promesse formulée dans les courriels ni à la cible du tableau de bord.

La cible retenue est la suivante :

- l’espace de résultats affiche uniquement le taux global et des données agrégées;
- aucun nom, courriel, lien individuel ou statut de réponse individuel n’y apparaît;
- les données nécessaires à l’envoi des invitations et des relances sont séparées de l’espace de résultats;
- un utilisateur consultant les résultats ne peut pas relier une réponse à une personne.

## 4. Inventaire des systèmes où se trouvent les données ou les accès

| Système | Données ou capacités présentes aujourd’hui | Accès humain ou technique observable |
|---|---|---|
| Outil d’administration | Comptes, entreprises, employés, campagnes, participants, statuts, réponses, résultats et rapports | Comptes applicatifs admis par la liste de courriels; aucune séparation complète par rôle ou par entreprise aujourd’hui |
| PostgreSQL | Identités, coordonnées, services, jetons, invitations, relances, statuts, réponses, comptes administratifs et références de rapports | Utilisateur technique de l’application; une personne ayant un accès administratif au serveur peut également administrer la base |
| n8n | Workflows, historique d’exécution, données reçues pour l’analyse et identifiants des services connectés | Utilisateurs n8n; l’accès administratif permet de gérer les workflows et d’utiliser les identifiants enregistrés |
| SendGrid | Destinataires des invitations et relances, expéditeur et journaux de livraison | Utilisateurs du compte SendGrid et clé de service utilisée par l’application et n8n |
| Entreposage des rapports | Rapports générés et déposés dans Google Drive | Compte Google connecté à n8n et personnes ayant accès au dossier Drive; le compte client documenté pour ce dossier est `abondelire@gmail.com` |
| Dépôt de code | Code source, historique, documentation, workflow n8n et configuration de déploiement | Dépôt actuellement rattaché au compte GitHub `AzazelSloth`; collaborateurs du dépôt et personnes autorisées dans l’organisation cible |
| GitHub Actions | Déploiement et secrets nécessaires au VPS, à la base, à n8n et aux services externes | Administrateurs autorisés du dépôt et processus GitHub Actions |
| Service d’IA | Réponses actuellement transmises à Gemini pour produire l’analyse narrative | Identifiant Gemini conservé dans n8n; modèle configuré : Gemini 2.5 Flash |
| Serveur/VPS | Application, conteneurs, journaux, variables d’environnement, n8n et accès à PostgreSQL | Comptes SSH humains à confirmer dans le serveur et clé SSH utilisée par GitHub Actions |
| cPanel/WHM | Domaine, certificats et fonctions d’hébergement disponibles | Compte technique cPanel identifié dans le déploiement : `devlaroche360`; utilisateurs humains de cPanel/WHM à confirmer dans la console |

Le code permet d’identifier les systèmes, les comptes techniques et leurs capacités. En revanche, il ne permet pas de lire la liste actuelle des membres dans les consoles GitHub, n8n, SendGrid, Google, cPanel/WHM ou dans les comptes SSH du serveur. Ces listes devront être exportées directement de chaque service pour compléter la colonne nominative.

## 5. Accès non humains

Aucune valeur de clé ou de mot de passe n’est reproduite ci-dessous.

| Accès technique | Ce qu’il permet | Emplacement de conservation observable | Personnes pouvant potentiellement l’administrer |
|---|---|---|---|
| Utilisateur PostgreSQL de l’application | Lire et modifier les données nécessaires au fonctionnement de l’application | Environnement du VPS et secrets de déploiement GitHub | Administrateurs du VPS et personnes autorisées à administrer les secrets GitHub |
| Clé SendGrid | Envoyer les invitations, relances, réinitialisations de mot de passe et courriels liés aux rapports | Environnement applicatif, environnement n8n et secrets GitHub | Administrateurs SendGrid, n8n, VPS et secrets GitHub selon leur niveau d’accès |
| Identifiant Gemini | Appeler le service d’IA et lui transmettre les données d’analyse | Coffre d’identifiants n8n | Administrateurs n8n et administrateurs du compte Google associé |
| Identifiant Google Drive | Créer et déposer les rapports dans le dossier cible | Coffre d’identifiants n8n | Administrateurs n8n et administrateurs du compte Google associé |
| Clé API n8n/application | Autoriser les communications automatisées avec le backend | Environnements du VPS et de n8n, alimentés par les secrets GitHub | Administrateurs du VPS, de n8n et des secrets GitHub |
| Clé de chiffrement n8n | Chiffrer et rendre utilisables les identifiants stockés dans le coffre n8n | Secret GitHub et environnement n8n du VPS | Administrateurs des secrets GitHub et du VPS |
| Clé SSH de déploiement | Permettre à GitHub Actions d’exécuter le déploiement sur le VPS | Secret GitHub Actions | Administrateurs du dépôt et des secrets GitHub; administrateurs du VPS pour sa révocation |
| Secret de session JWT | Signer les sessions des administrateurs | Secret GitHub et environnement du backend | Administrateurs des secrets GitHub et du VPS |
| Secret de pseudonymisation des exports | Générer les références pseudonymes des répondants | Secret GitHub et environnement du backend | Administrateurs des secrets GitHub et du VPS |

Le coffre n8n est traité comme un accès privilégié, car il permet d’utiliser plusieurs identifiants de services même lorsque leurs valeurs ne sont pas affichées directement.

Pour chaque accès technique, la matrice finale précisera le propriétaire du compte fournisseur, le responsable de la rotation, la dernière rotation connue, la procédure de révocation et les personnes disposant des droits permettant de l’utiliser ou de le remplacer.

## 6. Propriété du dépôt et continuité

Le dépôt est actuellement hébergé sous un compte GitHub qui n’appartient pas encore à une organisation contrôlée par L360.

Nous proposons que L360 crée une organisation GitHub dont elle sera propriétaire et administratrice principale. Le dépôt existant y sera transféré avec son historique. Au moins deux personnes nommées de L360 seront désignées propriétaires de l’organisation afin d’éviter une dépendance à une seule personne.

Chaque intervenant technique utilisera son propre compte nominatif. Aucun compte collectif et aucun partage de mot de passe ne seront utilisés. Les développeurs recevront seulement les permissions nécessaires et pourront être retirés sans affecter la propriété du dépôt.

Le transfert devra inclure une révision distincte des éléments qui ne sont pas automatiquement réglés par le déplacement du dépôt :

- membres et collaborateurs;
- secrets GitHub Actions;
- clés SSH et clés de déploiement;
- variables d’environnement;
- applications et intégrations GitHub;
- règles de branches et validations;
- facturation et adresses de récupération;
- accès d’urgence et procédure de relève.

La propriété du dépôt sera ainsi du côté de L360. Les droits de propriété intellectuelle sur le code développé spécifiquement pour le projet demeurent encadrés par le contrat, tandis que les composants tiers continuent d’être utilisés selon leurs licences respectives.

## 7. Structure cible proposée

Nous retenons votre proposition comme base de la structure cible :

| Niveau | Personnes concernées | Autorisations cibles |
|---|---|---|
| Administration courante | Personnes de L360 nommées individuellement | Créer et modifier les sondages, gérer les campagnes et consulter les statistiques agrégées, dont le taux global de participation et la durée moyenne |
| Administration privilégiée | Sébastien Laforge et Roxanne Dubé | Droits précédents, gestion des comptes et rôles, suppression distincte d’un sondage ou d’un rapport et export des réponses fermées sans donnée permettant d’identifier ou de suivre un répondant |
| Personnes désignées | Sébastien Laforge, Roxanne Dubé et Judith Lockhead | Consulter uniquement les commentaires signalés, un à la fois, sans identité ni réponse associée, appliquer le protocole de secours et ne disposer d’aucun export |
| Accès technique | Geneviève et Toky, ainsi que tout prestataire technique disposant réellement d’un accès, avec comptes nommés | Exploitation, déploiement, maintenance et diagnostic selon le moindre privilège, avec journalisation et sans consultation fonctionnelle des commentaires bruts hors de la chaîne automatisée |

Une même personne pourra cumuler plusieurs rôles lorsque cela est explicitement autorisé. Les permissions seront contrôlées côté serveur et non uniquement par l’affichage ou le masquage de boutons dans l’interface.

## 8. Écarts à corriger

Les principaux écarts entre l’état actuel et la cible sont donc :

- possibilité d’une autorisation administrative fondée sur un domaine;
- absence de rôles fins et d’une page de gestion des utilisateurs;
- affichage du statut individuel de participation;
- accès administratif général à des réponses individuelles dans l’API;
- existence de l’export global des réponses textuelles;
- référence pseudonyme stable dans l’export fermé;
- transmission actuelle des identifiants et réponses brutes à n8n et Gemini;
- absence de l’écran réservé aux commentaires signalés;
- absence d’un inventaire nominatif consolidé provenant des consoles externes;
- dépôt GitHub qui n’est pas encore détenu par une organisation L360.

Nous utiliserons cette liste et la matrice des habilitations comme critères de validation. Le travail ne sera considéré comme terminé qu’après vérification des contrôles côté serveur et revue des accès humains et techniques dans chacun des systèmes concernés.

Cordialement,

Cathy
