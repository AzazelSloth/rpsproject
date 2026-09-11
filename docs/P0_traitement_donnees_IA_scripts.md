# Traitement des données transmises à l’IA — Laroche360

## Résumé client

L’anonymisation est actuellement **en cours et non démontrée comme achevée**. L’analyse du dépôt montre que le workflow n8n reçoit des réponses individuelles et construit, avant Gemini, un texte contenant potentiellement le nom, la fonction, le courriel et les réponses `Q…`. Aucun script de retrait des identifiants dans les commentaires n’a été trouvé dans le périmètre examiné.

En conséquence, le P0 n’est pas démontré comme terminé. Le dépôt ne permet pas non plus de prouver quel workflow est réellement déployé, ni la conservation effective des données dans n8n, Google Drive ou chez Gemini.

## Périmètre et limites

Analyse statique du dépôt, sans données réelles, appel externe, déploiement ni migration. Fichiers examinés notamment :

- `rps-automation/NEW WORKFLOW RSP.json` ;
- `rps-backend/src/response/response.service.ts` ;
- `rps-backend/src/campaign-participant/campaign-participant.service.ts` ;
- `rps-frontend/nextjs-app/lib/repositories/rps-repository.ts`.

Les lignes citées sont celles du dépôt au moment de l’analyse. Le code versionné ne prouve pas à lui seul ce qui est déployé.

### Contrôle de cohérence documentaire

Les constats ci-dessous ont été recoupés avec les fichiers présents dans le dépôt. Les éléments marqués « actuel » sont des comportements observés dans le code ; les éléments marqués « cible », « proposition » ou « à valider » ne sont pas présentés comme implémentés. Les configurations n8n réellement actives, les paramètres de rétention et les données de production restent hors du périmètre vérifiable.

## Parcours observé

1. Les réponses sont associées à un employé et à une question. Le backend conserve donc le lien réponse–employé (`response.service.ts`, `create`, lignes 18–58).
2. Un brouillon peut contenir `question_id`, `answer` et `response_state`, y compris pour une soumission partielle (`campaign-participant.service.ts`, `saveDraftByToken`, lignes 304–378).
3. Le workflow n8n extrait les lignes de réponses du webhook (`NEW WORKFLOW RSP.json`, nœud « Formater les donnees », ligne 5).
4. Il forme `formattedForAI` avec une identité, une fonction, un courriel et les réponses individuelles (`NEW WORKFLOW RSP.json`, ligne 5).
5. Le prompt de l’agent Gemini transmet `formattedForAI` pour analyse (`NEW WORKFLOW RSP.json`, lignes 26–30). Le modèle configuré est Gemini 2.5 Flash (lignes 290–298).
6. Le rapport est ensuite enregistré dans Google Drive puis envoyé par courriel (`NEW WORKFLOW RSP.json`, nœuds « Enregistrement du rapport dans drive » et « Send an email »).

La séparation attendue « commentaires nettoyés seuls » puis « agrégats seuls » n’est pas présente dans le workflow examiné : un seul agent reçoit simultanément les réponses fermées et les textes libres, avec les champs d’identité construits dans le même payload.

## Questions fermées : traitement actuel

### Script réel — validation d’une réponse

Extrait simplifié fidèle de `rps-backend/src/response/response.service.ts`, fonction `create` (lignes 18–40) :

```ts
const responseState =
  createResponseDto.response_state === SurveyResponseState.DECLINED
    ? SurveyResponseState.DECLINED
    : SurveyResponseState.ANSWERED;

const answer =
  responseState === SurveyResponseState.DECLINED
    ? null
    : createResponseDto.answer?.trim() || null;

if (responseState === SurveyResponseState.ANSWERED && !answer) {
  throw new BadRequestException(
    'An answered response must contain a value',
  );
}
```

Ce code conserve l’état de refus et transforme son contenu en `null`. Il ne calcule pas à lui seul les statistiques et ne retire aucun identifiant.

### Script réel — moyenne d’échelle

Extrait de `rps-frontend/nextjs-app/lib/repositories/rps-repository.ts`, fonctions `computeStressScore` et `buildAveragedSeries` (lignes 786–806 et 969–1011) :

```ts
const scaleValues = getValidScaleResponseValues(
  responses
    .filter((response) =>
      normalizeQuestionType(response.question?.question_type) === 'scale',
    )
    .map((response) => ({
      answer: response.answer,
      responseState: response.response_state,
    })),
);

const average =
  scaleValues.reduce((sum, value) => sum + value, 0) / scaleValues.length;
return Number(average.toFixed(1));
```

La fonction de série temporelle applique aussi un filtre numérique `1 <= valeur <= 5` avant de calculer la moyenne. Ces extraits sont les scripts réellement présents ; ils ne constituent pas un script de transmission agrégée vers l’IA.

Dans l’interface, les agrégations locales de l’échelle filtrent les valeurs numériques valides entre 1 et 5 puis calculent la moyenne sur les valeurs restantes (`rps-repository.ts`, `computeStressScore`, lignes 786–806 ; `buildAveragedSeries`, lignes 969–1011). Les réponses refusées ou non numériques ne sont donc pas ajoutées à cette moyenne lorsque l’état est correctement filtré.

Le backend transforme un refus explicite en état `declined` avec `answer = null`, et refuse une réponse marquée répondue sans valeur (`response.service.ts`, `create`, lignes 18–40). Le dépôt contient aussi des réponses partielles via les brouillons, mais aucune preuve dans le workflow n8n que ces états soient agrégés avant l’envoi à l’IA.

Les sections masquées sont filtrées côté questionnaire (`campaign-participant.service.ts`, lignes 244–261). Le type exact de chaque QCM, les dénominateurs de distributions et un traitement dédié des choix multiples ne sont pas suffisamment documentés dans le workflow n8n fourni. Il faut donc les valider sur le modèle de questions et le payload réellement produit.

Exemple fictif d’agrégation attendue : pour les valeurs `4, 2, refus, absent`, moyenne = `(4 + 2) / 2 = 3`, dénominateur = 2 répondants exploitables, et non 4. Cet exemple décrit la règle observée pour les valeurs numériques locales ; il ne constitue pas une preuve du payload IA.

## Questions ouvertes : traitement actuel

### Script réel — préparation du payload n8n

Extrait du nœud `Formater les donnees` de `rps-automation/NEW WORKFLOW RSP.json` (ligne 5) :

```js
const questionKeys = [...new Set(
  responses.flatMap((row) =>
    Object.keys(row || {}).filter((key) => /^Q\d+$/.test(key))
  )
)];

const formattedForAI = responses.map((row, index) => {
  const identity = row['Nom et Prenom'] || row['Nom et Prénom(s)']
    || row.nom || row.name || `Repondant ${index + 1}`;
  const header = [
    `Repondant ${index + 1}`,
    identity,
    row.Fonction || row.fonction,
    row.Email || row.email,
  ].filter(Boolean).join(' - ');
  const answers = questionKeys
    .map((key) => `${key}: ${row[key] ?? ''}`).join('\n');
  return `${header}\n${answers}`;
}).join('\n\n---\n\n');

return [{
  json: {
    campaignInfo: { total_repondants: responses.length },
    openAnswers: responses,
    formattedForAI,
  },
}];
```

Ce script est nommé « Formater les donnees » et sa note indique « Nettoie et formate », mais le code montré ci-dessus ne retire aucun nom, courriel, fonction ou élément identifiant. Il conserve aussi `openAnswers: responses`, donc les lignes sources restent présentes dans l’item n8n.

### Script réel — transmission à Gemini

Le prompt de l’agent utilise directement la chaîne préparée :

```text
Nombre de répondants : {{ $json.campaignInfo.total_repondants }}

DONNÉES À ANALYSER
{{ $json.formattedForAI }}
```

Source : `rps-automation/NEW WORKFLOW RSP.json`, nœud `AI Agent1`, lignes 26–30. Les instructions demandant de ne pas citer les personnes ne remplacent pas un retrait technique avant transmission.

## Contact du champion de la démarche

Le nom et l’adresse courriel du champion ne sont pas présents dans le code examiné. Il est recommandé de les ajouter près du contexte de l’entreprise, mais dans deux champs structurés distincts, par exemple :

```text
Contexte de l’entreprise : …
Nom du champion : …
Adresse courriel du champion : …
```

Ces champs concernent le contact de la démarche, et non les réponses des employés. Ils devraient être utilisés uniquement pour personnaliser les courriels d’invitation et de relance, par exemple :

```text
Des questions sur la démarche ?
Écrivez à {{ champion_name }}, {{ champion_email }}.
```

Cette évolution est une proposition non implémentée dans le dépôt. Elle ne doit pas être confondue avec le nettoyage des réponses ou l’anonymisation.

Le nœud intitulé « Formater les donnees » ne réalise pas de retrait d’identifiants. Il lit notamment `Nom et Prenom`, `Nom et Prénom(s)`, `nom`, `name`, `Fonction`/`fonction`, `Email`/`email`, puis ajoute les réponses `Q1`, `Q2`, etc. au texte `formattedForAI` (`NEW WORKFLOW RSP.json`, ligne 5).

Aucun mécanisme identifié ne traite les noms présents dans le texte libre, courriels, téléphones, fonctions rares, lieux, dates ou événements précis. Aucun comportement de quarantaine ou de blocage en cas de doute n’est démontré. Des instructions dans le prompt demandent de ne pas citer les personnes, mais une consigne au modèle ne retire pas les données du payload transmis.

Conclusion explicite : **aucun script de retrait des identifiants dans les commentaires n’a été trouvé dans le périmètre examiné.**

## Exemples fictifs de charges utiles

Payload actuellement compatible avec le workflow (à ne pas considérer comme conforme) :

```json
{
  "Nom et Prenom": "Alice Exemple",
  "Email": "alice.exemple@example.test",
  "Fonction": "Responsable d’unité rare",
  "Q1": "4",
  "Q2": "Le projet X du 12 mars est difficile"
}
```

Le code peut produire notamment : `Repondant 1 - Alice Exemple - Responsable d’unité rare - alice.exemple@example.test`, suivi de `Q1` et `Q2`. Cela démontre le risque de transmission d’identifiants et de réponses individuelles, mais pas la charge effectivement envoyée en production.

Payload cible non implémenté : commentaires nettoyés sous identifiants techniques non ré-identifiants, sans nom, courriel, fonction rare ni réponse fermée individuelle ; second appel limité à des distributions, effectifs, moyennes et thèmes contrôlés.

## Tests et preuves

Tests existants repérés : tests unitaires du backend et du dépôt frontend, mais aucun test identifié ne vérifie l’absence de nom, courriel, identifiant ou réponse individuelle dans le payload IA.

Tests exécutés : aucun test d’intégration n8n/Gemini et aucun appel externe n’a été effectué.

Tests à ajouter et exécuter localement, sur données fictives uniquement : réponse valide, refus, absence, soumission partielle, groupe vide, commentaire avec nom/courriel, identification indirecte, échec ou doute de nettoyage, absence d’identifiants dans l’appel 1 et absence de commentaires d’origine dans l’appel 2.

## Exigences, constats et écarts

| Exigence | Constat / preuve | Écart | Action nécessaire |
|---|---|---|---|
| IA limitée aux commentaires nettoyés et agrégats | `formattedForAI` contient identité et réponses individuelles, workflow ligne 5 | Non conforme au besoin P0 | Implémenter un nettoyage bloquant et vérifier le payload final |
| Retrait des identifiants dans les commentaires | Aucun script trouvé | Non démontré | Définir, coder et tester le traitement local |
| Second appel sans données brutes | Un seul agent visible, prompt avec `formattedForAI`, lignes 26–30 | Séparation non démontrée | Créer deux payloads indépendants et tests de non-contamination |
| Refus/absence hors moyennes | Filtrage local des valeurs valides, `rps-repository.ts` lignes 786–806 | Périmètre IA non prouvé | Produire les agrégats avant n8n et conserver les états explicitement |
| Conservation n8n/IA contrôlée | Configurations de rétention absentes du dépôt | Non vérifiable | Fournir les paramètres d’instance, logs, exécutions et politique fournisseur |
| Petit groupe protégé | Aucun seuil identifié dans le périmètre | Non vérifiable | Faire valider une règle de diffusion ; un seuil seul ne supprime pas la ré-identification |
| Coordonnées du champion disponibles dans les courriels | Aucun champ `champion_name`/`champion_email` trouvé dans le code | Non implémenté | Ajouter deux champs structurés auprès du contexte de l’entreprise et les raccorder aux modèles d’invitation et de relance |

## Proposition non implémentée

Construire localement un payload de premier appel contenant uniquement des commentaires nettoyés, avec rejet en cas de doute, puis un second payload indépendant contenant uniquement les agrégats et les thèmes contrôlés. Ne pas envoyer les commentaires bruts à un autre service externe pour nettoyage. Ajouter des tests de sérialisation qui échouent si un champ d’identité ou une réponse individuelle réapparaît.

## Décisions à faire valider

- définition opérationnelle de « commentaire nettoyé » et traitement des cas ambigus ;
- champs et agrégats autorisés chez n8n puis chez Gemini ;
- règle de diffusion pour les petits groupes et les groupes sans réponse exploitable ;
- politique de conservation/suppression des exécutions n8n, journaux, Drive et fournisseur IA ;
- choix concernant les exports individuels demandés au client, distincts de la transmission IA.

## Conclusion P0

Démontré : le dépôt conserve des liens entre réponses et employés, et le workflow versionné construit un texte IA à partir de réponses individuelles avec des champs d’identité potentiels. Non démontré : nettoyage des commentaires, séparation de deux appels IA, payload réellement déployé et rétention des données. À corriger et tester avant de considérer le P0 comme terminé. La formulation client recommandée est donc : **« l’anonymisation est en cours ; elle n’est pas encore démontrée comme effective dans l’implémentation examinée »**.
