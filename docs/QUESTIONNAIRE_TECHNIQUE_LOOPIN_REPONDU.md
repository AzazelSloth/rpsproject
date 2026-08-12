# P4 : Questions techniques • LoopIn

## Pour orienter la construction de l'application

> **Note de lecture** — Les questions ci-dessous sont retranscrites intégralement du document `laroche04 - Questions Techniques.docx.pdf`. Les réponses décrivent l’état observable du dépôt au 24 juillet 2026. Les décisions organisationnelles impossibles à déduire du code sont indiquées en commentaire.

## 1. Pourquoi ce document

LoopIn est en développement : c'est le moment idéal pour bâtir les bonnes fondations. Les réponses aux questions qui suivent nous permettront de concevoir le questionnaire sur des bases solides, de protéger réellement l'anonymat des répondants, d'encadrer le calcul, l'IA et le rapport, et de documenter l'ensemble comme nos clients le demanderont. Pour chaque question, une réponse simple suffit : déjà construit, prévu, ou pas encore décidé.

---

## 2. Les questions et leur configuration

### Question 1

> Les composantes utilisées pour bâtir LoopIn (plateforme de sondage, bibliothèques) fournissent-elles des gabarits ou des banques de questions, et est-il prévu d'en utiliser? Pour éviter d'intégrer des énoncés sous licence sans le savoir.

**Statut : Partiellement construit.**

Les questions sont créées manuellement. Une campagne peut copier les questions et sections d’une campagne existante, mais il n’existe pas de banque externe ni de métadonnées de source, licence ou version d’instrument.

**Commentaire :** l’utilisation future d’instruments externes est à décider avec L360. Il faudra documenter leur source et leur licence.

### Question 2

> Les questions commenceront-elles vides? Des maquettes antérieures montraient « 1 - Pas du tout d'accord » présélectionné : peut-on confirmer qu'aucune valeur par défaut ne pourra jamais être enregistrée comme réponse? Une valeur par défaut enregistrée corrompt les données sans que personne le voie.

**Statut : Déjà construit.**

Oui. L’état des réponses commence vide et aucune valeur de l’échelle 1 à 5 n’est présélectionnée ou enregistrée sans action du répondant.

### Question 3

> Les questions pourront-elles être configurées comme facultatives? Pourra-t-on offrir une option « Je préfère ne pas répondre », enregistrée comme un choix distinct (différent d'une question sautée)? Le répondant pourra-t-il revenir en arrière? Les questions sensibles ne doivent jamais forcer une réponse, et un refus ne se traite pas comme une donnée manquante.

**Statut : Pas construit.**

Il n’existe pas de propriété obligatoire/facultative. Le formulaire actuel exige toutes les réponses. « Je préfère ne pas répondre » peut seulement être ajouté manuellement comme choix ordinaire. Toutes les questions sont sur une page et restent modifiables avant l’envoi; elles ne le sont plus après la soumission.

**Commentaire :** le traitement des questions sensibles et du refus de répondre reste à décider.

### Question 4

> Si une question à développement (texte libre) est intégrée : pourra-t-elle être facultative, limitée en caractères et accompagnée d'une consigne affichée? Pour encadrer ce type de question si on décide d'en garder une.

**Statut : Partiellement construit.**

Le type texte libre et une consigne existent. Une limite de 4 000 caractères existe sur l’API administrative, mais elle n’est pas affichée dans le formulaire public et la question n’est pas facultative.

### Question 5

> Des pages d'introduction (accueil, consentement, ressources d'aide) et de fin sont-elles prévues, et leur contenu sera-t-il configurable par mandat? Le questionnaire ne commence pas à la question 1.

**Statut : Partiellement construit.**

Une page d’accès, un en-tête et une confirmation de fin existent. Il n’existe pas de page configurable de consentement, ressources d’aide ou contenu de fin par mandat.

### Question 6

> Comment les questions démographiques seront-elles configurées, et des règles de taille minimale de groupe sont-elles prévues pour l'affichage des résultats? Le croisement démographique est le principal risque de réidentification.

**Statut : Partiellement construit.**

Le département/fonction est enregistré avec l’employé et utilisé pour regrouper les résultats. Aucun seuil minimal de groupe ni mécanisme empêchant les petits groupes ou croisements n’existe.

**Commentaire :** le seuil minimal doit être décidé avec les responsables méthodologiques et de la vie privée, puis appliqué dans le backend, les rapports et les exports.

### Question 7

> Le système conserve-t-il l’heure exacte à laquelle chaque employé ouvre son invitation ainsi que l’heure de début, de progression ou de soumission du questionnaire? Si oui, ces horaires peuvent-ils être comparés afin de relier une réponse à un employé? Même sans nom ni identifiant dans les réponses, des heures précises conservées dans les deux systèmes pourraient permettre d’identifier indirectement le répondant.

**Statut : Déjà construit, avec risque élevé.**

Le système conserve les heures d’invitation, de rappel, de fin et de création de chaque réponse. Il n’existe pas de champ explicite d’ouverture ou de progression, mais les journaux Nginx enregistrent les accès et les URL contenant le jeton. Les réponses sont en plus directement reliées à l’employé.

### Question 8

> Comment le bilinguisme sera-t-il géré : deux versions liées d'un même questionnaire, une bascule de langue, autre chose? Les versions française et anglaise doivent rester synchronisées et comparables.

**Statut : Pas construit.**

Aucun modèle de traduction, champ de langue, bascule ou synchronisation français/anglais n’existe.

**Commentaire :** la stratégie bilingue reste à décider. Un même item logique avec deux traductions liées est recommandé.

### Question 9

> L'interface est-elle conçue et testée pour mobile et les principaux navigateurs? Un problème d'accès crée un biais de participation.

**Statut : Partiellement construit.**

L’interface utilise des styles responsifs, mais aucune suite de tests mobile, navigateurs ou accessibilité n’a été trouvée.

---

## 3. Le calcul

> **Note du document original :** pour les items provenant d'instruments validés, des règles de calcul publiées existent et seront fournies à l'étape de spécification. Les questions ci-dessous portent sur ce qui est conçu ou prévu dans LoopIn.

### Question 10

> Le système permet-il de détecter et d’écarter les réponses potentiellement non valides. Par exemple, un questionnaire complété dans un délai irréaliste, des réponses identiques à toutes les questions, des incohérences importantes ou des doublons? Quelles règles sont appliquées, qui décide de l’exclusion et les résultats ainsi que le taux de participation sont-ils recalculés uniquement à partir des réponses jugées valides? Un taux de participation élevé ne garantit pas une analyse fiable. Les critères d’exclusion doivent être définis, documentés et appliqués uniformément avant la génération du rapport. Une réponse complétée rapidement ne devrait pas être automatiquement supprimée. Elle devrait être signalée pour validation selon un seuil réaliste, idéalement combiné à d’autres indices.

**Statut : Pas construit.**

Aucune détection de durée irréaliste, réponses uniformes, incohérences ou qualité douteuse n’existe. Le jeton empêche seulement une deuxième soumission avec le même lien. Le taux de participation repose sur le statut terminé, sans notion de validité, les critères, seuils, personnes autorisées à valider et règles de recalcul restent à décider.

### Question 11

> Le rapport signale-t-il lorsque le nombre de réponses valides est insuffisant pour soutenir les constats et recommandations? Pour éviter de présenter comme représentatif un diagnostic reposant sur un échantillon trop faible ou sur des réponses de qualité douteuse.

**Statut : Partiellement construit.**

Un message général peut indiquer des données insuffisantes et le prompt IA demande de rester prudent. Aucun seuil numérique ne bloque les résultats, recommandations ou rapports.

### Question 12

> Comment est-il prévu que les réponses deviennent des résultats? Par exemple : une moyenne des questions 1 à 4 produirait un score « Charge de travail ». Et où cette logique vivra-t-elle : dans le code, dans une configuration modifiable, ou dans les instructions données à l'IA? C'est le cœur de la traçabilité : montrer le chemin d'une réponse jusqu'au rapport.

**Statut : Déjà construit, mais provisoire.**

La logique actuelle vit dans le code : moyenne simple des réponses d’échelle 1 à 5 par employé, puis moyenne par département et globale. Le champ de dimension RPS existe, mais n’est pas utilisé dans les calculs. L’IA reçoit séparément les réponses brutes.

### Question 13

> Avant de calculer les scores, le système recode-t-il automatiquement les questions formulées dans le sens opposé aux autres? Par exemple, si un score élevé doit toujours représenter une situation favorable, une réponse de 5 à « Je crains de perdre mon emploi » doit devenir 1, selon la formule 6 − réponse. Sans cette inversion, un niveau de risque élevé pourrait être interprété comme un résultat favorable. Une question oubliée ou incorrectement configurée fausserait silencieusement le score de sa dimension et les constats du rapport. Quand le rapport affichera un niveau (vert, jaune, rouge ou équivalent), quelle règle exacte le déterminera, où sera-t-elle définie, et pourra-t-on la modifier sans reprogrammer? Un niveau montré à un client doit reposer sur une règle explicable et ajustable.

**Statut : Pas construit pour l’inversion; partiellement construit pour les seuils.**

Aucune inversion `6 − réponse` n’existe. Les seuils actuels sont codés en dur : zone de risque à partir de 3,5/5 et alerte à partir de 4/5. Ils exigent une modification du code.

### Question 14

> Quelle règle est prévue pour les questionnaires abandonnés en cours de route et les réponses manquantes : exclus, comptés partiellement, autre? Les données partielles se traitent selon des règles, pas au hasard.

**Statut : Incohérent entre frontend et backend.**

Le frontend exige toutes les réponses et ne sauvegarde pas la progression. Le backend accepte au moins une réponse et marque alors le questionnaire comme terminé. Les calculs utilisent les valeurs numériques disponibles sans règle méthodologique formelle.

### Question 15

> Le système gardera-t-il la trace de quelle version du questionnaire a produit quelles données (si une question change, les anciens résultats restent associés à l'ancienne formulation)? Sans ça, les comparaisons d'une année à l'autre deviennent invérifiables.

**Statut : Partiellement construit.**

Une réponse reste liée à son enregistrement de question et les questions ne sont pas modifiables pendant une campagne active. Aucun numéro de version, historique d’item, date d’effet ou empreinte du questionnaire n’existe.

---

## 3. L’IA et le rapport

### Question 16

> L'IA recevra-t-elle les réponses brutes des employés, ou des résultats déjà calculés (scores, moyennes)? Et plus largement, qu'est-ce qui lui sera transmis : les textes libres, les données démographiques? Un exemple du format prévu serait idéal. Cette réponse détermine l'architecture de toute la chaîne d'analyse; si ce n'est pas encore décidé, c'est une décision à prendre ensemble avant de coder la suite.

**Statut : Déjà construit.**

L’IA reçoit actuellement les réponses individuelles brutes, les textes libres, le nom, le courriel et la fonction/département. Exemple réel du format préparé :

```text
Repondant 1 - Nom Prénom - Fonction - courriel
Q1: réponse
Q2: réponse
```

Elle ne reçoit donc pas seulement des scores agrégés.

### Question 17

> Les instructions données à l'IA (le prompt) sont-elles rédigées? Où vivront-elles, et seront-elles versionnées? Le prompt est une pièce de gouvernance à conserver et à dater.

**Statut : Déjà construit, mais gouvernance incomplète.**

Les prompts sont rédigés dans le fichier JSON du workflow n8n et versionnés dans Git. La version du prompt n’est toutefois pas enregistrée avec chaque rapport et aucun registre d’approbation n’existe.

### Question 18

> Quel service d'IA est prévu (fournisseur et modèle), et sous quel type de compte ou d'entente? Cette entente permet-elle au fournisseur de conserver nos données ou de les utiliser pour améliorer ses modèles? C'est souvent un réglage ou un niveau de compte : lequel est prévu? Des réponses d'employés sur leur santé psychologique ne doivent jamais servir à entraîner un modèle tiers.

**Statut : Fournisseur et modèle construits; entente à confirmer.**

Le workflow utilise Google Gemini, modèle `models/gemini-2.5-flash`, avec des identifiants gérés dans n8n.

**Commentaire :** le type de compte, la région, la conservation, les paramètres de non-entraînement et l’entente contractuelle doivent être vérifiés dans le compte Google réellement utilisé.

### Question 19

> Si des textes libres sont transmis à l'IA, un retrait des noms et détails identifiants est-il prévu avant l'envoi? Un commentaire peut identifier son auteur ou un collègue.

**Statut : Pas construit.**

Aucun retrait automatique des identifiants n’existe. Le nom et le courriel de l’employé sont même ajoutés explicitement au texte transmis à l’IA. Les personnes nommées dans les commentaires ne sont pas masquées.

### Question 20

> Quelles transformations sont prévues avant et après l'appel à l'IA : agrégation, retrait d'identifiants, mise en forme, validation ou filtrage de ce qui revient? Le prompt seul ne décrit pas toute la chaîne.

**Statut : Partiellement construit.**

Avant l’appel, le système valide sommairement le payload, extrait les colonnes `Qn` et concatène les réponses par personne avec son identité. Il n’y a ni agrégation, ni anonymisation, ni seuil de petit groupe. Après l’appel, le texte est inséré dans un gabarit, déposé sur Google Drive, envoyé par courriel et marqué comme livré. Aucun contrôle automatisé des hallucinations, identifiants retournés ou recommandations n’existe.

### Question 21

> Dans le rapport, qu'est-ce qui sera un gabarit fixe, qu'est-ce qui sera calculé automatiquement, qu'est-ce qui viendra d'une banque de contenus prérédigés, et qu'est-ce qui sera rédigé par l'IA? Pour savoir exactement quelle part du livrable dépendra de l'IA.

**Statut : Déjà construit de manière mixte.**

- Gabarit fixe : titre, métadonnées, structure et avis de confidentialité.
- Calcul automatique : participation, moyennes, alertes et départements à risque.
- Contenu prérédigé : gabarit Strapi optionnel ou valeurs par défaut.
- IA : analyse narrative et trois actions proposées.
- Aucune banque formelle et versionnée de recommandations n’a été trouvée.

### Question 22

> Comment les recommandations et le plan d'action seront-ils choisis : des règles prédéfinies, une banque de recommandations, l'IA, une intervention humaine? Une recommandation doit être reliée aux résultats qui la justifient.

**Statut : Partiellement construit.**

Le rapport frontend utilise quelques règles codées, notamment selon le taux de participation et les moyennes par département. Le workflow n8n demande aussi trois actions à l’IA. Il n’existe pas de banque contrôlée, de lien de preuve vers les résultats ni de validation humaine obligatoire.

### Question 23

> Le prototype de rapport mentionnait une analyse du contexte organisationnel et des entretiens avec la direction : comment ces informations entreront-elles dans LoopIn (saisies où, stockées où, intégrées comment au rapport)? Il faut distinguer ce qui vient du sondage de ce qui vient d'ailleurs, et éviter que l'IA en invente une partie.

**Statut : Pas construit.**

Aucun formulaire, table ou endpoint ne stocke les entretiens, le contexte organisationnel ou leur provenance. Une zone de notes de consultant existe dans le gabarit, mais sans chaîne structurée d’intégration et de validation.

### Question 24

> Un rapport de démonstration peut-il être généré à partir de données test, avec la version du questionnaire correspondante? Pour évaluer la chaîne complète, des réponses au livrable.

**Statut : Techniquement possible, mais pas fourni comme test reproductible.**

Une campagne de test peut être créée et analysée, mais aucun jeu synthétique de référence avec questionnaire versionné, résultats attendus et rapport témoin n’est fourni.

---

## 3. L’anonymat, la confidentialité et l’infrastructure

### Question 25

> Selon l’architecture actuelle, les réponses sont-elles anonymes, pseudonymisées ou confidentielles? Pour chaque qualification, veuillez expliquer les critères techniques utilisés et indiquer si une personne disposant des accès administrateur ou développeur pourrait, directement ou par recoupement, relier une réponse à un employé. L’absence du nom dans le rapport ne suffit pas à garantir l’anonymat. Nous devons déterminer précisément ce que LoopIn peut promettre aux répondants et quelles obligations s’appliquent aux données.

**Statut : Réponses confidentielles et directement identifiables.**

Chaque réponse contient `employee_id`. L’employé contient son nom, courriel et département; le jeton est également lié à cet employé. Les API administratives retournent la réponse avec l’employé. Une personne ayant accès administrateur ou base de données peut donc relier directement une réponse à une personne. La qualification « anonyme » ou même « pseudonymisée » n’est pas appropriée actuellement.

### Question 26

> Quelles données sont traitées confidentiellement même si les réponses sont anonymes, notamment la liste des employés, les invitations, les statuts de participation, les journaux techniques et les comptes administrateurs et quelles personnes peuvent y accéder? L’anonymat potentiel des réponses ne retire pas l’obligation de protéger les autres renseignements personnels recueillis par LoopIn.

**Statut : Données présentes; accès partiellement contrôlés.**

Sont traités : identités, coordonnées, fonctions, entreprises, invitations, rappels, statuts, jetons, réponses, comptes administrateurs, journaux, rapports Drive et historiques n8n. Les administrateurs autorisés par courriel et les personnes ayant accès au VPS, PostgreSQL, n8n, Drive, SendGrid ou GitHub peuvent avoir accès à une partie de ces données.

**Commentaire :** la liste nominative des personnes ayant ces accès doit être confirmée par L360 et les responsables TI.

### Question 27

> Est-il possible de gérer confidentiellement la liste des employés et les invitations, tout en rendant les réponses véritablement anonymes et impossibles à relier, directement ou indirectement, à un employé? Si oui, quelles modifications techniques ou fonctionnelles seraient nécessaires? Pour déterminer si cette architecture cible est réalisable dans LoopIn et identifier les ajustements requis.

**Statut : Faisable avec une refonte; pas construit.**

Il faudrait séparer le service d’invitation du stockage des réponses, retirer `employee_id` des réponses, ne jamais conserver le jeton avec la réponse, agréger avant consultation/export/IA, appliquer les seuils dans le backend, limiter les horodatages et empêcher tout accès aux réponses individuelles.

### Question 28

> La question directe : LoopIn peut-il être conçu pour que les réponses soient véritablement anonymes à 100 %? Concrètement : lien d'invitation générique plutôt qu'individuel, aucun enregistrement d'adresse IP ni d'horodatage précis, aucun moyen de recroiser une réponse avec la liste d'invitation. Et quelles limitations cela créerait-il : impossibilité d'empêcher les réponses multiples, de faire des rappels ciblés aux non-répondants, de reprendre un questionnaire commencé? Qu'est-ce qui est déjà en place, qu'est-ce qui est prévu, et qu'est-ce qui reste à décider? C'est la décision de fond du projet; la faisabilité technique la conditionne.

**Statut : Pas construit; décision de produit à prendre.**

Une architecture d’anonymat fort est possible, mais une promesse absolue de 100 % reste risquée à cause des journaux réseau, textes libres, petits groupes et métadonnées. Il faudrait un lien générique, aucune identité ou IP dans la couche de réponses, aucun horodatage précis, une dé-identification des textes, des résultats uniquement agrégés et une séparation stricte des droits.

Limitations : prévention des doublons moins fiable, rappels ciblés impossibles, reprise plus difficile et taux individuel moins précis.

### Question 29

> Peux-tu dessiner (même à main levée) le parcours prévu d'un répondant : de l'importation de la liste d'employés jusqu'à la production du rapport, en montrant où passent les données à chaque étape? Un seul schéma montre chaque endroit où une identité pourrait rejoindre une réponse.

**Statut : Parcours actuel documenté ci-dessous.**

```text
Client/L360
   |
   | CSV : nom, prénom, courriel, téléphone, département
   v
Frontend admin Next.js
   v
Backend NestJS -----------------------------+
   | crée Employee et un jeton UUID          | journaux Nginx : IP + URL
   v                                         |
PostgreSQL                                   |
   | Employee <--- CampaignParticipant ------+
   |                 token + horaires
   v
SendGrid ---> lien /survey-response/{token}
                         |
                         | retrouve et affiche l'employé
                         v
                    Réponses
                         v
PostgreSQL responses : employee_id + question_id + answer + created_at
   |
   +--> administrateurs : réponses et résultats
   |
   +--> n8n : nom + courriel + fonction + réponses
             +--> Google Gemini
             +--> Google Drive
             +--> SendGrid
             +--> marqueur de rapport dans le backend
```

Les jonctions identité-réponse sont le jeton, `employee_id`, les horodatages, les journaux d’URL et le payload n8n/Gemini.

### Question 30

> Les liens d'invitation seront-ils génériques ou individuels? S'ils contiennent un jeton ou un code unique : comment sera-t-il créé, à quoi servira-t-il, sera-t-il conservé avec la réponse, et détruit quand? Le jeton est souvent le fil qui relie techniquement une réponse à une personne.

**Statut : Déjà construit — liens individuels.**

Un UUID est créé pour chaque couple campagne-employé. Il charge le questionnaire et empêche une seconde soumission avec le même lien. Il reste conservé avec l’employé, la campagne et les horaires. Aucun délai d’expiration ou destruction après utilisation n’existe.

### Question 31

> Pour chaque répondant, qu'est-ce qui sera conservé : adresse courriel, adresse IP, horodatages, identifiant unique, type d'appareil? C'est la liste qui déterminera si le mot « anonyme » est vrai.

**Statut : Déjà construit.**

Sont conservés dans les tables : nom, prénom, courriel, téléphone, entreprise, département, identifiant, jeton, invitation, rappel, nombre de rappels, fin et date de chaque réponse. Aucun champ métier dédié à l’appareil ou au navigateur n’existe. Nginx journalise toutefois l’adresse IP et peut journaliser l’URL complète avec le jeton.

### Question 32

> La liste des invités (noms, prénoms, fonctions, courriels fournis par les clients) et les réponses seront-elles stockées séparément? Le système conservera-t-il seulement un statut « invitation utilisée », ou aussi des heures précises rapprochables des réponses? L'architecture cible : une couche administrative confidentielle, une couche de réponses anonyme, aucun recroisement possible.

**Statut : Tables séparées, mais réponses non anonymes.**

Les employés, participants et réponses sont dans des tables différentes, mais les réponses contiennent directement `employee_id`. Le participant conserve le jeton, l’employé, le statut et les heures précises. Le recroisement est donc simple et prévu par le modèle.

### Question 33

> Les règles de taille minimale de groupe s'appliqueront-elles aussi aux filtres, aux croisements et aux exports, ou seulement au rapport affiché? Et une fonction permettra-t-elle à un administrateur, au développeur ou au client de consulter ou d'exporter des réponses individuelles? Un seuil respecté au rapport mais contournable par un export ne protège rien; on veut les capacités réelles, pas l'affichage.

**Statut : Pas construit.**

Aucun seuil minimal ne s’applique aux résultats, filtres, croisements ou exports. Les routes administratives permettent de lire les réponses individuelles avec l’employé associé. Même sans bouton d’export visible, l’API rend ces données accessibles.

### Question 34

> Où les données seront-elles hébergées (fournisseur, pays, région)? Les transferts hors Québec exigent une évaluation (Loi 25).

**Statut : Architecture connue; fournisseur, pays et région à confirmer.**

Le déploiement prévoit un VPS Ubuntu avec Docker, Nginx, PostgreSQL et n8n. Les rapports sont déposés dans Google Drive. Le fournisseur du VPS, le pays, les régions de la base et de Google ainsi que les lieux de sauvegarde ne figurent pas dans le dépôt.

### Question 35

> Qui aura accès à quoi (développeur, L360, client), et des journaux d'accès sont-ils prévus? Les accès aux données sensibles se limitent et se tracent.

**Statut : Contrôle partiel; audit métier pas construit.**

Les administrateurs utilisent un JWT et une liste de courriels autorisés; n8n peut utiliser une clé API. Il n’existe pas de rôles fins ou de permissions par client. Le backend conserve des journaux horodatés et Nginx des journaux d’accès, mais aucun audit métier ne trace qui a consulté ou exporté une donnée précise.

**Commentaire :** les personnes réelles ayant accès aux différents comptes et serveurs sont à confirmer.

### Question 36

> Quelle durée de conservation est prévue, une procédure de destruction ou d'export existera-t-elle, et couvrira-t-elle les sauvegardes? Une destruction qui oublie les sauvegardes n'est pas une destruction.

**Statut : Pas décidé et pas construit de bout en bout.**

Aucun calendrier de conservation, traitement automatique à échéance, registre de destruction ou export client complet n’existe. Certaines suppressions sont logiques et laissent les données en base. La stratégie de sauvegarde et sa durée ne sont pas documentées.

### Question 37

> Quels sous-traitants ou services tiers toucheront aux données : plateforme de sondage sous-jacente, hébergeur, outils d'analytique, fournisseur d'IA, service d'envoi de courriels? Chaque maillon de la chaîne compte.

**Statut : Inventaire partiel observable.**

Services identifiés : fournisseur du VPS, GitHub/GitHub Actions, SendGrid, n8n, Google Gemini, Google Drive, Strapi si activé, fournisseur de domaine/DNS/TLS et PostgreSQL ou son fournisseur externe.

**Commentaire :** les fournisseurs exacts du VPS, de PostgreSQL, du domaine et de Strapi sont à confirmer.

### Question 38

> Des environnements de développement ou de test existeront-ils, et des données réelles de clients pourraient-elles y circuler? Les données sensibles ne doivent pas vivre dans des environnements moins protégés.

**Statut : Environnements présents; politique de données réelles absente.**

Les environnements `rps_dev`, `development`, local et CI existent. Aucun contrôle technique n’interdit l’importation de données réelles et aucun mécanisme de masquage ou de génération synthétique n’a été trouvé.

**Commentaire :** une politique interdisant les données réelles en développement/test reste à adopter.

---

## 3. Documentation, qualité et continuité

### Question 39

> Une documentation ou une FAQ existe-t-elle ou est-elle prévue : pour les administrateurs (L360), pour les clients, pour les répondants? La documentation fait partie du produit; elle portera aussi les promesses d'anonymat.

**Statut : Partiellement construit.**

Il existe un README technique, des guides de passation, de configuration n8n, de déploiement et Swagger. Il n’existe pas de FAQ répondant, politique d’anonymat approuvée, avis de consentement, manuel client de gouvernance, matrice des accès ou politique de conservation.

### Question 40

> LoopIn reposera-t-il sur des plateformes, bibliothèques ou services tiers, et sous quelles licences? Une dépendance non documentée peut limiter la commercialisation.

**Statut : Plateformes documentées; licences incomplètement inventoriées.**

Le projet utilise notamment Next.js, React, TypeScript, Tailwind, tRPC, Zod, NestJS, TypeORM, PostgreSQL, n8n, Google Gemini, Google Drive, SendGrid, Strapi optionnel, Nginx, Docker et GitHub Actions. Le package backend déclare le projet `UNLICENSED`. Aucun fichier `LICENSE`, SBOM ou registre complet des licences tierces n’a été trouvé.

### Question 41

> Des tests sont-ils prévus (par exemple un jeu de données d'essai avec les résultats attendus), et existe-t-il une liste des limites ou choix techniques encore ouverts? Documenter ce qui reste à faire vaut autant que documenter ce qui est fait.

**Statut : Partiellement construit.**

Des tests unitaires backend et une CI existent. Il n’y a pas de suite de tests frontend, de jeu psychométrique avec résultats attendus, de test d’anonymat, de seuils, de dé-identification, de prompt IA ou de rapport complet. Aucun registre unique des décisions et risques ouverts n’existe.

### Question 42

> Dans quels comptes vivront le code source, l'hébergement, le nom de domaine et les clés d'accès aux services (incluant l'IA)? Continuité d'affaires.

**Statut : Partiellement connu.**

- Code : dépôt `github.com/AzazelSloth/rpsproject`.
- Déploiement : secrets GitHub Actions vers un VPS accessible par SSH.
- Domaines prévus : `appli.laroche360.ca` et `automation.laroche360.ca`.
- Clés applicatives : GitHub Actions et environnement VPS.
- Identifiants Gemini, Drive et SendGrid du workflow : coffre d’identifiants n8n.

**Commentaire :** les propriétaires organisationnels des comptes, les accès d’urgence, la rotation des clés et la procédure de relève sont à confirmer.

---

## Conclusion prioritaire

Les réponses observables montrent que l’application fonctionne déjà pour créer et administrer des campagnes RPS. Toutefois, elle ne peut pas actuellement promettre l’anonymat : les réponses sont directement reliées aux employés et les identifiants sont transmis au workflow IA. Les décisions prioritaires sont donc de définir officiellement le niveau de confidentialité promis, de séparer identité et réponses, de retirer les identifiants avant Gemini, d’appliquer les seuils de groupe et de documenter les fournisseurs, accès, régions et durées de conservation.
