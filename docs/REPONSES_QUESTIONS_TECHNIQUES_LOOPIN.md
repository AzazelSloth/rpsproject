# P4 - Reponses aux questions techniques LoopIn

## Etat analyse : 24 juillet 2026

Ce document repond a partir du code, des fichiers de deploiement et du workflow n8n presents dans le depot. Il decrit l'etat technique observable, et non une certification juridique, une verification de la production ou une decision officielle de L360.

## Legende

- **Deja construit** : comportement present dans le code.
- **Partiellement construit** : une partie existe, mais la fonction ou la protection est incomplete.
- **Pas construit** : aucune implementation correspondante trouvee.
- **A confirmer / decider** : information impossible a etablir depuis le depot.

## Conclusion generale

L'application couvre deja les entreprises, campagnes, questions, imports d'employes, invitations individuelles, reponses, suivi de participation, calculs simples, analyse n8n/Gemini et depot de rapports dans Google Drive.

Dans son etat actuel, les reponses ne sont toutefois **pas anonymes** : elles sont reliees a l'employe par `employee_id`, les jetons et horodatages sont conserves, les administrateurs peuvent lire les reponses individuelles et l'IA recoit le nom, le courriel, la fonction et les reponses de chaque employe. La qualification technique correcte est donc : **donnees personnelles confidentielles et reponses directement identifiables**.

---

# 1. Questions et configuration

## 1.1 Gabarits ou banques de questions

**Statut : Partiellement construit.**

- Les questions sont creees manuellement.
- Une campagne peut copier les sections et questions d'une campagne existante; il s'agit d'une reutilisation interne.
- Aucun catalogue externe, instrument valide, champ de source, auteur, licence ou version d'instrument n'existe.
- Strapi est optionnel, mais sert au gabarit editorial du rapport, pas a une banque de questions.

**Commentaire :** l'utilisation future d'instruments externes est a decider. Ajouter `source`, `licence`, `version`, `langue`, `regle_de_calcul` et `autorisation_utilisation` avant toute integration.

## 1.2 Questions vides et valeur preselectionnee

**Statut : Deja construit dans l'interface actuelle.**

- L'etat des reponses commence vide.
- Aucun bouton de l'echelle 1 a 5 n'est preselectionne.
- Aucune valeur n'est envoyee sans action du repondant.
- Le frontend exige actuellement une reponse a toutes les questions.

**Reponse :** aucune valeur `1 - Pas du tout d'accord` n'est enregistree par defaut.

**Reserve :** le backend accepte une soumission partielle et peut ensuite marquer le questionnaire comme termine.

## 1.3 Questions facultatives, refus distinct et retour

**Statut : Pas construit, sauf modification avant l'envoi.**

- Aucun champ `required` ou `optional` n'existe.
- L'interface impose toutes les questions.
- « Je prefere ne pas repondre » peut seulement etre ajoute manuellement comme choix ordinaire. Il serait alors stocke comme texte distinct d'une question omise.
- Toutes les questions sont sur une page; les reponses peuvent etre modifiees avant l'envoi.
- Apres l'envoi, le lien est marque comme utilise et la modification n'est plus possible.

**Commentaire :** decider par question si elle est obligatoire, facultative ou sensible, et representer explicitement le refus de repondre.

## 1.4 Texte libre

**Statut : Partiellement construit.**

- Le type texte libre existe et une consigne peut etre affichee.
- L'API administrative limite une reponse a 4 000 caracteres.
- Le formulaire public n'affiche pas de compteur ou `maxLength`, et la soumission par jeton n'impose pas la meme limite explicitement.
- Le texte libre est obligatoire dans le formulaire actuel.

**Commentaire :** ajouter limite configurable, compteur, validation frontend/backend identique et option facultative.

## 1.5 Introduction, consentement, ressources et fin

**Statut : Partiellement construit.**

- Une page d'acces, un en-tete de campagne et un etat de fin existent.
- Aucun modele configurable de consentement, ressources d'aide, engagement de confidentialite ou retrait du consentement n'existe.
- Le texte de fin n'est pas configurable par mandat.

**Commentaire :** ajouter ces pages comme contenus versionnes par campagne et par langue, avec la version de consentement acceptee.

## 1.6 Demographie et taille minimale des groupes

**Statut : Partiellement construit pour la demographie; pas construit pour la confidentialite.**

- Le departement/fonction est conserve dans la fiche employe et utilise pour les resultats.
- Aucun seuil minimal de groupe, regroupement « Autres », suppression secondaire ou controle de croisements n'existe.
- Un departement d'une seule personne peut apparaitre.

**Commentaire :** le seuil doit etre applique dans le backend, les filtres, rapports et exports, pas uniquement dans l'affichage.

## 1.7 Horaires et recoupement

**Statut : Deja construit, avec risque eleve.**

Sont conserves : creation de l'employe et du participant, invitation, rappel, nombre de rappels, fin du questionnaire et creation de chaque reponse.

Il n'y a pas de champ explicite « ouvert a », mais les journaux Nginx enregistrent les requetes et IP, les URL contiennent le jeton individuel, et les reponses sont directement liees a l'employe.

**Reponse :** oui, l'architecture actuelle permet de relier une reponse a un employe, directement et par recoupement temporel.

## 1.8 Bilinguisme

**Statut : Pas construit.**

Les contenus sont principalement codes en francais. Aucun champ de langue, traduction liee, identifiant commun d'item, bascule ou controle de synchronisation francais/anglais n'existe.

**Commentaire :** recommander un item logique versionne avec deux libelles lies plutot que deux questionnaires independants.

## 1.9 Mobile et navigateurs

**Statut : Partiellement construit.**

- L'interface utilise des styles responsifs Tailwind.
- Aucune suite de tests frontend, E2E navigateur, matrice Chrome/Edge/Firefox/Safari ou test d'accessibilite n'a ete trouvee.

**Commentaire :** la conception responsive existe, mais la compatibilite n'est pas demontree par des tests documentes.

---

# 2. Calcul

## 2.1 Reponses potentiellement non valides

**Statut : Pas construit.**

Aucune regle ne detecte la duree irrealiste, les reponses identiques, les incoherences, doublons de contenu, valeurs aberrantes ou qualite insuffisante. Le jeton empeche seulement une deuxieme soumission avec le meme lien.

Le taux de participation repose sur le statut `completed`, sans statut valide/invalide. Une soumission backend contenant une seule reponse peut marquer le participant comme termine.

**Commentaire :** criteres, seuils, droits de validation et recalculs restent a definir. Une reponse suspecte devrait etre signalee, pas supprimee automatiquement sur un seul indice.

## 2.2 Echantillon insuffisant

**Statut : Partiellement construit, mais insuffisant.**

- L'interface peut afficher un message general de donnees insuffisantes.
- Le prompt IA demande de rester prudent avec peu de repondants.
- Aucun seuil numerique officiel ne bloque resultats, couleurs, recommandations ou rapport.

**Commentaire :** remplacer la consigne textuelle par une regle explicite et testable.

## 2.3 Transformation des reponses en resultats

**Statut : Deja construit, mais provisoire.**

La logique actuelle :

1. retient les reponses d'echelle numeriques de 1 a 5;
2. calcule la moyenne simple de toutes les echelles d'un employe;
3. calcule la moyenne des employes repondants par departement;
4. calcule une moyenne globale;
5. n'applique aucune ponderation par dimension ou instrument;
6. n'utilise pas le champ `rps_dimension` dans les calculs.

L'IA recoit separement les reponses brutes. Il existe donc une chaine de calcul simple dans le code et une chaine d'interpretation par IA.

**Commentaire :** placer les regles methodologiques dans une configuration versionnee executee par du code deterministe, pas dans le prompt.

## 2.4 Items inverses et niveaux

**Statut : Pas construit pour l'inversion; partiellement construit pour les seuils.**

- Aucun champ d'item inverse et aucune formule `6 - reponse`.
- Toutes les valeurs elevees augmentent le score, quel que soit le sens de l'enonce.
- Une zone de risque est codee a `3,5/5`; une alerte est comptee a `4/5`.
- Ces seuils sont codes en dur.

**Commentaire :** configurer pour chaque item le sens, l'inversion, la dimension, la ponderation, le minimum repondu et les seuils versionnes.

## 2.5 Abandons et donnees manquantes

**Statut : Incoherent entre frontend et backend.**

- Le frontend exige toutes les reponses et ne sauvegarde pas la progression.
- Fermer la page avant l'envoi perd les reponses locales; le lien peut etre rouvert.
- Le backend accepte au moins une reponse, puis marque le questionnaire comme termine.
- Les calculs ignorent les valeurs non numeriques sans regle methodologique formelle.

**Commentaire :** decider une politique officielle et aligner la validation backend sur les questions obligatoires/facultatives.

## 2.6 Version du questionnaire

**Statut : Partiellement protege, mais pas versionne.**

- Les questions ne peuvent pas etre modifiees pendant une campagne active.
- Une campagne peut copier une ancienne campagne.
- Chaque reponse reste liee a son enregistrement de question.
- Aucun numero de version, date d'effet, empreinte de contenu ou historique d'item n'existe.

**Commentaire :** le lien vers la question ne suffit pas pour une tracabilite longitudinale demontrable.

---

# 3. IA et rapport

## 3.1 Donnees transmises a l'IA

**Statut : Deja construit - reponses brutes et identifiants transmis.**

Le workflow recoit par employe : employeur, nom et prenom, courriel, fonction/departement et reponses `Q1`, `Q2`, etc., incluant les textes libres. Le format envoye a Gemini ressemble a :

```text
Repondant 1 - Nom Prenom - Fonction - courriel
Q1: reponse
Q2: reponse
```

**Reponse :** l'IA recoit les reponses individuelles avec des identifiants directs, pas seulement des scores agreges.

## 3.2 Prompt et versionnement

**Statut : Deja construit, mais gouvernance incomplete.**

- Les prompts systeme et utilisateur sont dans le fichier JSON du workflow n8n, versionne dans Git.
- Aucun identifiant de version du prompt n'est enregistre avec le rapport.
- Aucun registre d'approbation, date d'effet ou validation fonctionnelle du prompt n'existe.

**Commentaire :** enregistrer avec chaque rapport les versions du workflow, prompt, modele, calculs et questionnaire.

## 3.3 Fournisseur, modele et entente

**Statut : Fournisseur et modele construits; entente a confirmer.**

- Fournisseur observable : Google.
- Modele configure : `models/gemini-2.5-flash`.
- Connexion : identifiants Google Palm/Gemini dans n8n.
- Type de compte, region, retention, option de non-entrainement et entente de traitement : non visibles dans le depot.

**Commentaire :** verifier ces parametres dans le compte reel. Le code ne permet pas d'affirmer que les donnees ne servent pas a l'amelioration des modeles.

## 3.4 Retrait des noms et details identifiants

**Statut : Pas construit.**

Aucun retrait automatique des noms, courriels, numeros, lieux ou autres identifiants n'est applique. Au contraire, le nom et le courriel sont ajoutes explicitement au texte transmis a l'IA. Les personnes nommees dans un commentaire libre ne sont pas masquees.

**Commentaire :** correction prioritaire avant toute utilisation de donnees reelles sensibles.

## 3.5 Transformations avant et apres l'IA

**Statut : Partiellement construit.**

Avant : validation sommaire, extraction des colonnes `Qn`, concatenation par personne et ajout de l'identite. Il n'y a ni agregation, ni anonymisation, ni suppression des petits groupes.

Apres : le texte IA est insere dans un gabarit fixe, depose dans Google Drive, envoye par courriel, puis un marqueur de rapport est cree dans l'application.

Aucune validation automatisee des affirmations, recommandations, donnees personnelles retournees ou hallucinations n'est presente.

## 3.6 Gabarit, calcul, banque de contenu et IA

**Statut : Deja construit de maniere mixte.**

- **Gabarit fixe :** titre, metadonnees, avis de confidentialite et structure.
- **Calcul automatique :** participation, moyennes simples, alertes et departements a risque.
- **Regles codees :** recommandations simples du rapport frontend.
- **Gabarit editorial optionnel :** Strapi ou valeurs par defaut.
- **IA :** analyse narrative et proposition de trois actions.
- **Banque formelle de recommandations :** non trouvee.

## 3.7 Recommandations et plan d'action

**Statut : Partiellement construit.**

- Le frontend applique quelques regles : relance sous 70 % de participation, priorisation des departements a partir de 3,5 et suivi des signaux faibles.
- Le rapport n8n demande a l'IA trois actions.
- Aucun identifiant de recommandation, lien probant aux donnees, statut d'approbation humaine ou banque controlee n'existe.

**Commentaire :** rendre les recommandations tracables et imposees a une validation humaine avant livraison.

## 3.8 Contexte organisationnel et entretiens

**Statut : Pas construit.**

Aucun formulaire, table ou endpoint ne stocke les entretiens, documents de contexte, hypotheses de direction ou notes structurees de consultant. Le gabarit possede une zone de notes, mais sans provenance. Le workflow IA ne recoit que les reponses et metadonnees de campagne.

**Commentaire :** distinguer la source, l'auteur, la date et le statut de validation de chaque information externe au sondage.

## 3.9 Rapport de demonstration

**Statut : Techniquement possible, mais pas fourni comme test reproductible.**

Une campagne et des donnees synthetiques peuvent etre chargees puis analysees. Cependant, aucun jeu de reference complet avec questionnaire versionne, resultats attendus et rapport temoin n'a ete trouve.

**Commentaire :** creer un jeu synthetique, un calcul attendu et un rapport approuve de reference.

---

# 4. Anonymat, confidentialite et infrastructure

## 4.1 Qualification actuelle

**Statut : Confidentielles et directement identifiables.**

Les reponses ne sont pas anonymes parce que :

- chaque reponse contient une cle obligatoire vers l'employe;
- l'employe contient nom, prenom, courriel, telephone et departement;
- le participant relie le jeton individuel a l'employe et la campagne;
- l'interface de reponse affiche l'identite de l'employe;
- les API administratives retournent les reponses avec l'employe;
- l'analyse n8n transmet les identifiants a l'IA.

Elles ne sont pas reellement pseudonymisees : la table de correspondance est dans le meme systeme et directement accessible aux administrateurs autorises.

## 4.2 Autres donnees confidentielles et acces

**Statut : Donnees presentes; controles partiels.**

Donnees traitees : identites et coordonnees, fonctions, entreprises, invitations, rappels, statuts, jetons, reponses, comptes administrateurs, journaux, rapports Drive et historiques n8n.

- Les courriels de `ADMIN_ALLOWED_EMAILS` peuvent ouvrir une session administrative.
- Les routes utilisent JWT ou une cle API n8n.
- Il n'existe pas de roles distincts, permissions par entreprise ou separation L360/client/developpeur.
- Un administrateur autorise peut lire l'ensemble des donnees disponibles.
- Les acces reels au VPS, PostgreSQL, n8n, Drive, SendGrid et secrets GitHub sont a confirmer.

## 4.3 Liste d'employes separee et reponses anonymes

**Statut : Faisable avec refonte; pas realise.**

Modifications necessaires :

1. separer le service d'invitation du coffre de reponses;
2. ne jamais conserver `employee_id`, courriel ou jeton dans une reponse;
3. conserver seulement un identifiant de campagne non personnel;
4. supprimer ou grossir fortement les horodatages;
5. interdire les endpoints individuels;
6. agreger avant consultation, export ou IA;
7. appliquer les seuils dans le backend;
8. journaliser les acces sans journaliser le contenu sensible;
9. detruire ou dissocier irreversiblement les jetons;
10. arbitrer anonymat, reprise, rappels cibles et prevention des doublons.

## 4.4 Anonymat a 100 %

**Statut : Pas construit; decision de produit a prendre.**

LoopIn peut viser un anonymat fort, mais une promesse absolue de « 100 % » reste risquee : journaux reseau, textes libres, petits groupes et metadonnees peuvent identifier indirectement.

Architecture cible : lien generique par campagne, aucune identite dans les reponses, aucune IP ou URL avec jeton dans les journaux, aucun horodatage precis, de-identification des textes, seuils de groupes, exports agreges, droits separes et politique de destruction.

Limitations : prevention des doublons moins fiable, rappels individuels impossibles, reprise plus difficile, taux individuel moins precis et risque de partage du lien.

Une option intermediaire consiste a faire valider un jeton a usage unique par un service d'invitation, puis l'echanger contre une autorisation anonyme non tracable. Cette solution exige une analyse de menace specialisee.

## 4.5 Parcours actuel des donnees

```text
Client/L360
   |
   | import CSV : nom, prenom, courriel, telephone, departement
   v
Frontend admin Next.js
   |
   v
Backend NestJS ------------------------------+
   |                                         |
   | cree Employee                           | journaux horodates
   | cree CampaignParticipant                | Nginx avec IP et URL
   | cree un UUID individuel                 |
   v                                         |
PostgreSQL                                   |
   | employees <------ employee_id ----------+
   | campaign_participants : token, invitation,
   | rappel, fin, statut
   |
   | lien individuel contenant le token
   v
SendGrid ---> Courriel de l'employe
                 |
                 v
        /survey-response/{token}
                 |
                 | retrouve et affiche l'employe
                 v
         Reponses du questionnaire
                 |
                 v
PostgreSQL responses
   | employee_id + question_id + answer + created_at
   |
   +--> Interface admin : reponses et resultats
   |
   +--> n8n : nom + courriel + fonction + Q1..Qn
             |
             +--> Gemini 2.5 Flash
             +--> Google Drive
             +--> SendGrid
             +--> marqueur reports.report_path
```

**Jonctions identite-reponse :** jeton, `employee_id`, affichage du nom, horodatages, URL des journaux, payload n8n et texte Gemini.

## 4.6 Liens d'invitation

**Statut : Deja construit - liens individuels.**

- Un UUID aleatoire est cree pour chaque couple campagne-employe.
- Il charge le questionnaire et empeche une seconde soumission avec le meme lien.
- Il reste conserve avec l'employe, la campagne et les horodatages.
- Aucun delai d'expiration, rotation ou destruction apres utilisation n'existe.

## 4.7 Donnees conservees par repondant

**Statut : Deja construit.**

Tables applicatives : nom, prenom, courriel, telephone, statut, entreprise, departement, identifiant, ancien `survey_token`, jeton de participation, invitation, rappel, nombre de rappels, fin et date de chaque reponse.

Pas de champs metier dedies trouves pour IP, appareil, navigateur ou geolocalisation. Toutefois, Nginx transmet et journalise l'IP et peut enregistrer l'URL complete avec le jeton. Le rate limiter traite aussi l'IP en memoire.

## 4.8 Separation invites/reponses

**Statut : Pas separe de facon anonyme.**

Les donnees sont dans des tables distinctes, mais `responses` contient directement `employee_id`, et `campaign_participants` conserve le jeton, l'employe, le statut et les heures. La jointure identite-reponse est simple et prevue par le modele.

**Reponse :** la cible « couche administrative confidentielle + couche anonyme sans recroisement » n'est pas presente.

## 4.9 Seuils, filtres, exports et reponses individuelles

**Statut : Pas construit.**

- Aucun seuil minimal n'est applique aux departements, filtres ou rapports.
- Les routes administratives listent les reponses individuelles avec l'employe associe.
- Aucun bouton d'export des reponses n'a ete trouve dans les resultats, mais l'API rend les donnees individuelles accessibles a un administrateur.

**Commentaire :** la capacite API contournerait une protection limitee au rapport affiche.

## 4.10 Lieu d'hebergement

**Statut : Architecture connue; fournisseur, pays et region non confirmes.**

- Deploiement prevu sur VPS Ubuntu, Docker Compose et Nginx.
- PostgreSQL peut etre externe ou sur le VPS.
- n8n utilise la meme infrastructure reseau ou une URL publique.
- Les rapports vont dans Google Drive.
- Fournisseur VPS, pays, region PostgreSQL, region Google et lieux de sauvegarde ne sont pas indiques.

**Commentaire :** confirmer avec les proprietaires du VPS, de la base, du domaine et des comptes Google. L'evaluation Loi 25 doit utiliser les regions reelles.

## 4.11 Acces et journaux

**Statut : Controle partiel; audit metier pas construit.**

- JWT pour administrateurs, liste de courriels autorises et cle API n8n.
- Aucun role fin, droit par client ou separation lecture/ecriture.
- Journaux backend horodates : 14 jours pour l'application et 30 jours pour les erreurs.
- Journaux Nginx distincts pour l'application et n8n.
- Aucun audit metier structure n'indique qui a consulte, exporte ou modifie une donnee precise.

**Commentaire :** les personnes reelles ayant acces au VPS, GitHub, n8n, Drive, SendGrid et PostgreSQL restent a confirmer.

## 4.12 Conservation, destruction, export et sauvegardes

**Statut : Pas decide et pas construit de bout en bout.**

- Certaines suppressions logiques existent; les reponses avec `deleted_at` restent physiquement en base.
- Des suppressions en cascade existent pour la base active.
- Aucun calendrier de conservation, traitement automatique, registre de destruction ou export client complet n'existe.
- Aucune procedure ne couvre ensemble PostgreSQL, Drive, n8n, SendGrid, journaux et sauvegardes.
- La strategie et la retention des sauvegardes ne sont pas documentees.

**Commentaire :** impossible d'affirmer qu'une destruction couvre les sauvegardes sans inspecter les configurations de production.

## 4.13 Sous-traitants et services tiers

**Statut : Inventaire partiel observable.**

- fournisseur du VPS et du reseau;
- GitHub et GitHub Actions;
- SendGrid;
- n8n;
- Google Gemini;
- Google Drive;
- Strapi si active;
- fournisseur de domaine/DNS/TLS;
- PostgreSQL ou son fournisseur externe.

**Commentaire :** les fournisseurs exacts du VPS, de PostgreSQL, du domaine et de Strapi sont a confirmer.

## 4.14 Developpement et test

**Statut : Environnements presents; politique de donnees reelles absente.**

- GitHub prevoit les environnements `rps_dev` et `development`.
- L'application fonctionne localement et possede des tests backend et une CI.
- Aucun controle technique n'interdit les donnees reelles en developpement.
- Aucun masquage, generateur synthetique ou classification des donnees n'a ete trouve.

**Commentaire :** adopter une regle explicite interdisant les donnees reelles en dev/test, sauf environnement approuve et protege de facon equivalente.

---

# 5. Documentation, qualite et continuite

## 5.1 Documentation et FAQ

**Statut : Partiellement construit.**

Existent : README technique, guide de passation, guide n8n client, deploiement/depannage et Swagger lorsque active.

Non trouves : FAQ repondant, politique d'anonymat approuvee, consentement, manuel client de gouvernance, matrice des acces, politique de conservation, procedure d'incident et documentation methodologique des calculs.

## 5.2 Plateformes, bibliotheques et licences

**Statut : Plateformes documentees; licences non inventoriees completement.**

Composantes principales : Next.js, React, TypeScript, Tailwind, tRPC, Zod, NestJS, TypeORM, PostgreSQL, bcrypt, JWT, Helmet, Winston, n8n, Gemini, Drive, SendGrid, Strapi optionnel, Nginx, Docker et GitHub Actions.

Le package backend declare le projet `UNLICENSED`. Aucun fichier `LICENSE`, registre complet des licences tierces, SBOM ou procedure de verification n'a ete trouve.

**Commentaire :** produire un inventaire automatise, puis valider les conditions commerciales de n8n, Google, SendGrid, Strapi et des instruments psychometriques.

## 5.3 Tests et limites ouvertes

**Statut : Partiellement construit.**

- Tests unitaires backend pour authentification, employes, campagnes, reponses, courriel, sante et n8n.
- Squelette E2E NestJS et CI qui teste le backend et construit les deux applications.
- Pas de suite de tests frontend trouvee.
- Pas de test psychometrique avec resultats attendus.
- Pas de test d'anonymat, seuil de groupe, de-identification, prompt IA ou rapport complet.
- Pas de registre unique des decisions et risques ouverts.

**Commentaire :** creer un registre de decisions et une matrice de tests calcul, vie privee, securite, accessibilite, navigateurs et IA.

## 5.4 Comptes, hebergement, domaine et cles

**Statut : Partiellement connu.**

- Depot Git : `github.com/AzazelSloth/rpsproject`.
- Deploiement par secrets et variables GitHub Actions vers un VPS SSH.
- Domaines prevus : `appli.laroche360.ca` et `automation.laroche360.ca`.
- Cles JWT, base, n8n, SendGrid et API injectees par GitHub ou l'environnement VPS.
- Identifiants Gemini, Drive et SendGrid du workflow conserves dans le coffre n8n.

**A confirmer :** proprietaires du depot, VPS, domaine et comptes tiers; acces d'urgence; personnes possedant les secrets; rotation/revocation des cles; procedure de depart d'un developpeur ou fournisseur.

---

# 6. Decisions prioritaires recommandees

## Priorite critique avant donnees reelles sensibles

1. Decider si LoopIn promet confidentialite, pseudonymisation ou anonymat fort.
2. Cesser d'envoyer noms et courriels a Gemini.
3. De-identifier les textes libres avant tout service tiers.
4. Retirer `responses.employee_id` si l'objectif est l'anonymat.
5. Proteger les jetons dans les journaux Nginx.
6. Appliquer les seuils dans les vues, API et exports.
7. Desactiver l'acces aux reponses individuelles si non indispensable.
8. Confirmer regions, contrats et retentions des fournisseurs.

## Priorite methodologique

1. Versionner questionnaires, items, traductions, prompts et calculs.
2. Configurer items inverses et dimensions.
3. Definir donnees manquantes et validite.
4. Definir couleurs, alertes et echantillons insuffisants.
5. Separer calcul deterministe, contenu approuve et redaction IA.
6. Exiger une validation humaine du rapport.

## Priorite produit et continuite

1. Ajouter consentement, ressources et fin configurables.
2. Ajouter le bilinguisme lie.
3. Tester mobile, navigateurs et accessibilite.
4. Definir conservation, destruction, sauvegardes et export.
5. Creer roles fins et audit metier.
6. Documenter les comptes proprietaires et la releve.

---

# 7. Fichiers principalement examines

- `rps-backend/src/response/response.entity.ts`
- `rps-backend/src/campaign-participant/campaign-participant.entity.ts`
- `rps-backend/src/campaign-participant/campaign-participant.service.ts`
- `rps-backend/src/campaign/campaign.service.ts`
- `rps-backend/src/question/question.entity.ts`
- `rps-backend/src/question/question.service.ts`
- `rps-backend/src/employee/employee.entity.ts`
- `rps-backend/src/common/winston-logger.service.ts`
- `rps-frontend/nextjs-app/components/rps/survey-response-demo.tsx`
- `rps-frontend/nextjs-app/lib/repositories/rps-repository.ts`
- `rps-automation/NEW WORKFLOW RSP.json`
- `scripts/vps/docker-compose.yml`
- `scripts/vps/nginx.host.conf`
- `.github/workflows/rps_deployment.yml`
- `README.md`
