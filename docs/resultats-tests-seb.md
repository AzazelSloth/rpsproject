# Résultats vérifiés pour Seb — 23 septembre 2026

Les trois états sont démontrés dans une vraie base PostgreSQL locale, pour trois répondants fictifs à une même question fermée. Le scénario a été répété sur une question d'échelle. **Ces résultats peuvent être transmis ; ils ne clôturent pas l'ensemble de la demande.** Le numéro canonique, l'import des six jeux et le rapport témoin restent à compléter.

## Preuves et périmètre

- [Requêtes, paramètres et résultats bruts](survey-response-states-evidence.json), exécutés le 23 septembre 2026 à 06:23:58 UTC.
- [Test reproductible](../rps-backend/test/survey-response-states.postgres.cjs).
- Vérification effectuée sur le code de l'application disponible le 23 septembre 2026, sans modification de son fonctionnement.
- PostgreSQL local, schéma temporaire neuf, 18 migrations applicatives exécutées, aucune synchronisation automatique du schéma. Le schéma temporaire a été supprimé après le test.
- Trois répondants entièrement fictifs, une question à choix, une question d'échelle et une question de département. Les six CSV du client ne sont pas présents dans l'espace de travail et n'ont pas servi à ce test.
- Appels aux services applicatifs d'ouverture du questionnaire, de sauvegarde du brouillon et de soumission, avec de vrais dépôts PostgreSQL. Ce test ne passe pas par le navigateur ni les routes HTTP et ne vérifie pas le sondage déployé.
- Aucun courriel ni appel au workflow d'analyse. La sortie Excel a été relue en mémoire ; aucun CSV ni classeur n'a été déposé. Les fichiers de preuve contiennent uniquement les données fictives du test.

## Trois répondants, même question fermée

Cette requête est exécutée **avant** l'appel au service d'export. Elle lit directement la colonne persistée, sans conversion du libellé de refus ni reconstruction des états :

```sql
SELECT participation_id, original_question_id, question_type, answer, response_state
FROM survey_submission_items
WHERE original_question_id IN ($1, $2)
ORDER BY original_question_id, participation_id;
-- Paramètres réellement utilisés : [1, 2]
```

| Question interne | Type | Participation fictive | answer | response_state |
|---|---|---|---|---|
| 1 | choice | 1 | Oui | answered |
| 1 | choice | 2 | NULL | skipped |
| 1 | choice | 3 | NULL | declined |
| 2 | scale | 1 | 4 | answered |
| 2 | scale | 2 | NULL | skipped |
| 2 | scale | 3 | NULL | declined |

```sql
SELECT original_question_id,
       COUNT(DISTINCT participation_id)::int AS respondents,
       COUNT(DISTINCT response_state)::int AS distinct_states,
       ARRAY_AGG(DISTINCT response_state ORDER BY response_state) AS stored_states
FROM survey_submission_items
WHERE original_question_id IN ($1, $2)
GROUP BY original_question_id
ORDER BY original_question_id;
-- Paramètres réellement utilisés : [1, 2]
```

| Question interne | Répondants | Valeurs distinctes | Valeurs stockées |
|---|---|---|---|
| 1 | 3 | 3 | answered, declined, skipped |
| 2 | 3 | 3 | answered, declined, skipped |

PostgreSQL rejette aussi un état inconnu et une réponse textuelle associée à `declined` : les deux essais reçoivent le code de violation de contrainte `23514`. Les contraintes réellement lues sont incluses dans le JSON de preuve.

La distinction se trouve dans **`survey_submission_items`**. La table historique **`responses`** ne contient que les réponses et refus ; une question sautée n'y crée pas de ligne. Une lecture directe limitée à `responses` ne satisfait donc pas la demande. Le test inclut cette seconde lecture et constate quatre lignes, contre six dans les éléments de soumission pour les deux questions examinées.

L'observation du libellé dans l'interface reste exacte : le composant de réponse utilise encore « Je préfère ne pas répondre » comme valeur d'interface. À la construction de la soumission, il transmet un état explicite `declined` avec une réponse `null`. Le test PostgreSQL confirme le stockage après soumission, sans démontrer que toute dépendance au libellé a disparu dans l'interface ou dans les anciennes données.

## Sortie applicative et numéro canonique

La sortie Excel effectivement produite contient ces colonnes :

```text
Répondant | Section | Question | Type de question | Réponse | Statut
```

Les trois statuts affichés sont « Répondu », « Sauté » et « Je préfère ne pas répondre ». Leur texte de présentation provient des trois valeurs déjà enregistrées.

**Le numéro canonique est absent de cette sortie.** Les identifiants `1` et `2` ci-dessus sont les identifiants techniques du test, pas des numéros canoniques. Le modèle ne comporte pas de champ dédié au numéro canonique. Le chemin d'analyse n8n construit actuellement `Q…` à partir de `order_index` ; cela ne démontre pas la correspondance avec la numérotation convenue le 13 septembre. Il faut fournir et vérifier cette correspondance, la conserver avec les soumissions et l'exposer dans la sortie avant de valider ce critère.

## Groupe et durée

Une requête complémentaire, intégralement déposée dans le JSON, joint les états stockés, la réponse à la question département, le département de la fiche employé et les intervalles temporels enregistrés. Pour chacune des deux questions fermées, elle retourne :

| Participation fictive | État stocké | Groupe répondu dans le sondage | Département de la fiche | Temps actif en secondes |
|---|---|---|---|---|
| 1 | answered | Groupe A | Groupe A | 120 |
| 2 | skipped | Groupe B | Groupe B | 180 |
| 3 | declined | Groupe A | Groupe A | 240 |

Les durées sont des valeurs fictives transmises lors de la soumission. Les intervalles sont conservés dans `campaign_participants.timing_intervals`, avec `timing_started_at`. Le temps actif est calculé à partir de ces intervalles ; ce n'est pas une colonne scalaire de durée ni nécessairement le temps écoulé entre ouverture et fin. Aucun seuil d'exclusion des réponses rapides n'a été validé ici.

Dans **ce scénario local**, le groupe et les éléments permettant de calculer la durée sont donc enregistrés. Dans **la sortie applicative actuelle**, la durée et la colonne groupe sont absentes. Une question département, si elle existe dans le questionnaire et appartient aux types exportés, apparaît comme une ligne de réponse ordinaire ; elle n'est pas jointe à chaque autre réponse. Le département de la fiche employé n'est pas exporté par ce service.

La présence effective de la question département et des mesures temporelles dans **le sondage de test partagé le 13 septembre** reste non vérifiée : ce sondage et ses deux fichiers n'ont pas été identifiés dans cet espace de travail. Il ne faut pas déduire leur contenu à partir de ces fixtures locales.

## Chemin des six jeux fictifs

**Aucun importeur des six jeux de réponses ni rapport témoin correspondant n'est démontré.** L'import CSV existant concerne les employés, pas leurs réponses, et la commande `seed` ne charge aucune donnée.

Le chemin proposé pour les six jeux est :

```text
Six CSV fictifs existants
→ adaptateur d'import de test à réaliser
  (colonnes canoniques, états explicites, groupe, durée et contrôles de correspondance)
→ campagnes et participations réservées aux tests
→ ouverture du questionnaire puis soumission par l'application
→ survey_submission_items + campaign_participants
→ lecture directe pour le calcul
→ rapport témoin avec comparaison aux résultats attendus
```

Les routes applicatives disponibles pour l'étape de soumission sont :

```text
GET  /api/campaign-participants/token/:token/questionnaire
POST /api/campaign-participants/token/:token/submit
```

L'adaptateur devra transformer chaque ligne fictive en soumission, omettre les questions sautées, transmettre `response_state: "declined"` pour les refus et utiliser la correspondance canonique validée pour retrouver les questions internes. Une cellule vide ne peut pas être interprétée comme un refus sans convention explicite. La définition de durée des CSV doit également être rapprochée de celle du temps actif avant conversion.

Cette entrée ponctuelle en CSV est compatible avec une solution finale qui lit directement l'application et ne produit pas de CSV de réponses réelles. Elle reste **à implémenter et à éprouver sur les six fichiers**.

Le circuit de rapport actuel utilise `responses`, filtre sur `answered`, construit les clés avec `order_index` et ne transmet pas les durées. Il ne peut donc pas être présenté comme une validation de bout en bout des trois états, de la numérotation canonique et du filtrage temporel. Le raccordement au calcul et au rapport témoin reste à réaliser ; il n'a pas été déclenché pendant cette vérification.

## Éléments à définir pour la validation complète

À la suite de la vérification locale, les références et critères nécessaires à la validation complète ont été signalés comme n'étant pas encore définis. Les six CSV mentionnés dans la demande initiale n'ont pas été fournis pour cette vérification. Le parcours décrit ci-dessus reste donc un protocole proposé, et non un parcours exécuté sur les jeux du client.

| Élément | Définition nécessaire avant validation |
|---|---|
| Numéro officiel | Questionnaire de référence, version et correspondance entre chaque numéro et la question concernée. L'identifiant interne ou l'ordre d'affichage ne suffit pas. |
| Groupe | Question de secteur utilisée pour les découpages et liste des choix fixée au cadrage. Le groupe provient de la réponse au questionnaire, conformément à la décision retenue, et non de la liste importée des répondants. |
| Durée | Définition de la mesure utilisée, unité, seuil d'exclusion et traitement d'une durée absente. Le temps actif actuellement mesuré ne doit pas être assimilé sans validation au temps total de complétion. |
| Six jeux fictifs | Fichiers de référence et signification de leurs colonnes, notamment des cellules vides et des refus. |
| Rapport témoin | Résultats attendus pour chaque jeu : effectifs retenus et exclus, dénominateurs, résultats par groupe et indicateurs calculés. Ces valeurs doivent être établies indépendamment de la sortie à contrôler. |

Une fois ces éléments définis, le contrôle comparera, pour chacun des six jeux, les données d'entrée, les valeurs effectivement enregistrées, la sortie de calcul et les résultats attendus du rapport. Les écarts seront consignés. Aucun numéro officiel, seuil de durée ou résultat attendu n'est inventé pour déclarer le test réussi.

Cette attente ne remet pas en cause la preuve déjà obtenue sur les trois états stockés dans PostgreSQL local. Elle empêche de conclure à la validation complète, qui exige aussi les compléments applicatifs décrits dans ce document.

## Vérifications exécutées

| Vérification | Résultat |
|---|---|
| Backend : 7 suites ciblées sur soumission, durée, réponses, export et schéma | 72 tests réussis |
| Frontend : commande `test:survey-response` | 48 tests réussis |
| Compilation backend | Réussie |
| Test PostgreSQL décrit ci-dessus | Réussi, preuves enregistrées et schéma temporaire supprimé |

Reproduction depuis `rps-backend`, avec les dépendances installées et une base PostgreSQL **locale** configurée :

```powershell
npm run build
node test/survey-response-states.postgres.cjs ../docs/survey-response-states-evidence.json
```

Le test crée uniquement ses données fictives dans son propre schéma temporaire. Il interdit une cible PostgreSQL distante et ne lance aucune automatisation de courriel ou d'analyse.

Les critères encore ouverts sont le numéro canonique dans la sortie, la vérification du sondage partagé, et l'import réel des six jeux jusqu'au rapport témoin. Les résultats ci-dessus constituent une preuve locale du stockage des trois états et un constat précis des champs absents de la sortie actuelle.
